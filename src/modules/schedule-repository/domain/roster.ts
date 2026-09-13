export interface DutyRosterEntry {
  id: string;
  kind: "cadet" | "officer";
  date: string;
  person: string;
  duty: string;
  mine: boolean;
}

export interface DutyOverview {
  today: string;
  tomorrow: string;
  entries: DutyRosterEntry[];
  unavailable: boolean;
  userId?: string;
  updatedAt?: string;
}
