import type { QtsSnapshot } from "../domain/qts";

export const QTS_OFFLINE_KEY = "cfo:qts:v1";
const OWNER_KEY = "cfo:qts:owner";
const MAX_AGE = 7 * 86400_000;

export function clearOfflineQts() {
  try {
    localStorage.removeItem(QTS_OFFLINE_KEY);
    localStorage.removeItem(OWNER_KEY);
  } catch {
    // Armazenamento local pode estar indisponível.
  }
}

export function setOfflineQtsOwner(userId: string) {
  try {
    if (localStorage.getItem(OWNER_KEY) !== userId) clearOfflineQts();
    localStorage.setItem(OWNER_KEY, userId);
  } catch {
    // A consulta online permanece disponível.
  }
}

export function readOfflineQts(userId: string, now = Date.now()): QtsSnapshot | null {
  try {
    const value = JSON.parse(localStorage.getItem(QTS_OFFLINE_KEY) ?? "null") as QtsSnapshot | null;
    if (
      !value ||
      value.version !== 1 ||
      value.userId !== userId ||
      localStorage.getItem(OWNER_KEY) !== userId ||
      !Array.isArray(value.entries) ||
      !Array.isArray(value.documents) ||
      !Number.isFinite(Date.parse(value.savedAt)) ||
      now - Date.parse(value.savedAt) > MAX_AGE ||
      Date.parse(value.savedAt) > now + 60_000
    )
      return null;
    return value;
  } catch {
    return null;
  }
}

export function saveOfflineQts(snapshot: QtsSnapshot) {
  try {
    if (localStorage.getItem(OWNER_KEY) !== snapshot.userId) return false;
    localStorage.setItem(QTS_OFFLINE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}
