"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { getSession } from "@/modules/identity/presentation/session";
import { generateFairRoster } from "../domain/services/generateFairRoster";
import {
  getActiveImpediments,
  getDefaultClassId,
  getDutyRoles,
  getEligibleStudents,
  getHistoricalAssignments,
} from "../infrastructure/queries";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function requireCoord() {
  const session = await getSession();
  if (!session) return { error: "Sessao expirada" as const };
  if (session.role !== "coordenacao") return { error: "Apenas Coordenacao" as const };
  return { session };
}

const generateSchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export async function generateDutyRosterAction(
  formData: FormData,
): Promise<void> {
  const auth = await requireCoord();
  if ("error" in auth) return;

  const today = new Date();
  const parsed = generateSchema.safeParse({
    startDate: formData.get("startDate") || toDateKey(today),
    endDate: formData.get("endDate") || toDateKey(addDays(today, 6)),
  });
  if (!parsed.success) return;

  const startDate = parsed.data.startDate ?? toDateKey(today);
  const endDate = parsed.data.endDate ?? toDateKey(addDays(today, 6));
  const supabase = createSupabaseServerClient();

  try {
    const classId = await getDefaultClassId(supabase);
    if (!classId) return;

    const { data: existing } = await supabase
      .from("duty_rosters")
      .select("id")
      .eq("class_id", classId)
      .eq("period_start", startDate)
      .eq("period_end", endDate)
      .neq("status", "arquivada")
      .maybeSingle();
    if (existing) return;

    const [roles, students, historicalAssignments, impediments] = await Promise.all([
      getDutyRoles(supabase),
      getEligibleStudents(supabase, classId),
      getHistoricalAssignments(supabase, classId),
      getActiveImpediments(supabase),
    ]);

    const generated = generateFairRoster({
      students,
      roles,
      startDate,
      endDate,
      historicalAssignments,
      impediments,
    });

    const { data: roster, error: rosterError } = await supabase
      .from("duty_rosters")
      .insert({
        class_id: classId,
        period_start: startDate,
        period_end: endDate,
        status: "publicada",
        generated_by: auth.session.userId,
        generated_at: new Date().toISOString(),
        published_by: auth.session.userId,
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (rosterError) return;

    if (generated.assignments.length > 0) {
      const { error: assignmentsError } = await supabase.from("duty_assignments").insert(
        generated.assignments.map((assignment) => ({
          roster_id: roster.id,
          class_id: classId,
          duty_date: assignment.dutyDate,
          role_id: assignment.roleId,
          student_id: assignment.studentId,
          status: "confirmada",
          assignment_source: assignment.assignmentSource,
          created_by: auth.session.userId,
          updated_by: auth.session.userId,
        })),
      );
      if (assignmentsError) return;
    }

    await supabase.from("duty_assignment_logs").insert({
      roster_id: roster.id,
      action: "generated",
      actor_id: auth.session.userId,
      actor_role: auth.session.role,
      after_data: {
        startDate,
        endDate,
        assignments: generated.assignments.length,
        alerts: generated.alerts,
      } as unknown as Json,
      reason: "Geracao automatica de escala operacional",
    });

    revalidatePath("/coordenacao/operacional");
    revalidatePath("/coordenacao/operacional/escala");
    revalidatePath("/instrutor/operacional");
    revalidatePath("/aluno/operacional");
    return;
  } catch (error) {
    console.error(error);
  }
}

const impedimentSchema = z.object({
  studentId: z.string().uuid(),
  impedimentType: z.enum([
    "ausencia",
    "dispensa",
    "restricao_medica",
    "missao_externa",
    "problema_administrativo",
    "outro",
  ]),
  startsOn: z.string().date(),
  endsOn: z.string().date(),
  reason: z.string().min(3),
  operationalNote: z.string().optional(),
});

export async function registerDutyImpedimentAction(
  formData: FormData,
): Promise<void> {
  const auth = await requireCoord();
  if ("error" in auth) return;

  const parsed = impedimentSchema.safeParse({
    studentId: formData.get("studentId"),
    impedimentType: formData.get("impedimentType"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
    reason: formData.get("reason"),
    operationalNote: formData.get("operationalNote") || undefined,
  });
  if (!parsed.success) return;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("duty_impediments").insert({
    student_id: parsed.data.studentId,
    impediment_type: parsed.data.impedimentType,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
    reason: parsed.data.reason,
    operational_note: parsed.data.operationalNote ?? null,
    registered_by: auth.session.userId,
  });

  if (error) return;

  revalidatePath("/coordenacao/operacional");
  revalidatePath("/coordenacao/operacional/impedimentos");
  revalidatePath("/instrutor/operacional");
  return;
}

const manualReplaceSchema = z.object({
  assignmentId: z.string().uuid(),
  newStudentId: z.string().uuid(),
  reason: z.string().min(5),
});

export async function manuallyReplaceDutyAssignmentAction(
  formData: FormData,
): Promise<void> {
  const auth = await requireCoord();
  if ("error" in auth) return;

  const parsed = manualReplaceSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    newStudentId: formData.get("newStudentId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return;

  const supabase = createSupabaseServerClient();
  const { data: current, error: currentError } = await supabase
    .from("duty_assignments")
    .select("id, roster_id, class_id, duty_date, role_id, student_id, status")
    .eq("id", parsed.data.assignmentId)
    .maybeSingle();

  if (currentError) return;
  if (!current) return;

  const { data: conflict } = await supabase
    .from("duty_assignments")
    .select("id")
    .eq("duty_date", current.duty_date)
    .eq("student_id", parsed.data.newStudentId)
    .in("status", ["prevista", "confirmada"])
    .neq("id", current.id)
    .maybeSingle();
  if (conflict) return;

  const { data: impediment } = await supabase
    .from("duty_impediments")
    .select("id")
    .eq("student_id", parsed.data.newStudentId)
    .eq("active", true)
    .lte("starts_on", current.duty_date)
    .gte("ends_on", current.duty_date)
    .maybeSingle();
  if (impediment) return;

  const { error: updateError } = await supabase
    .from("duty_assignments")
    .update({ status: "substituida", updated_by: auth.session.userId })
    .eq("id", current.id);
  if (updateError) return;

  const { data: replacement, error: insertError } = await supabase
    .from("duty_assignments")
    .insert({
      roster_id: current.roster_id,
      class_id: current.class_id,
      duty_date: current.duty_date,
      role_id: current.role_id,
      student_id: parsed.data.newStudentId,
      status: "confirmada",
      assignment_source: "manual",
      manual_reason: parsed.data.reason,
      replaced_assignment_id: current.id,
      created_by: auth.session.userId,
      updated_by: auth.session.userId,
    })
    .select("id")
    .single();
  if (insertError) return;

  await supabase.from("duty_assignment_logs").insert({
    assignment_id: replacement.id,
    roster_id: current.roster_id,
    action: "manual_change",
    actor_id: auth.session.userId,
    actor_role: auth.session.role,
    before_data: current,
    after_data: { ...current, student_id: parsed.data.newStudentId },
    reason: parsed.data.reason,
  });

  revalidatePath("/coordenacao/operacional");
  revalidatePath("/coordenacao/operacional/escala");
  revalidatePath("/instrutor/operacional");
  revalidatePath("/aluno/operacional");
  return;
}
