import {
  formatBirthdayDate,
  type BirthdayAlert,
} from "@/modules/student-profile/domain/birthdayAlerts";

export type BirthdayDeliveryChannel = "web_push" | "email";

export interface BirthdayNotificationContent {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export interface PushSubscriptionTarget {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface BirthdayNotificationRecipient {
  userId: string;
  email: string | null;
  pushSubscriptions: PushSubscriptionTarget[];
}

export interface ReserveBirthdayDeliveryInput {
  studentId: string;
  alertOn: string;
  birthdayOn: string;
  alertKind: BirthdayAlert["period"];
  channel: BirthdayDeliveryChannel;
  recipientKey: string;
  payload: BirthdayNotificationContent;
}

export interface NotificationSendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  permanentFailure?: boolean;
}

export interface BirthdayNotificationDependencies {
  reserveDelivery(input: ReserveBirthdayDeliveryInput): Promise<string | null>;
  markDeliverySent(deliveryId: string, providerMessageId?: string): Promise<void>;
  markDeliveryFailed(deliveryId: string, error: string): Promise<void>;
  sendPush(
    target: PushSubscriptionTarget,
    content: BirthdayNotificationContent,
  ): Promise<NotificationSendResult>;
  sendEmail(
    recipient: { userId: string; email: string },
    content: BirthdayNotificationContent,
    idempotencyKey: string,
  ): Promise<NotificationSendResult>;
  disablePushSubscription(subscriptionId: string): Promise<void>;
}

export interface BirthdayDispatchSummary {
  alerts: number;
  push: { sent: number; failed: number; deduplicated: number };
  email: { sent: number; failed: number; deduplicated: number };
}

export function buildBirthdayNotificationContent(
  alert: BirthdayAlert,
): BirthdayNotificationContent {
  const date = formatBirthdayDate(alert.occurrenceDate);
  const isToday = alert.period === "today";

  return {
    title: isToday ? "🎉 Aniversário hoje" : "🎂 Aniversário amanhã",
    body: isToday
      ? `Hoje é aniversário do Cadete ${alert.cadetName} (${date}). Completa ${alert.age} anos.`
      : `Amanhã é aniversário do Cadete ${alert.cadetName} (${date}). Completará ${alert.age} anos.`,
    url: "/",
    tag: `birthday-${alert.studentId}-${alert.period}-${alert.occurrenceDate}`,
  };
}

function emptyChannelSummary() {
  return { sent: 0, failed: 0, deduplicated: 0 };
}

export async function dispatchBirthdayNotifications(
  alerts: BirthdayAlert[],
  recipients: BirthdayNotificationRecipient[],
  alertOn: string,
  dependencies: BirthdayNotificationDependencies,
): Promise<BirthdayDispatchSummary> {
  const summary: BirthdayDispatchSummary = {
    alerts: alerts.length,
    push: emptyChannelSummary(),
    email: emptyChannelSummary(),
  };

  for (const alert of alerts) {
    const content = buildBirthdayNotificationContent(alert);

    for (const recipient of recipients) {
      for (const subscription of recipient.pushSubscriptions) {
        const deliveryId = await dependencies.reserveDelivery({
          studentId: alert.studentId,
          alertOn,
          birthdayOn: alert.occurrenceDate,
          alertKind: alert.period,
          channel: "web_push",
          recipientKey: `push:${subscription.id}`,
          payload: content,
        });

        if (!deliveryId) {
          summary.push.deduplicated++;
          continue;
        }

        const result = await dependencies.sendPush(subscription, content);
        if (result.ok) {
          await dependencies.markDeliverySent(deliveryId, result.providerMessageId);
          summary.push.sent++;
        } else {
          await dependencies.markDeliveryFailed(deliveryId, result.error ?? "Falha no Web Push");
          if (result.permanentFailure) {
            await dependencies.disablePushSubscription(subscription.id);
          }
          summary.push.failed++;
        }
      }

      if (recipient.email) {
        const deliveryId = await dependencies.reserveDelivery({
          studentId: alert.studentId,
          alertOn,
          birthdayOn: alert.occurrenceDate,
          alertKind: alert.period,
          channel: "email",
          recipientKey: `email:${recipient.email.toLowerCase()}`,
          payload: content,
        });

        if (!deliveryId) {
          summary.email.deduplicated++;
          continue;
        }

        const result = await dependencies.sendEmail(
          { userId: recipient.userId, email: recipient.email },
          content,
          `birthday-${deliveryId}`,
        );
        if (result.ok) {
          await dependencies.markDeliverySent(deliveryId, result.providerMessageId);
          summary.email.sent++;
        } else {
          await dependencies.markDeliveryFailed(deliveryId, result.error ?? "Falha no e-mail");
          summary.email.failed++;
        }
      }
    }
  }

  return summary;
}
