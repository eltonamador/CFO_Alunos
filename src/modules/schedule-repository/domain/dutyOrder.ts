import type { DutyRosterEntry } from "./roster";

function normalizeDuty(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function functionPriority(duty: string) {
  const normalized = normalizeDuty(duty);
  if (/^DIA\s+(?:AO\s+)?(?:1[O°]?|PRIMEIRO)\s+ANO\b/.test(normalized)) return 0;
  const support = normalized.match(/^(?:APOIO\s*|P\s*)([123])\b/);
  return support ? Number(support[1]) : 4;
}

function shiftPriority(duty: string) {
  const shift = normalizeDuty(duty).match(/\b([12])[O°]?\s*TURNO\b/);
  return shift ? Number(shift[1]) : 0;
}

/** A função vem antes do turno e do nome; os dois turnos continuam visíveis. */
export function sortCadetDuties(entries: readonly DutyRosterEntry[]): DutyRosterEntry[] {
  return [...entries].sort(
    (a, b) =>
      functionPriority(a.duty) - functionPriority(b.duty) ||
      shiftPriority(a.duty) - shiftPriority(b.duty) ||
      a.person.localeCompare(b.person, "pt-BR", { numeric: true }) ||
      a.id.localeCompare(b.id),
  );
}
