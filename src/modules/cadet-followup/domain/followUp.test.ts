import { describe, expect, it } from "vitest";
import {
  deadlineFrom,
  initialStatus,
  normalizeLabel,
  rankSuggestions,
  remainingTime,
  requiresManifestation,
} from "./followUp";

describe("requiresManifestation", () => {
  it("abre prazo apenas para FO−", () => {
    expect(requiresManifestation("fo_negativo")).toBe(true);
    expect(requiresManifestation("fo_positivo")).toBe(false);
    expect(requiresManifestation("saude")).toBe(false);
  });

  it("define o status inicial conforme o tipo", () => {
    expect(initialStatus("fo_negativo")).toBe("aguardando_manifestacao");
    expect(initialStatus("missao")).toBe("registrado");
  });
});

describe("prazo de 24 horas", () => {
  const start = new Date("2026-09-08T08:00:00.000Z");

  it("soma 24 horas ao registro", () => {
    expect(deadlineFrom(start).toISOString()).toBe("2026-09-09T08:00:00.000Z");
  });

  it("formata horas e minutos restantes", () => {
    const now = new Date("2026-09-08T13:28:00.000Z");
    const result = remainingTime(deadlineFrom(start), now);
    expect(result.expired).toBe(false);
    expect(result.label).toBe("18h32 restantes");
  });

  it("mostra apenas minutos na última hora", () => {
    const now = new Date("2026-09-09T07:15:00.000Z");
    expect(remainingTime(deadlineFrom(start), now).label).toBe("45 min restantes");
  });

  it("marca prazo encerrado", () => {
    const now = new Date("2026-09-09T08:00:01.000Z");
    const result = remainingTime(deadlineFrom(start), now);
    expect(result.expired).toBe(true);
    expect(result.label).toContain("Prazo encerrado");
  });
});

describe("normalizeLabel", () => {
  it("ignora acento, caixa, pontuação e espaço extra", () => {
    expect(normalizeLabel("  Coturno   SUJO. ")).toBe("coturno sujo");
    expect(normalizeLabel("Atenção à formatura!")).toBe("atencao a formatura");
  });

  it("gera a mesma chave para escritas equivalentes", () => {
    expect(normalizeLabel("Uniforme fora do padrão")).toBe(
      normalizeLabel("uniforme  fora do padrao"),
    );
  });

  it("mantém motivos legitimamente diferentes separados", () => {
    expect(normalizeLabel("Coturno sujo")).not.toBe(normalizeLabel("Coturno fora do padrão"));
  });
});

describe("rankSuggestions", () => {
  const suggestions = [
    { id: "1", label: "Coturno sujo", usageCount: 12, lastUsedAt: null },
    { id: "2", label: "Coturno fora do padrão", usageCount: 3, lastUsedAt: null },
    { id: "3", label: "Sem manutenção no coturno", usageCount: 30, lastUsedAt: null },
    { id: "4", label: "Falar em forma", usageCount: 7, lastUsedAt: null },
  ];

  it("prioriza quem começa com o termo digitado", () => {
    const result = rankSuggestions(suggestions, "cot");
    expect(result.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("desempata pelo uso quando a posição é a mesma", () => {
    const result = rankSuggestions(suggestions, "coturno");
    expect(result[0]?.id).toBe("1");
    expect(result[1]?.id).toBe("2");
  });

  it("sem termo, devolve os mais usados", () => {
    expect(rankSuggestions(suggestions, "")[0]?.id).toBe("3");
  });

  it("ignora acento na busca", () => {
    expect(rankSuggestions(suggestions, "padrao").map((i) => i.id)).toEqual(["2"]);
  });
});
