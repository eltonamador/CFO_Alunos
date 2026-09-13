import { beforeEach, describe, expect, it } from "vitest";
import type { CalendarSnapshot } from "../application/calendar";
import {
  clearOfflineRoster,
  readOfflineRoster,
  saveOfflineRoster,
  setOfflineOwner,
} from "./offlineStorage";

const snapshot: CalendarSnapshot = {
  version: 1,
  userId: "user-a",
  start: "2026-09-01",
  end: "2026-09-30",
  savedAt: "2026-09-13T15:00:00Z",
  entries: [
    { id: "1", kind: "cadet", person: "Teste", duty: "Apoio", date: "2026-09-13", mine: true },
  ],
};
const now = Date.parse(snapshot.savedAt);
beforeEach(() => localStorage.clear());
describe("consulta salva", () => {
  it("isola contas e rejeita uma resposta que chegou depois da troca de usuário", () => {
    setOfflineOwner("user-a");
    saveOfflineRoster(snapshot);
    expect(readOfflineRoster("user-a", now)?.entries).toHaveLength(1);
    expect(readOfflineRoster("user-b", now)).toBeNull();
    setOfflineOwner("user-b");
    expect(saveOfflineRoster(snapshot)).toBe(false);
    expect(readOfflineRoster("user-a", now)).toBeNull();
  });
  it("remove designações canceladas em uma atualização vazia", () => {
    setOfflineOwner("user-a");
    saveOfflineRoster(snapshot);
    saveOfflineRoster({ ...snapshot, entries: [] });
    expect(readOfflineRoster("user-a", now)?.entries).toEqual([]);
  });
  it("descarta cópia vencida e limpa ao sair", () => {
    setOfflineOwner("user-a");
    saveOfflineRoster(snapshot);
    expect(readOfflineRoster("user-a", now + 8 * 86400_000)).toBeNull();
    clearOfflineRoster();
    expect(readOfflineRoster("user-a", now)).toBeNull();
  });
});
