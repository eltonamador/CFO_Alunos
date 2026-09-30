import { describe, it, expect } from "vitest";
import { internshipPending } from "./pending";
import { rankRotationCandidates } from "./rotation";
import { permanenceInputSchema } from "./permanence";
const row = {
  assignment_id: "a",
  ends_at: "2026-09-26T19:45:00-03:00",
  shift_status: "publicado",
  assignment_status: "prevista",
  validation_status: null,
};
describe("etapas e pendências", () => {
  it("não cobra horas ou avaliação de serviço futuro", () =>
    expect(internshipPending(row, [], Date.parse("2026-09-23"))).toEqual([]));
  it("ao terminar abre avaliação e horas; revisão não homologa", () => {
    const now = Date.parse("2026-10-01");
    expect(internshipPending(row, [], now).map((t) => t.key)).toEqual(["solicitar", "homologar"]);
    expect(
      internshipPending(
        row,
        [{ assignment_id: "a", version: 1, status: "liberada", expires_at: null }],
        now,
      ).map((t) => t.key),
    ).toEqual(["homologar"]);
  });
  it("considera a última versão e ignora cancelamentos", () => {
    const evals = [
      { assignment_id: "a", version: 1, status: "respondida", expires_at: null },
      { assignment_id: "a", version: 2, status: "devolvida", expires_at: null },
    ];
    expect(
      internshipPending(
        { ...row, validation_status: "homologado" },
        evals,
        Date.parse("2026-10-01"),
      ).map((t) => t.key),
    ).toEqual(["corrigir"]);
    expect(
      internshipPending(
        { ...row, assignment_status: "cancelada" },
        evals,
        Date.parse("2026-10-01"),
      ),
    ).toEqual([]);
  });
  it("expiração não se confunde com falta de resposta", () =>
    expect(
      internshipPending(
        row,
        [{ assignment_id: "a", version: 1, status: "aguardando", expires_at: "2026-09-24" }],
        Date.parse("2026-09-25"),
      ).map((t) => t.key),
    ).toEqual(["renovar"]));
});
describe("rodízio conjunto", () => {
  const base = {
    cadets: [
      { id: "a", war_name: "A", student_number: 1 },
      { id: "b", war_name: "B", student_number: 2 },
    ],
    assignments: [],
    commitments: [],
    startsAt: "2026-10-10T07:45:00-03:00",
    endsAt: "2026-10-10T19:45:00-03:00",
    timezone: "America/Belem",
    blocked: {},
  };
  it("permanência altera a prioridade sem virar hora de estágio", () => {
    const result = rankRotationCandidates({
      ...base,
      duties: [
        {
          studentId: "a",
          date: "2026-10-01",
          startsAt: "2026-10-01T08:00:00-03:00",
          endsAt: "2026-10-02T08:00:00-03:00",
        },
      ],
    });
    expect(result[0]?.id).toBe("b");
    const a = result.find((c) => c.id === "a")!;
    expect(a.permanenceMinutes).toBe(1440);
    expect(a.committedMinutes).toBe(0);
    expect(a.approvedMinutes).toBe(0);
    expect(a.serviceDays).toBe(2);
  });
  it("preserva dias antigos sem inventar horas", () => {
    const a = rankRotationCandidates({
      ...base,
      duties: [{ studentId: "a", date: "2026-10-01", startsAt: null, endsAt: null }],
    }).find((c) => c.id === "a")!;
    expect(a.unknownDutyDays).toBe(1);
    expect(a.permanenceMinutes).toBe(0);
    expect(a.serviceDays).toBe(1);
  });
  it("inclui o descanso da permanência e recusa sobreposição", () => {
    const a = rankRotationCandidates({
      ...base,
      duties: [
        { studentId: "a", date: "2026-10-10", startsAt: base.startsAt, endsAt: base.endsAt },
      ],
    }).find((c) => c.id === "a")!;
    expect(a.reasons).toContain("Serviço no mesmo horário");
  });
});
it("aceita um a quatro apoios diferentes e exige motivo para alteração", () => {
  const id = "11111111-1111-4111-8111-111111111111",
    id2 = "22222222-2222-4222-8222-222222222222",
    id3 = "33333333-3333-4333-8333-333333333333";
  const base = {
    programId: id,
    startsAt: "2026-10-01T08:00:00-03:00",
    endsAt: "2026-10-01T20:00:00-03:00",
    location: "ABM",
    uniformCode: "3A",
    students: [id, id2],
  };
  expect(permanenceInputSchema.safeParse(base).success).toBe(true);
  expect(permanenceInputSchema.safeParse({ ...base, students: [id, id] }).success).toBe(false);
  expect(permanenceInputSchema.safeParse({ ...base, students: [id] }).success).toBe(false);
  expect(permanenceInputSchema.safeParse({ ...base, students: [id, id2, id3] }).success).toBe(true);
  expect(
    permanenceInputSchema.safeParse({
      ...base,
      students: [
        id,
        id2,
        id3,
        "44444444-4444-4444-8444-444444444444",
        "55555555-5555-4555-8555-555555555555",
        "66666666-6666-4666-8666-666666666666",
      ],
    }).success,
  ).toBe(false);
  expect(permanenceInputSchema.safeParse({ ...base, rosterId: id }).success).toBe(false);
});
