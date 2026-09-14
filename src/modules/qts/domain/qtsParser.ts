import type { QtsDraftActivity } from "./qts";

export type QtsSourceToken = {
  text: string;
  page: number;
  x: number;
  y: number;
};

export type QtsParseResult = {
  periodStart: string;
  periodEnd: string;
  qtsNumber: string | null;
  rows: QtsDraftActivity[];
};

type TimedRow = {
  page: number;
  y: number;
  globalY: number;
  startsAt: string;
  endsAt: string;
  activity: string;
  instructor: string | null;
  workload: string | null;
  uniform: string | null;
  location: string | null;
  sourceLine: string;
};

const TIME = /\b([01]?\d|2[0-3])h([0-5]\d)\b/gi;
const HAS_TIME = /\b([01]?\d|2[0-3])h([0-5]\d)\b/i;
const DATE = /\b(\d{2})\/(\d{2})\/(\d{2,4})\b/;

function isoDate(day: string, month: string, year: string) {
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month}-${day}`;
}

function clean(value: string) {
  const normalized = value
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return /^[-—\s]*$/.test(normalized) ? "" : normalized;
}

function cleanAuxiliary(value: string) {
  return clean(value.replace(/\b(?:INTERVALO|ALMO[ÇC]O|FORMATURA)\b/gi, " "));
}

function minutes(value: string) {
  const [hour = 0, minute = 0] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function normalizeTime(value: string) {
  return value.replace(/^(\d):/, "0$1:");
}

function columnText(tokens: QtsSourceToken[], from: number, to: number) {
  return clean(
    tokens
      .filter(
        (token) =>
          token.x >= from &&
          token.x < to &&
          !/autenticidade do documento|sigdoc\.ap\.gov\.br|c[óo]d\.?(?:\s+verificador|\s+crc)|marcio fonseca da costa/i.test(token.text),
      )
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((token) => token.text)
      .join(" "),
  );
}

function closeGroup<T extends { y: number }>(groups: T[][], token: T, distance: number) {
  const group = groups.at(-1);
  if (!group || Math.abs(group[0]!.y - token.y) > distance) groups.push([token]);
  else group.push(token);
}

function periodFromText(text: string) {
  const match = text.match(/PER[ÍI]ODO\s+DE\s+(\d{1,2})\s+A\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
  if (!match) throw new Error("Não encontrei o período de vigência no PDF do QTS.");
  const [, firstDay, lastDay, month, year] = match;
  return {
    start: isoDate(firstDay!.padStart(2, "0"), month!.padStart(2, "0"), year!),
    end: isoDate(lastDay!.padStart(2, "0"), month!.padStart(2, "0"), year!),
  };
}

function rowsFromTokens(tokens: QtsSourceToken[]) {
  const pages = [...new Set(tokens.map((token) => token.page))].sort((a, b) => a - b);
  const rows: TimedRow[] = [];
  for (const page of pages) {
    const pageTokens = tokens.filter((token) => token.page === page);
    const timeTokens = pageTokens
      .filter((token) => token.x >= 0.35 && token.x < 0.49 && HAS_TIME.test(token.text))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    const groups: QtsSourceToken[][] = [];
    for (const token of timeTokens) closeGroup(groups, token, 0.006);
    const bands = groups
      .map((group) => ({ y: group.reduce((sum, item) => sum + item.y, 0) / group.length, group }))
      .sort((a, b) => a.y - b.y);
    for (const [index, band] of bands.entries()) {
      const previous = bands[index - 1];
      const next = bands[index + 1];
      // Nas primeiras e últimas linhas a página ainda contém cabeçalho e
      // rodapé. Limitamos a faixa a uma altura de célula para não misturá-los
      // à atividade válida.
      const start = previous ? (previous.y + band.y) / 2 : band.y - 0.009;
      const end = next ? (next.y + band.y) / 2 : band.y + 0.009;
      const area = pageTokens.filter((token) => token.y >= start && token.y < end);
      const timeText = columnText(area, 0.35, 0.49);
      const clock = [...timeText.matchAll(TIME)].map((match) => normalizeTime(`${match[1]}:${match[2]}`));
      TIME.lastIndex = 0;
      if (clock.length < 2) continue;
      const activity = columnText(area, 0.16, 0.35);
      if (!activity || /^HOR[ÁA]RIO$/i.test(activity)) continue;
      const workload = columnText(area, 0.49, 0.54) || null;
      const instructor = cleanAuxiliary(columnText(area, 0.54, 0.68)) || null;
      const uniform = columnText(area, 0.68, 0.8) || null;
      const location = columnText(area, 0.8, 0.99) || null;
      rows.push({
        page,
        y: band.y,
        globalY: page + band.y,
        startsAt: clock[0]!,
        endsAt: clock[1]!,
        activity,
        instructor,
        workload,
        uniform,
        location,
        sourceLine: clean(
          [activity, `${clock[0]}-${clock[1]}`, workload, instructor, uniform, location]
            .filter(Boolean)
            .join(" | "),
        ),
      });
    }
  }
  return rows.sort((a, b) => a.page - b.page || a.y - b.y);
}

function documentDates(tokens: QtsSourceToken[]) {
  return tokens
    .filter((token) => token.x < 0.16)
    .flatMap((token) => {
      const match = token.text.match(DATE);
      return match
        ? [{ value: isoDate(match[1]!, match[2]!, match[3]!), globalY: token.page + token.y }]
        : [];
    });
}

function activityIsBreak(activity: string) {
  return /^(INTERVALO|ALMO[ÇC]O|DESCANSO|DESLOCAMENTO)/i.test(activity);
}

/**
 * Lê o layout tabular nativo dos QTS do CFO. A data impressa fica no centro
 * do bloco diário; por isso ela é associada ao grupo cronológico mais próximo.
 */
export function parseQtsTokens(tokens: QtsSourceToken[]): QtsParseResult {
  if (!tokens.length) throw new Error("O PDF não contém texto legível para montar o QTS.");
  const allText = tokens.map((token) => token.text).join(" ");
  const period = periodFromText(allText);
  const qtsNumber = allText.match(/QTS\s*N[ºO°]?\s*(\d+)/i)?.[1] ?? null;
  const timedRows = rowsFromTokens(tokens);
  if (!timedRows.length)
    throw new Error("Não encontrei horários no QTS. Confira se o PDF é a versão original, não uma foto.");

  const groups: TimedRow[][] = [];
  for (const row of timedRows) {
    const current = groups.at(-1);
    const previous = current?.at(-1);
    if (!current || (previous && minutes(row.startsAt) < minutes(previous.startsAt) && minutes(previous.startsAt) >= 12 * 60))
      groups.push([row]);
    else current.push(row);
  }
  const printedDates = documentDates(tokens);
  const fallbackDates = groups.map((_, index) => {
    const date = new Date(`${period.start}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const rows: QtsDraftActivity[] = [];
  for (const [groupIndex, group] of groups.entries()) {
    const closestPrinted = printedDates
      .map((printed) => ({
        ...printed,
        distance: Math.min(...group.map((row) => Math.abs(row.globalY - printed.globalY))),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    const date = closestPrinted?.value ?? fallbackDates[groupIndex]!;
    for (const row of group) {
      rows.push({
        id: `draft-${rows.length + 1}`,
        date,
        sequence: rows.length + 1,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        activity: row.activity,
        instructor: row.instructor,
        workload: row.workload,
        uniform: row.uniform,
        location: row.location,
        isBreak: activityIsBreak(row.activity),
        sourceLine: row.sourceLine,
      });
    }
  }
  return { periodStart: period.start, periodEnd: period.end, qtsNumber, rows };
}
