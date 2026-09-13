import { describe, expect, it } from "vitest";
import { normalizeScheduleText, parseScheduleText } from "./parser";

const cadets = [
  { id: "a", studentNumber: 1, fullName: "João da Silva", warName: "SILVA" },
  { id: "b", studentNumber: 2, fullName: "Maria de Souza", warName: "SOUZA" },
];

describe("parser conservador de escalas", () => {
  it("normaliza acentos sem perder os números", () => {
    expect(normalizeScheduleText("  João nº 02  ")).toBe("JOAO N 02");
  });

  it("confirma automaticamente apenas nome único com data e função", () => {
    const result = parseScheduleText("10/09/2026\nCadete SILVA", cadets, {
      referenceYear: 2026,
      defaultDutyFunction: "Aluno de Dia",
    });
    expect(result.status).toBe("succeeded");
    expect(result.candidates[0]).toMatchObject({
      duty_date: "2026-09-10",
      match_status: "auto_confirmed",
      matched_student_id: "a",
    });
  });

  it("encaminha para revisão quando falta data", () => {
    const result = parseScheduleText("Cadete SOUZA", cadets, {
      referenceYear: 2026,
      defaultDutyFunction: "Aluno de Dia",
    });
    expect(result.status).toBe("partial");
    expect(result.candidates[0]).toMatchObject({
      match_status: "needs_review",
      matched_student_id: null,
    });
  });

  it("ignora linhas sem identidade conhecida", () => {
    const result = parseScheduleText("10/09/2026\nCABO DESCONHECIDO", cadets, {
      referenceYear: 2026,
      defaultDutyFunction: "Aluno de Dia",
    });
    expect(result.candidates).toHaveLength(0);
    expect(result.metrics.ignoredLineCount).toBe(2);
  });

  it("não publica um oficial com o mesmo nome de guerra de um cadete", () => {
    const result = parseScheduleText("10/09/2026 CAP SILVA", cadets, {
      referenceYear: 2026,
      defaultDutyFunction: "Oficial de Dia",
    });
    expect(result.candidates[0]).toMatchObject({
      match_status: "needs_review",
      matched_student_id: null,
    });
  });
});
