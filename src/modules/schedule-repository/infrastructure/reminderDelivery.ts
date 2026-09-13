import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  sendPushNotification,
  sendTransactionalEmail,
} from "@/modules/notifications/infrastructure/send";
import type { NotificationSendResult } from "@/modules/notifications/domain/types";
import { reminderContent, reminderWindow, type ReminderSlot } from "../domain/reminders";
import { shiftDate } from "../domain/calendar";
import type { LiveRosterRow, ScheduleDatabase } from "./extendedDatabase";

export async function sendDutyReminders(slot: ReminderSlot, now = new Date()) {
  const window = reminderWindow(slot, now);
  if (!window) return { skipped: "outside_window", sent: 0, failed: 0, withoutDestination: 0 };
  const expires = new Date(
    `${slot === "evening" ? window.date : shiftDate(window.date, 1)}T00:00:00-03:00`,
  );
  const ttlSeconds = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000));
  const client = createSupabaseAdminClient() as SupabaseClient<ScheduleDatabase>;
  const roster = await client.rpc("schedule_live_roster", {
    p_start: window.date,
    p_end: window.date,
  });
  if (roster.error) throw new Error("Não foi possível consultar as escalas vigentes.");
  const grouped = new Map<string, LiveRosterRow[]>();
  for (const entry of roster.data ?? []) {
    if (entry.profile_id)
      grouped.set(entry.profile_id, [...(grouped.get(entry.profile_id) ?? []), entry]);
  }
  const push =
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT
      ? {
          publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          privateKey: env.VAPID_PRIVATE_KEY,
          subject: env.VAPID_SUBJECT,
        }
      : null;
  const email =
    env.RESEND_API_KEY && env.BIRTHDAY_EMAIL_FROM
      ? {
          apiKey: env.RESEND_API_KEY,
          from: env.BIRTHDAY_EMAIL_FROM,
          appUrl: env.NEXT_PUBLIC_APP_URL,
        }
      : null;
  if (!push && !email) throw new Error("Nenhum canal de lembretes está configurado.");
  const counts = { sent: 0, failed: 0, deduplicated: 0, withoutDestination: 0 };
  const recipients = [...grouped.entries()];
  async function deliver(profileId: string, entries: LiveRosterRow[]) {
    const content = reminderContent(
      window!.date,
      slot,
      entries.map((entry) => entry.duty),
    );
    let destinations = 0;
    async function send(
      channel: "web_push" | "email",
      recipient: string,
      perform: (key: string) => Promise<NotificationSendResult>,
    ) {
      destinations++;
      const key = createHash("sha256").update(recipient).digest("hex");
      const claim = await client.rpc("schedule_reserve_reminder", {
        p_profile_id: profileId,
        p_duty_date: window!.date,
        p_slot: slot,
        p_channel: channel,
        p_recipient_key: key,
      });
      if (claim.error) throw new Error("Falha ao reservar o lembrete.");
      const lease = claim.data?.[0];
      if (!lease) {
        counts.deduplicated++;
        return;
      }
      const result = await perform(
        `reminder:${profileId}:${window!.date}:${slot}:${channel}:${key}`,
      );
      const completed = await client
        .from("schedule_reminder_deliveries")
        .update({
          status: result.ok ? "sent" : result.permanentFailure ? "cancelled" : "failed",
          last_error: result.ok ? null : (result.error ?? "Falha de envio").slice(0, 500),
          sent_at: result.ok ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lease.id)
        .eq("lease_token", lease.lease_token)
        .eq("status", "processing");
      if (completed.error) throw new Error("Falha ao registrar a entrega do lembrete.");
      if (result.ok) counts.sent++;
      else counts.failed++;
    }
    if (push) {
      const subscriptions = await client
        .from("push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .eq("user_id", profileId)
        .eq("enabled", true);
      if (subscriptions.error) throw new Error("Falha ao consultar dispositivos.");
      for (const target of subscriptions.data ?? []) {
        await send("web_push", target.endpoint, async () => {
          const result = await sendPushNotification(target, content, push, { ttlSeconds });
          if (result.permanentFailure)
            await client.from("push_subscriptions").update({ enabled: false }).eq("id", target.id);
          return result;
        });
      }
    }
    if (email) {
      // O endereço vem da conta autenticada, inclusive para oficiais, sem acesso
      // desnecessário aos dados cadastrais civis dos alunos.
      const account = await client.auth.admin.getUserById(profileId);
      if (account.error) throw new Error("Falha ao consultar destinatário do lembrete.");
      const address = account.data.user?.email;
      if (address)
        await send("email", address.toLowerCase(), (key) =>
          sendTransactionalEmail({ email: address }, content, key, email),
        );
    }
    if (!destinations) counts.withoutDestination++;
  }
  // Paralelismo limitado para atender a turma inteira dentro da execução do cron.
  for (let index = 0; index < recipients.length; index += 8) {
    const results = await Promise.allSettled(
      recipients.slice(index, index + 8).map(([id, entries]) => deliver(id, entries)),
    );
    counts.failed += results.filter((result) => result.status === "rejected").length;
  }
  return { date: window.date, profiles: grouped.size, ...counts };
}
