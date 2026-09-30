"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";

const path = "/aluno/estagio";

function resultUrl(result: string): never {
  revalidatePath(path);
  redirect(`${path}?resultado=${result}`);
}

async function requireCadet() {
  const session = await getSession();
  if (!session || !session.active || session.role !== "aluno" || !session.studentId) {
    throw new Error("Acesso restrito ao cadete.");
  }
  return { session, supabase: createSupabaseServerClient() };
}

export async function confirmInternshipPresenceAction(formData: FormData): Promise<void> {
  const { session, supabase } = await requireCadet();
  const parsed = z.string().uuid().safeParse(formData.get("assignmentId"));
  if (!parsed.success) resultUrl("relato_invalido");
  const { error } = await supabase.from("internship_cadet_reports").insert({
    assignment_id: parsed.data,
    student_id: session.studentId!,
    report_type: "presenca",
    reported_by: session.userId,
  });
  resultUrl(error ? "falha_relato" : "presenca_confirmada");
}

const exitSchema = z.object({
  assignmentId: z.string().uuid(),
  exitAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/),
  reason: z.string().trim().min(5).max(500),
});

export async function reportInternshipEarlyExitAction(formData: FormData): Promise<void> {
  const { session, supabase } = await requireCadet();
  const parsed = exitSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    exitAt: formData.get("exitAt"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) resultUrl("relato_invalido");
  const exitAt = new Date(`${parsed.data.exitAt}:00-03:00`);
  if (Number.isNaN(exitAt.getTime())) resultUrl("relato_invalido");
  const { error } = await supabase.from("internship_cadet_reports").insert({
    assignment_id: parsed.data.assignmentId,
    student_id: session.studentId!,
    report_type: "saida_antecipada",
    reported_exit_at: exitAt.toISOString(),
    reason: parsed.data.reason,
    reported_by: session.userId,
  });
  resultUrl(error ? "falha_relato" : "saida_registrada");
}
