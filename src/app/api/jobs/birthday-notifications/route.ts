import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  dispatchBirthdayNotifications,
  type BirthdayNotificationDependencies,
  type BirthdayNotificationRecipient,
  type PushSubscriptionTarget,
} from "@/modules/student-profile/application/externalBirthdayNotifications";
import {
  getBirthdayAlerts,
  getDateInTimeZone,
  type BirthdayStudent,
} from "@/modules/student-profile/domain/birthdayAlerts";
import {
  createBirthdayDeliveryRepository,
  sendBirthdayEmail,
  sendWebPushNotification,
  type EmailConfiguration,
  type WebPushConfiguration,
} from "@/modules/student-profile/infrastructure/externalBirthdayDelivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface StudentRow {
  id: string;
  full_name: string;
  birth_date: string | null;
}

interface ProfileRow {
  id: string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function webPushConfiguration(): WebPushConfiguration | null {
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    return null;
  }
  return {
    publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  };
}

function emailConfiguration(): EmailConfiguration | null {
  if (!env.RESEND_API_KEY || !env.BIRTHDAY_EMAIL_FROM) return null;
  return {
    apiKey: env.RESEND_API_KEY,
    from: env.BIRTHDAY_EMAIL_FROM,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  };
}

export async function GET(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 503 },
    );
  }

  const pushConfig = webPushConfiguration();
  const emailConfig = emailConfiguration();
  if (!pushConfig && !emailConfig) {
    return NextResponse.json({ error: "Nenhum canal externo foi configurado" }, { status: 503 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .select("id, full_name, birth_date")
    .is("deleted_at", null);
  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }

  const students: BirthdayStudent[] = ((studentData ?? []) as StudentRow[]).map((student) => ({
    id: student.id,
    fullName: student.full_name,
    birthDate: student.birth_date,
  }));
  const now = new Date();
  const alerts = getBirthdayAlerts(students, now);
  const alertOn = getDateInTimeZone(now);

  if (alerts.length === 0) {
    return NextResponse.json({
      ok: true,
      alertOn,
      channels: { webPush: Boolean(pushConfig), email: Boolean(emailConfig) },
      summary: {
        alerts: 0,
        push: { sent: 0, failed: 0, deduplicated: 0 },
        email: { sent: 0, failed: 0, deduplicated: 0 },
      },
    });
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["coordenacao", "secretaria"])
    .eq("active", true);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const profiles = (profileData ?? []) as ProfileRow[];
  const profileIds = profiles.map((profile) => profile.id);
  let subscriptions: SubscriptionRow[] = [];
  if (pushConfig && profileIds.length > 0) {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", profileIds)
      .eq("enabled", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    subscriptions = (data ?? []) as SubscriptionRow[];
  }

  const emailsByUser = new Map<string, string>();
  if (emailConfig) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const user of data.users) {
      if (user.email) emailsByUser.set(user.id, user.email);
    }
  }

  const subscriptionsByUser = new Map<string, PushSubscriptionTarget[]>();
  for (const subscription of subscriptions) {
    const current = subscriptionsByUser.get(subscription.user_id) ?? [];
    current.push({
      id: subscription.id,
      userId: subscription.user_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    });
    subscriptionsByUser.set(subscription.user_id, current);
  }

  const recipients: BirthdayNotificationRecipient[] = profiles.map((profile) => ({
    userId: profile.id,
    email: emailConfig ? (emailsByUser.get(profile.id) ?? null) : null,
    pushSubscriptions: pushConfig ? (subscriptionsByUser.get(profile.id) ?? []) : [],
  }));

  const repository = createBirthdayDeliveryRepository(supabase);
  const dependencies: BirthdayNotificationDependencies = {
    ...repository,
    sendPush: (target, content) =>
      pushConfig
        ? sendWebPushNotification(target, content, pushConfig)
        : Promise.resolve({ ok: false, error: "Web Push não configurado" }),
    sendEmail: (recipient, content, idempotencyKey) =>
      emailConfig
        ? sendBirthdayEmail(recipient, content, idempotencyKey, emailConfig)
        : Promise.resolve({ ok: false, error: "E-mail não configurado" }),
  };

  try {
    const summary = await dispatchBirthdayNotifications(alerts, recipients, alertOn, dependencies);
    return NextResponse.json({
      ok: summary.push.failed === 0 && summary.email.failed === 0,
      alertOn,
      channels: { webPush: Boolean(pushConfig), email: Boolean(emailConfig) },
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
