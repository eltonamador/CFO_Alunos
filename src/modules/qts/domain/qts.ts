export const QTS_TIME_ZONE = "America/Belem";

export type QtsActivity = {
  id: string;
  documentId: string;
  date: string;
  sequence: number;
  startsAt: string | null;
  endsAt: string | null;
  activity: string;
  instructor: string | null;
  workload: string | null;
  uniform: string | null;
  location: string | null;
  isBreak: boolean;
  originalFilename: string;
};

export type QtsDocument = {
  id: string;
  periodStart: string | null;
  periodEnd: string | null;
  originalFilename: string;
  downloadUrl: string | null;
};

export type QtsSnapshot = {
  version: 1;
  userId: string;
  start: string;
  end: string;
  savedAt: string;
  entries: QtsActivity[];
  documents: QtsDocument[];
};

export type QtsDraftActivity = Omit<QtsActivity, "documentId" | "originalFilename"> & {
  sourceLine: string;
};

export function macapaDate(now = new Date()) {
  return now.toLocaleDateString("sv-SE", { timeZone: QTS_TIME_ZONE });
}

export function shiftQtsDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function qtsWeekRange(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const start = shiftQtsDate(date, -((value.getUTCDay() + 6) % 7));
  return { start, end: shiftQtsDate(start, 6) };
}

export function qtsDateLabel(date: string, includeYear = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    ...(includeYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function qtsShortDateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function qtsTime(value: string | null) {
  return value ? value.slice(0, 5) : "—";
}

export function isQtsActivityNow(activity: QtsActivity, now = new Date()) {
  if (!activity.startsAt || !activity.endsAt || activity.date !== macapaDate(now)) return false;
  const current = now.toLocaleTimeString("sv-SE", {
    timeZone: QTS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return current >= activity.startsAt.slice(0, 5) && current < activity.endsAt.slice(0, 5);
}

export function qtsDocumentForDate(documents: QtsDocument[], date: string) {
  return documents.find(
    (document) =>
      (!document.periodStart || document.periodStart <= date) &&
      (!document.periodEnd || document.periodEnd >= date),
  );
}
