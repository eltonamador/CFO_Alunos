"use client";
import { logoutAction } from "@/modules/identity/presentation/actions/authActions";
import { clearOfflineRoster } from "../infrastructure/offlineStorage";
import { clearOfflineQts } from "@/modules/qts/infrastructure/offlineStorage";

import { clearNavigationState } from "@/modules/mobile-session/infrastructure/navigationStorage";

export async function logoutWithCleanup() {
  clearNavigationState();
  clearOfflineRoster();
  clearOfflineQts();
  await logoutAction();
}
