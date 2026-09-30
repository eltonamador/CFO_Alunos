/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatReportDate,
  internshipCountingLabel,
  internshipExcelDateTime,
  internshipSourceLabel,
  internshipStatusLabel,
  loadInternshipReportData,
} from "./internship-report-data";

// =====================================================================
// Estilos base reutilizáveis
// =====================================================================
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1D3557" }, // azul escuro CBMAP
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};
const ALT_ROW_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF0F4F8" },
};

function applyHeaderRow(row: ExcelJS.Row, columns: string[]) {
  row.values = ["", ...columns]; // offset 1 (ExcelJS is 1-indexed)
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF457B9D" } },
    };
  });
  row.height = 22;
}

function applyDataRow(row: ExcelJS.Row, index: number) {
  if (index % 2 === 0) {
    row.eachCell((cell) => {
      cell.fill = ALT_ROW_FILL;
    });
  }
  row.eachCell((cell) => {
    cell.alignment = { vertical: "middle", wrapText: true };
  });
}

function autoWidth(sheet: ExcelJS.Worksheet, minWidth = 10, maxWidth = 45) {
  sheet.columns.forEach((col) => {
    let max = minWidth;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.text?.length ?? 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, maxWidth);
  });
}

// =====================================================================
// 1. Ficha Completa da Turma
// =====================================================================
export async function buildFichaCompletaWorkbook(
  supabase: SupabaseClient<any, any, any>,
): Promise<ExcelJS.Buffer> {
  const { data: students } = await supabase
    .from("students")
    .select(
      `id, student_number, war_name, full_name, pelotao, situation, sex, birth_date,
       cpf, rg, enrollment_id, marital_status, education_level,
       student_contacts(whatsapp, email_personal),
       student_addresses(city, state, from_other_state),
       student_logistics(needs_housing, has_fixed_residence_macapa, gandola_size, pants_size)`,
    )
    .is("deleted_at", null)
    .eq("course_status", "matriculado")
    .order("student_number");

  const wb = new ExcelJS.Workbook();
  wb.creator = "CFO Alunos";
  wb.created = new Date();

  const ws = wb.addWorksheet("Ficha Completa", {
    pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "landscape" },
  });

  const columns = [
    "Nº",
    "Nome de Guerra",
    "Nome Completo",
    "Fase do CFO",
    "Situação",
    "Sexo",
    "Nascimento",
    "CPF",
    "RG",
    "Matrícula",
    "Est. Civil",
    "Escolaridade",
    "WhatsApp",
    "E-mail",
    "Cidade",
    "UF",
    "Vem de outro estado",
    "Necessita alojamento",
    "Gandola",
    "Calça",
  ];

  applyHeaderRow(ws.addRow([]), columns);

  (students ?? []).forEach((s: any, i) => {
    const c = Array.isArray(s.student_contacts) ? s.student_contacts[0] : s.student_contacts;
    const a = Array.isArray(s.student_addresses) ? s.student_addresses[0] : s.student_addresses;
    const l = Array.isArray(s.student_logistics) ? s.student_logistics[0] : s.student_logistics;

    const row = ws.addRow([
      s.student_number ?? "",
      s.war_name,
      s.full_name,
      s.pelotao ?? "",
      s.situation,
      s.sex ?? "",
      s.birth_date ?? "",
      s.cpf ?? "",
      s.rg ?? "",
      s.enrollment_id ?? "",
      s.marital_status ?? "",
      s.education_level ?? "",
      c?.whatsapp ?? "",
      c?.email_personal ?? "",
      a?.city ?? "",
      a?.state ?? "",
      a?.from_other_state ? "Sim" : "Não",
      l?.needs_housing ? "Sim" : "Não",
      l?.gandola_size ?? "",
      l?.pants_size ?? "",
    ]);
    applyDataRow(row, i);
  });

  autoWidth(ws);
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1, topLeftCell: "A2", activeCell: "A2" }];

  return wb.xlsx.writeBuffer();
}

// =====================================================================
// 2. Pendências de Enxoval
// =====================================================================
export async function buildPendenciasEnxovalWorkbook(
  supabase: SupabaseClient<any, any, any>,
): Promise<ExcelJS.Buffer> {
  const { data: students } = await supabase
    .from("students")
    .select("id, student_number, war_name, sex, situation")
    .eq("situation", "matriculado")
    .eq("course_status", "matriculado")
    .is("deleted_at", null)
    .order("student_number");

  const { data: requirements } = await supabase
    .from("equipment_requirements")
    .select("id, name, category_id, mandatory, applicability")
    .eq("active", true)
    .eq("mandatory", true)
    .order("name");

  const { data: allStatuses } = await supabase
    .from("student_equipment_status")
    .select("student_id, requirement_id, status, validation_status");

  const wb = new ExcelJS.Workbook();
  wb.creator = "CFO Alunos";
  wb.created = new Date();

  const ws = wb.addWorksheet("Pendências Enxoval", {
    pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "landscape" },
  });

  const columns = ["Nº", "Nome de Guerra", "Sexo", "Item", "Status Atual", "Validação"];
  applyHeaderRow(ws.addRow([]), columns);

  const statusIndex: Record<string, Record<string, any>> = {};
  for (const s of allStatuses ?? []) {
    if (s.student_id && s.requirement_id) {
      if (!statusIndex[s.student_id]) statusIndex[s.student_id] = {};
      statusIndex[s.student_id]![s.requirement_id] = s;
    }
  }

  const PENDING_STATUS = new Set([
    "pendente_validacao",
    "falta_comprar",
    "em_duvida",
    "inadequado",
    "vai_chegar",
  ]);

  let rowIndex = 0;
  for (const student of students ?? []) {
    for (const req of requirements ?? []) {
      if (req.applicability === "masculino" && student.sex !== "M") continue;
      if (req.applicability === "feminino" && student.sex !== "F") continue;

      const st = statusIndex[student.id]?.[req.id];
      const status = st?.status ?? "pendente_validacao";
      const validation = st?.validation_status ?? "nao_validado";

      const pending =
        !st || PENDING_STATUS.has(status) || (status === "comprado" && validation !== "validado");

      if (!pending) continue;

      const row = ws.addRow([
        student.student_number ?? "",
        student.war_name,
        student.sex ?? "",
        req.name,
        status.replace(/_/g, " "),
        validation.replace(/_/g, " "),
      ]);
      applyDataRow(row, rowIndex++);
    }
  }

  autoWidth(ws);
  return wb.xlsx.writeBuffer();
}

// =====================================================================
// 3. Restrições de Saúde
// =====================================================================
export async function buildSaudeWorkbook(
  supabase: SupabaseClient<any, any, any>,
): Promise<ExcelJS.Buffer> {
  const { data } = await supabase
    .from("students")
    .select(
      `student_number, war_name, full_name, sex,
       health_restrictions(operational_summary, allergies, continuous_medication, chronic_disease, physical_restriction, validation_status, has_allergies, has_continuous_medication, has_chronic_disease, has_physical_restriction)`,
    )
    .is("deleted_at", null)
    .eq("course_status", "matriculado")
    .order("student_number");

  const wb = new ExcelJS.Workbook();
  wb.creator = "CFO Alunos";
  wb.created = new Date();

  const ws = wb.addWorksheet("Restrições de Saúde");
  const columns = [
    "Nº",
    "Nome de Guerra",
    "Nome Completo",
    "Sexo",
    "Resumo Operacional",
    "Alergias",
    "Medicação Contínua",
    "Doença Crônica",
    "Restrição Física",
    "Validação",
  ];
  applyHeaderRow(ws.addRow([]), columns);

  let rowIndex = 0;
  (data ?? []).forEach((s: any) => {
    const h = Array.isArray(s.health_restrictions)
      ? s.health_restrictions[0]
      : s.health_restrictions;
    if (
      !h?.operational_summary &&
      !h?.has_allergies &&
      !h?.has_continuous_medication &&
      !h?.has_chronic_disease &&
      !h?.has_physical_restriction
    ) {
      return; // sem restrição: omite
    }
    const fmtBool = (flag: boolean | null, detail: string | null) =>
      flag ? (detail ? `Sim — ${detail}` : "Sim") : flag === false ? "Não" : "";
    const row = ws.addRow([
      s.student_number ?? "",
      s.war_name,
      s.full_name,
      s.sex ?? "",
      h?.operational_summary ?? "",
      fmtBool(h?.has_allergies, h?.allergies),
      fmtBool(h?.has_continuous_medication, h?.continuous_medication),
      fmtBool(h?.has_chronic_disease, h?.chronic_disease),
      fmtBool(h?.has_physical_restriction, h?.physical_restriction),
      h?.validation_status?.replace(/_/g, " ") ?? "",
    ]);
    applyDataRow(row, rowIndex++);
  });

  if (rowIndex === 0) {
    const row = ws.addRow(["Sem registros de restrições de saúde no momento."]);
    ws.mergeCells(row.number, 1, row.number, columns.length);
  }

  autoWidth(ws);
  return wb.xlsx.writeBuffer();
}

// =====================================================================
// 4. Contatos de Emergência
// =====================================================================
export async function buildEmergenciaWorkbook(
  supabase: SupabaseClient<any, any, any>,
): Promise<ExcelJS.Buffer> {
  const { data } = await supabase
    .from("students")
    .select(
      `student_number, war_name,
       emergency_contacts(priority, full_name, relationship, phone, address)`,
    )
    .is("deleted_at", null)
    .eq("course_status", "matriculado")
    .order("student_number");

  const wb = new ExcelJS.Workbook();
  wb.creator = "CFO Alunos";
  wb.created = new Date();

  const ws = wb.addWorksheet("Emergência");
  const columns = [
    "Nº Aluno",
    "Nome de Guerra",
    "Prioridade",
    "Contato",
    "Parentesco",
    "Telefone",
    "Endereço",
  ];
  applyHeaderRow(ws.addRow([]), columns);

  let rowIndex = 0;
  for (const s of data ?? []) {
    const contacts: any[] = Array.isArray(s.emergency_contacts)
      ? s.emergency_contacts
      : s.emergency_contacts
        ? [s.emergency_contacts]
        : [];
    for (const c of contacts) {
      const row = ws.addRow([
        (s as any).student_number ?? "",
        (s as any).war_name,
        c.priority,
        c.full_name,
        c.relationship ?? "",
        c.phone,
        c.address ?? "",
      ]);
      applyDataRow(row, rowIndex++);
    }
  }

  autoWidth(ws);
  return wb.xlsx.writeBuffer();
}

// =====================================================================
// 5. Controle do Estágio Supervisionado
// =====================================================================
export async function buildInternshipWorkbook(
  supabase: SupabaseClient<any, any, any>,
): Promise<ExcelJS.Buffer> {
  const { program, workload, schedule } = await loadInternshipReportData(supabase);
  const wb = new ExcelJS.Workbook();
  wb.creator = "CFO Alunos";
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  const summary = wb.addWorksheet("Resumo de Carga", {
    pageSetup: {
      fitToPage: true,
      fitToWidth: 1,
      orientation: "landscape",
      paperSize: 9,
    },
  });
  summary.mergeCells("A1:N1");
  summary.getCell("A1").value = "Controle de Estágio Supervisionado — CFO 2026.1";
  summary.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF1D3557" } };
  summary.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  summary.getRow(1).height = 28;
  summary.mergeCells("A2:N2");
  summary.getCell("A2").value =
    `${program.name} · ${formatReportDate(program.starts_on)} a ${formatReportDate(program.ends_on)}`;
  summary.getCell("A2").font = { italic: true, color: { argb: "FF4B5563" } };

  const totals = workload.reduce(
    (sum, row) => ({
      planned: sum.planned + Number(row.planned_minutes),
      performed: sum.performed + Number(row.performed_minutes),
      validated: sum.validated + Number(row.validated_minutes),
      concluded: sum.concluded + (row.concluded ? 1 : 0),
      pending: sum.pending + Number(row.awaiting_homologation),
    }),
    { planned: 0, performed: 0, validated: 0, concluded: 0, pending: 0 },
  );
  const kpis = [
    ["Cadetes", workload.length],
    ["Com mínimo integralizado", totals.concluded],
    ["Fichas pendentes", totals.pending],
    ["Carga homologada da turma", totals.validated / 1440],
  ];
  kpis.forEach(([label, value], index) => {
    const start = index * 3 + 1;
    summary.mergeCells(4, start, 4, start + 1);
    summary.mergeCells(5, start, 5, start + 1);
    summary.getCell(4, start).value = label;
    summary.getCell(4, start).font = { bold: true, color: { argb: "FFFFFFFF" } };
    summary.getCell(4, start).fill = HEADER_FILL;
    summary.getCell(5, start).value = value;
    summary.getCell(5, start).font = { bold: true, size: 13 };
    if (index === 3) summary.getCell(5, start).numFmt = "[h]:mm";
  });

  const summaryHeaders = [
    "Nº",
    "Cadete",
    "Prevista",
    "Realizada",
    "Homologada",
    "Mínimo",
    "Meta",
    "Falta mínimo",
    "Falta meta",
    "Excedente",
    "Plantões",
    "Fichas pendentes",
    "Ocorrências",
    "Situação",
  ];
  applyHeaderRow(summary.addRow([]), summaryHeaders);
  const firstDataRow = 7;
  workload.forEach((item, index) => {
    const rowNumber = firstDataRow + index;
    const row = summary.addRow([
      item.student_number ?? "",
      item.war_name,
      Number(item.planned_minutes) / 1440,
      Number(item.performed_minutes) / 1440,
      Number(item.validated_minutes) / 1440,
      Number(item.required_minutes) / 1440,
      Number(item.target_minutes) / 1440,
      {
        formula: `MAX(0,F${rowNumber}-E${rowNumber})`,
        result: Number(item.missing_required_minutes) / 1440,
      },
      {
        formula: `MAX(0,G${rowNumber}-E${rowNumber})`,
        result: Number(item.missing_target_minutes) / 1440,
      },
      { formula: `MAX(0,E${rowNumber}-F${rowNumber})`, result: Number(item.excess_minutes) / 1440 },
      Number(item.assigned_shifts),
      Number(item.awaiting_homologation),
      Number(item.open_occurrences),
      {
        formula: `IF(E${rowNumber}>=F${rowNumber},"Integralizado","Em formação")`,
        result: item.concluded ? "Integralizado" : "Em formação",
      },
    ]);
    applyDataRow(row, index);
    for (let column = 3; column <= 10; column += 1) row.getCell(column).numFmt = "[h]:mm";
  });
  const totalRowNumber = firstDataRow + workload.length;
  const totalRow = summary.addRow([
    "",
    "TOTAL DA TURMA",
    { formula: `SUM(C${firstDataRow}:C${totalRowNumber - 1})`, result: totals.planned / 1440 },
    { formula: `SUM(D${firstDataRow}:D${totalRowNumber - 1})`, result: totals.performed / 1440 },
    { formula: `SUM(E${firstDataRow}:E${totalRowNumber - 1})`, result: totals.validated / 1440 },
    "",
    "",
    { formula: `SUM(H${firstDataRow}:H${totalRowNumber - 1})` },
    { formula: `SUM(I${firstDataRow}:I${totalRowNumber - 1})` },
    { formula: `SUM(J${firstDataRow}:J${totalRowNumber - 1})` },
    { formula: `SUM(K${firstDataRow}:K${totalRowNumber - 1})` },
    { formula: `SUM(L${firstDataRow}:L${totalRowNumber - 1})`, result: totals.pending },
    { formula: `SUM(M${firstDataRow}:M${totalRowNumber - 1})` },
    "",
  ]);
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };
  });
  for (let column = 3; column <= 10; column += 1) totalRow.getCell(column).numFmt = "[h]:mm";
  summary.autoFilter = { from: { row: 6, column: 1 }, to: { row: totalRowNumber - 1, column: 14 } };
  summary.views = [{ state: "frozen", ySplit: 6, topLeftCell: "A7", activeCell: "A7" }];
  autoWidth(summary, 9, 24);
  summary.getColumn(2).width = 24;

  const agenda = wb.addWorksheet("Agenda Detalhada", {
    pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "landscape", paperSize: 9 },
  });
  const agendaHeaders = [
    "Data",
    "Padrão",
    "Modalidade",
    "Local / recurso",
    "Nº",
    "Cadete",
    "Origem",
    "Situação",
    "Início",
    "Fim",
    "Prevista",
    "Realizada",
    "Homologada",
    "Supervisor",
    "Ficha",
    "Motivo / movimentação",
    "Contagem da carga",
  ];
  applyHeaderRow(agenda.addRow([]), agendaHeaders);
  schedule.forEach((item, index) => {
    const row = agenda.addRow([
      formatReportDate(item.shift_date),
      item.template_code ?? "Excepcional",
      item.activity_name,
      `${item.site_name} · ${item.resource_name}`,
      item.student_number ?? "",
      item.war_name ?? "Sem cadete",
      internshipSourceLabel(item.assignment_source),
      internshipStatusLabel(item),
      internshipExcelDateTime(item.starts_at),
      internshipExcelDateTime(item.ends_at),
      Number(item.planned_minutes) / 1440,
      item.performed_minutes === null ? "" : Number(item.performed_minutes) / 1440,
      item.approved_minutes === null ? "" : Number(item.approved_minutes) / 1440,
      item.supervisor_name ?? "",
      item.document_reference ?? "",
      item.movement_reason ?? "",
      internshipCountingLabel(item),
    ]);
    applyDataRow(row, index);
    row.getCell(9).numFmt = "dd/mm/yyyy hh:mm";
    row.getCell(10).numFmt = "dd/mm/yyyy hh:mm";
    for (let column = 11; column <= 13; column += 1) row.getCell(column).numFmt = "[h]:mm";
  });
  agenda.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, schedule.length + 1), column: 17 },
  };
  agenda.views = [{ state: "frozen", ySplit: 1, topLeftCell: "A2", activeCell: "A2" }];
  autoWidth(agenda, 10, 32);
  agenda.getColumn(4).width = 28;
  agenda.getColumn(16).width = 32;

  return wb.xlsx.writeBuffer();
}
