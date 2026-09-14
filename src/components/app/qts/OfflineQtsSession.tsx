"use client";

import { useEffect } from "react";
import { clearOfflineQts, setOfflineQtsOwner } from "@/modules/qts/infrastructure/offlineStorage";

export function OfflineQtsSession({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (userId) setOfflineQtsOwner(userId);
    else clearOfflineQts();
  }, [userId]);
  return null;
}
