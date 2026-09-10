import { describe, expect, it } from "vitest";
import { designationReferenceFor, PORTARIA_550_CFO1_DESIGNATIONS } from "./designations";

describe("Portaria 550 do CFO I 2026", () => {
  it("preserva as 24 linhas formalmente designadas", () => {
    expect(PORTARIA_550_CFO1_DESIGNATIONS).toHaveLength(24);
    expect(new Set(PORTARIA_550_CFO1_DESIGNATIONS.map((item) => item.disciplineCode)).size).toBe(
      24,
    );
  });

  it("adota 38 h/a para Legislação Bombeiro Militar em 2026", () => {
    expect(designationReferenceFor("CFO1-09", 2026)?.workloadHours).toBe(38);
    expect(designationReferenceFor("CFO1-09", 2025)).toBeUndefined();
  });

  it("mapeia o código 26 da Portaria para o Estágio do catálogo", () => {
    expect(designationReferenceFor("CFO1-25", 2026)).toMatchObject({
      sourceCode: "26",
      disciplineName: "ESTÁGIO SUPERVISIONADO",
      workloadHours: 250,
    });
  });

  it("não inventa designações ausentes no ato", () => {
    expect(designationReferenceFor("CFO1-03", 2026)).toBeUndefined();
    expect(designationReferenceFor("CFO1-26", 2026)).toBeUndefined();
  });
});
