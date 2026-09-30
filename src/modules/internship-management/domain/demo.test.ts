import { describe, expect, it } from "vitest";
import { applyDemo, createDemo, demoPhase, demoTotals } from "./demo";
import type { EvaluationBody } from "./evaluationValidation";
const body: EvaluationBody = {
  evaluatorName: "Cap. Fictício",
  evaluatorUnit: "GBM teste",
  serviceCode: "geral",
  confirmed: true,
  incident: false,
  incidentNote: "",
  guidance: "",
  ratings: {
    pontualidade: "esperado",
    seguranca: "nao_observado",
    tecnica: "esperado",
    equipe: "esperado",
    postura: "esperado",
    aprendizagem: "esperado",
  },
};
describe("Demonstração isolada do estágio", () => {
  it("mantém passado, presente e futuro mesmo antes das 07h45 de Belém", () => {
    for (const now of ["2026-09-24T03:01:00Z", "2026-09-24T15:00:00Z"]) {
      const s = createDemo(now);
      expect(s.shifts.map((x) => demoPhase(x, s.clock))).toEqual([
        "Encerrado",
        "Em andamento",
        "Agendado",
      ]);
      expect(demoTotals(s)).toMatchObject({
        plannedMinutes: 2880,
        performedMinutes: 0,
        validatedMinutes: 0,
        missingRequiredMinutes: 15000,
      });
    }
  });
  it("bloqueia avaliação e homologação antecipadas e preserva as horas após avaliar", () => {
    let s = createDemo("2026-09-24T15:00:00Z");
    for (const id of ["presente", "futuro"] as const) {
      expect(() => applyDemo(s, { type: "evaluate", id, body })).toThrow();
      expect(() => applyDemo(s, { type: "homologate", id, approved: 720, reason: "" })).toThrow();
    }
    s = applyDemo(s, { type: "evaluate", id: "passado", body });
    expect(s.shifts[0]!.evaluation?.released).toBe(false);
    s = applyDemo(s, { type: "release", id: "passado" });
    expect(demoTotals(s).validatedMinutes).toBe(0);
    expect(() => applyDemo(s, { type: "evaluate", id: "passado", body })).toThrow();
  });
  it("não duplica homologação e termina com 48 horas e saldo de 202", () => {
    let s = createDemo("2026-09-24T15:00:00Z");
    s = applyDemo(s, { type: "homologate", id: "passado", approved: 720, reason: "" });
    expect(demoTotals(s).validatedMinutes).toBe(720);
    expect(() =>
      applyDemo(s, { type: "homologate", id: "passado", approved: 720, reason: "" }),
    ).toThrow();
    s = applyDemo(s, { type: "advance", id: "presente", to: "end" });
    s = applyDemo(s, { type: "homologate", id: "presente", approved: 1440, reason: "" });
    expect(demoTotals(s).validatedMinutes).toBe(2160);
    s = applyDemo(s, { type: "advance", id: "futuro", to: "start" });
    s = applyDemo(s, { type: "point", id: "futuro", kind: "entry" });
    expect(() => applyDemo(s, { type: "point", id: "futuro", kind: "exit" })).toThrow();
    s = applyDemo(s, { type: "advance", id: "futuro", to: "end" });
    s = applyDemo(s, { type: "point", id: "futuro", kind: "exit" });
    expect(demoTotals(s).validatedMinutes).toBe(2160);
    s = applyDemo(s, { type: "homologate", id: "futuro", approved: 720, reason: "" });
    expect(demoTotals(s)).toMatchObject({
      plannedMinutes: 2880,
      performedMinutes: 2880,
      validatedMinutes: 2880,
      missingRequiredMinutes: 12120,
    });
  });
  it("usa a mesma exigência de orientação para reforço do formulário oficial", () => {
    const s = createDemo("2026-09-24T15:00:00Z");
    expect(() =>
      applyDemo(s, {
        type: "evaluate",
        id: "passado",
        body: { ...body, ratings: { ...body.ratings, tecnica: "reforco" } },
      }),
    ).toThrow();
    expect(() =>
      applyDemo(s, { type: "homologate", id: "passado", approved: 600, reason: "" }),
    ).toThrow();
  });
});
