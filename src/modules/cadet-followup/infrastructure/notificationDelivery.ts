import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type { EmailConfig, WebPushConfig } from "@/modules/notifications/domain/types";
import {
  sendPushNotification,
  sendTransactionalEmail,
} from "@/modules/notifications/infrastructure/send";
import {
  dispatchFollowUpNotifications,
  type DispatchSummary,
  type FollowUpNotificationDependencies,
  type RecipientTargets,
} from "../application/followUpNotifications";
import {
  REMINDER_THRESHOLD_HOURS,
  selectDeadlineReminders,
  type NotifiableRecord,
} from "../domain/notifications";

function recipientHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function webPushConfig(): WebPushConfig | null {
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

function buildDependencies(
  supabase: SupabaseClient<any, any, any>,
  push: WebPushConfig | null,
  email: EmailConfig | null,
): FollowUpNotificationDependencies {
  return {
    async loadRecipient(studentId: string): Promise<RecipientTargets> {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("student_id", studentId)
        .eq("active", true)
        .maybeSingle();

      let pushTargets: RecipientTargets["push"] = [];
      if (push && profile?.id) {
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", profile.id)
          .eq("enabled", true);
        pushTargets = (subscriptions ?? []).map((row: any) => ({
          id: row.id,
          endpoint: row.endpoint,
          p256dh: row.p256dh,
          auth: row.auth,
        }));
      }

      // E-mail pessoal da ficha — o login `<nome>@abm.br` é interno e não
      // corresponde a uma caixa real.
      let personalEmail: string | null = null;
      if (email) {
        const { data: contact } = await supabase
          .from("student_contacts")
          .select("email_personal")
          .eq("student_id", studentId)
          .maybeSingle();
        const value = (contact as any)?.email_personal;
        personalEmail = value && String(value).includes("@") ? String(value) : null;
      }

      return { push: pushTargets, email: personalEmail };
    },

    async reserve(input) {
      const { data, error } = await supabase
        .from("follow_up_notifications")
        .insert({
          record_id: input.recordId,
          student_id: input.studentId,
          kind: input.kind,
          channel: input.channel,
          recipient_key: recipientHash(input.recipientKey),
          payload: input.payload as unknown as Json,
          status: "pending",
        })
        .select("id")
        .single();

      // 23505 = já existe entrega igual: idempotência, não erro.
      if (error?.code === "23505") return null;
      if (error) throw new Error(`Falha ao reservar entrega: ${error.message}`);
      return data.id;
    },

    async markSent(deliveryId, providerMessageId) {
      await supabase
        .from("follow_up_notifications")
        .update({
          status: "sent",
          provider_message_id: providerMessageId ?? null,
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", deliveryId);
    },

    async markFailed(deliveryId, errorMessage) {
      await supabase
        .from("follow_up_notifications")
        .update({ status: "failed", last_error: errorMessage.slice(0, 500) })
        .eq("id", deliveryId);
    },

    async sendPush(target, content) {
      if (!push) return { ok: false, error: "Web Push não configurado" };
      return sendPushNotification(target, content, push);
    },

    async sendEmail(recipient, content, idempotencyKey) {
      if (!email) return { ok: false, error: "E-mail não configurado" };
      return sendTransactionalEmail(recipient, content, idempotencyKey, email);
    },

    async disablePush(subscriptionId) {
      await supabase
        .from("push_subscriptions")
        .update({ enabled: false })
        .eq("id", subscriptionId);
    },
  };
}

/**
 * Escreve no ledger e envia com service_role: o cadete não tem permissão
 * de escrita ali, e a Coordenação que registrou o FO− também não deve ter.
 */
function adminClientOrNull(): SupabaseClient<any, any, any> | null {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    return createSupabaseAdminClient() as unknown as SupabaseClient<any, any, any>;
  } catch {
    return null;
  }
}

function channelsConfigured() {
  const push = webPushConfig();
  const email = emailConfig();
  return { push, email, any: Boolean(push || email) };
}

async function loadNotifiable(
  supabase: SupabaseClient<any, any, any>,
  filter: (query: any) => any,
): Promise<NotifiableRecord[]> {
  const { data } = await filter(
    supabase
      .from("follow_up_records")
      .select("id, student_id, reason_text, status, deadline_at")
      .eq("type", "fo_negativo"),
  );

  return (data ?? []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    reasonText: row.reason_text,
    status: row.status,
    deadlineAt: row.deadline_at ?? null,
  }));
}

/**
 * Aviso imediato do FO− recém-registrado. Nunca lança: a falha de um
 * canal externo não pode derrubar o registro em si, que já está salvo.
 */
export async function notifyFollowUpRegistered(recordId: string): Promise<void> {
  const { push, email, any } = channelsConfigured();
  if (!any) return;

  const supabase = adminClientOrNull();
  if (!supabase) return;

  try {
    const records = await loadNotifiable(supabase, (query) => query.eq("id", recordId));
    if (records.length === 0) return;

    await dispatchFollowUpNotifications(
      records,
      "registrado",
      buildDependencies(supabase, push, email),
    );
  } catch (error) {
    console.error("[followup] falha ao notificar registro", error);
  }
}

/**
 * Lembrete dos FO− cujo prazo está terminando. Chamado pela rota agendada.
 */
export async function dispatchDeadlineReminders(
  now: Date = new Date(),
): Promise<DispatchSummary | null> {
  const { push, email, any } = channelsConfigured();
  if (!any) return null;

  const supabase = adminClientOrNull();
  if (!supabase) return null;

  const candidates = await loadNotifiable(supabase, (query) =>
    query.eq("status", "aguardando_manifestacao").not("deadline_at", "is", null),
  );

  const due = selectDeadlineReminders(candidates, now, REMINDER_THRESHOLD_HOURS);
  if (due.length === 0) {
    return {
      records: 0,
      push: { sent: 0, failed: 0, deduplicated: 0 },
      email: { sent: 0, failed: 0, deduplicated: 0 },
      withoutRecipient: 0,
    };
  }

  return dispatchFollowUpNotifications(
    due,
    "prazo_proximo",
    buildDependencies(supabase, push, email),
    now,
  );
}
