/**
 * Orquestra o envio dos avisos de FO− ao cadete.
 *
 * Toda dependência externa entra por parâmetro: o caso de uso é testável
 * sem rede, sem banco e sem provedor de push.
 */
import type {
  NotificationContent,
  NotificationSendResult,
  PushTarget,
} from "@/modules/notifications/domain/types";
import {
  buildFollowUpNotification,
  type FollowUpNotificationKind,
  type NotifiableRecord,
} from "../domain/notifications";

export interface RecipientTargets {
  push: PushTarget[];
  /** E-mail pessoal do cadete, quando informado na ficha. */
  email: string | null;
}

export interface ReserveInput {
  recordId: string;
  studentId: string;
  kind: FollowUpNotificationKind;
  channel: "web_push" | "email";
  recipientKey: string;
  payload: NotificationContent;
}

export interface FollowUpNotificationDependencies {
  loadRecipient(studentId: string): Promise<RecipientTargets>;
  /** Devolve o id da entrega, ou null se já existia (idempotência). */
  reserve(input: ReserveInput): Promise<string | null>;
  markSent(deliveryId: string, providerMessageId?: string): Promise<void>;
  markFailed(deliveryId: string, error: string): Promise<void>;
  sendPush(target: PushTarget, content: NotificationContent): Promise<NotificationSendResult>;
  sendEmail(
    recipient: { email: string },
    content: NotificationContent,
    idempotencyKey: string,
  ): Promise<NotificationSendResult>;
  disablePush(subscriptionId: string): Promise<void>;
}

export interface ChannelSummary {
  sent: number;
  failed: number;
  deduplicated: number;
}

export interface DispatchSummary {
  records: number;
  push: ChannelSummary;
  email: ChannelSummary;
  /** Cadetes sem push nem e-mail: o aviso no app segue sendo o canal. */
  withoutRecipient: number;
}

function emptyChannel(): ChannelSummary {
  return { sent: 0, failed: 0, deduplicated: 0 };
}

export async function dispatchFollowUpNotifications(
  records: NotifiableRecord[],
  kind: FollowUpNotificationKind,
  deps: FollowUpNotificationDependencies,
  now: Date = new Date(),
): Promise<DispatchSummary> {
  const summary: DispatchSummary = {
    records: records.length,
    push: emptyChannel(),
    email: emptyChannel(),
    withoutRecipient: 0,
  };

  for (const record of records) {
    const recipient = await deps.loadRecipient(record.studentId);

    if (recipient.push.length === 0 && !recipient.email) {
      summary.withoutRecipient += 1;
      continue;
    }

    const content = buildFollowUpNotification(record, kind, now);

    for (const target of recipient.push) {
      const deliveryId = await deps.reserve({
        recordId: record.id,
        studentId: record.studentId,
        kind,
        channel: "web_push",
        recipientKey: target.endpoint,
        payload: content,
      });

      if (!deliveryId) {
        summary.push.deduplicated += 1;
        continue;
      }

      const result = await deps.sendPush(target, content);
      if (result.ok) {
        await deps.markSent(deliveryId, result.providerMessageId);
        summary.push.sent += 1;
      } else {
        await deps.markFailed(deliveryId, result.error ?? "Falha desconhecida");
        summary.push.failed += 1;
        // Assinatura morta (404/410) não adianta retentar.
        if (result.permanentFailure) await deps.disablePush(target.id);
      }
    }

    if (recipient.email) {
      const deliveryId = await deps.reserve({
        recordId: record.id,
        studentId: record.studentId,
        kind,
        channel: "email",
        recipientKey: recipient.email,
        payload: content,
      });

      if (!deliveryId) {
        summary.email.deduplicated += 1;
      } else {
        const result = await deps.sendEmail(
          { email: recipient.email },
          content,
          `fo-${record.id}-${kind}-email`,
        );
        if (result.ok) {
          await deps.markSent(deliveryId, result.providerMessageId);
          summary.email.sent += 1;
        } else {
          await deps.markFailed(deliveryId, result.error ?? "Falha desconhecida");
          summary.email.failed += 1;
        }
      }
    }
  }

  return summary;
}
