"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import { canManageInternship } from "../domain/access";

const schema = z.object({
  programId: z.string().uuid(),
  shiftDate: z.string().date(),
  documentReference: z.string().trim().max(200),
  officerName: z
    .string()
    .trim()
    .max(120)
    .refine((v) => !v || v.length >= 3),
});

export async function finalizeLifeguardDraftAction(input: {
  programId: string;
  shiftDate: string;
  documentReference: string;
  officerName: string;
  published?: boolean;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!canManageInternship(session))
    return { error: "Acesso restrito à administração do estágio." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Confira os dados opcionais informados." };
  if (
    input.published &&
    (parsed.data.documentReference.length < 5 || parsed.data.officerName.length < 3)
  )
    return {
      error: "Para completar o registro, informe documento e oficial. A escala já está publicada.",
    };
  const db = createSupabaseServerClient();
  const { error } = await db.rpc(
    input.published
      ? "internship_formalize_published_lifeguard_plan"
      : "internship_finalize_lifeguard_draft",
    {
      p_program_id: parsed.data.programId,
      p_shift_date: parsed.data.shiftDate,
      p_document_reference: parsed.data.documentReference,
      p_officer_name: parsed.data.officerName,
    },
  );
  if (error) return { error: error.message };
  revalidatePath("/coordenacao/estagio/agenda");
  revalidatePath("/coordenacao/estagio");
  for (const path of ["/aluno", "/coordenacao", "/secretaria", "/instrutor"]) revalidatePath(path);
  revalidatePath("/aluno/estagio");
  return {};
}
