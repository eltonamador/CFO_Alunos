import "server-only";
import webPush from "web-push";
import type {
  EmailConfig,
  NotificationContent,
  NotificationSendResult,
  PushTarget,
  WebPushConfig,
} from "../domain/types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendPushNotification(
  target: PushTarget,
  content: NotificationContent,
  config: WebPushConfig,
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

export async function sendTransactionalEmail(
  recipient: { email: string },
  content: NotificationContent,
  idempotencyKey: string,
  config: EmailConfig,
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
        text: `${content.body}\n\n${appLink}`,
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
