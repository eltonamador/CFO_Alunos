export const SCHEDULE_PARSER_REVISION = "schedule-parser/1.1.0";

export interface ScheduleCadetIdentity {
  id: string;
  studentNumber: number | null;
  fullName: string;
  warName: string;
}

export interface ScheduleParsedCandidate {
  sequence: number;
  raw_name: string | null;
  duty_date: string | null;
  duty_function: string | null;
  original_line: string;
  match_status: "auto_confirmed" | "needs_review" | "not_found";
  confidence: number;
  match_reasons: string[];
  candidate_student_ids: string[];
  matched_student_id: string | null;
}

export interface ScheduleParseResult {
  candidates: ScheduleParsedCandidate[];
  metrics: {
    lineCount: number;
    candidateCount: number;
    autoConfirmedCount: number;
    reviewCount: number;
    ignoredLineCount: number;
  };
  status: "succeeded" | "partial";
}

export function normalizeScheduleText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function parseDate(line: string, referenceYear: number) {
  const iso = line.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  const local = line.match(/\b(0?[1-9]|[12]\d|3[01])[/.\-](0?[1-9]|1[0-2])(?:[/.\-](20\d{2}))?\b/);
  const parts = iso
    ? { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }
    : local
      ? { year: Number(local[3] ?? referenceYear), month: Number(local[2]), day: Number(local[1]) }
      : null;
  if (!parts) return null;
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (
    value.getUTCFullYear() !== parts.year ||
    value.getUTCMonth() !== parts.month - 1 ||
    value.getUTCDate() !== parts.day
  ) {
    return null;
  }
  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

function aliases(cadet: ScheduleCadetIdentity) {
  return [cadet.fullName, cadet.warName]
    .map(normalizeScheduleText)
    .filter((value, index, list) => value.length >= 3 && list.indexOf(value) === index);
}

function lineContainsAlias(line: string, alias: string) {
  return ` ${line} `.includes(` ${alias} `);
}

export function parseScheduleText(
  text: string,
  cadets: ScheduleCadetIdentity[],
  options: { referenceYear: number; defaultDutyFunction: string },
): ScheduleParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const candidates: ScheduleParsedCandidate[] = [];
  let currentDate: string | null = null;

  for (const originalLine of lines) {
    currentDate = parseDate(originalLine, options.referenceYear) ?? currentDate;
    const normalizedLine = normalizeScheduleText(originalLine);
    const matched = cadets.filter((cadet) =>
      aliases(cadet).some((alias) => lineContainsAlias(normalizedLine, alias)),
    );
    if (!matched.length) continue;

    const uniqueIds = [...new Set(matched.map((cadet) => cadet.id))];
    const exact = uniqueIds.length === 1;
    // Um nome de guerra também pode pertencer a um oficial citado no documento.
    // Só publique automaticamente quando a própria linha o identificar como cadete.
    const explicitCadet = /\b(CADETE|CAD)\b/.test(normalizedLine);
    const complete =
      exact && explicitCadet && Boolean(currentDate) && Boolean(options.defaultDutyFunction.trim());
    const cadet = exact ? matched[0] : null;
    candidates.push({
      sequence: candidates.length + 1,
      raw_name: cadet?.warName || cadet?.fullName || originalLine,
      duty_date: currentDate,
      duty_function: options.defaultDutyFunction.trim() || null,
      original_line: originalLine,
      match_status: complete ? "auto_confirmed" : "needs_review",
      confidence: complete ? 0.99 : exact ? 0.85 : 0.6,
      match_reasons: [
        exact ? "nome_exato_unico" : "nome_ambiguo",
        explicitCadet ? "cadete_explicito" : "identidade_cadete_nao_confirmada",
        currentDate ? "data_valida" : "data_ausente",
        options.defaultDutyFunction.trim() ? "funcao_tipo_documento" : "funcao_ausente",
      ],
      candidate_student_ids: uniqueIds,
      matched_student_id: complete ? (uniqueIds[0] ?? null) : null,
    });
  }

  const reviewCount = candidates.filter(
    (candidate) => candidate.match_status !== "auto_confirmed",
  ).length;
  return {
    candidates,
    metrics: {
      lineCount: lines.length,
      candidateCount: candidates.length,
      autoConfirmedCount: candidates.length - reviewCount,
      reviewCount,
      ignoredLineCount: lines.length - candidates.length,
    },
    status: candidates.length > 0 && reviewCount === 0 ? "succeeded" : "partial",
  };
}
