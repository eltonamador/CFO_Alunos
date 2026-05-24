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
export async function buildFichaCompletaPDF(supabase: SupabaseClient<any, any, any>): Promise<Buffer> {
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

  const headers = [
    "Nº",
    "Nome de Guerra",
    "Nome Completo",
    "Sexo",
    "Nasc.",
    "Pelotão",
    "WhatsApp",
    "Cidade/UF",
    "Situação",
  ];
  const rows = (students ?? []).map((s: any) => {
    const contact = Array.isArray(s.student_contacts) ? s.student_contacts[0] : s.student_contacts;
    const addr = Array.isArray(s.student_addresses) ? s.student_addresses[0] : s.student_addresses;
    return [
      s.student_number ?? "—",
      s.war_name ?? "—",
      s.full_name ?? "—",
      s.sex ?? "—",
      s.birth_date ? new Date(s.birth_date).toLocaleDateString("pt-BR") : "—",
      s.pelotao ?? "—",
      contact?.whatsapp ?? "—",
      addr ? `${addr.city ?? ""}${addr.state ? "/" + addr.state : ""}` : "—",
      s.situation ?? "—",
    ];
  });

  renderTable(doc, headers, rows, [0.05, 0.13, 0.22, 0.05, 0.08, 0.08, 0.13, 0.16, 0.1]);

  return pdfToBuffer(doc);
}

// =====================================================================
// 2. Pendências de Enxoval
// =====================================================================
export async function buildPendenciasEnxovalPDF(
  supabase: SupabaseClient<any, any, any>,
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

  const headers = ["Nº", "Nome de Guerra", "Sexo", "Item", "Qtd", "Status", "Validação"];
  const rows = (data ?? []).map((r: any) => {
    const st = Array.isArray(r.student) ? r.student[0] : r.student;
    const req = Array.isArray(r.requirement) ? r.requirement[0] : r.requirement;
    return [
      st?.student_number ?? "—",
      st?.war_name ?? "—",
      st?.sex ?? "—",
      req?.name ?? "—",
      req ? `${req.quantity} ${req.unit ?? ""}`.trim() : "—",
      (r.status ?? "").replace(/_/g, " "),
      (r.validation_status ?? "").replace(/_/g, " "),
    ];
  });

  renderTable(doc, headers, rows, [0.06, 0.16, 0.06, 0.34, 0.08, 0.15, 0.15]);

  return pdfToBuffer(doc);
}

// =====================================================================
// 3. Restrições de Saúde (LGPD)
// =====================================================================
export async function buildSaudePDF(supabase: SupabaseClient<any, any, any>): Promise<Buffer> {
  const { data } = await supabase
    .from("students")
    .select(
      `student_number, war_name, full_name, sex,
       health_restrictions(blood_type, rh_factor, allergies, continuous_medication, chronic_disease, physical_restriction, validation_status, operational_summary)`,
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
        h.operational_summary)
    );
  });

  const headers = ["Nº", "Nome de Guerra", "Sangue", "Alergias", "Medicação", "Doença crônica", "Resumo operacional"];
  const rows = filtered.map((s: any) => {
    const h = Array.isArray(s.health_restrictions) ? s.health_restrictions[0] : s.health_restrictions;
    return [
      s.student_number ?? "—",
      s.war_name ?? "—",
      h?.blood_type ? `${h.blood_type}${h.rh_factor ?? ""}` : "—",
      h?.allergies ?? "—",
      h?.continuous_medication ?? "—",
      h?.chronic_disease ?? "—",
      h?.operational_summary ?? "—",
    ];
  });

  renderTable(doc, headers, rows, [0.05, 0.15, 0.08, 0.18, 0.18, 0.16, 0.2]);

  return pdfToBuffer(doc);
}

// =====================================================================
// 4. Contatos de Emergência
// =====================================================================
export async function buildEmergenciaPDF(supabase: SupabaseClient<any, any, any>): Promise<Buffer> {
  const { data } = await supabase
    .from("students")
    .select(
      `student_number, war_name,
       emergency_contacts(priority, full_name, relationship, phone, address)`,
    )
    .order("student_number");

  const doc = createInstitutionalDoc({ title: "Contatos de Emergência" });

  const headers = ["Nº", "Nome de Guerra", "Prio", "Contato", "Parentesco", "Telefone", "Endereço"];
  const rows: (string | number)[][] = [];
  for (const s of data ?? []) {
    const contacts: any[] = Array.isArray((s as any).emergency_contacts)
      ? (s as any).emergency_contacts
      : (s as any).emergency_contacts
      ? [(s as any).emergency_contacts]
      : [];
    contacts
      .sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9))
      .forEach((c) => {
        rows.push([
          (s as any).student_number ?? "—",
          (s as any).war_name ?? "—",
          String(c.priority ?? "—"),
          c.full_name ?? "—",
          c.relationship ?? "—",
          c.phone ?? "—",
          c.address ?? "—",
        ]);
      });
  }

  renderTable(doc, headers, rows, [0.05, 0.14, 0.05, 0.2, 0.12, 0.14, 0.3]);

  return pdfToBuffer(doc);
}
