import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, session } = vi.hoisted(() => ({ createClient: vi.fn(), session: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: createClient }));
vi.mock("@/modules/identity/presentation/session", () => ({ getSession: session }));
import { getDutyOverview } from "./dashboardQueries";

type Row = Record<string, unknown>;
function query(source: Row[]) {
  let rows = [...source];
  const value = (row: Row, path: string): unknown => path.split(".").reduce<unknown>(
    (current, part) => (current as Row)[part], row,
  );
  const builder = {
    select: () => builder,
    order: () => builder,
    eq: (key: string, expected: unknown) => { rows = rows.filter((row) => value(row, key) === expected); return builder; },
    neq: (key: string, expected: unknown) => { rows = rows.filter((row) => value(row, key) !== expected); return builder; },
    gte: (key: string, expected: string) => { rows = rows.filter((row) => String(value(row, key)) >= expected); return builder; },
    lte: (key: string, expected: string) => { rows = rows.filter((row) => String(value(row, key)) <= expected); return builder; },
    in: (key: string, expected: unknown[]) => { rows = rows.filter((row) => expected.includes(value(row, key))); return builder; },
    then: (resolve: (result: { data: Row[]; error: null }) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return builder;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-13T15:00:00Z"));
  const officer = {
    profile_id: "officer", display_name: "CAP AMADOR", duty_date: "2026-09-14",
    duty_function: "ODA", shift: "tarde", starts_at: "13:00:00", ends_at: "19:00:00",
  };
  const tables: Record<string, Row[]> = {
    schedule_assignments: [
      { id: "own", student_id: "a", duty_date: "2026-09-13", duty_function: "Dia ao 1º Ano · 1º turno", status: "published" },
      { id: "peer", student_id: "b", duty_date: "2026-09-13", duty_function: "Apoio 1 · 1º turno", status: "published" },
      { id: "cancelled", student_id: "b", duty_date: "2026-09-13", duty_function: "Apoio 2", status: "cancelled" },
    ],
    v_student_class_basic: [
      { id: "a", student_number: 13, war_name: "GIOVANNA" },
      { id: "b", student_number: 30, war_name: "JULIANA" },
    ],
    schedule_officer_assignments: [
      { ...officer, id: "old", schedule_documents: { publication_status: "published", processing_status: "superseded" } },
      { ...officer, id: "current", schedule_documents: { publication_status: "published", processing_status: "processed" } },
      { ...officer, id: "reserved", schedule_documents: { publication_status: "reserved", processing_status: "uploaded" } },
    ],
  };
  createClient.mockReturnValue({ from: (table: string) => query(tables[table] ?? []) });
});
afterEach(() => vi.useRealTimers());

describe("consulta compartilhada do painel", () => {
  it.each(["aluno", "coordenacao", "instrutor", "secretaria"])("mostra cadetes e oficiais para %s, sem versões superadas", async (role) => {
    session.mockResolvedValue({ role, userId: "viewer", studentId: role === "aluno" ? "a" : null, active: true, isFirstAccess: false });
    const result = await getDutyOverview();
    expect(result.unavailable).toBe(false);
    expect(result.firstGroup).toBe(role === "aluno" ? "cadet" : "officer");
    expect(result.entries.map((entry) => entry.id).sort()).toEqual(["current", "own", "peer"]);
    expect(result.entries.find((entry) => entry.id === "own")).toMatchObject({
      kind: "cadet", person: "GIOVANNA — 13", mine: role === "aluno", duty: "Dia ao 1º Ano · 1º turno",
    });
    expect(result.entries.find((entry) => entry.id === "peer")?.mine).toBe(false);
  });
});
