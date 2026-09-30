import { describe, expect, it, vi } from "vitest";
import {
  formatInternshipScaleNumber,
  loadOperationalInternshipScale,
} from "./internship-operational-scale";
import { loadInternshipReportData } from "./internship-report-data";
vi.mock("./internship-report-data", () => ({ loadInternshipReportData: vi.fn() }));
const shift = {
  shift_id: "shift-1",
  assignment_id: "assignment-1",
  student_id: "student-1",
  student_number: 2,
  war_name: "IAN LIMA",
  activity_code: "ar",
  activity_name: "AR — Autorresgate",
  site_name: "1º GBM",
  resource_name: "AR",
  shift_date: "2026-09-26",
  starts_at: "2026-09-26T10:45:00Z",
  ends_at: "2026-09-27T10:45:00Z",
  shift_status: "publicado",
  assignment_status: "prevista",
};
describe("escala operacional", () => {
  it("imprime somente participações vigentes e usa a carga homologada acumulada", async () => {
    vi.mocked(loadInternshipReportData).mockResolvedValue({
      program: {
        id: "program",
        name: "CFO 2026.1",
        starts_on: "2026-09-26",
        ends_on: "2026-12-13",
        required_minutes: 15000,
        target_minutes: 15120,
      },
      workload: [{ student_id: "student-1", validated_minutes: 960 } as never],
      schedule: [
        shift,
        { ...shift, shift_id: "old", assignment_status: "substituida" },
        { ...shift, shift_id: "outside", shift_date: "2026-10-10" },
      ] as never,
    });
    const supabase = {
      from: () => ({
        select: () => ({
          in: async () => ({ data: [{ shift_id: "shift-1", uniform_code: "2C" }], error: null }),
        }),
      }),
    };
    const scale = await loadOperationalInternshipScale(
      supabase as never,
      "2026-09-26",
      "2026-09-27",
    );
    expect(scale.rows).toHaveLength(1);
    expect(scale.rows[0]).toMatchObject({
      shiftId: "shift-1",
      uniformCode: "2C",
      validatedMinutes: 960,
      endsAt: "2026-09-27T10:45:00Z",
    });
  });
});

it("exporta as três escalas e filtra praia e permanência sem incluir cancelamentos", async () => {
  vi.mocked(loadInternshipReportData).mockResolvedValue({
    program: {
      id: "program",
      name: "CFO",
      starts_on: "2026-09-26",
      ends_on: "2026-12-13",
      required_minutes: 15000,
      target_minutes: 15120,
    },
    workload: [
      { student_id: "11111111-1111-4111-8111-111111111111", validated_minutes: 720 } as never,
    ],
    schedule: [
      shift,
      { ...shift, shift_id: "beach", activity_code: "guarda_vida", activity_name: "Guarda-vidas" },
    ] as never,
  });
  const duty = {
    id: "11111111-1111-4111-8111-111111111111",
    rosterId: "22222222-2222-4222-8222-222222222222",
    studentId: "11111111-1111-4111-8111-111111111111",
    date: "2026-09-26",
    startsAt: "2026-09-26T09:00:00Z",
    endsAt: "2026-09-26T21:00:00Z",
    location: "ABM",
    uniformCode: "3A",
    role: "Aluno de Dia",
    status: "confirmada",
    editable: true,
    studentNumber: 17,
    warName: "SALES",
  };
  const db = {
    from: () => ({ select: () => ({ in: async () => ({ data: [], error: null }) }) }),
    rpc: vi.fn(async () => ({
      data: [duty, { ...duty, status: "cancelada" }, { ...duty, date: "2026-10-02" }],
      error: null,
    })),
  };
  const all = await loadOperationalInternshipScale(
    db as never,
    "2026-09-26",
    "2026-09-27",
    "todos",
  );
  expect(all.rows).toHaveLength(3);
  expect(all.rows.find((r) => r.activityName === "Dia ao 1º Ano")).toMatchObject({
    resourceName: "Aluno de Dia",
    validatedMinutes: 720,
    siteName: "ABM",
  });
  const beach = await loadOperationalInternshipScale(
    db as never,
    "2026-09-26",
    "2026-09-27",
    "praia",
  );
  expect(beach.rows.map((r) => r.shiftId)).toEqual(["beach"]);
  const permanence = await loadOperationalInternshipScale(
    db as never,
    "2026-09-26",
    "2026-09-27",
    "permanencia",
  );
  expect(permanence.rows).toHaveLength(1);
});

it("separa a escala por GBM e não inclui cadetes das outras unidades", async () => {
  vi.mocked(loadInternshipReportData).mockResolvedValue({
    program: {
      id: "program",
      name: "CFO",
      starts_on: "2026-09-26",
      ends_on: "2026-12-13",
      required_minutes: 15000,
      target_minutes: 15120,
    },
    workload: [],
    schedule: [
      shift,
      { ...shift, shift_id: "shift-2", student_id: "student-2", site_name: "2º GBM" },
      {
        ...shift,
        shift_id: "shift-3",
        student_id: "student-3",
        site_name: "1º GBM",
        activity_code: "guarda_vida",
      },
    ] as never,
  });
  const db = {
    from: (table: string) =>
      table === "internship_sites"
        ? {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: { name: "1º GBM" }, error: null }),
                  }),
                }),
              }),
            }),
          }
        : { select: () => ({ in: async () => ({ data: [], error: null }) }) },
  };
  const scale = await loadOperationalInternshipScale(
    db as never,
    "2026-09-26",
    "2026-09-27",
    "gbm",
    "site-1",
  );
  expect(scale.gbmName).toBe("1º GBM");
  expect(scale.rows.map((row) => row.shiftId)).toEqual(["shift-1"]);
});

it("formata um sequencial simples seguido da data inicial", () => {
  expect(formatInternshipScaleNumber(1, "2026-09-26")).toBe("01-26092026");
  expect(formatInternshipScaleNumber(12, "2026-09-27")).toBe("12-27092026");
  expect(formatInternshipScaleNumber(1000, "2026-09-27")).toBe("1000-27092026");
  expect(() => formatInternshipScaleNumber(0, "2026-09-26")).toThrow();
});
