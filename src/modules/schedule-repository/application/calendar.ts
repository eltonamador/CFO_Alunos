import type { DutyRosterEntry } from "../domain/roster";

export interface CalendarSnapshot {
  version: 1;
  userId: string;
  start: string;
  end: string;
  savedAt: string;
  entries: DutyRosterEntry[];
}
