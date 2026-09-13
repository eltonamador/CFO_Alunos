import { normalizeScheduleText } from "./parser";

export interface OfficerTextItem {
  text: string;
  x: number;
  y: number;
}

export interface OfficerIdentity {
  serviceAlias: string;
  profileId: string | null;
}

export interface ParsedOfficerDuty {
  sequence: number;
  duty_date: string;
  display_name: string;
  duty_function: string;
  shift: "manha" | "tarde" | "noite" | "diurno" | "noturno";
  starts_at: string;
  ends_at: string;
  profile_id: string | null;
  source_line: string;
}

function dateFromItem(text: string) {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(20\d{2})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftFor(x: number, width: number, weekend: boolean) {
  if (weekend) return x < width * 0.6 ? "diurno" : "noturno";
  if (x < width * 0.54) return "manha";
  return x < width * 0.75 ? "tarde" : "noite";
}

const TIMES = {
  manha: ["07:00", "13:00"],
  tarde: ["13:00", "19:00"],
  noite: ["19:00", "07:00"],
  diurno: ["07:00", "19:00"],
  noturno: ["19:00", "07:00"],
} as const;

/** Lê apenas células de serviço da tabela ODA; ignora prescrição e observações. */
export function parseOfficerRosterItems(
  items: OfficerTextItem[],
  pageWidth: number,
  identities: OfficerIdentity[],
): ParsedOfficerDuty[] {
  const heading = items.some((item) =>
    normalizeScheduleText(item.text).includes("ESCALA DE SERVICO N") &&
    normalizeScheduleText(item.text).includes("OFICIAL DE DIA"),
  );
  if (!heading) return [];

  const dates = items
    .filter((item) => item.x < pageWidth * 0.25)
    .map((item) => ({ ...item, date: dateFromItem(item.text) }))
    .filter((item): item is OfficerTextItem & { date: string } => item.date !== null);
  const entries: ParsedOfficerDuty[] = [];
  for (const row of dates) {
    const weekday = new Date(`${row.date}T00:00:00Z`).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    const names = items.filter(
      (item) => item.x > pageWidth * 0.3 && item.y > row.y + 1 && item.y < row.y + 10 &&
        /^(TEN|CAP|MAJ|CEL|SGT|SUBTEN|ASP)\b/.test(normalizeScheduleText(item.text)),
    );
    for (const name of names) {
      const shift = shiftFor(name.x, pageWidth, weekend);
      const functionItem = items.find(
        (item) => item.y < row.y - 1 && item.y > row.y - 10 &&
          shiftFor(item.x, pageWidth, weekend) === shift &&
          /^(ODA|SUPERIOR DE DIA)/.test(normalizeScheduleText(item.text)),
      );
      if (!functionItem) continue;
      const normalizedName = normalizeScheduleText(name.text);
      const matches = identities.filter(
        (identity) => normalizeScheduleText(identity.serviceAlias) === normalizedName,
      );
      const [starts_at, ends_at] = TIMES[shift];
      entries.push({
        sequence: entries.length + 1,
        duty_date: row.date,
        display_name: name.text.trim(),
        duty_function: functionItem.text.trim(),
        shift,
        starts_at,
        ends_at,
        profile_id: matches.length === 1 ? matches[0]?.profileId ?? null : null,
        source_line: `${row.text.trim()} · ${name.text.trim()} · ${functionItem.text.trim()}`,
      });
    }
  }
  return entries;
}
