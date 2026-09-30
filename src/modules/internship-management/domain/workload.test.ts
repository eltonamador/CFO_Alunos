import { describe, expect, it } from "vitest";
import {
  completion,
  formatMinutes,
  minutesBetween,
  sumWorkload,
  validateApproval,
} from "./workload";

describe("carga do estágio", () => {
  it.each([
    ["2026-09-26T08:00:00-03:00", "2026-09-26T16:00:00-03:00", 480],
    ["2026-09-26T08:00:00-03:00", "2026-09-26T20:00:00-03:00", 720],
    ["2026-09-26T08:00:00-03:00", "2026-09-27T08:00:00-03:00", 1440],
  ])("calcula minutos operacionais com virada de dia", (start, end, expected) => {
    expect(minutesBetween(start, end)).toBe(expected);
  });

  it("rejeita horários sem fuso ou frações de minuto", () => {
    expect(() => minutesBetween("2026-09-26T08:00", "2026-09-26T20:00")).toThrow();
    expect(() =>
      minutesBetween("2026-09-26T08:00:00-03:00", "2026-09-26T08:00:30-03:00"),
    ).toThrow();
  });

  it("mantém a carga realizada separada da homologada em saída antecipada", () => {
    const record = {
      actualStartsAt: "2026-09-26T08:00:00-03:00",
      actualEndsAt: "2026-09-26T17:00:00-03:00",
      approvedMinutes: 720,
      supervisorName: "Oficial responsável",
      paperReference: "Ficha 001",
    };
    expect(() => validateApproval(record)).toThrow("Justifique");
    expect(
      validateApproval({ ...record, decisionReason: "Saída autorizada pela Coordenação" }),
    ).toBe(540);
    expect(
      sumWorkload([{ plannedMinutes: 720, performedMinutes: 540, validatedMinutes: 720 }]),
    ).toEqual({
      plannedMinutes: 720,
      performedMinutes: 540,
      validatedMinutes: 720,
    });
  });

  it("só conclui com 250 horas validadas e preserva o excedente até 252", () => {
    expect(completion(14_999, 15_000, 15_120).concluded).toBe(false);
    expect(completion(15_120, 15_000, 15_120)).toEqual({
      concluded: true,
      missingRequiredMinutes: 0,
      missingTargetMinutes: 0,
      excessMinutes: 120,
    });
    expect(formatMinutes(15_120)).toBe("252 h 00 min");
  });
});
