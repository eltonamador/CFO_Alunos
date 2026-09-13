import { normalizeScheduleText, parseScheduleText, type ScheduleCadetIdentity } from "./parser";

export interface ImportStudent extends ScheduleCadetIdentity {
  classId: string;
  registration: string | null;
}
export interface ImportOfficer {
  person: string;
  profileId: string | null;
  registration: string;
}
export interface ImportToken {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}
export interface ImportRow {
  kind: "cadet" | "officer";
  person: string;
  studentId: string;
  profileId: string;
  date: string;
  dutyFunction: string;
  shift: string;
  startsAt: string;
  endsAt: string;
  sourceLine: string;
}

function tokenDate(text: string) {
  const match = text.match(/\b(\d{2})\/(\d{2})\/(20\d{2})\b/);
  if (!match) return "";
  const date = `${match[3]}-${match[2]}-${match[1]}`;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    ? date
    : "";
}

export function emptyImportRow(defaultDutyFunction: string, date = ""): ImportRow {
  return {
    kind: "cadet",
    person: "",
    studentId: "",
    profileId: "",
    date,
    dutyFunction: defaultDutyFunction,
    shift: "",
    startsAt: "",
    endsAt: "",
    sourceLine: "Linha adicionada na conferência",
  };
}

function matchStudent(text: string, students: ImportStudent[]) {
  const normalized = ` ${normalizeScheduleText(text)} `;
  const matches = students.filter((student) =>
    [student.warName, student.fullName, student.registration ?? ""]
      .map(normalizeScheduleText)
      .filter((alias) => alias.length >= 3)
      .some((alias) => normalized.includes(` ${alias} `)),
  );
  return matches.length === 1 ? matches[0] : null;
}

/** Mantém as colunas da tabela de cadetes (dia ao ano + apoios), sem misturar nomes. */
export function previewCadetTable(
  tokens: ImportToken[],
  students: ImportStudent[],
  fallbackFunction: string,
): ImportRow[] {
  const result: ImportRow[] = [];
  for (const page of [...new Set(tokens.map((token) => token.page))]) {
    const pageTokens = tokens.filter((token) => token.page === page);
    const firstDate = pageTokens
      .filter((token) => tokenDate(token.text))
      .sort((a, b) => a.y - b.y)[0];
    if (!firstDate) continue;
    const header = pageTokens.filter((token) => token.y < firstDate.y);
    const columns: { x: number; duty: string }[] = [];
    for (const token of header) {
      const normalized = normalizeScheduleText(token.text);
      if (normalized.includes("APOIO")) {
        const digit =
          normalized.match(/APOIO\s*(\d)/)?.[1] ??
          header
            .find(
              (other) =>
                /^\d$/.test(other.text.trim()) &&
                Math.abs(other.y - token.y) < 0.03 &&
                other.x > token.x &&
                other.x < token.x + token.width + 0.04,
            )
            ?.text.trim();
        columns.push({ x: token.x + token.width / 2, duty: `Apoio${digit ? ` ${digit}` : ""}` });
      } else if (/\bANO\b/.test(normalized)) {
        const beginning = header.find(
          (other) =>
            /^DIA/.test(normalizeScheduleText(other.text)) &&
            other.x <= token.x &&
            other.x >= token.x - 0.15 &&
            Math.abs(other.y - token.y) < 0.04,
        );
        const phrase = header
          .filter((other) => other.x >= (beginning?.x ?? token.x) && other.x <= token.x)
          .map((other) => normalizeScheduleText(other.text))
          .join(" ");
        const year = phrase.match(/([123])\s*(?:O\s*)?ANO/)?.[1] ?? "1";
        columns.push({
          x: ((beginning?.x ?? token.x) + token.x + token.width) / 2,
          duty: `Dia ao ${year}º Ano`,
        });
      }
    }
    columns.sort((a, b) => a.x - b.x);
    if (columns.length < 2) continue;
    const dated = pageTokens.filter((token) => tokenDate(token.text)).sort((a, b) => a.y - b.y);
    for (const dateToken of dated) {
      const center = dateToken.y + dateToken.height / 2;
      const row = pageTokens.filter(
        (token) =>
          Math.abs(token.y + token.height / 2 - center) < Math.max(0.012, dateToken.height * 0.8),
      );
      const line = row
        .sort((a, b) => a.x - b.x)
        .map((token) => token.text)
        .join(" ");
      const shiftText = normalizeScheduleText(line);
      const shift = /\b1\s*(O\s*)?TURNO\b/.test(shiftText)
        ? "1º turno"
        : /\b2\s*(O\s*)?TURNO\b/.test(shiftText)
          ? "2º turno"
          : /\bUNICO\b/.test(shiftText)
            ? "Único"
            : "";
      columns.forEach((column, index) => {
        const left = index
          ? (columns[index - 1]!.x + column.x) / 2
          : column.x - (columns[1]!.x - column.x) / 2;
        const right = index + 1 < columns.length ? (column.x + columns[index + 1]!.x) / 2 : 1;
        const person = row
          .filter((token) => token.x + token.width / 2 >= left && token.x + token.width / 2 < right)
          .map((token) => token.text)
          .join(" ")
          .trim();
        if (!person || /^[-–—]+$/.test(person)) return;
        const student = matchStudent(person, students);
        result.push({
          ...emptyImportRow(column.duty, tokenDate(dateToken.text)),
          person,
          studentId: student?.id ?? "",
          shift,
          sourceLine: line,
        });
      });
    }
  }
  if (result.length) return result;
  // PDFs de texto com uma atribuição por linha, incluindo o modelo de teste.
  const lines = new Map<string, ImportToken[]>();
  for (const token of tokens) {
    const key = `${token.page}:${Math.round(token.y * 120)}`;
    lines.set(key, [...(lines.get(key) ?? []), token]);
  }
  const text = [...lines.values()]
    .map((line) =>
      line
        .sort((a, b) => a.x - b.x)
        .map((token) => token.text)
        .join(" "),
    )
    .join("\n");
  const parsed = parseScheduleText(text, students, {
    referenceYear: new Date().getFullYear(),
    defaultDutyFunction: fallbackFunction,
  });
  return parsed.candidates.map((candidate) => {
    const parts = (candidate.duty_function ?? fallbackFunction).split(" · ");
    return {
      ...emptyImportRow(parts[0]!, candidate.duty_date ?? ""),
      shift: parts.slice(1).join(" · "),
      person: candidate.raw_name ?? "",
      studentId:
        candidate.candidate_student_ids.length === 1 ? candidate.candidate_student_ids[0]! : "",
      sourceLine: candidate.original_line,
    };
  });
}
