import { addDays, calendarDay } from "./rotation";

export type WeeklyUnavailability = {
  starts_on: string;
  ends_on: string;
  window_start_dow?: number | null;
  window_start?: string | null;
  window_minutes?: number | null;
};

/**
 * Janela semanal recorrente em horário de Belém (ex.: guarda do sábado, de sexta 18h a
 * sábado 19h). Verdadeiro quando alguma ocorrência vigente cruza o serviço proposto.
 */
export function weeklyWindowOverlaps(
  rule: WeeklyUnavailability,
  startsAt: string,
  endsAt: string,
): boolean {
  if (rule.window_start_dow == null || !rule.window_start || !rule.window_minutes) return false;
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  const last = calendarDay(end, "America/Belem");
  for (
    let day = addDays(calendarDay(start, "America/Belem"), -7);
    day <= last;
    day = addDays(day, 1)
  ) {
    if (day < rule.starts_on || day > rule.ends_on) continue;
    if (new Date(`${day}T12:00:00Z`).getUTCDay() !== rule.window_start_dow) continue;
    const opens = Date.parse(`${day}T${rule.window_start.slice(0, 5)}:00-03:00`);
    if (opens < end && opens + rule.window_minutes * 60_000 > start) return true;
  }
  return false;
}
