"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import { prepareDiaryEntry, REACTION_KINDS } from "../domain/occurrenceDiary";
import { deleteDiaryPhotoFolder, diaryPhotosConfigured } from "../infrastructure/diaryPhotosDrive";

type Result = { error?: string };

async function cadet() {
  const session = await getSession();
  if (!session?.active || session.role !== "aluno" || !session.studentId) return null;
  return { studentId: session.studentId, userId: session.userId, db: createSupabaseServerClient() };
}

function refreshDiary() {
  revalidatePath("/aluno/estagio/ocorrencias");
  revalidatePath("/coordenacao/estagio/ocorrencias");
}

export async function saveDiaryEntry(
  input: unknown,
  options: { autosave?: boolean } = {},
): Promise<Result & { id?: string }> {
  const context = await cadet();
  if (!context) return { error: "Acesso restrito ao cadete." };
  const prepared = prepareDiaryEntry(input);
  if (!prepared.ok) return { error: prepared.error };
  const table = context.db.from("internship_diary_entries");
  const { data, error } = prepared.id
    ? await table
        .update(prepared.row)
        .eq("id", prepared.id)
        .eq("student_id", context.studentId)
        .select("id")
        .maybeSingle()
    : await table
        .insert({ ...prepared.row, student_id: context.studentId })
        .select("id")
        .maybeSingle();
  if (error?.message.includes("Plantão não encontrado"))
    return { error: "Esse plantão não aparece mais entre os seus. Escolha outro ou deixe em branco." };
  if (error || !data) return { error: "Não foi possível salvar agora. Seu texto continua aqui." };
  // O rascunho automático não recarrega a página, para não interromper quem está escrevendo.
  if (!options.autosave) refreshDiary();
  return { id: data.id };
}

const entryId = z.string().uuid();

export async function setDiaryEntryVisibility(
  id: string,
  status: "pessoal" | "compartilhado",
): Promise<Result> {
  const context = await cadet();
  if (!context) return { error: "Acesso restrito ao cadete." };
  if (!entryId.safeParse(id).success || !["pessoal", "compartilhado"].includes(status))
    return { error: "Registro não encontrado." };
  const { data, error } = await context.db
    .from("internship_diary_entries")
    .update({ status })
    .eq("id", id)
    .eq("student_id", context.studentId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Não foi possível atualizar. Tente de novo." };
  refreshDiary();
  return {};
}

export async function deleteDiaryEntry(id: string): Promise<Result> {
  const context = await cadet();
  if (!context) return { error: "Acesso restrito ao cadete." };
  if (!entryId.safeParse(id).success) return { error: "Registro não encontrado." };
  const { data: existing } = await context.db
    .from("internship_diary_entries")
    .select("id")
    .eq("id", id)
    .eq("student_id", context.studentId)
    .maybeSingle();
  if (!existing) return { error: "Registro não encontrado." };
  if (diaryPhotosConfigured()) {
    try { await deleteDiaryPhotoFolder(id); }
    catch { return { error: "Não foi possível remover as fotos do Drive. Tente novamente." }; }
  }
  const { error } = await context.db
    .from("internship_diary_entries")
    .delete()
    .eq("id", id)
    .eq("student_id", context.studentId);
  if (error) return { error: "Não foi possível excluir. Tente de novo." };
  refreshDiary();
  return {};
}

export async function toggleDiaryReaction(
  id: string,
  kind: string,
  active: boolean,
): Promise<Result> {
  const session = await getSession();
  if (!session?.active || !["aluno", "coordenacao"].includes(session.role))
    return { error: "Reações disponíveis só para a turma e a Coordenação." };
  if (!entryId.safeParse(id).success || !(REACTION_KINDS as string[]).includes(kind))
    return { error: "Relato não encontrado." };
  const reactions = createSupabaseServerClient().from("internship_diary_reactions");
  const { error } = active
    ? await reactions.insert({ entry_id: id, user_id: session.userId, kind })
    : await reactions.delete().eq("entry_id", id).eq("user_id", session.userId).eq("kind", kind);
  if (error && error.code !== "23505") return { error: "Não foi possível registrar a reação." };
  refreshDiary();
  return {};
}

const moderation = z.object({
  id: entryId,
  action: z.enum(["destacar", "remover_destaque", "ocultar", "reexibir"]),
  reason: z.string().trim().max(300).optional(),
});

export async function moderateDiaryEntry(input: unknown): Promise<Result> {
  const session = await getSession();
  if (!session?.active || session.role !== "coordenacao")
    return { error: "Acesso restrito à Coordenação." };
  const parsed = moderation.safeParse(input);
  if (!parsed.success) return { error: "Ação não reconhecida." };
  const { error } = await createSupabaseServerClient().rpc("internship_diary_moderate", {
    p_entry_id: parsed.data.id,
    p_action: parsed.data.action,
    p_reason: parsed.data.reason ?? null,
  });
  if (error)
    return {
      error:
        error.code === "P0002"
          ? "O relato não está mais no mural. Atualize a página."
          : "Não foi possível aplicar a ação.",
    };
  refreshDiary();
  return {};
}
