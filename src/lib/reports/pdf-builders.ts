/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from "pdfkit";
import type { SupabaseClient } from "@supabase/supabase-js";

// =====================================================================
// Helpers — layout institucional CBMAP · ABM · CFO 2026.1
// =====================================================================

const COLORS = {
  primary: "#7B1818", // brand-red
  text: "#1a1a1a",
  muted: "#6b7280",
  border: "#d4d4d8",
  zebra: "#f4f4f5",
  warn: "#92400e",
  warnBg: "#fef3c7",
};

interface RenderOptions {
  title: string;
  lgpdWarning?: string;
}

/**
 * Inicializa um PDFDocument A4 paisagem com cabeçalho institucional
 * e rodapé "Gerado automaticamente em ...".
 */
function createInstitutionalDoc(opts: RenderOptions): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 90, bottom: 50, left: 36, right: 36 },
    info: {
      Title: opts.title,
      Author: "CFO Alunos",
      Creator: "Sistema CFO Alunos · CBMAP",
      Producer: "Sistema CFO Alunos",
    },
  });

  const now = new Date();
  const dateStr = now.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Header e rodapé em todas as páginas
  const renderChrome = () => {
    const w = doc.page.width;

    // ── Cabeçalho ──
    doc.save();
    doc
      .fillColor(COLORS.primary)
      .rect(0, 0, w, 70)
      .fill();

    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("CBMAP · ABM", 36, 16, { lineBreak: false });

    doc
      .fontSize(15)
      .text(opts.title, 36, 30, { lineBreak: false });

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#ffe4e4")
      .text("Sistema CFO Alunos · Turma CFO 2026.1", 36, 50, { lineBreak: false });

    doc
      .fontSize(8)
      .text(`Gerado em ${dateStr}`, w - 200, 50, { width: 164, align: "right", lineBreak: false });

    doc.restore();

    // ── Rodapé ──
    const footerY = doc.page.height - 30;
    const bottomM = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .save()
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(7.5)
      .text(
        "Documento gerado automaticamente pelo Sistema CFO Alunos · CBMAP",
        36,
        footerY,
        { lineBreak: false },
      )
      .text(
        `Página ${doc.bufferedPageRange().count}`,
        w - 100,
        footerY,
        { width: 64, align: "right", lineBreak: false },
      )
      .restore();
    doc.page.margins.bottom = bottomM;
  };

  // Hook em todas as páginas novas
  doc.on("pageAdded", renderChrome);
  // Render na primeira página manualmente (pageAdded não dispara para a inicial)
  renderChrome();

  // Aviso LGPD logo abaixo do cabeçalho, se aplicável
  if (opts.lgpdWarning) {
    doc.moveDown(0.5);
    const lgpdY = 78;
    doc
      .save()
      .fillColor(COLORS.warnBg)
      .rect(36, lgpdY, doc.page.width - 72, 18)
      .fill();
    doc
      .fillColor(COLORS.warn)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(opts.lgpdWarning, 42, lgpdY + 5, {
        width: doc.page.width - 84,
        lineBreak: false,
      })
      .restore();
    doc.y = lgpdY + 28;
  } else {
    doc.y = 90;
  }

  return doc;
}

/**
 * Renderiza uma tabela simples com cabeçalho colorido e zebra striping.
 * As larguras de coluna são em "frações" — somam 1.0 do espaço útil.
 */
function renderTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  widthFractions: number[],
) {
  const startX = 36;
  const usableW = doc.page.width - 72;
  const colWidths = widthFractions.map((f) => f * usableW);
  const rowH = 16;
  const headerH = 18;

  const drawHeader = () => {
    let x = startX;
    doc
      .save()
      .fillColor(COLORS.primary)
      .rect(startX, doc.y, usableW, headerH)
      .fill();
    headers.forEach((h, i) => {
      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text(h, x + 4, doc.y + 5, { width: (colWidths[i] ?? 0) - 8, lineBreak: false });
      x += colWidths[i] ?? 0;
    });
    doc.restore();
    doc.y += headerH;
  };

  drawHeader();

  rows.forEach((row, rowIdx) => {
    // quebra de página
    if (doc.y + rowH > doc.page.height - 50) {
      doc.addPage();
      drawHeader();
    }

    // zebra
    if (rowIdx % 2 === 0) {
      doc
        .save()
        .fillColor(COLORS.zebra)
        .rect(startX, doc.y, usableW, rowH)
        .fill()
        .restore();
    }

    let x = startX;
    row.forEach((cell, i) => {
      const text = cell === null || cell === undefined || cell === "" ? "—" : String(cell);
      doc
        .fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(8)
        .text(text, x + 4, doc.y + 4, {
          width: (colWidths[i] ?? 0) - 8,
          height: rowH - 4,
          ellipsis: true,
          lineBreak: false,
        });
      x += colWidths[i] ?? 0;
    });
    doc.y += rowH;
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

// =====================================================================
// 1. Ficha Completa da Turma
// =====================================================================
interface FichaColumn {
  id: string;
  header: string;
  width: number;
  accessor: (s: any, ctx: { contact: any; addr: any }) => string | number | null | undefined;
}

const FICHA_COLUMNS: FichaColumn[] = [
  { id: "fc_numero", header: "Nº", width: 0.05, accessor: (s) => s.student_number },
  { id: "fc_nome_guerra", header: "Nome de Guerra", width: 0.12, accessor: (s) => s.war_name },
  { id: "fc_nome_completo", header: "Nome Completo", width: 0.18, accessor: (s) => s.full_name },
  { id: "fc_cpf", header: "CPF", width: 0.09, accessor: (s) => s.cpf },
  { id: "fc_rg", header: "RG", width: 0.08, accessor: (s) => s.rg },
  {
    id: "fc_nasc",
    header: "Nasc.",
    width: 0.07,
    accessor: (s) => (s.birth_date ? new Date(s.birth_date).toLocaleDateString("pt-BR") : null),
  },
  { id: "fc_fase", header: "Pelotão/Fase", width: 0.08, accessor: (s) => s.pelotao },
  { id: "fc_sexo", header: "Sexo", width: 0.05, accessor: (s) => s.sex },
  { id: "fc_whatsapp", header: "WhatsApp", width: 0.11, accessor: (_s, ctx) => ctx.contact?.whatsapp },
  { id: "fc_email", header: "E-mail", width: 0.14, accessor: (_s, ctx) => ctx.contact?.email_personal },
  { id: "fc_cidade", header: "Cidade", width: 0.1, accessor: (_s, ctx) => ctx.addr?.city },
  { id: "fc_estado", header: "UF", width: 0.04, accessor: (_s, ctx) => ctx.addr?.state },
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
       student_addresses(city, state)`,
    )
    .order("student_number");

  const doc = createInstitutionalDoc({ title: "Ficha Completa da Turma" });

  const selected = selectedFields && selectedFields.length > 0 ? new Set(selectedFields) : null;
  const activeColumns = selected
    ? FICHA_COLUMNS.filter((c) => selected.has(c.id))
    : FICHA_COLUMNS;

  const fallbackColumns = activeColumns.length > 0 ? activeColumns : FICHA_COLUMNS;
  const totalWeight = fallbackColumns.reduce((sum, c) => sum + c.width, 0);
  const widthFractions = fallbackColumns.map((c) => c.width / totalWeight);
  const headers = fallbackColumns.map((c) => c.header);

  const rows = (students ?? []).map((s: any) => {
    const contact = Array.isArray(s.student_contacts) ? s.student_contacts[0] : s.student_contacts;
    const addr = Array.isArray(s.student_addresses) ? s.student_addresses[0] : s.student_addresses;
    return fallbackColumns.map((col) => {
      const value = col.accessor(s, { contact, addr });
      return value === null || value === undefined || value === "" ? "—" : value;
    });
  });

  renderTable(doc, headers, rows, widthFractions);

  return pdfToBuffer(doc);
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
  { id: "pe_numero", header: "Nº", width: 0.06, accessor: (_r, ctx) => ctx.st?.student_number },
  { id: "pe_nome_guerra", header: "Nome de Guerra", width: 0.16, accessor: (_r, ctx) => ctx.st?.war_name },
  { id: "pe_sexo", header: "Sexo", width: 0.06, accessor: (_r, ctx) => ctx.st?.sex },
  { id: "pe_item", header: "Item", width: 0.34, accessor: (_r, ctx) => ctx.req?.name },
  {
    id: "pe_qtd",
    header: "Qtd",
    width: 0.08,
    accessor: (_r, ctx) => (ctx.req ? `${ctx.req.quantity} ${ctx.req.unit ?? ""}`.trim() : null),
  },
  { id: "pe_status", header: "Status", width: 0.15, accessor: (r) => (r.status ?? "").replace(/_/g, " ") },
  {
    id: "pe_validacao",
    header: "Validação",
    width: 0.15,
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

  const doc = createInstitutionalDoc({ title: "Pendências de Enxoval" });

  const selected = selectedFields && selectedFields.length > 0 ? new Set(selectedFields) : null;
  const activeColumns = selected
    ? PENDENCIA_COLUMNS.filter((c) => selected.has(c.id))
    : PENDENCIA_COLUMNS;
  const cols = activeColumns.length > 0 ? activeColumns : PENDENCIA_COLUMNS;
  const totalWeight = cols.reduce((sum, c) => sum + c.width, 0);
  const widthFractions = cols.map((c) => c.width / totalWeight);
  const headers = cols.map((c) => c.header);

  const rows = (data ?? []).map((r: any) => {
    const st = Array.isArray(r.student) ? r.student[0] : r.student;
    const req = Array.isArray(r.requirement) ? r.requirement[0] : r.requirement;
    return cols.map((col) => {
      const value = col.accessor(r, { st, req });
      return value === null || value === undefined || value === "" ? "—" : value;
    });
  });

  renderTable(doc, headers, rows, widthFractions);

  return pdfToBuffer(doc);
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
  { id: "sa_numero", header: "Nº", width: 0.05, accessor: (s) => s.student_number },
  { id: "sa_nome", header: "Nome de Guerra", width: 0.14, accessor: (s) => s.war_name },
  {
    id: "sa_sangue",
    header: "Sangue/RH",
    width: 0.07,
    accessor: (_s, h) => (h?.blood_type ? `${h.blood_type}${h.rh_factor ?? ""}` : null),
  },
  {
    id: "sa_oculos",
    header: "Óculos",
    width: 0.05,
    accessor: (_s, h) => (h?.uses_glasses === true ? "Sim" : h?.uses_glasses === false ? "Não" : null),
  },
  { id: "sa_alergias", header: "Alergias", width: 0.14, accessor: (_s, h) => h?.allergies },
  { id: "sa_medicacao", header: "Medicação contínua", width: 0.14, accessor: (_s, h) => h?.continuous_medication },
  {
    id: "sa_restricao_fisica",
    header: "Restrição física / Doença",
    width: 0.14,
    accessor: (_s, h) => {
      const parts = [h?.physical_restriction, h?.chronic_disease].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : null;
    },
  },
  { id: "sa_restricao_alimentar", header: "Restr. alimentar", width: 0.1, accessor: (_s, h) => h?.dietary_restriction },
  {
    id: "sa_cirurgia_ocular",
    header: "Cirurgia ocular",
    width: 0.08,
    accessor: (_s, h) => {
      if (h?.cirurgia_ocular === true) return h?.cirurgia_ocular_obs ? `Sim · ${h.cirurgia_ocular_obs}` : "Sim";
      if (h?.cirurgia_ocular === false) return "Não";
      return null;
    },
  },
  { id: "sa_observacoes", header: "Resumo operacional", width: 0.16, accessor: (_s, h) => h?.operational_summary },
  {
    id: "sa_validacao",
    header: "Validação",
    width: 0.08,
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
         cirurgia_ocular_obs, validation_status, operational_summary
       )`,
    )
    .order("student_number");

  const doc = createInstitutionalDoc({
    title: "Restrições de Saúde",
    lgpdWarning:
      "AVISO LGPD · Documento de uso restrito à Coordenação. Contém dados sensíveis de saúde — Lei 13.709/2018. Não compartilhe.",
  });

  const filtered = (data ?? []).filter((s: any) => {
    const h = Array.isArray(s.health_restrictions) ? s.health_restrictions[0] : s.health_restrictions;
    return (
      h &&
      (h.allergies ||
        h.continuous_medication ||
        h.chronic_disease ||
        h.physical_restriction ||
        h.dietary_restriction ||
        h.uses_glasses ||
        h.cirurgia_ocular ||
        h.operational_summary)
    );
  });

  const selected = selectedFields && selectedFields.length > 0 ? new Set(selectedFields) : null;
  const activeColumns = selected ? SAUDE_COLUMNS.filter((c) => selected.has(c.id)) : SAUDE_COLUMNS;
  const cols = activeColumns.length > 0 ? activeColumns : SAUDE_COLUMNS;
  const totalWeight = cols.reduce((sum, c) => sum + c.width, 0);
  const widthFractions = cols.map((c) => c.width / totalWeight);
  const headers = cols.map((c) => c.header);

  const rows = filtered.map((s: any) => {
    const h = Array.isArray(s.health_restrictions) ? s.health_restrictions[0] : s.health_restrictions;
    return cols.map((col) => {
      const value = col.accessor(s, h);
      return value === null || value === undefined || value === "" ? "—" : value;
    });
  });

  renderTable(doc, headers, rows, widthFractions);

  return pdfToBuffer(doc);
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
  { id: "em_numero", header: "Nº", width: 0.05, accessor: (s) => s.student_number },
  { id: "em_nome_guerra", header: "Nome de Guerra", width: 0.12, accessor: (s) => s.war_name },
  { id: "em_c1_nome", header: "Contato 1", width: 0.12, accessor: (_s, ctx) => ctx.c1?.full_name },
  { id: "em_c1_parentesco", header: "Parentesco 1", width: 0.08, accessor: (_s, ctx) => ctx.c1?.relationship },
  { id: "em_c1_telefone", header: "Telefone 1", width: 0.1, accessor: (_s, ctx) => ctx.c1?.phone },
  { id: "em_c1_endereco", header: "Endereço 1", width: 0.13, accessor: (_s, ctx) => ctx.c1?.address },
  { id: "em_c2_nome", header: "Contato 2", width: 0.12, accessor: (_s, ctx) => ctx.c2?.full_name },
  { id: "em_c2_parentesco", header: "Parentesco 2", width: 0.08, accessor: (_s, ctx) => ctx.c2?.relationship },
  { id: "em_c2_telefone", header: "Telefone 2", width: 0.1, accessor: (_s, ctx) => ctx.c2?.phone },
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

  const doc = createInstitutionalDoc({ title: "Contatos de Emergência" });

  const selected = selectedFields && selectedFields.length > 0 ? new Set(selectedFields) : null;
  const activeColumns = selected
    ? EMERGENCIA_COLUMNS.filter((c) => selected.has(c.id))
    : EMERGENCIA_COLUMNS;
  const cols = activeColumns.length > 0 ? activeColumns : EMERGENCIA_COLUMNS;
  const totalWeight = cols.reduce((sum, c) => sum + c.width, 0);
  const widthFractions = cols.map((c) => c.width / totalWeight);
  const headers = cols.map((c) => c.header);

  const rows = (data ?? []).map((s: any) => {
    const contacts: any[] = Array.isArray(s.emergency_contacts)
      ? s.emergency_contacts
      : s.emergency_contacts
      ? [s.emergency_contacts]
      : [];
    const c1 = contacts.find((c) => c.priority === 1) ?? null;
    const c2 = contacts.find((c) => c.priority === 2) ?? null;
    return cols.map((col) => {
      const value = col.accessor(s, { c1, c2 });
      return value === null || value === undefined || value === "" ? "—" : value;
    });
  });

  renderTable(doc, headers, rows, widthFractions);

  return pdfToBuffer(doc);
}
