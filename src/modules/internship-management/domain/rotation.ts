import {
  minimumRestLoad,
  rotationCalendarLoad,
  REST_PRIORITY_CEILING_MINUTES,
  type ServiceInterval,
} from "./rotationFairness";
import type { RotationDuty } from "./permanence";
import { minutesBetween } from "./workload";

export type RotationCadet = {
  id: string;
  war_name: string | null;
  student_number: number | null;
  birthMonthDay?: string | null;
};
export type RotationAssignment = {
  studentId: string;
  startsAt: string;
  endsAt: string;
  activityCode?: string | null;
  siteName?: string | null;
  plannedMinutes: number;
  approvedMinutes: number | null;
  active: boolean;
};
export type RotationCommitment = { studentId: string; startsAt: string; endsAt: string };
export type RotationCandidate = RotationCadet & {
  approvedMinutes: number;
  reservedMinutes: number;
  committedMinutes: number;
  projectedMinutes: number;
  permanenceMinutes: number;
  unknownDutyDays: number;
  serviceDays: number;
  combinedMinutes: number;
  sameActivityShifts: number;
  sameSiteShifts: number;
  restBeforeMinutes: number | null;
  restAfterMinutes: number | null;
  lastServiceEndsAt: string | null;
  weekendCount: number;
  weekendMinutes: number;
  weekdayMinutes: number;
  projectedWeekendCount: number;
  projectedWeekendStreak: number;
  isWeekendService: boolean;
  minimumRestOccurrences: number;
  projectedMinimumRestMaximum: number;
  minimumRestLimitExceeded: boolean;
  reasons: string[];
};

const dayFormatters = new Map<string, Intl.DateTimeFormat>();
/** Calendar days in the program's timezone; never use the browser's local timezone. */
export function calendarDay(instant: string | number, timezone: string): string {
  let formatter = dayFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dayFormatters.set(timezone, formatter);
  }
  const parts = formatter.formatToParts(new Date(instant));
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function addDays(day: string, count: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + count * 86_400_000).toISOString().slice(0, 10);
}

/** Inclui o plantão noturno que atravessa a meia-noite do aniversário. */
export function serviceOverlapsBirthday(
  birthMonthDay: string | null | undefined,
  startsAt: string,
  endsAt: string,
  timezone: string,
): boolean {
  if (!birthMonthDay || Date.parse(endsAt) <= Date.parse(startsAt)) return false;
  const last = calendarDay(Date.parse(endsAt) - 1, timezone);
  for (let day = calendarDay(startsAt, timezone); day <= last; day = addDays(day, 1)) {
    if (day.slice(5) === birthMonthDay) return true;
  }
  return false;
}

/** Shared hard rest rules for ranking and the weekly combination search. */
export function rotationRestAvailability(services: ServiceInterval[], proposed: ServiceInterval) {
  const start = Date.parse(proposed.startsAt);
  const end = Date.parse(proposed.endsAt);
  const minimumRestMs = 24 * 60 * 60 * 1000;
  const reasons = new Set<string>();
  const restLoad = minimumRestLoad(services, proposed);
  if (restLoad.minimumRestLimitExceeded)
    reasons.add("Limite de três descansos de 24 horas em 28 dias excedido");
  let previous = -Infinity;
  let next = Infinity;
  for (const row of services) {
    const from = Date.parse(row.startsAt);
    const to = Date.parse(row.endsAt);
    if (from < end && to > start) reasons.add("Serviço no mesmo horário");
    else if (to <= start && start - to < minimumRestMs)
      reasons.add("Descanso anterior inferior a 24 horas");
    else if (from >= end && from - end < minimumRestMs)
      reasons.add("Descanso posterior inferior a 24 horas");
    if (to <= start) previous = Math.max(previous, to);
    if (from >= end) next = Math.min(next, from);
  }
  return {
    ...restLoad,
    restBeforeMinutes: Number.isFinite(previous) ? (start - previous) / 60_000 : null,
    restAfterMinutes: Number.isFinite(next) ? (next - end) / 60_000 : null,
    lastServiceEndsAt: Number.isFinite(previous) ? new Date(previous).toISOString() : null,
    reasons: [...reasons],
  };
}

export function rankRotationCandidates(input: {
  cadets: RotationCadet[];
  assignments: RotationAssignment[];
  commitments: RotationCommitment[];
  startsAt: string;
  endsAt: string;
  timezone: string;
  blocked: Record<string, string[]>;
  duties?: RotationDuty[];
  targetActivityCode?: string;
  targetSiteName?: string;
}): RotationCandidate[] {
  const duration = minutesBetween(input.startsAt, input.endsAt);
  return input.cadets
    .map((cadet) => {
      let approvedMinutes = 0;
      let reservedMinutes = 0;
      const history = input.assignments.filter((item) => item.studentId === cadet.id);
      for (const row of history) {
        if (row.approvedMinutes !== null) approvedMinutes += row.approvedMinutes;
        else if (row.active) reservedMinutes += row.plannedMinutes;
      }
      const effectiveHistory = history.filter(
        (row) => (row.active && row.approvedMinutes === null) || (row.approvedMinutes ?? 0) > 0,
      );
      const sameActivityShifts = input.targetActivityCode
        ? effectiveHistory.filter((row) => row.activityCode === input.targetActivityCode).length
        : 0;
      const sameSiteShifts = input.targetSiteName
        ? effectiveHistory.filter((row) => row.siteName === input.targetSiteName).length
        : 0;
      const duties = (input.duties ?? []).filter((d) => d.studentId === cadet.id);
      const permanenceMinutes = duties.reduce(
        (sum, d) => sum + (d.startsAt && d.endsAt ? minutesBetween(d.startsAt, d.endsAt) : 0),
        0,
      );
      const unknownDutyDays = duties.filter((d) => !d.startsAt || !d.endsAt).length;
      const serviceDates = new Set<string>();
      for (const d of duties) {
        const final = d.endsAt ? calendarDay(Date.parse(d.endsAt) - 1, input.timezone) : d.date;
        for (let day = d.date; day <= final; day = addDays(day, 1)) serviceDates.add(day);
      }
      for (const row of input.assignments.filter(
        (a) => a.studentId === cadet.id && (a.active || a.approvedMinutes !== null),
      )) {
        for (
          let day = calendarDay(row.startsAt, input.timezone);
          day <= calendarDay(Date.parse(row.endsAt) - 1, input.timezone);
          day = addDays(day, 1)
        )
          serviceDates.add(day);
      }
      const reasons = new Set(input.blocked[cadet.id] ?? []);
      if (serviceOverlapsBirthday(cadet.birthMonthDay, input.startsAt, input.endsAt, input.timezone))
        reasons.add("Serviço no dia do aniversário");
      const timedServices = [
        ...input.commitments.filter((item) => item.studentId === cadet.id),
        ...duties
          .filter((d) => d.startsAt && d.endsAt)
          .map((d) => ({ startsAt: d.startsAt!, endsAt: d.endsAt!, kind: "permanencia" })),
      ];
      const proposed = { startsAt: input.startsAt, endsAt: input.endsAt };
      const availability = rotationRestAvailability(timedServices, proposed);
      availability.reasons.forEach((reason) => reasons.add(reason));
      const calendarLoad = rotationCalendarLoad(
        [...effectiveHistory, ...timedServices],
        proposed,
        input.timezone,
      );
      const committedMinutes = approvedMinutes + reservedMinutes;
      return {
        ...cadet,
        ...calendarLoad,
        ...availability,
        approvedMinutes,
        reservedMinutes,
        committedMinutes,
        permanenceMinutes,
        unknownDutyDays,
        serviceDays: serviceDates.size,
        combinedMinutes: committedMinutes + permanenceMinutes,
        sameActivityShifts,
        sameSiteShifts,
        projectedMinutes: committedMinutes + duration,
        reasons: [...reasons],
      };
    })
    .sort((a, b) => {
      const available = Number(a.reasons.length > 0) - Number(b.reasons.length > 0);
      if (available) return available;
      const restA = Math.min(a.restBeforeMinutes ?? Infinity, a.restAfterMinutes ?? Infinity);
      const restB = Math.min(b.restBeforeMinutes ?? Infinity, b.restAfterMinutes ?? Infinity);
      // Once both have 72h, weekend fairness and workload take precedence over extra rest.
      const recoveryA = Math.min(restA, REST_PRIORITY_CEILING_MINUTES);
      const recoveryB = Math.min(restB, REST_PRIORITY_CEILING_MINUTES);
      if (recoveryA !== recoveryB) return recoveryB - recoveryA;
      if (a.isWeekendService) {
        if (a.projectedWeekendStreak !== b.projectedWeekendStreak)
          return a.projectedWeekendStreak - b.projectedWeekendStreak;
        if (a.projectedWeekendCount !== b.projectedWeekendCount)
          return a.projectedWeekendCount - b.projectedWeekendCount;
        if (a.weekendMinutes !== b.weekendMinutes) return a.weekendMinutes - b.weekendMinutes;
      }
      if (a.minimumRestOccurrences !== b.minimumRestOccurrences)
        return a.minimumRestOccurrences - b.minimumRestOccurrences;
      if (a.combinedMinutes !== b.combinedMinutes) return a.combinedMinutes - b.combinedMinutes;
      if (a.sameActivityShifts !== b.sameActivityShifts)
        return a.sameActivityShifts - b.sameActivityShifts;
      if (a.sameSiteShifts !== b.sameSiteShifts) return a.sameSiteShifts - b.sameSiteShifts;
      if (a.serviceDays !== b.serviceDays) return a.serviceDays - b.serviceDays;
      if (restA !== restB) return restA > restB ? -1 : 1;
      // Stable initial tie break; subsequent reserved hours change the priority.
      return (
        (a.student_number ?? Infinity) - (b.student_number ?? Infinity) || a.id.localeCompare(b.id)
      );
    });
}
