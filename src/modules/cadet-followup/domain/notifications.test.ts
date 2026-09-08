import { describe, expect, it } from "vitest";
import {
  buildFollowUpNotification,
  selectDeadlineReminders,
  type NotifiableRecord,
} from "./notifications";

const NOW = new Date("2026-09-08T12:00:00.000Z");

function record(overrides: Partial<NotifiableRecord> = {}): NotifiableRecord {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    studentId: "s1",
    reasonText: "Coturno sujo",
    status: "aguardando_manifestacao",
    deadlineAt: "2026-09-09T12:00:00.000Z",
    ...overrides,
  };
}

describe("buildFollowUpNotification", () => {
  it("no registro, anuncia o prazo de 24 horas", () => {
    const content = buildFollowUpNotification(record(), "registrado", NOW);
    expect(content.title).toBe("FO− registrado");
    expect(content.body).toContain("Coturno sujo");
    expect(content.body).toContain("24 horas");
  });

  it("no lembrete, mostra o tempo que resta", () => {
    const content = buildFollowUpNotification(
      record({ deadlineAt: "2026-09-08T16:30:00.000Z" }),
      "prazo_proximo",
      NOW,
    );
    expect(content.title).toBe("Prazo de manifestação acabando");
    expect(content.body).toContain("4h30 restantes");
  });

  it("aponta para o registro do próprio cadete", () => {
    const content = buildFollowUpNotification(record(), "registrado", NOW);
    expect(content.url).toBe("/aluno/acompanhamento/11111111-1111-1111-1111-111111111111");
  });

  it("usa tag distinta por aviso, para não sobrescrever no aparelho", () => {
    const a = buildFollowUpNotification(record(), "registrado", NOW);
    const b = buildFollowUpNotification(record(), "prazo_proximo", NOW);
    expect(a.tag).not.toBe(b.tag);
  });
});

describe("selectDeadlineReminders", () => {
  it("seleciona quem está na janela final", () => {
    const dentro = record({ id: "a", deadlineAt: "2026-09-08T15:00:00.000Z" });
    const longe = record({ id: "b", deadlineAt: "2026-09-09T11:00:00.000Z" });
    const result = selectDeadlineReminders([dentro, longe], NOW);
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  it("ignora prazo já vencido — o aviso não serviria de nada", () => {
    const vencido = record({ deadlineAt: "2026-09-08T11:00:00.000Z" });
    expect(selectDeadlineReminders([vencido], NOW)).toHaveLength(0);
  });

  it("ignora quem já se manifestou ou teve decisão", () => {
    const respondido = record({
      status: "aguardando_analise",
      deadlineAt: "2026-09-08T15:00:00.000Z",
    });
    expect(selectDeadlineReminders([respondido], NOW)).toHaveLength(0);
  });

  it("ignora registro sem prazo", () => {
    expect(selectDeadlineReminders([record({ deadlineAt: null })], NOW)).toHaveLength(0);
  });

  it("respeita a janela configurada", () => {
    const em20h = record({ deadlineAt: "2026-09-09T08:00:00.000Z" });
    expect(selectDeadlineReminders([em20h], NOW)).toHaveLength(0);
    expect(selectDeadlineReminders([em20h], NOW, 24)).toHaveLength(1);
  });

  it("na janela padrão de 12 h, alcança um FO− aberto há mais de meio dia", () => {
    const em8h = record({ deadlineAt: "2026-09-08T20:00:00.000Z" });
    expect(selectDeadlineReminders([em8h], NOW)).toHaveLength(1);
  });
});
