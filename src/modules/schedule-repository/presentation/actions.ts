"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";

export type ScheduleActionResult = { ok: boolean; message: string };

async function activeCoordination() {
  const session = await getSession();
  return session?.active && !session.isFirstAccess && session.role === "coordenacao"
    ? session
    : null;
}

function scheduleCode(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 42);
  return `${slug || "escala"}_${crypto.randomUUID().slice(0, 8)}`;
}

export async function createScheduleTypeAction(
  _previous: ScheduleActionResult | null,
  formData: FormData,
): Promise<ScheduleActionResult> {
  const session = await activeCoordination();
  if (!session) return { ok: false, message: "Somente a Coordenação pode cadastrar tipos." };
  const parsed = z
    .object({
      name: z.string().trim().min(3).max(150),
      description: z.string().trim().max(1000).optional(),
    })
    .safeParse({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
    });
  if (!parsed.success) return { ok: false, message: "Revise o nome e a descrição." };
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("schedule_types").insert({
    code: scheduleCode(parsed.data.name),
    name: parsed.data.name,
    description: parsed.data.description ?? null,
  });
  if (error) return { ok: false, message: "Não foi possível cadastrar o tipo de escala." };
  revalidatePath("/coordenacao/escalas");
  revalidatePath("/coordenacao/escalas/tipos");
  return { ok: true, message: "Tipo de escala cadastrado." };
}

export async function toggleScheduleTypeAction(formData: FormData): Promise<void> {
  if (!(await activeCoordination())) return;
  const parsed = z
    .object({ id: z.string().uuid(), active: z.enum(["true", "false"]) })
    .safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success) return;
  const supabase = createSupabaseServerClient();
  await supabase
    .from("schedule_types")
    .update({ active: parsed.data.active === "true" })
    .eq("id", parsed.data.id);
  revalidatePath("/coordenacao/escalas");
  revalidatePath("/coordenacao/escalas/tipos");
}

export async function reprocessScheduleAction(formData: FormData): Promise<void> {
  if (!(await activeCoordination())) return;
  const parsed = z.string().uuid().safeParse(formData.get("document_id"));
  if (!parsed.success) return;
  const supabase = createSupabaseServerClient();
  await supabase.rpc("schedule_request_reprocess", {
    p_document_id: parsed.data,
    p_method: "auto",
  });
  revalidatePath("/coordenacao/escalas");
}

export async function confirmScheduleCandidateAction(
  _previous: ScheduleActionResult | null,
  formData: FormData,
): Promise<ScheduleActionResult> {
  if (!(await activeCoordination())) {
    return { ok: false, message: "Somente a Coordenação pode confirmar vínculos." };
  }
  const parsed = z
    .object({
      candidateId: z.string().uuid(),
      studentId: z.string().uuid(),
      reason: z.string().trim().min(5).max(500),
    })
    .safeParse({
      candidateId: formData.get("candidate_id"),
      studentId: formData.get("student_id"),
      reason: formData.get("reason"),
    });
  if (!parsed.success) {
    return { ok: false, message: "Selecione o cadete e informe uma justificativa." };
  }
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("schedule_confirm_candidate", {
    p_candidate_id: parsed.data.candidateId,
    p_student_id: parsed.data.studentId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: "Não foi possível confirmar este vínculo." };
  revalidatePath("/coordenacao/escalas");
  revalidatePath("/aluno/escalas");
  revalidatePath("/aluno");
  return { ok: true, message: "Vínculo confirmado e notificação enfileirada." };
}
