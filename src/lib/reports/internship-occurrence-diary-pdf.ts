import PDFDocument from "pdfkit";
import {
  DIARY_NOTICE,
  PARTICIPATIONS,
  SEVERITIES,
  formatDiaryDate,
  occurrenceTypeLabel,
  optionLabel,
  type DiaryBadge,
  type DiaryEntry,
} from "@/modules/internship-management/domain/occurrenceDiary";

// Lembrança pessoal do cadete: sem brasão, cabeçalho institucional ou assinatura, para não
// parecer documento oficial do estágio.
export type OccurrenceDiaryPdfInput = {
  cadet: string;
  /** Registros salvos (sem rascunhos), em ordem cronológica. */
  entries: DiaryEntry[];
  shiftLabels: ReadonlyMap<string, string>;
  names: ReadonlyMap<string, string>;
  reactionTotals: ReadonlyMap<string, number>;
  badges: DiaryBadge[];
  issuedAt: string;
};

const MARGIN = 56;
const COLORS = { ink: "#111827", soft: "#374151", muted: "#6B7280", accent: "#7B1818", line: "#D4D4D8" };
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

/** As fontes padrão do PDF usam WinAnsi: emojis e símbolos fora da tabela são removidos. */
export function pdfSafe(text: string): string {
  return [...text.normalize("NFC")]
    .filter((char) => {
      const code = char.codePointAt(0)!;
      return (
        char === "\n" ||
        (code >= 0x20 && code <= 0x7e) ||
        (code >= 0xa0 && code <= 0xff) ||
        WIN_ANSI_EXTRA.includes(char)
      );
    })
    .join("")
    .replace(/ {2,}/g, " ")
    .trim();
}

export async function buildOccurrenceDiaryPDF(input: OccurrenceDiaryPdfInput): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: 64, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: {
      Title: "Meu diário de ocorrências",
      Author: pdfSafe(input.cadet),
      Subject: "Registro pessoal e extraoficial do estágio",
    },
  });
  const chunks: Buffer[] = [];
  const output = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const width = doc.page.width - 2 * MARGIN;
  const entries = input.entries;
  const shared = entries.filter((entry) => entry.status === "compartilhado" && !entry.hidden_at);
  const types = new Set(entries.map((entry) => entry.occurrence_type).filter(Boolean)).size;
  const earned = input.badges.filter((badge) => badge.earned).map((badge) => badge.label);

  doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted);
  doc.text("ESTÁGIO SUPERVISIONADO · LEMBRANÇA PESSOAL", { characterSpacing: 1 });
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(26).fillColor(COLORS.ink).text("Meu diário de ocorrências");
  doc.font("Helvetica").fontSize(14).fillColor(COLORS.soft).text(pdfSafe(input.cadet));
  doc.moveDown(0.8);
  const period = entries.length
    ? ` de ${formatDiaryDate(entries[0]!.occurred_on)} a ${formatDiaryDate(entries.at(-1)!.occurred_on)}`
    : "";
  doc
    .fontSize(11)
    .fillColor(COLORS.ink)
    .text(
      `${entries.length} ${entries.length === 1 ? "registro" : "registros"}${period} · ${types} ${
        types === 1 ? "tipo vivido" : "tipos diferentes"
      } · ${shared.length} no mural da turma`,
      { width },
    );
  if (earned.length) doc.moveDown(0.3).text(`Insígnias: ${earned.join(" · ")}`, { width });
  doc.moveDown(0.9);

  const notice = `${DIARY_NOTICE} Documento pessoal, sem valor oficial.`;
  doc.fontSize(9);
  const boxTop = doc.y;
  const boxHeight = doc.heightOfString(notice, { width: width - 20 }) + 16;
  doc.roundedRect(MARGIN, boxTop, width, boxHeight, 4).fillAndStroke("#F4F4F5", COLORS.line);
  doc.fillColor(COLORS.soft).text(notice, MARGIN + 10, boxTop + 8, { width: width - 20 });
  doc.x = MARGIN;
  doc.y = boxTop + boxHeight + 20;

  for (const entry of entries) {
    if (doc.y + 110 > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const reactions = input.reactionTotals.get(entry.id) ?? 0;
    const meta = [
      entry.assignment_id ? input.shiftLabels.get(entry.assignment_id) : null,
      occurrenceTypeLabel(entry.occurrence_type, entry.other_type),
      optionLabel(SEVERITIES, entry.severity),
      optionLabel(PARTICIPATIONS, entry.participation),
      entry.vehicle ? `Viatura ${entry.vehicle}` : null,
    ].filter(Boolean);
    const companions = entry.companion_ids.map((id) => input.names.get(id) ?? "Cadete");
    const visibleOnMural = entry.status === "compartilhado" && !entry.hidden_at;
    const extra = [
      companions.length ? `Com ${companions.join(", ")}` : null,
      entry.protocol_number ? `Ocorrência nº ${entry.protocol_number}` : null,
      visibleOnMural
        ? `Compartilhado no mural${reactions ? ` · ${reactions} ${reactions === 1 ? "reação" : "reações"}` : ""}`
        : null,
      visibleOnMural && entry.featured_at ? "Destaque da Coordenação" : null,
    ].filter(Boolean);

    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.accent);
    doc.text(formatDiaryDate(entry.occurred_on), { width });
    doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.ink);
    doc.text(pdfSafe(entry.summary), { width });
    if (meta.length) {
      doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.muted);
      doc.text(pdfSafe(meta.join(" · ")), { width });
    }
    if (entry.perception) {
      doc.moveDown(0.4).font("Helvetica-Oblique").fontSize(10.5).fillColor(COLORS.soft);
      doc.text(pdfSafe(entry.perception), { width, lineGap: 2 });
    }
    if (entry.description) {
      doc.moveDown(0.4).font("Helvetica").fontSize(10.5).fillColor(COLORS.ink);
      doc.text(pdfSafe(entry.description), { width, lineGap: 2 });
    }
    if (extra.length) {
      doc.moveDown(0.4).font("Helvetica").fontSize(9).fillColor(COLORS.muted);
      doc.text(pdfSafe(extra.join(" · ")), { width });
    }
    doc.moveDown(0.8);
    doc
      .moveTo(MARGIN, doc.y)
      .lineTo(MARGIN + width, doc.y)
      .lineWidth(0.5)
      .strokeColor(COLORS.line)
      .stroke();
    doc.moveDown(0.8);
  }

  const issued = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    dateStyle: "short",
  }).format(new Date(input.issuedAt));
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index++) {
    doc.switchToPage(index);
    doc.page.margins.bottom = 0;
    const footer = `Diário pessoal · sem valor oficial · emitido em ${issued} · página ${index + 1} de ${range.count}`;
    doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted);
    doc.text(footer, (doc.page.width - doc.widthOfString(footer)) / 2, doc.page.height - 40, {
      lineBreak: false,
    });
  }
  doc.end();
  return output;
}
