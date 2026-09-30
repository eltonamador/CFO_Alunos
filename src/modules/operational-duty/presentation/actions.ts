"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import { redirect } from "next/navigation";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function requireCoord() {
  const session = await getSession();
  if (!session) return { error: "Sessao expirada" as const };
  if (session.role !== "coordenacao") return { error: "Apenas Coordenacao" as const };
  return { session };
}

export async function generateDutyRosterAction(): Promise<void> {
  const auth = await requireCoord();
  if ("error" in auth) return;
  redirect("/coordenacao/estagio/permanencia");
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

export async function registerDutyImpedimentAction(formData: FormData): Promise<void> {
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

export async function manuallyReplaceDutyAssignmentAction(formData: FormData): Promise<void> {
  const auth = await requireCoord();
  if ("error" in auth) return;

  const parsed = manualReplaceSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    newStudentId: formData.get("newStudentId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return;

  const { error } = await createSupabaseServerClient().rpc("duty_replace_assignment", {
    p_assignment_id: parsed.data.assignmentId,
    p_student_id: parsed.data.newStudentId,
    p_reason: parsed.data.reason,
  });
  if (error) redirect("/coordenacao/operacional/escala?resultado=conflito");
  for (const path of [
    "/coordenacao/operacional",
    "/coordenacao/operacional/escala",
    "/coordenacao/estagio",
    "/coordenacao/estagio/permanencia",
    "/instrutor/operacional",
    "/aluno/operacional",
    "/aluno",
    "/coordenacao",
  ])
    revalidatePath(path);
}
