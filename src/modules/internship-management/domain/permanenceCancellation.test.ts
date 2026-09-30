import { expect, it } from "vitest";
import {
  cancellationPeriodSchema,
  nextWeekend,
  previewCancellation,
} from "./permanenceCancellation";
import type { PermanenceRow } from "./permanence";
const row: PermanenceRow = {
  id: "a",
  rosterId: "r",
  studentId: "s",
  date: "2026-09-26",
  startsAt: "2026-09-26T18:00:00-03:00",
  endsAt: "2026-09-27T06:00:00-03:00",
  location: "ABM",
  uniformCode: "3A",
  role: "Aluno de Dia",
  status: "confirmada",
  editable: true,
  studentNumber: 17,
  warName: "Sales",
};
it("conta o mesmo Aluno de Dia uma vez em dois turnos e usa o início local do serviço", () => {
  const preview = previewCancellation(
    [row, { ...row, id: "b", rosterId: "r2", startsAt: "2026-09-26T06:00:00-03:00" }],
    "2026-09-26",
    "2026-09-26",
    Date.parse("2026-09-25T12:00:00Z"),
  );
  expect(preview.cadetCount).toBe(1);
  expect(preview.rosterIds).toHaveLength(2);
  expect(preview.assignmentIds).toHaveLength(2);
});
it("exclui serviços iniciados, cancelados e não editáveis", () => {
  const preview = previewCancellation(
    [
      row,
      { ...row, id: "b", status: "cancelada" },
      { ...row, id: "c", editable: false },
      { ...row, id: "d", startsAt: "2026-09-25T18:00:00-03:00" },
    ],
    "2026-09-25",
    "2026-09-27",
    Date.parse("2026-09-26T10:00:00Z"),
  );
  expect(preview.assignmentIds).toEqual(["a"]);
});
it("valida datas de calendário e limita período a 31 dias", () => {
  const p = {
    programId: "11111111-1111-4111-8111-111111111111",
    start: "2026-09-26",
    end: "2026-09-27",
  };
  expect(cancellationPeriodSchema.safeParse(p).success).toBe(true);
  for (const v of [
    { start: "2026-02-30" },
    { end: "2026-09-25" },
    { end: "2026-11-01" },
    { start: "" },
  ])
    expect(cancellationPeriodSchema.safeParse({ ...p, ...v }).success).toBe(false);
});
it("abre o próximo fim de semana e preserva domingo em curso", () => {
  expect(nextWeekend("2026-09-25")).toEqual({ start: "2026-09-26", end: "2026-09-27" });
  expect(nextWeekend("2026-09-27")).toEqual({ start: "2026-09-27", end: "2026-09-27" });
});
