"use server";
import { z } from "zod";
import type { Json } from "@/lib/supabase/types";
import { revalidatePath } from "next/cache";
import { getSession } from "@/modules/identity/presentation/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canManageInternship } from "../domain/access";
import { instructionInputSchema, type InstructionInput } from "../domain/instructions";
export async function saveInstruction(input: InstructionInput): Promise<{ error?: string }> {
  if (!canManageInternship(await getSession()))
    return { error: "Acesso restrito à administração do estágio." };
  const parsed = instructionInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise a instrução." };
  const v = parsed.data;
  const { error } = await createSupabaseServerClient().rpc("internship_save_instruction", {
    p_program_id: v.programId,
    p_title: v.title,
    p_starts_at: v.startsAt,
    p_ends_at: v.endsAt,
    p_source_reference: v.sourceReference,
    p_id: v.id,
    p_expected_updated_at: v.expectedUpdatedAt,
    p_active: v.active,
  });
  if (error)
    return {
      error:
        error.code === "40001"
          ? "A instrução mudou. Atualize a página antes de salvar."
          : error.code === "23505"
            ? "Esta instrução já está cadastrada."
            : "Não foi possível salvar. Confira os horários e o período do programa.",
    };
  revalidatePath("/coordenacao/estagio");
  revalidatePath("/coordenacao/estagio/agenda");
  return {};
}

const standbySchema = z.object({
  instructionId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  expectedContext: z.record(z.unknown()),
  confirmed: z.boolean(),
});
export async function confirmInstructionStandby(input: {
  instructionId: string;
  assignmentId: string;
  expectedContext: Record<string, unknown>;
  confirmed: boolean;
}): Promise<{ error?: string }> {
  if (!canManageInternship(await getSession()))
    return { error: "Acesso restrito à administração do estágio." };
  const parsed = standbySchema.safeParse(input);
  if (!parsed.success) return { error: "Atualize a página e confira o serviço do Dia ao 1º Ano." };
  const v = parsed.data;
  const { error } = await createSupabaseServerClient().rpc(
    "internship_confirm_instruction_standby",
    {
      p_instruction_id: v.instructionId,
      p_assignment_id: v.assignmentId,
      p_expected_context: v.expectedContext as Json,
      p_confirmed: v.confirmed,
    },
  );
  if (error)
    return {
      error: ["23514", "40001"].includes(error.code)
        ? error.message
        : "Não foi possível registrar o sobreaviso.",
    };
  revalidatePath("/coordenacao/estagio");
  return {};
}
