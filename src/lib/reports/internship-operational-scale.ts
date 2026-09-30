/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defaultInternshipUniform,
  type InternshipUniformCode,
} from "@/modules/internship-management/domain/uniforms";
import { loadInternshipReportData } from "./internship-report-data";
import { permanenceRowSchema } from "@/modules/internship-management/domain/permanence";

export type ScaleService = "estagio" | "todos" | "gbm" | "praia" | "permanencia";

export type OperationalInternshipRow = {
  shiftId: string;
  studentNumber: number;
  warName: string;
  activityName: string;
  siteName: string;
  resourceName: string;
  startsAt: string;
  endsAt: string;
  uniformCode: InternshipUniformCode;
  validatedMinutes: number;
};
export type OperationalInternshipScaleDraft = {
  title?: string;
  gbmName?: string;
  service: ScaleService;
  programId: string;
  programName: string;
  periodStart: string;
  periodEnd: string;
  issuedAt: string;
  rows: OperationalInternshipRow[];
};
export type OperationalInternshipScale = OperationalInternshipScaleDraft & {
  referenceCode: string;
  rectification?: number | null;
  changeSummary?: string;
};

export function formatInternshipScaleNumber(sequenceNumber: number, periodStart: string): string {
  if (
    !Number.isSafeInteger(sequenceNumber) ||
    sequenceNumber < 1 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(periodStart)
  )
    throw new Error("Numeração da escala inválida.");
  return `${String(sequenceNumber).padStart(2, "0")}-${periodStart.slice(8, 10)}${periodStart.slice(5, 7)}${periodStart.slice(0, 4)}`;
}

export async function issueInternshipScaleNumber(
  supabase: SupabaseClient<any, any, any>,
  input: {
    programId: string;
    service: ScaleService;
    periodStart: string;
    periodEnd: string;
    gbmSiteId?: string;
    sourceRosterId?: string;
  },
): Promise<string> {
  const { data, error } = await supabase.rpc("internship_issue_scale_number", {
    p_program_id: input.programId,
    p_service: input.service,
    p_period_start: input.periodStart,
    p_period_end: input.periodEnd,
    p_gbm_site_id: input.gbmSiteId ?? null,
    p_source_roster_id: input.sourceRosterId ?? null,
  });
  if (error || typeof data !== "number")
    throw new Error(`Não foi possível numerar a escala: ${error?.message ?? "retorno inválido"}`);
  return formatInternshipScaleNumber(data, input.periodStart);
}

export async function loadOperationalInternshipScale(
  supabase: SupabaseClient<any, any, any>,
  periodStart?: string,
  periodEnd?: string,
  service: ScaleService = "estagio",
  gbmSiteId?: string,
): Promise<OperationalInternshipScaleDraft> {
  const { program, workload, schedule } = await loadInternshipReportData(supabase);
  let gbmName: string | undefined;
  if (gbmSiteId) {
    if (service !== "gbm") throw new Error("GBM só pode ser filtrado na escala operacional.");
    const { data: site, error } = await supabase
      .from("internship_sites")
      .select("name")
      .eq("id", gbmSiteId)
      .eq("program_id", program.id)
      .eq("site_type", "gbm")
      .maybeSingle();
    if (error || !site) throw new Error("GBM inválido para o programa de estágio.");
    gbmName = site.name;
  }
  const start = periodStart ?? program.starts_on;
  const end = periodEnd ?? program.ends_on;
  const active = schedule.filter(
    (row) =>
      row.shift_status === "publicado" &&
      row.assignment_status === "prevista" &&
      row.student_id &&
      row.student_number !== null &&
      row.war_name &&
      service !== "permanencia" &&
      (service !== "praia" || row.activity_code === "guarda_vida") &&
      (service !== "gbm" || ["usb", "ar"].includes(row.activity_code)) &&
      (!gbmName || row.site_name === gbmName) &&
      row.shift_date >= start &&
      row.shift_date <= end,
  );
  const shiftIds = [...new Set(active.map((row) => row.shift_id))];
  const uniformResult = shiftIds.length
    ? await supabase
        .from("internship_shift_uniforms")
        .select("shift_id, uniform_code")
        .in("shift_id", shiftIds)
    : { data: [], error: null };
  if (uniformResult.error)
    throw new Error(`Falha ao consultar uniformes: ${uniformResult.error.message}`);
  const uniforms = new Map(
    (uniformResult.data ?? []).map((row: any) => [row.shift_id, row.uniform_code]),
  );
  const hours = new Map(workload.map((row) => [row.student_id, Number(row.validated_minutes)]));
  const permanenceRows: OperationalInternshipRow[] = [];
  if (service === "todos" || service === "permanencia") {
    const result = await supabase.rpc("permanence_planning_context", { p_program_id: program.id });
    if (result.error) throw new Error("Não foi possível consultar a permanência.");
    for (const row of permanenceRowSchema.array().parse(result.data)) {
      if (
        !row.editable ||
        !["prevista", "confirmada"].includes(row.status) ||
        !row.startsAt ||
        !row.endsAt ||
        row.date < start ||
        row.date > end
      )
        continue;
      permanenceRows.push({
        shiftId: row.rosterId,
        studentNumber: row.studentNumber ?? 0,
        warName: row.warName ?? "",
        activityName: "Dia ao 1º Ano",
        siteName: row.location ?? "ABM",
        resourceName: row.role,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        uniformCode: (row.uniformCode ?? "3A") as InternshipUniformCode,
        validatedMinutes: hours.get(row.studentId) ?? 0,
      });
    }
  }
  const rows = active
    .map((row) => ({
      shiftId: row.shift_id,
      studentNumber: row.student_number!,
      warName: row.war_name!,
      activityName: row.activity_name,
      siteName: row.site_name,
      resourceName: row.resource_name,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      uniformCode: (uniforms.get(row.shift_id) ??
        defaultInternshipUniform(row.activity_code)) as InternshipUniformCode,
      validatedMinutes: hours.get(row.student_id!) ?? 0,
    }))
    .concat(permanenceRows)
    .sort(
      (a, b) =>
        a.startsAt.localeCompare(b.startsAt) ||
        a.siteName.localeCompare(b.siteName) ||
        a.studentNumber - b.studentNumber,
    );
  return {
    title: {
      gbm: "ESCALA DE ESTÁGIO OPERACIONAL CFO1",
      praia: "ESCALA DE SERVIÇO DE PRAIA CFO1",
      permanencia: "ESCALA DE DIA AO 1º ANO CFO1",
      todos: "ESCALAS DE SERVIÇO CFO1",
      estagio: "ESCALA DE ESTÁGIO SUPERVISIONADO CFO1",
    }[service],
    gbmName,
    service,
    programId: program.id,
    programName: program.name,
    periodStart: start,
    periodEnd: end,
    issuedAt: new Date().toISOString(),
    rows,
  };
}
