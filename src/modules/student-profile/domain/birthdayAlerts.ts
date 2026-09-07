export const BIRTHDAY_TIME_ZONE = "America/Belem";

export type BirthdayAlertPeriod = "today" | "tomorrow";

export interface BirthdayStudent {
  id: string;
  fullName: string;
  birthDate: string | null;
}

export interface BirthdayAlert {
  studentId: string;
  cadetName: string;
  birthDate: string;
  occurrenceDate: string;
  age: number;
  period: BirthdayAlertPeriod;
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function toCalendarDate(date: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
  };
}

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function parseDateOnly(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function toDateOnly(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function sameMonthAndDay(left: CalendarDate, right: CalendarDate): boolean {
  return left.month === right.month && left.day === right.day;
}

/**
 * Calcula alertas a partir da data civil armazenada no banco, sem converter
 * `birth_date` para UTC. Isso evita deslocar o aniversário para o dia anterior.
 */
export function getBirthdayAlerts(
  students: BirthdayStudent[],
  now: Date = new Date(),
  timeZone = BIRTHDAY_TIME_ZONE,
): BirthdayAlert[] {
  const today = toCalendarDate(now, timeZone);
  const tomorrow = addCalendarDays(today, 1);
  const alerts: BirthdayAlert[] = [];

  for (const student of students) {
    if (!student.birthDate) continue;

    const birthDate = parseDateOnly(student.birthDate);
    if (!birthDate) continue;

    const period = sameMonthAndDay(birthDate, today)
      ? "today"
      : sameMonthAndDay(birthDate, tomorrow)
        ? "tomorrow"
        : null;

    if (!period) continue;

    const occurrence = period === "today" ? today : tomorrow;
    alerts.push({
      studentId: student.id,
      cadetName: student.fullName,
      birthDate: student.birthDate,
      occurrenceDate: toDateOnly(occurrence),
      age: occurrence.year - birthDate.year,
      period,
    });
  }

  return alerts.sort((left, right) => {
    if (left.period !== right.period) return left.period === "today" ? -1 : 1;
    return left.cadetName.localeCompare(right.cadetName, "pt-BR");
  });
}

export function formatBirthdayDate(date: string): string {
  const parsed = parseDateOnly(date);
  if (!parsed) return date;
  return `${String(parsed.day).padStart(2, "0")}/${String(parsed.month).padStart(2, "0")}/${parsed.year}`;
}
