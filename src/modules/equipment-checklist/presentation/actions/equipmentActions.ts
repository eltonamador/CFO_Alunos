"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

const STATUS_VALUES = [
  "ok",
  "comprado",
  "vai_chegar",
  "falta_comprar",
  "em_duvida",
  "inadequado",
  "nao_se_aplica",
  "pendente_validacao",
] as const;

const upsertStatusSchema = z.object({
  studentId: z.string().uuid(),
  requirementId: z.string().uuid(),
  status: z.enum(STATUS_VALUES),
  studentNotes: z.string().optional(),
});

/** Aluno ou Admin atualiza status de um item do checklist. */
export async function upsertEquipmentStatusAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };

  const parsed = upsertStatusSchema.safeParse({
    studentId: formData.get("studentId"),
    requirementId: formData.get("requirementId"),
    status: formData.get("status"),
    studentNotes: formData.get("studentNotes") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { studentId, requirementId, status, studentNotes } = parsed.data;

  // Aluno só pode editar o próprio; admin edita qualquer um
  const isAdmin = session.role === "coordenacao" || session.role === "secretaria";
  if (!isAdmin && !(session.role === "aluno" && session.studentId === studentId)) {
    return { ok: false, error: "Sem permissão" };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("student_equipment_status").upsert(
    {
      student_id: studentId,
      requirement_id: requirementId,
      status,
      student_notes: studentNotes ?? null,
      updated_by: session.userId,
    },
    { onConflict: "student_id,requirement_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/coordenacao");
  revalidatePath("/aluno/ficha");
  revalidatePath("/aluno/materiais");
  revalidatePath("/aluno");
  return { ok: true };
}

const validateSchema = z.object({
  studentEquipmentStatusId: z.string().uuid(),
  studentId: z.string().uuid(),
  action: z.enum(["validar", "reprovar"]),
});

/** Coordenação valida ou reprova um item do checklist. */
export async function validateEquipmentItemAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };
  if (session.role !== "coordenacao") return { ok: false, error: "Apenas Coordenação" };

  const parsed = validateSchema.safeParse({
    studentEquipmentStatusId: formData.get("statusId"),
    studentId: formData.get("studentId"),
    action: formData.get("action"),
  });
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { studentEquipmentStatusId, studentId, action } = parsed.data;
  const validationStatus = action === "validar" ? "validado" : "reprovado";
  const status = action === "reprovar" ? "inadequado" : undefined;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("student_equipment_status")
    .update({
      validation_status: validationStatus,
      ...(status ? { status } : {}),
      validated_by: session.userId,
      validated_at: new Date().toISOString(),
    })
    .eq("id", studentEquipmentStatusId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/coordenacao/alunos/${studentId}`);
  revalidatePath("/coordenacao");
  revalidatePath("/coordenacao/pendencias");
  return { ok: true };
}
