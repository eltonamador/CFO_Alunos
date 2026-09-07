import { describe, expect, it, vi } from "vitest";
import type { BirthdayAlert } from "@/modules/student-profile/domain/birthdayAlerts";
import {
  buildBirthdayNotificationContent,
  dispatchBirthdayNotifications,
  type BirthdayNotificationDependencies,
  type BirthdayNotificationRecipient,
} from "./externalBirthdayNotifications";

const todayAlert: BirthdayAlert = {
  studentId: "student-1",
  cadetName: "Maria Souza",
  birthDate: "2002-09-07",
  occurrenceDate: "2026-09-07",
  age: 24,
  period: "today",
};

const tomorrowAlert: BirthdayAlert = {
  ...todayAlert,
  studentId: "student-2",
  cadetName: "João Silva",
  birthDate: "2003-09-08",
  occurrenceDate: "2026-09-08",
  age: 23,
  period: "tomorrow",
};

describe("buildBirthdayNotificationContent", () => {
  it("inclui nome, data e idade nos avisos de hoje e amanhã", () => {
    expect(buildBirthdayNotificationContent(todayAlert)).toMatchObject({
      title: "🎉 Aniversário hoje",
      body: "Hoje é aniversário do Cadete Maria Souza (07/09/2026). Completa 24 anos.",
    });
    expect(buildBirthdayNotificationContent(tomorrowAlert)).toMatchObject({
      title: "🎂 Aniversário amanhã",
      body: "Amanhã é aniversário do Cadete João Silva (08/09/2026). Completará 23 anos.",
    });
  });
});

describe("dispatchBirthdayNotifications", () => {
  const recipients: BirthdayNotificationRecipient[] = [
    {
      userId: "admin-1",
      email: "coord@example.com",
      pushSubscriptions: [
        {
          id: "subscription-1",
          userId: "admin-1",
          endpoint: "https://push.example.com/1",
          p256dh: "p256dh",
          auth: "auth",
        },
      ],
    },
  ];

  function dependencies(): BirthdayNotificationDependencies {
    let sequence = 0;
    return {
      reserveDelivery: vi.fn(async () => `delivery-${++sequence}`),
      markDeliverySent: vi.fn(async () => undefined),
      markDeliveryFailed: vi.fn(async () => undefined),
      sendPush: vi.fn(async () => ({ ok: true })),
      sendEmail: vi.fn(async () => ({ ok: true, providerMessageId: "email-1" })),
      disablePushSubscription: vi.fn(async () => undefined),
    };
  }

  it("envia Web Push e e-mail complementar para cada alerta", async () => {
    const deps = dependencies();
    const summary = await dispatchBirthdayNotifications(
      [todayAlert, tomorrowAlert],
      recipients,
      "2026-09-07",
      deps,
    );

    expect(summary).toEqual({
      alerts: 2,
      push: { sent: 2, failed: 0, deduplicated: 0 },
      email: { sent: 2, failed: 0, deduplicated: 0 },
    });
    expect(deps.sendPush).toHaveBeenCalledTimes(2);
    expect(deps.sendEmail).toHaveBeenCalledTimes(2);
  });

  it("não envia novamente quando o ledger recusa a reserva duplicada", async () => {
    const deps = dependencies();
    deps.reserveDelivery = vi.fn(async () => null);

    const summary = await dispatchBirthdayNotifications(
      [todayAlert],
      recipients,
      "2026-09-07",
      deps,
    );

    expect(summary.push.deduplicated).toBe(1);
    expect(summary.email.deduplicated).toBe(1);
    expect(deps.sendPush).not.toHaveBeenCalled();
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("desativa assinatura expirada após falha permanente", async () => {
    const deps = dependencies();
    deps.sendPush = vi.fn(async () => ({
      ok: false,
      error: "Subscription gone",
      permanentFailure: true,
    }));

    await dispatchBirthdayNotifications(
      [todayAlert],
      [{ ...recipients[0]!, email: null }],
      "2026-09-07",
      deps,
    );

    expect(deps.disablePushSubscription).toHaveBeenCalledWith("subscription-1");
    expect(deps.markDeliveryFailed).toHaveBeenCalled();
  });
});
