import type { DutyRosterEntry } from "./roster";

export type CalendarView = "week" | "month";
export type CalendarFilter = "todos" | "minhas" | "cadetes" | "oficiais";

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function calendarRange(anchor: string, view: CalendarView) {
  const value = new Date(`${anchor}T12:00:00Z`);
  if (view === "week") {
    const start = shiftDate(anchor, -((value.getUTCDay() + 6) % 7));
    return { start, end: shiftDate(start, 6) };
  }
  const start = `${anchor.slice(0, 7)}-01`;
  const next = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0, 12));
  return { start, end: next.toISOString().slice(0, 10) };
}

export function moveCalendar(anchor: string, view: CalendarView, direction: number) {
  if (view === "week") return shiftDate(anchor, direction * 7);
  const value = new Date(`${anchor}T12:00:00Z`);
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + direction, 1, 12))
    .toISOString()
    .slice(0, 10);
}

export function calendarDays(start: string, end: string) {
  const days: string[] = [];
  for (let date = start; date <= end && days.length < 63; date = shiftDate(date, 1))
    days.push(date);
  return days;
}

export function filterCalendar(entries: DutyRosterEntry[], filter: CalendarFilter) {
  return entries.filter((entry) =>
    filter === "minhas"
      ? entry.mine
      : filter === "cadetes"
        ? entry.kind === "cadet"
        : filter === "oficiais"
          ? entry.kind === "officer"
          : true,
  );
}
