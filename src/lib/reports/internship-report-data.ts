/* eslint-disable @typescript-eslint/no-explicit-any */
import { readAll } from "@/modules/internship-management/infrastructure/readAll";
import type { SupabaseClient } from "@supabase/supabase-js";

export type InternshipProgramReport = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  required_minutes: number;
  target_minutes: number;
};

export type InternshipWorkloadReportRow = {
  student_id: string;
  student_number: number | null;
  war_name: string;
  planned_minutes: number;
  performed_minutes: number;
  validated_minutes: number;
  required_minutes: number;
  target_minutes: number;
  missing_required_minutes: number;
  missing_target_minutes: number;
  excess_minutes: number;
  assigned_shifts: number;
  awaiting_homologation: number;
  open_occurrences: number;
  concluded: boolean;
};

export type InternshipScheduleReportRow = {
  shift_id: string;
  assignment_id: string | null;
  student_id: string | null;
  student_number: number | null;
  war_name: string | null;
  activity_code: string;
  activity_name: string;
  site_name: string;
  resource_name: string;
  template_code: string | null;
  abm_departure_time: string | null;
  obm_arrival_time: string | null;
  obm_departure_time: string | null;
  abm_return_time: string | null;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  planned_minutes: number;
  shift_status: string;
  assignment_status: string | null;
  assignment_source: string | null;
  movement_reason: string | null;
  supervisor_name: string | null;
  document_reference: string | null;
  validation_status: string | null;
  performed_minutes: number | null;
  approved_minutes: number | null;
  cadet_report_count: number;
};

export type InternshipReportData = {
  program: InternshipProgramReport;
  workload: InternshipWorkloadReportRow[];
  schedule: InternshipScheduleReportRow[];
};

function assertNoError(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export async function loadInternshipReportData(
  supabase: SupabaseClient<any, any, any>,
): Promise<InternshipReportData> {
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("code", "CFO-2026")
    .maybeSingle();
  assertNoError(courseError, "Falha ao localizar o curso CFO 2026");
  if (!course) throw new Error("Curso CFO 2026 não encontrado.");

  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id")
    .eq("course_id", course.id)
    .eq("name", "CFO 2026.1")
    .maybeSingle();
  assertNoError(classError, "Falha ao localizar a turma CFO 2026.1");
  if (!classRow) throw new Error("Turma CFO 2026.1 não encontrada.");

  const { data: program, error: programError } = await supabase
    .from("internship_programs")
    .select("id, name, starts_on, ends_on, required_minutes, target_minutes")
    .eq("class_id", classRow.id)
    .eq("course_phase", "CFO I")
    .maybeSingle();
  assertNoError(programError, "Falha ao carregar o programa de estágio");
  if (!program) throw new Error("Programa de estágio da turma CFO 2026.1 não encontrado.");

  const [workload, schedule] = await Promise.all([
    readAll<InternshipWorkloadReportRow>((from, to) =>
      supabase
        .rpc("internship_coordination_workload", { p_program_id: program.id })
        .order("student_id")
        .range(from, to),
    ),
    readAll<InternshipScheduleReportRow>((from, to) =>
      supabase
        .rpc("internship_coordination_schedule", { p_program_id: program.id })
        .order("shift_id")
        .order("assignment_id")
        .range(from, to),
    ),
  ]);
  return {
    program,
    workload,
    schedule: schedule.filter(
      (row) => row.shift_status === "publicado" && row.assignment_status === "prevista",
    ),
  };
}

export function internshipStatusLabel(row: {
  shift_status: string;
  assignment_status: string | null;
  validation_status: string | null;
}) {
  if (row.shift_status === "cancelado") return "Turno cancelado";
  if (row.assignment_status === "cancelada") return "Participação cancelada";
  if (row.assignment_status === "substituida") return "Substituída";
  if (row.validation_status === "homologado") return "Homologada";
  if (row.validation_status === "pendente") return "Ficha pendente";
  return row.shift_status === "publicado" ? "Publicada" : "Rascunho";
}

export function internshipSourceLabel(source: string | null) {
  const labels: Record<string, string> = {
    manual: "Manual",
    importacao: "Importação",
    geracao: "Geração",
    remanejamento: "Remanejamento",
    reposicao: "Reposição",
    substituicao: "Substituição",
  };
  return source ? (labels[source] ?? source) : "Sem participação";
}

export function formatReportDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Belem" }).format(
    new Date(`${value}T12:00:00-03:00`),
  );
}

export function formatReportDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function internshipCountingLabel(row: {
  template_code: string | null;
  abm_departure_time: string | null;
}) {
  if (!row.template_code) return "Conforme plantão";
  return row.abm_departure_time
    ? "Saída–retorno ABM, com deslocamento"
    : "Apresentação OBM, sem deslocamento";
}

/** Excel stores a civil clock without timezone. Preserve the displayed Belem time. */
export function internshipExcelDateTime(value: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Belem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")),
  );
}
