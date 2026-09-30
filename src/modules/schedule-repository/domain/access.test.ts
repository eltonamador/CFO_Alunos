import { describe, expect, it } from "vitest";
import { canPublishSchedules, isSchedulePublishingPath } from "./access";

describe("delegação para publicar escalas", () => {
  it("aceita coordenação ativa e aluno explicitamente delegado", () => {
    expect(canPublishSchedules({ role: "coordenacao", active: true })).toBe(true);
    expect(canPublishSchedules({ role: "aluno", active: true, canPublishSchedules: true })).toBe(true);
  });

  it("nega aluno comum, conta inativa e permissões fora do repositório", () => {
    expect(canPublishSchedules({ role: "aluno", active: true })).toBe(false);
    expect(canPublishSchedules({ role: "aluno", active: false, canPublishSchedules: true })).toBe(false);
    expect(isSchedulePublishingPath("/coordenacao/escalas/tipos")).toBe(true);
    expect(isSchedulePublishingPath("/coordenacao/operacional/escala")).toBe(false);
    expect(isSchedulePublishingPath("/coordenacao/escalas-extra")).toBe(false);
  });
});
