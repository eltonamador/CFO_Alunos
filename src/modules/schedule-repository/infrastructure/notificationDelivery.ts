import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { EmailConfig, PushTarget, WebPushConfig } from "@/modules/notifications/domain/types";
import {
  sendPushNotification,
  sendTransactionalEmail,
} from "@/modules/notifications/infrastructure/send";
import { scheduleNotificationContent } from "../application/notifications";

interface ClaimedNotification {
  event_id: string;
  event_type: string;
  idempotency_key: string;
  student_id: string;
  duty_date: string | null;
  duty_function: string | null;
  schedule_type_name: string;
  original_filename: string;
}

type AdminClient = SupabaseClient<Database>;

function recipientHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function pushConfig(): WebPushConfig | null {
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    return null;
  }
  return {
    publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  };
}

function emailConfig(): EmailConfig | null {
  if (!env.RESEND_API_KEY || !env.BIRTHDAY_EMAIL_FROM) return null;
  return {
    apiKey: env.RESEND_API_KEY,
    from: env.BIRTHDAY_EMAIL_FROM,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  };
}

async function reserve(
  client: AdminClient,
  eventId: string,
  channel: "web_push" | "email",
  recipient: string,
) {
  const { data, error } = await client.rpc("schedule_reserve_notification_delivery", {
    p_event_id: eventId,
    p_channel: channel,
    p_recipient_key: recipientHash(recipient),
  });
  if (error) throw new Error(`Falha ao reservar entrega: ${error.message}`);
  return data;
}

async function complete(
  client: AdminClient,
  deliveryId: string,
  result: {
    ok: boolean;
    providerMessageId?: string;
    error?: string;
    permanentFailure?: boolean;
  },
) {
  const { error } = await client.rpc("schedule_complete_notification_delivery", {
    p_delivery_id: deliveryId,
    p_sent: result.ok,
    p_permanent: result.permanentFailure ?? false,
    p_provider_message_id: result.providerMessageId,
    p_error_message: result.error,
  });
  if (error) throw new Error(`Falha ao concluir entrega: ${error.message}`);
}

export async function dispatchNextScheduleNotification() {
  const push = pushConfig();
  const email = emailConfig();
  if (!push && !email) return null;
  const client = createSupabaseAdminClient();
  const claim = await client.rpc("schedule_claim_notification_event");
  if (claim.error) throw new Error(`Falha ao obter notificação: ${claim.error.message}`);
  const event = (claim.data?.[0] ?? null) as ClaimedNotification | null;
  if (!event) return null;

  const content = scheduleNotificationContent({
    eventType: event.event_type,
    eventId: event.event_id,
    dutyDate: event.duty_date,
    dutyFunction: event.duty_function,
    scheduleTypeName: event.schedule_type_name,
  });
  const profile = await client
    .from("profiles")
    .select("id")
    .eq("student_id", event.student_id)
    .eq("active", true)
    .maybeSingle();
  if (profile.error) throw new Error(`Falha ao localizar o perfil: ${profile.error.message}`);

  let sent = 0;
  let failed = 0;
  let deduplicated = 0;
  if (push && profile.data?.id) {
    const subscriptions = await client
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("user_id", profile.data.id)
      .eq("enabled", true);
    if (subscriptions.error) throw new Error(subscriptions.error.message);
    for (const target of (subscriptions.data ?? []) as PushTarget[]) {
      const deliveryId = await reserve(client, event.event_id, "web_push", target.endpoint);
      if (!deliveryId) {
        deduplicated += 1;
        continue;
      }
      const result = await sendPushNotification(target, content, push);
      await complete(client, deliveryId, result);
      if (result.ok) sent += 1;
      else failed += 1;
      if (result.permanentFailure) {
        await client.from("push_subscriptions").update({ enabled: false }).eq("id", target.id);
      }
    }
  }

  if (email) {
    const contact = await client
      .from("student_contacts")
      .select("email_personal")
      .eq("student_id", event.student_id)
      .maybeSingle();
    if (contact.error) throw new Error(contact.error.message);
    const address = contact.data?.email_personal;
    if (address?.includes("@")) {
      const deliveryId = await reserve(client, event.event_id, "email", address.toLowerCase());
      if (!deliveryId) deduplicated += 1;
      else {
        const result = await sendTransactionalEmail(
          { email: address },
          content,
          `${event.idempotency_key}:email`,
          email,
        );
        await complete(client, deliveryId, result);
        if (result.ok) sent += 1;
        else failed += 1;
      }
    }
  }

  const finalized = await client.rpc("schedule_finalize_notification_event", {
    p_event_id: event.event_id,
  });
  if (finalized.error) throw new Error(`Falha ao finalizar evento: ${finalized.error.message}`);
  return { eventId: event.event_id, status: finalized.data, sent, failed, deduplicated };
}
