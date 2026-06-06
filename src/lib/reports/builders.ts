/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  ws.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }
  ];

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

  const PENDING_STATUS = new Set(["pendente_validacao", "falta_comprar", "em_duvida", "inadequado", "vai_chegar"]);

  let rowIndex = 0;
  for (const student of students ?? []) {
    for (const req of requirements ?? []) {
      if (req.applicability === "masculino" && student.sex !== "M") continue;
      if (req.applicability === "feminino" && student.sex !== "F") continue;

      const st = statusIndex[student.id]?.[req.id];
      const status = st?.status ?? "pendente_validacao";
      const validation = st?.validation_status ?? "nao_validado";

      const pending =
        !st ||
        PENDING_STATUS.has(status) ||
        (status === "comprado" && validation !== "validado");

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
    const h = Array.isArray(s.health_restrictions) ? s.health_restrictions[0] : s.health_restrictions;
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
