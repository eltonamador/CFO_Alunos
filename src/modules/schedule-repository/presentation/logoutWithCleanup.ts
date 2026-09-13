"use client";
import { logoutAction } from "@/modules/identity/presentation/actions/authActions";
import { clearOfflineRoster } from "../infrastructure/offlineStorage";

export async function logoutWithCleanup() {
  clearOfflineRoster();
  await logoutAction();
}
