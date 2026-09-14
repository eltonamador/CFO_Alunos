"use client";
import { logoutAction } from "@/modules/identity/presentation/actions/authActions";
import { clearOfflineRoster } from "../infrastructure/offlineStorage";
import { clearOfflineQts } from "@/modules/qts/infrastructure/offlineStorage";

export async function logoutWithCleanup() {
  clearOfflineRoster();
  clearOfflineQts();
  await logoutAction();
}
