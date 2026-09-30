import { beforeEach, expect, it, vi } from "vitest";
import { suggestInternshipRotation } from "./rotationActions";
import { getSession } from "@/modules/identity/presentation/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
vi.mock("@/modules/identity/presentation/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
const input = {
  programId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  shiftDate: "2026-10-10",
  templateCode: "GUARDA-VIDA",
};
beforeEach(() => vi.clearAllMocks());
it.each([
  null,
  { active: false, role: "coordenacao" },
  { active: true, role: "aluno" },
  { active: true, role: "secretaria" },
])("restringe sugestões à Coordenação ativa: %j", async (session) => {
  vi.mocked(getSession).mockResolvedValue(session as Awaited<ReturnType<typeof getSession>>);
  expect(await suggestInternshipRotation(input)).toEqual({
    error: "Acesso restrito à administração do estágio.",
  });
  expect(createSupabaseServerClient).not.toHaveBeenCalled();
});
it("rejeita entrada inválida antes de consultar o histórico", async () => {
  vi.mocked(getSession).mockResolvedValue({ active: true, role: "coordenacao" } as Awaited<
    ReturnType<typeof getSession>
  >);
  expect(await suggestInternshipRotation({ ...input, shiftDate: "data inválida" })).toHaveProperty(
    "error",
  );
  expect(createSupabaseServerClient).not.toHaveBeenCalled();
});
it("combina homologações, reserva futura e impedimentos vindos das consultas protegidas", async () => {
  vi.mocked(getSession).mockResolvedValue({ active: true, role: "coordenacao" } as Awaited<
    ReturnType<typeof getSession>
  >);
  const records: Record<string, unknown[]> = {
    students: [1, 2, 3, 4].map((n) => ({
      id: String(n),
      war_name: `Cadete ${n}`,
      student_number: n,
    })),
    internship_assignments: [],
    duty_assignments: [{ id: "duty", student_id: "1" }],
    duty_impediments: [{ id: "impediment", student_id: "2" }],
    internship_student_blackouts: [
      {
        id: "blackout",
        student_id: "3",
        starts_on: "2026-10-01",
        ends_on: "2026-10-30",
        blocked_weekdays: [6],
      },
    ],
    internship_instruction_blocks: [],
    internship_lifeguard_windows: [],
  };
  const chain = (data: unknown) => {
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "in", "gte", "lte", "order"])
      query[method] = vi.fn(() => query);
    query.single = vi.fn(async () => ({ data, error: null }));
    query.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    query.range = vi.fn(async () => ({ data, error: null }));
    return query;
  };
  vi.mocked(createSupabaseServerClient).mockReturnValue({
    from: vi.fn((table: string) =>
      chain(
        table === "internship_programs"
          ? {
              id: input.programId,
              class_id: "class",
              starts_on: "2026-09-26",
              ends_on: "2026-12-13",
              timezone: "America/Belem",
              abm_buffer_days: 1,
              status: "publicado",
            }
          : records[table],
      ),
    ),
    rpc: vi.fn((name: string) => {
      if(name === "permanence_planning_context") return Promise.resolve({data:[],error:null});
      if (name === "internship_planning_cadets") return chain(records.students);
      if (name === "internship_planning_constraints") return chain([{id:"duty",student_id:"1",kind:"abm",starts_on:"2026-10-10",ends_on:"2026-10-10"},{id:"impediment",student_id:"2",kind:"impedimento",starts_on:"2026-10-10",ends_on:"2026-10-10"}]);
      return chain([
        {
          assignment_id: "first",
          student_id: "4",
          starts_at: "2026-10-01T10:00:00-03:00",
          ends_at: "2026-10-01T18:00:00-03:00",
          planned_minutes: 480,
          approved_minutes: 120,
          validation_status: "homologado",
          assignment_status: "prevista",
          shift_status: "publicado",
        },
        {
          assignment_id: "second",
          student_id: "4",
          starts_at: "2026-11-01T10:00:00-03:00",
          ends_at: "2026-11-01T18:00:00-03:00",
          planned_minutes: 480,
          approved_minutes: null,
          validation_status: null,
          assignment_status: "prevista",
          shift_status: "publicado",
        },
      ]);
    }),
  } as unknown as ReturnType<typeof createSupabaseServerClient>);
  const result = await suggestInternshipRotation(input);
  expect(result.error).toBeUndefined();
  expect(result.candidates?.[0]).toMatchObject({
    id: "4",
    approvedMinutes: 120,
    reservedMinutes: 480,
    committedMinutes: 600,
    projectedMinutes: 1080,
    reasons: [],
  });
  expect(result.candidates?.slice(1).every((row) => row.reasons.length === 1)).toBe(true);
});
