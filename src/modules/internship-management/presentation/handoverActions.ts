"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import { canManageInternship } from "../domain/access";
import { handoverSchema } from "../domain/handover";

export async function recordInternshipHandover(
  input: unknown,
): Promise<{ error?: string; success?: true; pending?: true }> {
  const session = await getSession();
  if (!canManageInternship(session))
    return { error: "Acesso restrito à administração do estágio." };
  const parsed = handoverSchema.safeParse(input);
  if (!parsed.success)
    return { error: "Confira o cadete, o horário e o motivo (mínimo de cinco caracteres)." };
  const db = createSupabaseServerClient();
  const delegated = session?.role === "aluno";
  const { error } = delegated
    ? await db.rpc("internship_request_change", {
        p_assignment_id: parsed.data.assignmentId,
        p_change_type: "passagem",
        p_new_student_id: parsed.data.newStudentId,
        p_handover_at: parsed.data.handoverAt,
        p_reason: parsed.data.reason,
      })
    : await db.rpc("internship_handover_assignment", {
        p_assignment_id: parsed.data.assignmentId,
        p_new_student_id: parsed.data.newStudentId,
        p_handover_at: parsed.data.handoverAt,
        p_reason: parsed.data.reason,
      });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "Já existe uma troca pendente para esta participação. Aguarde a Coordenação."
          : error.code === "23514"
          ? error.message
          : "Não foi possível registrar a passagem. Atualize a escala e tente novamente.",
    };
  for (const path of [
    "/coordenacao/estagio",
    "/coordenacao/estagio/agenda",
    "/coordenacao/estagio/relatorios",
    "/aluno/estagio",
    "/aluno",
    "/coordenacao",
    "/instrutor",
    "/secretaria",
  ])
    revalidatePath(path);
  return delegated ? { pending: true } : { success: true };
}
