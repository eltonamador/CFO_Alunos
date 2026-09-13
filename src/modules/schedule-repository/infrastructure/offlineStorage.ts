import type { CalendarSnapshot } from "../application/calendar";

export const OFFLINE_ROSTER_KEY = "cfo:roster:v1";
const OWNER_KEY = "cfo:roster:owner";
const MAX_AGE = 7 * 86400_000;

export function clearOfflineRoster() {
  try {
    localStorage.removeItem(OFFLINE_ROSTER_KEY);
    localStorage.removeItem(OWNER_KEY);
  } catch {
    /* Armazenamento pode estar bloqueado. */
  }
}

export function setOfflineOwner(userId: string) {
  try {
    if (localStorage.getItem(OWNER_KEY) !== userId) clearOfflineRoster();
    localStorage.setItem(OWNER_KEY, userId);
  } catch {
    /* A consulta online continua disponível. */
  }
}

export function readOfflineRoster(userId: string, now = Date.now()): CalendarSnapshot | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(OFFLINE_ROSTER_KEY) ?? "null",
    ) as CalendarSnapshot | null;
    if (
      !value ||
      value.version !== 1 ||
      value.userId !== userId ||
      localStorage.getItem(OWNER_KEY) !== userId ||
      !Array.isArray(value.entries) ||
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

export function saveOfflineRoster(snapshot: CalendarSnapshot) {
  try {
    // Uma resposta antiga, recebida depois da troca de conta, não restaura dados.
    if (localStorage.getItem(OWNER_KEY) !== snapshot.userId) return false;
    const previous = readOfflineRoster(snapshot.userId);
    const entries = new Map((previous?.entries ?? []).map((entry) => [entry.id, entry]));
    for (const [id, entry] of entries) {
      if (entry.date >= snapshot.start && entry.date <= snapshot.end) entries.delete(id);
    }
    for (const entry of snapshot.entries) entries.set(entry.id, entry);
    // Guardamos o intervalo consultado mais recente. Atualizações de hoje/amanhã
    // substituem as linhas desse intervalo, incluindo cancelamentos.
    const value = {
      ...snapshot,
      entries: [...entries.values()]
        .filter((entry) => entry.date >= snapshot.start && entry.date <= snapshot.end)
        .slice(0, 1000),
    };
    localStorage.setItem(OFFLINE_ROSTER_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
