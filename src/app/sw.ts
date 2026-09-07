/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

interface BirthdayPushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  badgeCount?: number;
}

const badgeNavigator = self.navigator as WorkerNavigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

self.addEventListener("push", (event: PushEvent) => {
  let payload: BirthdayPushPayload = {};
  try {
    payload = event.data?.json() as BirthdayPushPayload;
  } catch {
    payload = { body: event.data?.text() };
  }

  const title = payload.title ?? "CFO Alunos";
  const options: NotificationOptions = {
    body: payload.body ?? "Há um novo aviso no CFO Alunos.",
    icon: payload.icon ?? "/icons/icon-192.png",
    badge: payload.badge ?? "/icons/icon-192.png",
    tag: payload.tag ?? "cfo-alunos-notification",
    data: { url: payload.url ?? "/" },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      badgeNavigator.setAppBadge?.(payload.badgeCount ?? 1) ?? Promise.resolve(),
    ]).then(() => undefined),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const relativeUrl =
    typeof event.notification.data?.url === "string" ? event.notification.data.url : "/";
  const targetUrl = new URL(relativeUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      await badgeNavigator.clearAppBadge?.();
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.navigate(targetUrl);
        await existing.focus();
        return;
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
