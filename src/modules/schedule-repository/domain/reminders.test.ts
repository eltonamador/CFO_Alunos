import { describe, expect, it } from "vitest";
import { reminderContent, reminderWindow } from "./reminders";

describe("lembretes no horário de Macapá", () => {
  it("avisa sobre amanhã na virada do mês e aceita o atraso do cron", () => {
    expect(reminderWindow("evening", new Date("2026-09-30T21:59:00Z"))).toEqual({
      date: "2026-10-01",
      label: "amanhã",
    });
  });
  it("não envia lembrete atrasado ou por execução manual fora da janela", () => {
    expect(reminderWindow("evening", new Date("2026-10-01T03:00:00Z"))).toBeNull();
    expect(reminderWindow("morning", new Date("2026-10-01T10:00:00Z"))).toBeNull();
  });
  it("o lembrete matinal usa o próprio dia", () => {
    expect(reminderWindow("morning", new Date("2026-10-01T09:15:00Z"))).toEqual({
      date: "2026-10-01",
      label: "hoje",
    });
  });
  it("resume todos os turnos sem repetir a mesma função", () => {
    const content = reminderContent("2026-09-14", "evening", [
      "ODA · Manhã",
      "ODA · Tarde",
      "ODA · Manhã",
    ]);
    expect(content.title).toBe("Você está de serviço amanhã");
    expect(content.body).toContain("14/09/2026: ODA · Manhã; ODA · Tarde.");
    expect(content.url).toBe("/escalas/calendario?filtro=minhas");
  });
});
