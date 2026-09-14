export const HOUR_CLASS_MINUTES = 50;

export type SessionProjectionStatus = "on_track" | "deficit_risk" | "insufficient_data";

export function hoursFromTimes(start: string | null, end: string | null): number | null {
  if (!start || !end || !/^\d{2}:\d{2}(:\d{2})?$/.test(start) || !/^\d{2}:\d{2}(:\d{2})?$/.test(end))
    return null;
  const minutes = (value: string) => {
    const [hours, mins] = value.split(":").map(Number);
    return (hours ?? 0) * 60 + (mins ?? 0);
  };
  const duration = minutes(end) - minutes(start);
  return duration > 0 ? Math.round((duration / HOUR_CLASS_MINUTES) * 100) / 100 : null;
}

export function projectedWorkload(input: {
  adoptedHours: number;
  taughtHours: number;
  scheduledFutureHours: number;
  hasAcademicYear: boolean;
  hasMappedFuturePlan: boolean;
}) {
  const remainingHours = Math.max(0, Math.round((input.adoptedHours - input.taughtHours) * 100) / 100);
  const projectedHours = Math.round((input.taughtHours + input.scheduledFutureHours) * 100) / 100;
  const status: SessionProjectionStatus =
    !input.hasAcademicYear || (!input.hasMappedFuturePlan && remainingHours > 0)
      ? "insufficient_data"
      : projectedHours >= input.adoptedHours
        ? "on_track"
        : "deficit_risk";
  return {
    taughtHours: input.taughtHours,
    remainingHours,
    scheduledFutureHours: input.scheduledFutureHours,
    projectedHours,
    deficitHours: Math.max(0, Math.round((input.adoptedHours - projectedHours) * 100) / 100),
    status,
  };
}

export function instructionalDays(input: {
  startsOn: string;
  endsOn: string;
  blockedDates: readonly string[];
  asOf?: string;
}) {
  const start = new Date(`${input.startsOn}T12:00:00Z`);
  const end = new Date(`${input.endsOn}T12:00:00Z`);
  const blocked = new Set(input.blockedDates);
  const asOf = input.asOf ? new Date(`${input.asOf}T12:00:00Z`) : new Date();
  let total = 0;
  let elapsed = 0;
  for (let day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const key = day.toISOString().slice(0, 10);
    const weekDay = day.getUTCDay();
    if (weekDay === 0 || weekDay === 6 || blocked.has(key)) continue;
    total += 1;
    if (day <= asOf) elapsed += 1;
  }
  return { total, elapsed, remaining: Math.max(0, total - elapsed) };
}
