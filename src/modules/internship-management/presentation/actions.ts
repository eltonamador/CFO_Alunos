"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { canManageInternship } from "../domain/access";
import { getSession } from "@/modules/identity/presentation/session";
import { validateApproval } from "../domain/workload";
import { internshipUniforms } from "../domain/uniforms";

const optionalSupervisor = z
  .string()
  .trim()
  .max(120)
  .refine((value) => value.length === 0 || value.length >= 3)
  .optional()
  .default("");

const uniformSchema = z.enum(
  internshipUniforms.map((item) => item.code) as ["3A", "2C", "4A", "4D"],
);
const path = "/coordenacao/estagio";

async function requireCoordination() {
  const session = await getSession();
  if (!canManageInternship(session)) {
    throw new Error("Acesso restrito à administração do estágio.");
  }
  return createSupabaseServerClient();
}

function rotationFailure(error: { message: string }, fallback: string) {
  return error.message.startsWith("Limite de três descansos de 24 horas") ? "limite_descanso" : fallback;
}

function resultUrl(result: string, studentId?: string): never {
  revalidatePath(path);
  revalidatePath("/aluno/estagio");
  for (const dashboard of ["/aluno", "/coordenacao", "/instrutor", "/secretaria"])
    revalidatePath(dashboard);
  revalidatePath("/coordenacao/estagio/agenda");
  const studentQuery = studentId ? `&cadete=${encodeURIComponent(studentId)}#fichas` : "";
  redirect(`${path}?resultado=${result}${studentQuery}`);
}

export async function initializeCfoInternshipAction(): Promise<void> {
  const supabase = await requireCoordination();
  const { error } = await supabase.rpc("internship_initialize_cfo_2026");
  resultUrl(error ? "falha_configuracao" : "configurado");
}

const beachNamesSchema = z
  .array(z.string().trim().min(3).max(120))
  .length(5)
  .refine((names) => new Set(names.map((name) => name.toLocaleLowerCase("pt-BR"))).size === 5);

export async function configureCfoBeachesAction(formData: FormData): Promise<void> {
  const supabase = await requireCoordination();
  const parsed = beachNamesSchema.safeParse(
    Array.from({ length: 5 }, (_, index) => formData.get(`beach_${index + 1}`)),
  );
  if (!parsed.success) resultUrl("locais_invalidos");
  const { error } = await supabase.rpc("internship_configure_cfo_2026_beaches", {
    p_names: parsed.data,
  });
  resultUrl(error ? "falha_locais" : "locais_salvos");
}

export async function publishCfoInternshipAction(): Promise<void> {
  const supabase = await requireCoordination();
  const { error } = await supabase.rpc("internship_publish_cfo_2026");
  resultUrl(error ? "falha_publicacao" : "publicado");
}

const gbmShiftSchema = z.object({
  uniformCode: uniformSchema,
  programId: z.string().uuid(),
  resourceId: z.string().uuid(),
  studentId: z.string().uuid(),
  shiftDate: z.string().date(),
  shiftTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  supervisorName: optionalSupervisor,
});

export async function scheduleGbmShiftAction(formData: FormData): Promise<void> {
  const supabase = await requireCoordination();
  const parsed = gbmShiftSchema.safeParse({
    programId: formData.get("programId"),
    resourceId: formData.get("resourceId"),
    studentId: formData.get("studentId"),
    shiftDate: formData.get("shiftDate"),
    shiftTime: formData.get("shiftTime"),
    supervisorName: formData.get("supervisorName") ?? "",
    uniformCode: formData.get("uniformCode") ?? "3A",
  });
  if (!parsed.success) resultUrl("escala_invalida");
  const { data: resource } = await supabase
    .from("internship_resources")
    .select("site_id, resource_type")
    .eq("id", parsed.data.resourceId)
    .single();
  if (!resource || !["usb", "ar"].includes(resource.resource_type)) {
    resultUrl("escala_invalida");
  }
  const start = new Date(`${parsed.data.shiftDate}T${parsed.data.shiftTime}:00-03:00`);
  const weekday = new Date(`${parsed.data.shiftDate}T12:00:00Z`).getUTCDay();
  const minutes = resource.resource_type === "ar" && (weekday === 0 || weekday === 6) ? 1440 : 720;
  if (Number.isNaN(start.getTime())) resultUrl("escala_invalida");
  const end = new Date(start.getTime() + minutes * 60_000);
  const { error } = await supabase.rpc("internship_schedule_gbm_shift_uniform", {
    p_program_id: parsed.data.programId,
    p_activity_code: resource.resource_type,
    p_site_id: resource.site_id,
    p_resource_id: parsed.data.resourceId,
    p_starts_at: start.toISOString(),
    p_ends_at: end.toISOString(),
    p_student_id: parsed.data.studentId,
    p_supervisor_name: parsed.data.supervisorName,
    p_uniform_code: parsed.data.uniformCode,
  });
  resultUrl(error ? rotationFailure(error, "falha_escala") : "escala_criada");
}

const gbmTemplateSchema = z.object({
  uniformCode: uniformSchema,
  programId: z.string().uuid(),
  templateCode: z.string().trim().min(3).max(30),
  siteId: z.string().uuid(),
  studentId: z.string().uuid(),
  shiftDate: z.string().date(),
  supervisorName: optionalSupervisor,
});

export async function scheduleGbmTemplateAction(formData: FormData): Promise<void> {
  const supabase = await requireCoordination();
  const parsed = gbmTemplateSchema.safeParse({
    programId: formData.get("programId"),
    templateCode: formData.get("templateCode"),
    siteId: formData.get("siteId"),
    studentId: formData.get("studentId"),
    shiftDate: formData.get("shiftDate"),
    supervisorName: formData.get("supervisorName") ?? "",
    uniformCode: formData.get("uniformCode") ?? "3A",
  });
  if (!parsed.success) resultUrl("padrao_invalido");
  const { error } = await supabase.rpc("internship_schedule_gbm_from_template_uniform", {
    p_program_id: parsed.data.programId,
    p_template_code: parsed.data.templateCode,
    p_site_id: parsed.data.siteId,
    p_shift_date: parsed.data.shiftDate,
    p_student_id: parsed.data.studentId,
    p_supervisor_name: parsed.data.supervisorName,
    p_uniform_code: parsed.data.uniformCode,
  });
  resultUrl(
    error?.message === "Capacidade diária da modalidade neste GBM esgotada."
      ? "capacidade_padrao"
      : error
        ? rotationFailure(error, "falha_padrao")
        : "padrao_criado",
  );
}

const lifeguardDaySchema = z.object({
  uniformCode: uniformSchema,
  programId: z.string().uuid(),
  shiftDate: z.string().date(),
  studentIds: z
    .array(z.string().uuid())
    .length(5)
    .refine((ids) => new Set(ids).size === 5),
  documentReference: z.string().trim().max(200),
  officerName: optionalSupervisor,
});

export async function scheduleLifeguardDayAction(formData: FormData): Promise<void> {
  const supabase = await requireCoordination();
  const parsed = lifeguardDaySchema.safeParse({
    programId: formData.get("programId"),
    shiftDate: formData.get("shiftDate"),
    studentIds: Array.from({ length: 5 }, (_, index) => formData.get(`student_${index + 1}`)),
    documentReference: formData.get("documentReference") ?? "",
    officerName: formData.get("officerName") ?? "",
    uniformCode: formData.get("uniformCode") ?? "4D",
  });
  if (!parsed.success) resultUrl("guarda_vida_invalido");
  const { error } = await supabase.rpc("internship_schedule_lifeguard_day_uniform", {
    p_program_id: parsed.data.programId,
    p_shift_date: parsed.data.shiftDate,
    p_student_ids: parsed.data.studentIds,
    p_document_reference: parsed.data.documentReference,
    p_officer_name: parsed.data.officerName,
    p_uniform_code: parsed.data.uniformCode,
  });
  resultUrl(error ? rotationFailure(error, "falha_guarda_vida") : "guarda_vida_criado");
}

const assignmentChangeSchema = z.object({
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  reason: z.string().trim().min(5).max(500),
});

export async function cancelInternshipAssignmentAction(formData: FormData): Promise<void> {
  const supabase = await requireCoordination();
  const parsed = assignmentChangeSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    studentId: formData.get("studentId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) resultUrl("movimentacao_invalida");
  const { error } = await supabase.rpc("internship_cancel_assignment", {
    p_assignment_id: parsed.data.assignmentId,
    p_reason: parsed.data.reason,
  });
  resultUrl(error ? rotationFailure(error, "falha_movimentacao") : "participacao_cancelada", parsed.data.studentId);
}

const substitutionSchema = assignmentChangeSchema
  .extend({
    newStudentId: z.string().uuid(),
  })
  .refine((input) => input.studentId !== input.newStudentId);

export async function substituteInternshipAssignmentAction(formData: FormData): Promise<void> {
  const supabase = await requireCoordination();
  const parsed = substitutionSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    studentId: formData.get("studentId"),
    newStudentId: formData.get("newStudentId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) resultUrl("movimentacao_invalida");
  const delegated = (await getSession())?.role === "aluno";
  const { error } = delegated
    ? await supabase.rpc("internship_request_change", {
        p_assignment_id: parsed.data.assignmentId,
        p_change_type: "substituicao",
        p_new_student_id: parsed.data.newStudentId,
        p_reason: parsed.data.reason,
      })
    : await supabase.rpc("internship_substitute_assignment", {
        p_assignment_id: parsed.data.assignmentId,
        p_new_student_id: parsed.data.newStudentId,
        p_reason: parsed.data.reason,
      });
  resultUrl(
    error ? error.code === "23505" ? "troca_ja_pendente" : rotationFailure(error, "falha_movimentacao") : delegated ? "troca_solicitada" : "cadete_substituido",
    parsed.data.studentId,
  );
}

const agendaReplacementSchema = z.object({
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  newStudentId: z.string().uuid(),
  shiftDate: z.string().date(),
  impedimentUntil: z.string().date(),
  modality: z.string().regex(/^[a-z0-9_]+$/),
  reasonKind: z.enum(["saude", "outro"]),
  reasonDetails: z.string().trim().max(400),
}).refine((input) => input.studentId !== input.newStudentId)
  .refine((input) => input.reasonKind !== "outro" || input.reasonDetails.length >= 5);

export async function replaceInternshipCadetFromAgendaAction(formData: FormData): Promise<void> {
  const supabase = await requireCoordination();
  const parsed = agendaReplacementSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    studentId: formData.get("studentId"),
    newStudentId: formData.get("newStudentId"),
    shiftDate: formData.get("shiftDate"),
    impedimentUntil: formData.get("impedimentUntil"),
    modality: formData.get("modality"),
    reasonKind: formData.get("reasonKind"),
    reasonDetails: formData.get("reasonDetails") ?? "",
  });
  if (!parsed.success) {
    redirect("/coordenacao/estagio/agenda?resultado=troca_invalida");
  }
  const delegated = (await getSession())?.role === "aluno";
  const { error } = delegated
    ? await supabase.rpc("internship_request_change", {
        p_assignment_id: parsed.data.assignmentId,
        p_change_type: "troca",
        p_new_student_id: parsed.data.newStudentId,
        p_reason_kind: parsed.data.reasonKind,
        p_reason_details: parsed.data.reasonDetails,
        p_impediment_until: parsed.data.impedimentUntil,
      })
    : await supabase.rpc("internship_replace_with_impediment", {
        p_assignment_id: parsed.data.assignmentId,
        p_new_student_id: parsed.data.newStudentId,
        p_reason_kind: parsed.data.reasonKind,
        p_reason_details: parsed.data.reasonDetails,
        p_impediment_until: parsed.data.impedimentUntil,
      });
  revalidatePath("/coordenacao/estagio");
  revalidatePath("/coordenacao/estagio/agenda");
  revalidatePath("/aluno/estagio");
  revalidatePath("/coordenacao/operacional/impedimentos");
  for (const dashboard of ["/aluno", "/coordenacao", "/instrutor", "/secretaria"])
    revalidatePath(dashboard);
  const result = !error ? delegated ? "troca_solicitada" : "troca_publicada"
    : error.code === "23505" ? "troca_ja_pendente"
    : /período do impedimento|plantão futuro/i.test(error.message)
      ? "troca_periodo"
    : /24 horas|Conflito|conflito|já possui estágio|impedimento|indisponível/i.test(error.message)
      ? "troca_conflito"
      : "troca_falhou";
  const query = new URLSearchParams({
    resultado: result,
    inicio: parsed.data.shiftDate,
    fim: parsed.data.shiftDate,
    situacao: "todos",
    modalidade: parsed.data.modality,
  });
  redirect(`/coordenacao/estagio/agenda?${query.toString()}`);
}

const rescheduleSchema = assignmentChangeSchema.extend({
  resourceId: z.string().uuid(),
  shiftDate: z.string().date(),
  shiftTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  supervisorName: optionalSupervisor,
  source: z.enum(["remanejamento", "reposicao"]),
  durationMinutes: z.coerce.number().refine((value) => value === 720 || value === 1440),
});

export async function rescheduleInternshipAssignmentAction(formData: FormData): Promise<void> {
  const supabase = await requireCoordination();
  const parsed = rescheduleSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    studentId: formData.get("studentId"),
    resourceId: formData.get("resourceId"),
    shiftDate: formData.get("shiftDate"),
    shiftTime: formData.get("shiftTime"),
    supervisorName: formData.get("supervisorName") ?? "",
    reason: formData.get("reason"),
    source: formData.get("source"),
    durationMinutes: formData.get("durationMinutes"),
  });
  if (!parsed.success) resultUrl("movimentacao_invalida");
  const { data: resource } = await supabase
    .from("internship_resources")
    .select("resource_type")
    .eq("id", parsed.data.resourceId)
    .single();
  if (!resource || !["usb", "ar"].includes(resource.resource_type)) {
    resultUrl("movimentacao_invalida", parsed.data.studentId);
  }
  const start = new Date(`${parsed.data.shiftDate}T${parsed.data.shiftTime}:00-03:00`);
  const weekday = new Date(`${parsed.data.shiftDate}T12:00:00Z`).getUTCDay();
  const minutes = parsed.data.durationMinutes;
  if (minutes === 1440 && (resource.resource_type !== "ar" || (weekday !== 0 && weekday !== 6)))
    resultUrl("movimentacao_invalida", parsed.data.studentId);
  if (minutes === 720 && weekday === 6 && !["07:45", "19:45"].includes(parsed.data.shiftTime))
    resultUrl("movimentacao_invalida", parsed.data.studentId);
  if (Number.isNaN(start.getTime())) resultUrl("movimentacao_invalida", parsed.data.studentId);
  const end = new Date(start.getTime() + minutes * 60_000);
  const delegated = (await getSession())?.role === "aluno" && parsed.data.source === "remanejamento";
  const { error } = delegated
    ? await supabase.rpc("internship_request_change", {
        p_assignment_id: parsed.data.assignmentId,
        p_change_type: "remanejamento",
        p_resource_id: parsed.data.resourceId,
        p_starts_at: start.toISOString(),
        p_ends_at: end.toISOString(),
        p_supervisor_name: parsed.data.supervisorName,
        p_reason: parsed.data.reason,
      })
    : await supabase.rpc("internship_reschedule_gbm_assignment", {
        p_assignment_id: parsed.data.assignmentId,
        p_resource_id: parsed.data.resourceId,
        p_starts_at: start.toISOString(),
        p_ends_at: end.toISOString(),
        p_supervisor_name: parsed.data.supervisorName,
        p_reason: parsed.data.reason,
        p_source: parsed.data.source,
      });
  const success =
    delegated ? "troca_solicitada" : parsed.data.source === "reposicao" ? "reposicao_criada" : "participacao_remanejada";
  resultUrl(error ? error.code === "23505" ? "troca_ja_pendente" : rotationFailure(error, "falha_movimentacao") : success, parsed.data.studentId);
}

const homologationSchema = z.object({
  assignmentId: z.string().uuid(),
  attendanceStatus: z.enum(["integral", "parcial", "falta", "dispensa"]),
  actualStartsAt: z.string().optional(),
  actualEndsAt: z.string().optional(),
  approvedHours: z.coerce.number().int().min(0),
  approvedExtraMinutes: z.coerce.number().int().min(0).max(59),
  supervisorName: z.string().trim().min(3).max(120),
  paperReference: z.string().trim().min(3).max(200),
  occurrenceReason: z.string().trim().max(500).optional(),
  decisionReason: z.string().trim().max(500).optional(),
});

export async function homologateInternshipAction(formData: FormData): Promise<void> {
  const supabase = await requireCoordination();
  const studentResult = z.string().uuid().safeParse(formData.get("studentId"));
  const studentId = studentResult.success ? studentResult.data : undefined;
  const parsed = homologationSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    attendanceStatus: formData.get("attendanceStatus"),
    actualStartsAt: formData.get("actualStartsAt") || undefined,
    actualEndsAt: formData.get("actualEndsAt") || undefined,
    approvedHours: formData.get("approvedHours"),
    approvedExtraMinutes: formData.get("approvedExtraMinutes"),
    supervisorName: formData.get("supervisorName"),
    paperReference: formData.get("paperReference"),
    occurrenceReason: formData.get("occurrenceReason") || undefined,
    decisionReason: formData.get("decisionReason") || undefined,
  });
  if (!parsed.success) resultUrl("homologacao_invalida", studentId);
  const input = parsed.data;
  const earlyExit = await supabase.from("internship_cadet_reports")
    .select("id")
    .eq("assignment_id", input.assignmentId)
    .eq("report_type", "saida_antecipada")
    .limit(1);
  if (earlyExit.error) resultUrl("falha_homologacao", studentId);
  if (earlyExit.data?.length && (input.decisionReason?.length ?? 0) < 5)
    resultUrl("homologacao_invalida", studentId);
  const startsAt = input.actualStartsAt ? new Date(`${input.actualStartsAt}:00-03:00`) : null;
  const endsAt = input.actualEndsAt ? new Date(`${input.actualEndsAt}:00-03:00`) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) resultUrl("homologacao_invalida", studentId);
  if (endsAt && Number.isNaN(endsAt.getTime())) resultUrl("homologacao_invalida", studentId);
  if ((startsAt === null) !== (endsAt === null)) resultUrl("homologacao_invalida", studentId);
  if (endsAt && endsAt.getTime() > Date.now()) resultUrl("homologacao_futura", studentId);
  const approvedMinutes = input.approvedHours * 60 + input.approvedExtraMinutes;
  if (startsAt && endsAt) {
    try {
      validateApproval({
        actualStartsAt: startsAt.toISOString(),
        actualEndsAt: endsAt.toISOString(),
        approvedMinutes,
        supervisorName: input.supervisorName,
        paperReference: input.paperReference,
        decisionReason: input.decisionReason,
      });
    } catch {
      resultUrl("homologacao_invalida", studentId);
    }
  } else if (
    !["falta", "dispensa"].includes(input.attendanceStatus) ||
    (approvedMinutes > 0 && !input.decisionReason)
  ) {
    resultUrl("homologacao_invalida", studentId);
  }
  const argumentsWithNullableFields = {
    p_assignment_id: input.assignmentId,
    p_attendance_status: input.attendanceStatus,
    p_actual_starts_at: startsAt?.toISOString() ?? null,
    p_actual_ends_at: endsAt?.toISOString() ?? null,
    p_approved_minutes: approvedMinutes,
    p_supervisor_name: input.supervisorName,
    p_paper_reference: input.paperReference,
    p_occurrence_reason: input.occurrenceReason ?? null,
    p_occurrence_justified: formData.get("occurrenceJustified") === "on" ? true : null,
    p_decision_reason: input.decisionReason ?? null,
  };
  // O gerador Supabase omite nullability de argumentos de funções PostgreSQL.
  const { error } = await supabase.rpc(
    "internship_homologate_execution",
    argumentsWithNullableFields as unknown as Database["public"]["Functions"]["internship_homologate_execution"]["Args"],
  );
  resultUrl(
    error?.message.includes("ainda não realizado")
      ? "homologacao_futura"
      : error
        ? "falha_homologacao"
        : "carga_homologada",
    studentId,
  );
}
