"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Status = "loading" | "inactive" | "active" | "denied" | "unsupported" | "unconfigured";

interface PushConfiguration {
  publicKey: string | null;
  pushConfigured: boolean;
  emailConfigured: boolean;
}

function urlBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index++) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes.buffer;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

async function persistSubscription(subscription: PushSubscription): Promise<void> {
  const response = await fetch("/api/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Não foi possível salvar a assinatura");
  }
}

interface PushNotificationControlProps {
  /** Texto que explica o que este perfil vai receber. */
  description?: string;
}

export function PushNotificationControl({
  description = "Receba os aniversários mesmo com o sistema fechado.",
}: PushNotificationControlProps = {}) {
  const [status, setStatus] = useState<Status>("loading");
  const [configuration, setConfiguration] = useState<PushConfiguration | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if ("clearAppBadge" in navigator) {
      navigator.clearAppBadge().catch(() => undefined);
    }

    async function initialize() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setStatus("unsupported");
        return;
      }

      const response = await fetch("/api/push-subscriptions");
      if (!response.ok)
        throw new Error("Não foi possível consultar a configuração de notificações");
      const config = (await response.json()) as PushConfiguration;
      if (cancelled) return;
      setConfiguration(config);

      if (!config.pushConfigured || !config.publicKey) {
        setStatus("unconfigured");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }

      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (cancelled) return;
      if (subscription) {
        await persistSubscription(subscription);
        setStatus("active");
      } else {
        setStatus("inactive");
      }
    }

    initialize().catch((error: unknown) => {
      if (!cancelled) {
        setMessage(error instanceof Error ? error.message : "Falha ao preparar notificações");
        setStatus("unsupported");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function enablePush() {
    if (!configuration?.publicKey) return;
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "inactive");
        return;
      }
      const registration = await getRegistration();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(configuration.publicKey),
        }));
      await persistSubscription(subscription);
      setStatus("active");
      setMessage("Notificações ativadas neste dispositivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível ativar o Web Push");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    setMessage(null);
    try {
      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/push-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error("Não foi possível remover a assinatura");
        await subscription.unsubscribe();
      }
      if ("clearAppBadge" in navigator) await navigator.clearAppBadge();
      setStatus("inactive");
      setMessage("Notificações desativadas neste dispositivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível desativar o Web Push");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-xl border bg-card p-4 shadow-card-sm"
      aria-labelledby="external-notifications-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2
            id="external-notifications-title"
            className="font-display text-base font-bold text-foreground"
          >
            Notificações externas
          </h2>
          <p className="text-xs text-muted-foreground">
            {description} No iPhone ou iPad, instale o PWA na tela inicial antes de ativar.
          </p>
          {configuration?.emailConfigured && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" aria-hidden /> E-mail complementar ativo.
            </p>
          )}
          {message && (
            <p className="text-xs font-medium text-primary" role="status">
              {message}
            </p>
          )}
        </div>

        {status === "loading" ? (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Verificando…
          </span>
        ) : status === "active" ? (
          <Button type="button" variant="outline" size="sm" onClick={disablePush} disabled={busy}>
            <BellOff className="mr-2 h-4 w-4" aria-hidden /> Desativar neste dispositivo
          </Button>
        ) : status === "inactive" ? (
          <Button type="button" size="sm" onClick={enablePush} disabled={busy}>
            <BellRing className="mr-2 h-4 w-4" aria-hidden /> Ativar notificações
          </Button>
        ) : (
          <p className="max-w-64 text-xs text-muted-foreground">
            {status === "denied"
              ? "Permissão bloqueada no navegador. Libere-a nas configurações do site."
              : status === "unconfigured"
                ? "Web Push aguardando configuração das chaves VAPID."
                : "Este navegador não oferece Web Push para este aplicativo."}
          </p>
        )}
      </div>
    </section>
  );
}
