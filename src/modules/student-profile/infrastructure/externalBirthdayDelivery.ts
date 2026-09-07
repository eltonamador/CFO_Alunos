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
import webPush from "web-push";

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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

export async function sendWebPushNotification(
  target: PushSubscriptionTarget,
  content: BirthdayNotificationContent,
  config: WebPushConfiguration,
): Promise<NotificationSendResult> {
  try {
    await webPush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify({
        ...content,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        badgeCount: 1,
      }),
      {
        vapidDetails: {
          subject: config.subject,
          publicKey: config.publicKey,
          privateKey: config.privateKey,
        },
        TTL: 60 * 60 * 24,
        urgency: "normal",
      },
    );
    return { ok: true };
  } catch (error) {
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : undefined;
    return {
      ok: false,
      error: errorMessage(error),
      permanentFailure: statusCode === 404 || statusCode === 410,
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendBirthdayEmail(
  recipient: { email: string },
  content: BirthdayNotificationContent,
  idempotencyKey: string,
  config: EmailConfiguration,
): Promise<NotificationSendResult> {
  try {
    const appLink = new URL(content.url, config.appUrl).toString();
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: config.from,
        to: [recipient.email],
        subject: content.title,
        text: content.body,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#16140f"><h2>${escapeHtml(content.title)}</h2><p>${escapeHtml(content.body)}</p><p><a href="${escapeHtml(appLink)}">Abrir CFO Alunos</a></p></div>`,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const responseBody = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!response.ok) {
      return {
        ok: false,
        error: responseBody.message ?? `Resend respondeu HTTP ${response.status}`,
      };
    }

    return { ok: true, providerMessageId: responseBody.id };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
