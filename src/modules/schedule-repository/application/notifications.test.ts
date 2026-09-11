import { describe, expect, it } from "vitest";
import { scheduleNotificationContent } from "./notifications";

describe("conteúdo das notificações de escala", () => {
  it("informa função e data de uma nova atribuição", () => {
    const content = scheduleNotificationContent({
      eventType: "assignment_published",
      eventId: "event-1",
      dutyDate: "2026-09-10",
      dutyFunction: "Aluno de Dia",
      scheduleTypeName: "Escala de Aluno de Dia",
    });
    expect(content.title).toBe("Nova escala");
    expect(content.body).toContain("10/09/2026");
    expect(content.body).toContain("Aluno de Dia");
    expect(content.url).toBe("/aluno/escalas");
  });

  it("não repete uma atribuição removida ao destinatário incorreto", () => {
    const content = scheduleNotificationContent({
      eventType: "wrong_recipient_correction",
      eventId: "event-2",
      dutyDate: "2026-09-11",
      dutyFunction: null,
      scheduleTypeName: "Escala de Serviço",
    });
    expect(content.title).toBe("Correção de escala");
    expect(content.body).toContain("foi corrigida");
  });
});
