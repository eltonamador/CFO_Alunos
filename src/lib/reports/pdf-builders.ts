/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from "pdfkit";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FICHA_FIELDS_BY_ID, type FichaField } from "./ficha-personalizada-catalog";
import { buildWeightSummary, type WeightSummary } from "@/modules/student-profile/domain/weightHistory";

// =====================================================================
// Layout institucional CBMAP · ABM · CFO 2026.1
// =====================================================================
//
// Estratégia de renderização:
//   1. Abre o documento com `bufferPages: true`.
//   2. Renderiza apenas o conteúdo (linhas de tabela), sem cabeçalho/rodapé.
//   3. Após o fim do conteúdo, percorre `bufferedPageRange()` e estampa
//      cabeçalho institucional + rodapé com "Página X de N" em cada página.
//
// Por que assim:
//   - Elimina o bug onde o evento `pageAdded` movia `doc.y` para a posição
//     do rodapé, fazendo a próxima linha sobrepor o rodapé ou criar página
//     em branco.
//   - Permite paginação "X de N" sem precisar conhecer o total no início.
//   - O conteúdo flui livremente; quebras de página acontecem por regra
//     determinística (mede altura da linha → decide se cabe).
// =====================================================================

const PAGE = {
  size: "A4" as const,
  layout: "landscape" as const,
  marginX: 32,
  marginTop: 86, // espaço para o cabeçalho institucional
  marginBottom: 44, // espaço para o rodapé
};

const COLORS = {
  primary: "#7B1818",
  primaryDark: "#5F1111",
  text: "#111827",
  textSoft: "#374151",
  muted: "#6B7280",
  border: "#D1D5DB",
  borderStrong: "#9CA3AF",
  zebra: "#F4F4F5",
  warn: "#92400E",
  warnBg: "#FEF3C7",
  warnBorder: "#F59E0B",
};

const FONT = {
  bodySize: 8.5,
  headerCellSize: 8.5,
  titleSize: 14,
  subtitleSize: 8,
  footerSize: 7.5,
  lineGap: 1.2,
};

interface RenderOptions {
  title: string;
  subtitle?: string;
  lgpdWarning?: string;
}

function createDoc(): PDFKit.PDFDocument {
  return new PDFDocument({
    size: PAGE.size,
    layout: PAGE.layout,
    margins: {
      top: PAGE.marginTop,
      bottom: PAGE.marginBottom,
      left: PAGE.marginX,
      right: PAGE.marginX,
    },
    bufferPages: true,
    info: {
      Author: "CFO Alunos · CBMAP",
      Creator: "Sistema CFO Alunos · CBMAP",
      Producer: "Sistema CFO Alunos",
    },
  });
}

function formatNow(): string {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Estampa cabeçalho + rodapé em todas as páginas bufferizadas.
 * Chame DEPOIS de renderizar todo o conteúdo.
 */
function stampChrome(doc: PDFKit.PDFDocument, opts: RenderOptions) {
  const range = doc.bufferedPageRange();
  const total = range.count;
  const dateStr = formatNow();

  for (let i = 0; i < total; i++) {
    doc.switchToPage(range.start + i);

    // Anula margens para evitar que escrita absoluta no rodapé dispare
    // o auto-paging do PDFKit (que verifica margins.bottom ao mover o cursor).
    const origTop = doc.page.margins.top;
    const origBottom = doc.page.margins.bottom;
    doc.page.margins.top = 0;
    doc.page.margins.bottom = 0;

    const w = doc.page.width;
    const h = doc.page.height;

    // ─── Cabeçalho (faixa sóbria, 56px) ───
    doc.save();
    doc.rect(0, 0, w, 56).fill(COLORS.primary);

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(FONT.titleSize)
      .text(opts.title, PAGE.marginX, 16, {
        width: w - PAGE.marginX * 2 - 220,
        lineBreak: false,
        ellipsis: true,
      });

    const sub = opts.subtitle ?? "CBMAP · ABM · Sistema CFO Alunos · Turma CFO 2026.1";
    doc
      .font("Helvetica")
      .fontSize(FONT.subtitleSize)
      .fillColor("#F8D7D7")
      .text(sub, PAGE.marginX, 36, {
        width: w - PAGE.marginX * 2 - 220,
        lineBreak: false,
        ellipsis: true,
      });

    // Bloco direita: data + página
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica")
      .fontSize(FONT.subtitleSize)
      .text(`Emitido em ${dateStr}`, w - 220 - PAGE.marginX, 18, {
        width: 220,
        align: "right",
        lineBreak: false,
      })
      .text(`Página ${i + 1} de ${total}`, w - 220 - PAGE.marginX, 36, {
        width: 220,
        align: "right",
        lineBreak: false,
      });
    doc.restore();

    // ─── Aviso LGPD (somente página 1, se houver) ───
    if (opts.lgpdWarning && i === 0) {
      const lgpdY = 60;
      const lgpdH = 20;
      doc
        .save()
        .fillColor(COLORS.warnBg)
        .rect(PAGE.marginX, lgpdY, w - PAGE.marginX * 2, lgpdH)
        .fill();
      doc
        .strokeColor(COLORS.warnBorder)
        .lineWidth(0.5)
        .rect(PAGE.marginX, lgpdY, w - PAGE.marginX * 2, lgpdH)
        .stroke();
      doc
        .fillColor(COLORS.warn)
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(opts.lgpdWarning, PAGE.marginX + 8, lgpdY + 6, {
          width: w - PAGE.marginX * 2 - 16,
          lineBreak: false,
          ellipsis: true,
        });
      doc.restore();
    }

    // ─── Rodapé ───
    const footerY = h - 28;
    doc
      .save()
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .moveTo(PAGE.marginX, footerY - 6)
      .lineTo(w - PAGE.marginX, footerY - 6)
      .stroke();
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(FONT.footerSize)
      .text(
        "Documento gerado pelo Sistema CFO Alunos · CBMAP — Uso interno",
        PAGE.marginX,
        footerY,
        {
          width: w - PAGE.marginX * 2 - 100,
          lineBreak: false,
        },
      )
      .text(`${i + 1}/${total}`, w - 100 - PAGE.marginX, footerY, {
        width: 100,
        align: "right",
        lineBreak: false,
      });
    doc.restore();

    // Restaura margens
    doc.page.margins.top = origTop;
    doc.page.margins.bottom = origBottom;
  }
}

/** Espaço vertical disponível para conteúdo na página atual. */
function contentBottom(doc: PDFKit.PDFDocument): number {
  return doc.page.height - PAGE.marginBottom;
}

/** Topo da área de conteúdo (abaixo do cabeçalho + eventual LGPD). */
function contentTop(opts: RenderOptions): number {
  return opts.lgpdWarning ? PAGE.marginTop + 6 : PAGE.marginTop;
}

/**
 * Renderiza tabela com larguras fracionárias.
 * - Linhas de altura VARIÁVEL: cada célula mede sua altura real e a linha
 *   adota a maior — sem truncamento de dados.
 * - Quebras de página automáticas; o cabeçalho da tabela é redesenhado.
 * - Estado vazio: "Nenhum registro encontrado".
 */
function renderTable(
  doc: PDFKit.PDFDocument,
  opts: RenderOptions,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  widthFractions: number[],
) {
  const startX = PAGE.marginX;
  const usableW = doc.page.width - PAGE.marginX * 2;
  const colWidths = widthFractions.map((f) => f * usableW);
  const cellPadX = 5;
  const cellPadY = 4;
  const headerH = 20;

  // Posiciona no topo de conteúdo da página atual
  doc.y = contentTop(opts);

  const drawTableHeader = () => {
    const y = doc.y;
    doc.save();
    doc.fillColor(COLORS.primaryDark).rect(startX, y, usableW, headerH).fill();

    let x = startX;
    headers.forEach((h, i) => {
      const cw = colWidths[i] ?? 0;
      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(FONT.headerCellSize)
        .text(h, x + cellPadX, y + 6, {
          width: cw - cellPadX * 2,
          lineBreak: false,
          ellipsis: true,
        });
      x += cw;
    });
    doc.restore();
    doc.y = y + headerH;
  };

  drawTableHeader();

  if (rows.length === 0) {
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica-Oblique")
      .fontSize(10)
      .text("Nenhum registro encontrado.", startX, doc.y + 16, {
        width: usableW,
        align: "center",
      });
    return;
  }

  // Para cada linha: mede altura, decide página, desenha.
  rows.forEach((row, rowIdx) => {
    const cellStrings = row.map((cell) => {
      const v =
        cell === null || cell === undefined || cell === "" ? "—" : String(cell);
      return v;
    });

    // Mede a altura de cada célula
    doc.font("Helvetica").fontSize(FONT.bodySize);
    const cellHeights = cellStrings.map((text, i) => {
      const cw = (colWidths[i] ?? 0) - cellPadX * 2;
      const h = doc.heightOfString(text, { width: cw, lineGap: FONT.lineGap });
      return h;
    });
    const rowH = Math.max(...cellHeights, 14) + cellPadY * 2;

    // Quebra de página: não cortar linha
    if (doc.y + rowH > contentBottom(doc)) {
      doc.addPage();
      doc.y = contentTop(opts);
      drawTableHeader();
    }

    const y = doc.y;

    // Zebra
    if (rowIdx % 2 === 1) {
      doc.save().fillColor(COLORS.zebra).rect(startX, y, usableW, rowH).fill().restore();
    }

    // Linha divisória inferior sutil
    doc
      .save()
      .strokeColor(COLORS.border)
      .lineWidth(0.4)
      .moveTo(startX, y + rowH)
      .lineTo(startX + usableW, y + rowH)
      .stroke()
      .restore();

    // Conteúdo das células
    let x = startX;
    cellStrings.forEach((text, i) => {
      const cw = colWidths[i] ?? 0;
      doc
        .fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(FONT.bodySize)
        .text(text, x + cellPadX, y + cellPadY, {
          width: cw - cellPadX * 2,
          lineGap: FONT.lineGap,
        });
      x += cw;
    });

    // Restaura a posição para o final exato da linha (heightOfString pode
    // divergir de onde doc.text deixa o cursor com lineGap).
    doc.y = y + rowH;
  });
}

/** Converte um PDFDocument em Buffer (resolve quando 'end' emite). */
function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

/** Helper: renderiza tabela completa e estampa header/footer. */
async function buildTableReport(
  opts: RenderOptions,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  widthFractions: number[],
): Promise<Buffer> {
  const doc = createDoc();
  renderTable(doc, opts, headers, rows, widthFractions);
  stampChrome(doc, opts);
  return pdfToBuffer(doc);
}

// =====================================================================
// 1. Ficha Completa da Turma
// =====================================================================
interface FichaColumn {
  id: string;
  header: string;
  width: number;
  accessor: (s: any, ctx: { contact: any; addr: any; logistics: any }) => string | number | null | undefined;
}

const FICHA_COLUMNS: FichaColumn[] = [
  { id: "fc_numero", header: "Nº", width: 0.04, accessor: (s) => s.student_number },
  { id: "fc_nome_guerra", header: "Nome de Guerra", width: 0.12, accessor: (s) => s.war_name },
  { id: "fc_nome_completo", header: "Nome Completo", width: 0.18, accessor: (s) => s.full_name },
  { id: "fc_cpf", header: "CPF", width: 0.08, accessor: (s) => s.cpf },
  { id: "fc_rg", header: "RG", width: 0.07, accessor: (s) => s.rg },
  {
    id: "fc_nasc",
    header: "Nasc.",
    width: 0.06,
    accessor: (s) => (s.birth_date ? new Date(s.birth_date).toLocaleDateString("pt-BR") : null),
  },
  { id: "fc_fase", header: "Pelotão", width: 0.07, accessor: (s) => s.pelotao },
  { id: "fc_sexo", header: "Sexo", width: 0.04, accessor: (s) => s.sex },
  { id: "fc_whatsapp", header: "WhatsApp", width: 0.1, accessor: (_s, ctx) => ctx.contact?.whatsapp },
  { id: "fc_email", header: "E-mail", width: 0.14, accessor: (_s, ctx) => ctx.contact?.email_personal },
  { id: "fc_cidade", header: "Cidade", width: 0.07, accessor: (_s, ctx) => ctx.addr?.city },
  { id: "fc_estado", header: "UF", width: 0.03, accessor: (_s, ctx) => ctx.addr?.state },
  { id: "fc_gandola", header: "Gandola", width: 0.05, accessor: (_s, ctx) => ctx.logistics?.gandola_size },
  { id: "fc_calca", header: "Calça", width: 0.05, accessor: (_s, ctx) => ctx.logistics?.pants_size },
];

export async function buildFichaCompletaPDF(
  supabase: SupabaseClient<any, any, any>,
  selectedFields?: string[],
): Promise<Buffer> {
  const { data: students } = await supabase
    .from("students")
    .select(
      `id, student_number, war_name, full_name, sex, birth_date, cpf, rg,
       pelotao, situation, marital_status, education_level,
       student_contacts(whatsapp, email_personal),
       student_addresses(city, state),
       student_logistics(gandola_size, pants_size)`,
    )
    .order("student_number");

  const selected = selectedFields && selectedFields.length > 0 ? new Set(selectedFields) : null;
  const activeColumns = selected
    ? FICHA_COLUMNS.filter((c) => selected.has(c.id))
    : FICHA_COLUMNS;
  const cols = activeColumns.length > 0 ? activeColumns : FICHA_COLUMNS;
  const totalWeight = cols.reduce((sum, c) => sum + c.width, 0);
  const widthFractions = cols.map((c) => c.width / totalWeight);

  const rows = (students ?? []).map((s: any) => {
    const contact = Array.isArray(s.student_contacts) ? s.student_contacts[0] : s.student_contacts;
    const addr = Array.isArray(s.student_addresses) ? s.student_addresses[0] : s.student_addresses;
    const logistics = Array.isArray(s.student_logistics) ? s.student_logistics[0] : s.student_logistics;
    return cols.map((col) => col.accessor(s, { contact, addr, logistics }));
  });

  return buildTableReport(
    { title: "Ficha Completa da Turma" },
    cols.map((c) => c.header),
    rows,
    widthFractions,
  );
}

// =====================================================================
// 2. Pendências de Enxoval
// =====================================================================
interface PendenciaColumn {
  id: string;
  header: string;
  width: number;
  accessor: (r: any, ctx: { st: any; req: any }) => string | number | null | undefined;
}

const PENDENCIA_COLUMNS: PendenciaColumn[] = [
  { id: "pe_numero", header: "Nº", width: 0.05, accessor: (_r, ctx) => ctx.st?.student_number },
  { id: "pe_nome_guerra", header: "Nome de Guerra", width: 0.16, accessor: (_r, ctx) => ctx.st?.war_name },
  { id: "pe_sexo", header: "Sexo", width: 0.05, accessor: (_r, ctx) => ctx.st?.sex },
  { id: "pe_item", header: "Item", width: 0.34, accessor: (_r, ctx) => ctx.req?.name },
  {
    id: "pe_qtd",
    header: "Qtd",
    width: 0.07,
    accessor: (_r, ctx) => (ctx.req ? `${ctx.req.quantity} ${ctx.req.unit ?? ""}`.trim() : null),
  },
  { id: "pe_status", header: "Status", width: 0.16, accessor: (r) => (r.status ?? "").replace(/_/g, " ") },
  {
    id: "pe_validacao",
    header: "Validação",
    width: 0.17,
    accessor: (r) => (r.validation_status ?? "").replace(/_/g, " "),
  },
];

export async function buildPendenciasEnxovalPDF(
  supabase: SupabaseClient<any, any, any>,
  selectedFields?: string[],
): Promise<Buffer> {
  const { data } = await supabase
    .from("equipment_checklist")
    .select(
      `status, validation_status, student_notes,
       student:students!inner(student_number, war_name, sex),
       requirement:equipment_requirements!inner(name, quantity, unit, phase)`,
    )
    .neq("validation_status", "validado")
    .order("student(student_number)" as any, { ascending: true });

  const selected = selectedFields && selectedFields.length > 0 ? new Set(selectedFields) : null;
  const activeColumns = selected
    ? PENDENCIA_COLUMNS.filter((c) => selected.has(c.id))
    : PENDENCIA_COLUMNS;
  const cols = activeColumns.length > 0 ? activeColumns : PENDENCIA_COLUMNS;
  const totalWeight = cols.reduce((sum, c) => sum + c.width, 0);
  const widthFractions = cols.map((c) => c.width / totalWeight);

  const rows = (data ?? []).map((r: any) => {
    const st = Array.isArray(r.student) ? r.student[0] : r.student;
    const req = Array.isArray(r.requirement) ? r.requirement[0] : r.requirement;
    return cols.map((col) => col.accessor(r, { st, req }));
  });

  return buildTableReport(
    { title: "Pendências de Enxoval" },
    cols.map((c) => c.header),
    rows,
    widthFractions,
  );
}

// =====================================================================
// 3. Restrições de Saúde (LGPD)
// =====================================================================
interface SaudeColumn {
  id: string;
  header: string;
  width: number;
  accessor: (s: any, h: any) => string | number | null | undefined;
}

const SAUDE_COLUMNS: SaudeColumn[] = [
  { id: "sa_numero", header: "Nº", width: 0.04, accessor: (s) => s.student_number },
  { id: "sa_nome", header: "Nome de Guerra", width: 0.12, accessor: (s) => s.war_name },
  {
    id: "sa_sangue",
    header: "Sangue",
    width: 0.06,
    accessor: (_s, h) => (h?.blood_type ? `${h.blood_type}${h.rh_factor ?? ""}` : null),
  },
  {
    id: "sa_oculos",
    header: "Óculos",
    width: 0.05,
    accessor: (_s, h) =>
      h?.uses_glasses === true ? "Sim" : h?.uses_glasses === false ? "Não" : null,
  },
  { id: "sa_alergias", header: "Alergias", width: 0.14, accessor: (_s, h) => h?.allergies },
  {
    id: "sa_medicacao",
    header: "Medicação contínua",
    width: 0.13,
    accessor: (_s, h) => h?.continuous_medication,
  },
  {
    id: "sa_restricao_fisica",
    header: "Restrição / Doença",
    width: 0.13,
    accessor: (_s, h) => {
      const parts = [h?.physical_restriction, h?.chronic_disease].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : null;
    },
  },
  {
    id: "sa_restricao_alimentar",
    header: "Restr. alimentar",
    width: 0.09,
    accessor: (_s, h) => h?.dietary_restriction,
  },
  {
    id: "sa_cirurgia_ocular",
    header: "Cir. ocular",
    width: 0.07,
    accessor: (_s, h) => {
      if (h?.cirurgia_ocular === true)
        return h?.cirurgia_ocular_obs ? `Sim · ${h.cirurgia_ocular_obs}` : "Sim";
      if (h?.cirurgia_ocular === false) return "Não";
      return null;
    },
  },
  {
    id: "sa_observacoes",
    header: "Resumo operacional",
    width: 0.13,
    accessor: (_s, h) => h?.operational_summary,
  },
  {
    id: "sa_validacao",
    header: "Validação",
    width: 0.07,
    accessor: (_s, h) => (h?.validation_status ?? "").replace(/_/g, " "),
  },
];

export async function buildSaudePDF(
  supabase: SupabaseClient<any, any, any>,
  selectedFields?: string[],
): Promise<Buffer> {
  const { data } = await supabase
    .from("students")
    .select(
      `student_number, war_name, full_name, sex,
       health_restrictions(
         blood_type, rh_factor, allergies, continuous_medication, chronic_disease,
         physical_restriction, dietary_restriction, uses_glasses, cirurgia_ocular,
         cirurgia_ocular_obs, validation_status, operational_summary,
         has_allergies, has_continuous_medication, has_chronic_disease,
         has_physical_restriction, has_dietary_restriction, has_eye_surgery
       )`,
    )
    .order("student_number");

  const filtered = (data ?? []).filter((s: any) => {
    const h = Array.isArray(s.health_restrictions) ? s.health_restrictions[0] : s.health_restrictions;
    return (
      h &&
      (h.has_allergies ||
        h.has_continuous_medication ||
        h.has_chronic_disease ||
        h.has_physical_restriction ||
        h.has_dietary_restriction ||
        h.uses_glasses ||
        h.has_eye_surgery ||
        h.cirurgia_ocular ||
        h.operational_summary)
    );
  });

  const selected = selectedFields && selectedFields.length > 0 ? new Set(selectedFields) : null;
  const activeColumns = selected ? SAUDE_COLUMNS.filter((c) => selected.has(c.id)) : SAUDE_COLUMNS;
  const cols = activeColumns.length > 0 ? activeColumns : SAUDE_COLUMNS;
  const totalWeight = cols.reduce((sum, c) => sum + c.width, 0);
  const widthFractions = cols.map((c) => c.width / totalWeight);

  const rows = filtered.map((s: any) => {
    const h = Array.isArray(s.health_restrictions) ? s.health_restrictions[0] : s.health_restrictions;
    return cols.map((col) => col.accessor(s, h));
  });

  return buildTableReport(
    {
      title: "Restrições de Saúde",
      lgpdWarning:
        "AVISO LGPD · Documento de uso restrito à Coordenação. Contém dados sensíveis (Lei 13.709/2018). Não compartilhe.",
    },
    cols.map((c) => c.header),
    rows,
    widthFractions,
  );
}

// =====================================================================
// 4. Contatos de Emergência
// =====================================================================
interface EmergenciaColumn {
  id: string;
  header: string;
  width: number;
  accessor: (s: any, ctx: { c1: any; c2: any }) => string | number | null | undefined;
}

const EMERGENCIA_COLUMNS: EmergenciaColumn[] = [
  { id: "em_numero", header: "Nº", width: 0.04, accessor: (s) => s.student_number },
  { id: "em_nome_guerra", header: "Nome de Guerra", width: 0.11, accessor: (s) => s.war_name },
  { id: "em_c1_nome", header: "Contato 1", width: 0.12, accessor: (_s, ctx) => ctx.c1?.full_name },
  {
    id: "em_c1_parentesco",
    header: "Parentesco 1",
    width: 0.08,
    accessor: (_s, ctx) => ctx.c1?.relationship,
  },
  { id: "em_c1_telefone", header: "Telefone 1", width: 0.09, accessor: (_s, ctx) => ctx.c1?.phone },
  { id: "em_c1_endereco", header: "Endereço 1", width: 0.14, accessor: (_s, ctx) => ctx.c1?.address },
  { id: "em_c2_nome", header: "Contato 2", width: 0.12, accessor: (_s, ctx) => ctx.c2?.full_name },
  {
    id: "em_c2_parentesco",
    header: "Parentesco 2",
    width: 0.08,
    accessor: (_s, ctx) => ctx.c2?.relationship,
  },
  { id: "em_c2_telefone", header: "Telefone 2", width: 0.09, accessor: (_s, ctx) => ctx.c2?.phone },
  { id: "em_c2_endereco", header: "Endereço 2", width: 0.13, accessor: (_s, ctx) => ctx.c2?.address },
];

export async function buildEmergenciaPDF(
  supabase: SupabaseClient<any, any, any>,
  selectedFields?: string[],
): Promise<Buffer> {
  const { data } = await supabase
    .from("students")
    .select(
      `student_number, war_name,
       emergency_contacts(priority, full_name, relationship, phone, address)`,
    )
    .order("student_number");

  const selected = selectedFields && selectedFields.length > 0 ? new Set(selectedFields) : null;
  const activeColumns = selected
    ? EMERGENCIA_COLUMNS.filter((c) => selected.has(c.id))
    : EMERGENCIA_COLUMNS;
  const cols = activeColumns.length > 0 ? activeColumns : EMERGENCIA_COLUMNS;
  const totalWeight = cols.reduce((sum, c) => sum + c.width, 0);
  const widthFractions = cols.map((c) => c.width / totalWeight);

  const rows = (data ?? []).map((s: any) => {
    const contacts: any[] = Array.isArray(s.emergency_contacts)
      ? s.emergency_contacts
      : s.emergency_contacts
        ? [s.emergency_contacts]
        : [];
    const c1 = contacts.find((c) => c.priority === 1) ?? null;
    const c2 = contacts.find((c) => c.priority === 2) ?? null;
    return cols.map((col) => col.accessor(s, { c1, c2 }));
  });

  return buildTableReport(
    { title: "Contatos de Emergência" },
    cols.map((c) => c.header),
    rows,
    widthFractions,
  );
}

// =====================================================================
// 5. Ficha Personalizada da Turma
// =====================================================================
// A Coordenação seleciona qualquer subconjunto de campos do catálogo
// (definido em ficha-personalizada-catalog.ts). Aqui só mapeamos cada id
// para a função que extrai o valor de cada aluno.
// =====================================================================

interface FichaCtx {
  contact: any;
  address: any;
  logistics: any;
  health: any;
  weight: WeightSummary;
  vehicle: any;
  emergency: { c1: any; c2: any };
  docs: { enviados: number; pendentes: number; rejeitados: number };
  mats: { pendentes: number; validados: number };
}

type Accessor = (s: any, ctx: FichaCtx) => string | number | null | undefined;

function yesNo(v: unknown): string | null {
  if (v === true) return "Sim";
  if (v === false) return "Não";
  return null;
}

function formatDateBR(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("pt-BR");
}

function humanize(v: string | null | undefined): string | null {
  return v ? v.replace(/_/g, " ") : null;
}

const FICHA_ACCESSORS: Record<string, Accessor> = {
  // Resumo
  fp_resumo_numero: (s) => s.student_number,
  fp_resumo_war_name: (s) => s.war_name,
  fp_resumo_pelotao: (s) => s.pelotao,
  fp_resumo_situation: (s) => humanize(s.situation),
  fp_resumo_enrollment: (s) => humanize(s.enrollment_status),

  // Identificação
  fp_id_full_name: (s) => s.full_name,
  fp_id_cpf: (s) => s.cpf,
  fp_id_rg: (s) => s.rg,
  fp_id_birth_date: (s) => formatDateBR(s.birth_date),
  fp_id_sex: (s) => s.sex,
  fp_id_marital: (s) => humanize(s.marital_status),
  fp_id_education: (s) => humanize(s.education_level),
  fp_id_graduation_name: (s) => s.graduation_name,
  fp_id_nationality: (s) => s.nationality,
  fp_id_naturality: (s) => {
    const city = s.naturality_city;
    const state = s.naturality_state;
    return [city, state].filter(Boolean).join(" / ") || null;
  },
  fp_id_father: (s) => s.father_name,
  fp_id_mother: (s) => s.mother_name,
  fp_id_pis: (s) => s.pis,
  fp_id_voter: (s) => {
    const parts = [s.voter_id, s.voter_zone && `Z${s.voter_zone}`, s.voter_section && `S${s.voter_section}`].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  },
  fp_id_presentation: (s) => formatDateBR(s.presentation_date),
  fp_id_professional: (s) => s.professional_experience,

  // Contato
  fp_contato_whatsapp: (_s, ctx) => ctx.contact?.whatsapp,
  fp_contato_phone2: (_s, ctx) => ctx.contact?.phone_secondary,
  fp_contato_email: (_s, ctx) => ctx.contact?.email_personal,
  fp_contato_email_inst: (_s, ctx) => ctx.contact?.email_institutional,

  // Endereço
  fp_end_street: (_s, ctx) => ctx.address?.street,
  fp_end_district: (_s, ctx) => ctx.address?.district,
  fp_end_city: (_s, ctx) => ctx.address?.city,
  fp_end_state: (_s, ctx) => ctx.address?.state,
  fp_end_zip: (_s, ctx) => ctx.address?.zip,
  fp_end_landmark: (_s, ctx) => ctx.address?.landmark,
  fp_end_origin_ap: (_s, ctx) => yesNo(ctx.address?.origin_in_amapa),
  fp_end_other_state: (_s, ctx) => yesNo(ctx.address?.from_other_state),
  fp_end_origin_state: (_s, ctx) => ctx.address?.origin_state,
  fp_end_origin_city: (_s, ctx) => ctx.address?.origin_city,

  // Emergência
  fp_em_c1_nome: (_s, ctx) => ctx.emergency.c1?.full_name,
  fp_em_c1_parent: (_s, ctx) => ctx.emergency.c1?.relationship,
  fp_em_c1_tel: (_s, ctx) => ctx.emergency.c1?.phone,
  fp_em_c1_end: (_s, ctx) => ctx.emergency.c1?.address,
  fp_em_c2_nome: (_s, ctx) => ctx.emergency.c2?.full_name,
  fp_em_c2_parent: (_s, ctx) => ctx.emergency.c2?.relationship,
  fp_em_c2_tel: (_s, ctx) => ctx.emergency.c2?.phone,
  fp_em_c2_end: (_s, ctx) => ctx.emergency.c2?.address,

  // Saúde
  fp_sa_blood: (_s, ctx) =>
    ctx.health?.blood_type ? `${ctx.health.blood_type}${ctx.health.rh_factor ?? ""}` : null,
  fp_sa_altura: (_s, ctx) => (ctx.health?.altura_cm ? `${ctx.health.altura_cm} cm` : null),
  fp_sa_peso: (_s, ctx) =>
    ctx.weight.currentWeightKg != null
      ? `${ctx.weight.currentWeightKg} kg`
      : ctx.health?.peso_kg
        ? `${ctx.health.peso_kg} kg`
        : null,
  fp_sa_peso_data: (_s, ctx) => formatDateBR(ctx.weight.lastMeasuredAt),
  fp_sa_peso_registros: (_s, ctx) => ctx.weight.count,
  fp_sa_alergias: (_s, ctx) => ctx.health?.allergies,
  fp_sa_medicacao: (_s, ctx) => ctx.health?.continuous_medication,
  fp_sa_doenca: (_s, ctx) => {
    const parts = [ctx.health?.physical_restriction, ctx.health?.chronic_disease].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  },
  fp_sa_alimentar: (_s, ctx) => ctx.health?.dietary_restriction,
  fp_sa_oculos: (_s, ctx) => yesNo(ctx.health?.uses_glasses),
  fp_sa_cir_ocular: (_s, ctx) => {
    if (ctx.health?.cirurgia_ocular === true)
      return ctx.health?.cirurgia_ocular_obs ? `Sim · ${ctx.health.cirurgia_ocular_obs}` : "Sim";
    if (ctx.health?.cirurgia_ocular === false) return "Não";
    return null;
  },
  fp_sa_resumo: (_s, ctx) => ctx.health?.operational_summary,
  fp_sa_validacao: (_s, ctx) => humanize(ctx.health?.validation_status),

  // Logística
  fp_log_residencia_macapa: (_s, ctx) => yesNo(ctx.logistics?.has_fixed_residence_macapa),
  fp_log_course_address: (_s, ctx) => ctx.logistics?.course_address,
  fp_log_needs_housing: (_s, ctx) => yesNo(ctx.logistics?.needs_housing),
  fp_log_family_ap: (_s, ctx) => yesNo(ctx.logistics?.has_family_in_ap),
  fp_log_local_contact: (_s, ctx) => ctx.logistics?.local_contact,
  fp_log_gandola: (_s, ctx) => ctx.logistics?.gandola_size,
  fp_log_calca: (_s, ctx) => ctx.logistics?.pants_size,

  // Veículo
  fp_vei_has_vehicle: (_s, ctx) => yesNo(ctx.vehicle?.has_vehicle),
  fp_vei_type: (_s, ctx) => ctx.vehicle?.vehicle_type,
  fp_vei_brand_model: (_s, ctx) => ctx.vehicle?.vehicle_brand_model,
  fp_vei_plate: (_s, ctx) => ctx.vehicle?.plate,
  fp_vei_has_cnh: (_s, ctx) => yesNo(ctx.vehicle?.has_cnh),
  fp_vei_cnh_cat: (_s, ctx) => ctx.vehicle?.cnh_category,
  fp_vei_cnh_valid: (_s, ctx) => formatDateBR(ctx.vehicle?.cnh_valid_until),
  fp_vei_available: (_s, ctx) => yesNo(ctx.vehicle?.available_for_deployment),

  // Documentos (agregados)
  fp_doc_enviados: (_s, ctx) => ctx.docs.enviados,
  fp_doc_pendentes: (_s, ctx) => ctx.docs.pendentes,
  fp_doc_rejeitados: (_s, ctx) => ctx.docs.rejeitados,

  // Materiais (agregados)
  fp_mat_pendentes: (_s, ctx) => ctx.mats.pendentes,
  fp_mat_validados: (_s, ctx) => ctx.mats.validados,

  // Histórico
  fp_hist_prior_service: (s) => yesNo(s.had_prior_military_service),
  fp_hist_prior_branch: (s) => humanize(s.prior_military_branch),
  fp_hist_prior_inst: (s) => s.prior_military_institution,
  fp_hist_prior_rank: (s) => s.prior_military_rank,
  fp_hist_prior_duration: (s) => s.prior_military_duration,
  fp_hist_religion: (s) => {
    if (s.religion === "outra" && s.religion_other) return s.religion_other;
    return humanize(s.religion);
  },
  fp_hist_religious_restr: (s) => yesNo(s.has_religious_restriction),
};

export async function buildFichaPersonalizadaPDF(
  supabase: SupabaseClient<any, any, any>,
  selectedFields: string[],
): Promise<Buffer> {
  // Resolve campos do catálogo na ordem em que foram selecionados
  const cols: FichaField[] = selectedFields
    .map((id) => FICHA_FIELDS_BY_ID[id])
    .filter((f): f is FichaField => Boolean(f));

  if (cols.length === 0) {
    // Devolve um PDF de aviso em vez de quebrar
    const doc = createDoc();
    const opts = { title: "Ficha Personalizada da Turma" };
    renderTable(doc, opts, ["Aviso"], [["Nenhum campo selecionado."]], [1]);
    stampChrome(doc, opts);
    return pdfToBuffer(doc);
  }

  // ─── 1. Carrega alunos (todas as colunas) ────────────────────────
  // Usa `select("*")` em vez de lista explícita: assim, se a base tiver
  // migração X pendente (p.ex. coluna `religion` ou `had_prior_military_service`
  // ainda não criada), a query não quebra — o accessor apenas devolve `null`.
  // Query separada por tabela: uma falha de RLS/schema numa relação não
  // derruba o relatório inteiro — a coluna correspondente vira "—".
  const studentsResp = await supabase.from("students").select("*").order("student_number");

  if (studentsResp.error) {
    // Falha audível: a route.ts captura e devolve 500 com detalhe.
    throw new Error(
      `Falha ao carregar alunos para Ficha Personalizada: ${studentsResp.error.message}`,
    );
  }
  const students = studentsResp.data ?? [];
  const studentIds = students.map((s: any) => s.id);

  // ─── 2. Carrega relações apenas se algum campo da aba foi pedido ─
  const needsContact = cols.some((c) => c.groupId === "contato");
  const needsAddress = cols.some((c) => c.groupId === "endereco");
  const needsLogistics = cols.some((c) => c.groupId === "logistica");
  const needsVehicle = cols.some((c) => c.groupId === "veiculo");
  const needsHealth = cols.some((c) => c.groupId === "saude");
  const needsWeightHistory = cols.some((c) =>
    ["fp_sa_peso", "fp_sa_peso_data", "fp_sa_peso_registros"].includes(c.id),
  );
  const needsEmergency = cols.some((c) => c.groupId === "emergencia");
  const needsDocs = cols.some((c) => c.id.startsWith("fp_doc_"));
  const needsMats = cols.some((c) => c.id.startsWith("fp_mat_"));

  async function loadById<T extends Record<string, any>>(
    table: string,
    fields: string,
  ): Promise<Map<string, T>> {
    if (studentIds.length === 0) return new Map();
    const resp = await supabase.from(table).select(fields).in("student_id", studentIds);
    if (resp.error) {
      console.warn(`[ficha-personalizada] falha ao ler ${table}:`, resp.error.message);
      return new Map();
    }
    const map = new Map<string, T>();
    for (const row of (resp.data as any[]) ?? []) {
      map.set(row.student_id, row as T);
    }
    return map;
  }

  const [contactsMap, addressMap, logisticsMap, vehicleMap, healthMap] = await Promise.all([
    needsContact
      ? loadById("student_contacts", "student_id, whatsapp, phone_secondary, email_personal, email_institutional")
      : Promise.resolve(new Map<string, any>()),
    needsAddress
      ? loadById(
          "student_addresses",
          "student_id, street, district, city, state, zip, landmark, origin_in_amapa, from_other_state, origin_state, origin_city",
        )
      : Promise.resolve(new Map<string, any>()),
    needsLogistics
      ? loadById(
          "student_logistics",
          "student_id, has_fixed_residence_macapa, course_address, needs_housing, has_family_in_ap, local_contact, gandola_size, pants_size",
        )
      : Promise.resolve(new Map<string, any>()),
    needsVehicle
      ? loadById(
          "vehicles",
          "student_id, has_vehicle, vehicle_type, vehicle_brand_model, plate, has_cnh, cnh_category, cnh_valid_until, available_for_deployment",
        )
      : Promise.resolve(new Map<string, any>()),
    needsHealth
      ? loadById(
          "health_restrictions",
          "student_id, blood_type, rh_factor, altura_cm, peso_kg, allergies, continuous_medication, chronic_disease, physical_restriction, dietary_restriction, uses_glasses, cirurgia_ocular, cirurgia_ocular_obs, operational_summary, validation_status, has_allergies, has_continuous_medication, has_chronic_disease, has_physical_restriction, has_dietary_restriction, has_eye_surgery",
        )
      : Promise.resolve(new Map<string, any>()),
  ]);

  const weightByStudent = new Map<string, WeightSummary>();
  if (needsWeightHistory && studentIds.length > 0) {
    const resp = await supabase
      .from("student_weight_history")
      .select("id, student_id, weight_kg, measured_at, created_at")
      .in("student_id", studentIds);
    if (resp.error) {
      console.warn("[ficha-personalizada] falha em student_weight_history:", resp.error.message);
    } else {
      const grouped = new Map<string, any[]>();
      for (const row of (resp.data as any[]) ?? []) {
        const arr = grouped.get(row.student_id) ?? [];
        arr.push({
          id: row.id,
          weight_kg: Number(row.weight_kg),
          measured_at: row.measured_at,
          created_at: row.created_at,
        });
        grouped.set(row.student_id, arr);
      }
      for (const [studentId, rows] of grouped.entries()) {
        weightByStudent.set(studentId, buildWeightSummary(rows));
      }
    }
  }

  // Contatos de emergência: 1:N — agrupa em c1/c2
  const emergencyByStudent = new Map<string, { c1: any; c2: any }>();
  if (needsEmergency && studentIds.length > 0) {
    const resp = await supabase
      .from("emergency_contacts")
      .select("student_id, priority, full_name, relationship, phone, address")
      .in("student_id", studentIds);
    if (resp.error) {
      console.warn("[ficha-personalizada] falha em emergency_contacts:", resp.error.message);
    } else {
      for (const row of (resp.data as any[]) ?? []) {
        const cur = emergencyByStudent.get(row.student_id) ?? { c1: null, c2: null };
        if (row.priority === 1) cur.c1 = row;
        else if (row.priority === 2) cur.c2 = row;
        emergencyByStudent.set(row.student_id, cur);
      }
    }
  }

  // Documentos e materiais (agregados)
  const docsByStudent = new Map<string, { enviados: number; pendentes: number; rejeitados: number }>();
  const matsByStudent = new Map<string, { pendentes: number; validados: number }>();

  if (needsDocs && studentIds.length > 0) {
    const resp = await supabase
      .from("documents")
      .select("student_id, status")
      .in("student_id", studentIds);
    if (resp.error) {
      console.warn("[ficha-personalizada] falha em documents:", resp.error.message);
    } else {
      for (const d of (resp.data as any[]) ?? []) {
        const cur = docsByStudent.get(d.student_id) ?? { enviados: 0, pendentes: 0, rejeitados: 0 };
        const st = String(d.status ?? "");
        if (st === "validado" || st === "enviado") cur.enviados += 1;
        else if (st === "rejeitado") cur.rejeitados += 1;
        else cur.pendentes += 1;
        docsByStudent.set(d.student_id, cur);
      }
    }
  }

  if (needsMats && studentIds.length > 0) {
    const resp = await supabase
      .from("student_equipment_status")
      .select("student_id, validation_status")
      .in("student_id", studentIds);
    if (resp.error) {
      console.warn("[ficha-personalizada] falha em student_equipment_status:", resp.error.message);
    } else {
      for (const m of (resp.data as any[]) ?? []) {
        const cur = matsByStudent.get(m.student_id) ?? { pendentes: 0, validados: 0 };
        if (m.validation_status === "validado") cur.validados += 1;
        else cur.pendentes += 1;
        matsByStudent.set(m.student_id, cur);
      }
    }
  }

  // ─── 3. Monta linhas ─────────────────────────────────────────────
  const rows = students.map((s: any) => {
    const ctx: FichaCtx = {
      contact: contactsMap.get(s.id) ?? null,
      address: addressMap.get(s.id) ?? null,
      logistics: logisticsMap.get(s.id) ?? null,
      health: healthMap.get(s.id) ?? null,
      weight: weightByStudent.get(s.id) ?? {
        currentWeightKg: null,
        lastMeasuredAt: null,
        count: 0,
        variationKg: null,
      },
      vehicle: vehicleMap.get(s.id) ?? null,
      emergency: emergencyByStudent.get(s.id) ?? { c1: null, c2: null },
      docs: docsByStudent.get(s.id) ?? { enviados: 0, pendentes: 0, rejeitados: 0 },
      mats: matsByStudent.get(s.id) ?? { pendentes: 0, validados: 0 },
    };

    return cols.map((col) => {
      const accessor = FICHA_ACCESSORS[col.id];
      if (!accessor) return null;
      try {
        return accessor(s, ctx);
      } catch {
        return null;
      }
    });
  });

  const totalWeight = cols.reduce((sum, c) => sum + c.weight, 0);
  const widthFractions = cols.map((c) => c.weight / totalWeight);
  const headers = cols.map((c) => c.label);

  // Aciona o aviso LGPD se algum campo de Saúde foi selecionado
  return buildTableReport(
    {
      title: "Ficha Personalizada da Turma",
      lgpdWarning: needsHealth
        ? "AVISO LGPD · Contém dados sensíveis de saúde (Lei 13.709/2018). Uso restrito à Coordenação."
        : undefined,
    },
    headers,
    rows,
    widthFractions,
  );
}

// =====================================================================
// Reuso externo (escala operacional, etc.)
// =====================================================================
export const __internals = {
  createDoc,
  stampChrome,
  renderTable,
  pdfToBuffer,
  COLORS,
  PAGE,
  FONT,
};
