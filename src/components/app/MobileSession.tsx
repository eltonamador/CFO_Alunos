"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  navigationOwner,
  restorableHref,
  type NavigationIdentity,
} from "@/modules/mobile-session/domain/navigation";
import {
  clearNavigationState,
  initializeNavigationOwner,
  NAVIGATION_CLEARED_EVENT,
  NAVIGATION_OWNER_KEY,
  readNavigationState,
  saveNavigationState,
} from "@/modules/mobile-session/infrastructure/navigationStorage";

export function ClearMobileSession() {
  useEffect(() => {
    clearNavigationState();
  }, []);
  return null;
}

export function MobileSession({ identity }: { identity: NavigationIdentity }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();
  const initialized = useRef<string | null>(null);
  const [connection, setConnection] = useState<"online" | "offline" | "reconnected">("online");
  const { userId, role, canManageInternship, canPublishSchedules } = identity;

  useEffect(() => {
    const currentIdentity = { userId, role, canManageInternship, canPublishSchedules };
    const owner = navigationOwner(currentIdentity);
    const firstMount = initialized.current !== owner;
    if (firstMount) {
      initializeNavigationOwner(currentIdentity);
      initialized.current = owner;
    }
    const params = new URLSearchParams(search);
    const relaunch = params.get("resume") === "1";
    const saved = readNavigationState(currentIdentity, relaunch);
    if (relaunch) {
      params.delete("resume");
      const fallback = `${pathname}${params.size ? `?${params}` : ""}`;
      // A new installed-app window may have no sessionStorage yet.
      if (saved) saveNavigationState(currentIdentity, saved.href, saved.scrollY);
      router.replace(saved?.href ?? fallback, { scroll: false });
      return;
    }
    const href = restorableHref(`${pathname}${search ? `?${search}` : ""}`, currentIdentity);
    if (!href) return;
    let disabled = false;
    let restoring = saved?.href === href && saved.scrollY > 0;
    const targetY = restoring ? saved!.scrollY : 0;
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;
    const previousRestoration = window.history.scrollRestoration;
    if (restoring) window.history.scrollRestoration = "manual";
    const stopRestoring = () => {
      restoring = false;
      observer?.disconnect();
      window.history.scrollRestoration = previousRestoration;
    };
    const restore = () => {
      if (!restoring) return;
      window.scrollTo({ top: targetY, behavior: "instant" });
      if (document.documentElement.scrollHeight - window.innerHeight >= targetY) stopRestoring();
    };
    const persist = () => {
      if (!disabled)
        saveNavigationState(currentIdentity, href, restoring ? targetY : window.scrollY);
    };
    const onScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(persist, 200);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist();
    };
    const disable = () => {
      disabled = true;
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || (event.key === NAVIGATION_OWNER_KEY && event.newValue !== owner))
        disable();
    };
    // Streaming can increase the page height after hydration. Stop on user input.
    if (restoring && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(restore);
      observer.observe(document.body);
    }
    const frame = requestAnimationFrame(restore);
    const restoreTimer = setTimeout(stopRestoring, 5000);
    persist();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("freeze", persist);
    window.addEventListener(NAVIGATION_CLEARED_EVENT, disable);
    window.addEventListener("storage", onStorage);
    window.addEventListener("touchstart", stopRestoring, { passive: true });
    window.addEventListener("wheel", stopRestoring, { passive: true });
    window.addEventListener("keydown", stopRestoring);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(restoreTimer);
      cancelAnimationFrame(frame);
      stopRestoring();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("freeze", persist);
      window.removeEventListener(NAVIGATION_CLEARED_EVENT, disable);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("touchstart", stopRestoring);
      window.removeEventListener("wheel", stopRestoring);
      window.removeEventListener("keydown", stopRestoring);
    };
  }, [userId, role, canManageInternship, canPublishSchedules, pathname, search, router]);

  useEffect(() => {
    const offline = () => setConnection("offline");
    const online = () => setConnection((old) => (old === "offline" ? "reconnected" : old));
    if (!navigator.onLine) offline();
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);

  if (connection === "online") return null;
  return (
    <div role="status" className="mb-4 rounded-lg border border-border bg-card p-3 text-sm">
      {connection === "offline" ? (
        <>
          Sem conexão.{" "}
          <a className="underline" href="/escala-offline.html">
            Escalas salvas
          </a>{" "}
          ·{" "}
          <a className="underline" href="/qts-offline.html">
            QTS salvo
          </a>
        </>
      ) : (
        <>
          Conexão restabelecida.{" "}
          <button
            className="ml-2 underline"
            onClick={() => {
              router.refresh();
              setConnection("online");
            }}
          >
            Atualizar consulta
          </button>
        </>
      )}
    </div>
  );
}
