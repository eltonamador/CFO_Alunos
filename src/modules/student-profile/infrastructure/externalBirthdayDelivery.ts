import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/types";
import type {
  BirthdayNotificationContent,
  NotificationSendResult,
  PushSubscriptionTarget,
  ReserveBirthdayDeliveryInput,
} from "@/modules/student-profile/application/externalBirthdayNotifications";
import {
  sendPushNotification,
  sendTransactionalEmail,
} from "@/modules/notifications/infrastructure/send";

export interface WebPushConfiguration {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface EmailConfiguration {
  apiKey: string;
  from: string;
  appUrl: string;
}

function recipientHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}


export function createBirthdayDeliveryRepository(supabase: SupabaseClient<any, any, any>) {
  return {
    async reserveDelivery(input: ReserveBirthdayDeliveryInput): Promise<string | null> {
      const { data, error } = await supabase
        .from("notification_deliveries")
        .insert({
          student_id: input.studentId,
          alert_on: input.alertOn,
          birthday_on: input.birthdayOn,
          alert_kind: input.alertKind,
          channel: input.channel,
          recipient_key: recipientHash(input.recipientKey),
          payload: input.payload as unknown as Json,
          status: "pending",
        })
        .select("id")
        .single();

      if (error?.code === "23505") return null;
      if (error) throw new Error(`Falha ao reservar entrega: ${error.message}`);
      return data.id;
    },

    async markDeliverySent(deliveryId: string, providerMessageId?: string): Promise<void> {
      const { error } = await supabase
        .from("notification_deliveries")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: providerMessageId ?? null,
          last_error: null,
        })
        .eq("id", deliveryId);
      if (error) throw new Error(`Falha ao concluir entrega: ${error.message}`);
    },

    async markDeliveryFailed(deliveryId: string, message: string): Promise<void> {
      const { error } = await supabase
        .from("notification_deliveries")
        .update({ status: "failed", last_error: message.slice(0, 1000) })
        .eq("id", deliveryId);
      if (error) throw new Error(`Falha ao registrar erro da entrega: ${error.message}`);
    },

    async disablePushSubscription(subscriptionId: string): Promise<void> {
      const { error } = await supabase
        .from("push_subscriptions")
        .update({ enabled: false })
        .eq("id", subscriptionId);
      if (error) throw new Error(`Falha ao desativar assinatura: ${error.message}`);
    },
  };
}

/**
 * Envio de push e e-mail vivem em `@/modules/notifications` desde que o
 * módulo de acompanhamento passou a notificar também. Estas funções
 * seguem exportadas daqui para não mudar as chamadas existentes.
 */
export async function sendWebPushNotification(
  target: PushSubscriptionTarget,
  content: BirthdayNotificationContent,
  config: WebPushConfiguration,
): Promise<NotificationSendResult> {
  return sendPushNotification(target, content, config);
}

export async function sendBirthdayEmail(
  recipient: { email: string },
  content: BirthdayNotificationContent,
  idempotencyKey: string,
  config: EmailConfiguration,
): Promise<NotificationSendResult> {
  return sendTransactionalEmail(recipient, content, idempotencyKey, config);
}
