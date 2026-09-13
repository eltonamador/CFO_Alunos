"use client";
import { useEffect, useState } from "react";
import {
  clearOfflineRoster,
  saveOfflineRoster,
  setOfflineOwner,
} from "@/modules/schedule-repository/infrastructure/offlineStorage";
import type { CalendarSnapshot } from "@/modules/schedule-repository/application/calendar";

export function OfflineRosterSession({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (userId) setOfflineOwner(userId);
    else clearOfflineRoster();
  }, [userId]);
  return null;
}

export function SaveOfflineRoster({ snapshot }: { snapshot: CalendarSnapshot }) {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    saveOfflineRoster(snapshot);
  }, [snapshot]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("offline", update);
    window.addEventListener("online", update);
    return () => {
      window.removeEventListener("offline", update);
      window.removeEventListener("online", update);
    };
  }, []);
  return offline ? (
    <p
      role="status"
      className="rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950"
    >
      Sem conexão. As informações podem estar desatualizadas.{" "}
      <a href="/escala-offline.html" className="font-semibold underline">
        Abrir consulta salva
      </a>
    </p>
  ) : null;
}
