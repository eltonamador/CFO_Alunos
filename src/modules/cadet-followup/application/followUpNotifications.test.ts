import { describe, expect, it, vi } from "vitest";
import {
  dispatchFollowUpNotifications,
  type FollowUpNotificationDependencies,
  type RecipientTargets,
} from "./followUpNotifications";
import type { NotifiableRecord } from "../domain/notifications";

const NOW = new Date("2026-09-08T12:00:00.000Z");

function record(overrides: Partial<NotifiableRecord> = {}): NotifiableRecord {
  return {
    id: "rec-1",
    studentId: "aluno-1",
    reasonText: "Coturno sujo",
    status: "aguardando_manifestacao",
    deadlineAt: "2026-09-09T12:00:00.000Z",
    ...overrides,
  };
}

function pushTarget(id = "sub-1", endpoint = "https://push.example/1") {
  return { id, endpoint, p256dh: "p", auth: "a" };
}

function deps(
  overrides: Partial<FollowUpNotificationDependencies> = {},
  recipient: RecipientTargets = { push: [pushTarget()], email: "cadete@exemplo.br" },
): FollowUpNotificationDependencies {
  let seq = 0;
  return {
    loadRecipient: vi.fn(async () => recipient),
    reserve: vi.fn(async () => `entrega-${++seq}`),
    markSent: vi.fn(async () => {}),
    markFailed: vi.fn(async () => {}),
    sendPush: vi.fn(async () => ({ ok: true })),
    sendEmail: vi.fn(async () => ({ ok: true })),
    disablePush: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("dispatchFollowUpNotifications", () => {
  it("envia pelos dois canais quando o cadete tem push e e-mail", async () => {
    const d = deps();
    const summary = await dispatchFollowUpNotifications([record()], "registrado", d, NOW);

    expect(summary.push.sent).toBe(1);
    expect(summary.email.sent).toBe(1);
    expect(d.markSent).toHaveBeenCalledTimes(2);
  });

  it("leva o motivo e o link do registro no conteúdo", async () => {
    const d = deps();
    await dispatchFollowUpNotifications([record()], "registrado", d, NOW);

    const content = (d.sendPush as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(content.body).toContain("Coturno sujo");
    expect(content.url).toBe("/aluno/acompanhamento/rec-1");
  });

  it("não reenvia o que já foi entregue", async () => {
    const d = deps({ reserve: vi.fn(async () => null) });
    const summary = await dispatchFollowUpNotifications([record()], "registrado", d, NOW);

    expect(summary.push.deduplicated).toBe(1);
    expect(summary.email.deduplicated).toBe(1);
    expect(d.sendPush).not.toHaveBeenCalled();
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("desativa assinatura morta e não a retenta", async () => {
    const d = deps({
      sendPush: vi.fn(async () => ({ ok: false, error: "gone", permanentFailure: true })),
    });
    const summary = await dispatchFollowUpNotifications([record()], "registrado", d, NOW);

    expect(summary.push.failed).toBe(1);
    expect(d.disablePush).toHaveBeenCalledWith("sub-1");
  });

  it("falha temporária é marcada, sem desativar a assinatura", async () => {
    const d = deps({ sendPush: vi.fn(async () => ({ ok: false, error: "timeout" })) });
    await dispatchFollowUpNotifications([record()], "registrado", d, NOW);

    expect(d.markFailed).toHaveBeenCalledWith("entrega-1", "timeout");
    expect(d.disablePush).not.toHaveBeenCalled();
  });

  it("conta cadete sem canal externo em vez de falhar", async () => {
    const d = deps({}, { push: [], email: null });
    const summary = await dispatchFollowUpNotifications([record()], "registrado", d, NOW);

    expect(summary.withoutRecipient).toBe(1);
    expect(summary.push.sent).toBe(0);
    expect(d.reserve).not.toHaveBeenCalled();
  });

  it("envia para todos os aparelhos do cadete", async () => {
    const d = deps(
      {},
      {
        push: [pushTarget("sub-1", "https://push.example/1"), pushTarget("sub-2", "https://push.example/2")],
        email: null,
      },
    );
    const summary = await dispatchFollowUpNotifications([record()], "registrado", d, NOW);
    expect(summary.push.sent).toBe(2);
  });

  it("usa a chave do destino para a idempotência", async () => {
    const d = deps();
    await dispatchFollowUpNotifications([record()], "prazo_proximo", d, NOW);

    const calls = (d.reserve as ReturnType<typeof vi.fn>).mock.calls.map((call) => call?.[0]);
    expect(calls[0]?.recipientKey).toBe("https://push.example/1");
    expect(calls[0]?.kind).toBe("prazo_proximo");
    expect(calls[1]?.recipientKey).toBe("cadete@exemplo.br");
  });
});
