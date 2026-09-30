"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/modules/identity/presentation/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  permanenceBatchSchema,
  permanenceInputSchema,
  type PermanenceBatch,
  type PermanenceInput,
} from "../domain/permanence";
import { z } from "zod";
import { canManageInternship } from "../domain/access";
import {
  cancellationBatchSchema,
  cancellationPeriodSchema,
  previewCancellation,
  type CancellationBatch,
  type CancellationPreview,
} from "../domain/permanenceCancellation";
import { loadPermanenceContext } from "../infrastructure/permanenceContext";
function refresh() {
  for (const path of [
    "/coordenacao/estagio",
    "/coordenacao/estagio/permanencia",
    "/coordenacao/estagio/semana",
    "/coordenacao/estagio/agenda",
    "/coordenacao/operacional/escala",
    "/aluno",
    "/aluno/operacional",
    "/aluno/estagio",
    "/secretaria",
    "/coordenacao",
    "/instrutor",
  ])
    revalidatePath(path);
}
export async function previewPermanenceCancellation(input: {
  programId: string;
  start: string;
  end: string;
}): Promise<{ error?: string; preview?: CancellationPreview }> {
  if (!canManageInternship(await getSession()))
    return { error: "Acesso restrito à administração do serviço do Dia ao 1º Ano." };
  const parsed = cancellationPeriodSchema.safeParse(input);
  if (!parsed.success)
    return { error: "Selecione datas válidas, em ordem, em um período de até 31 dias." };
  try {
    const rows = await loadPermanenceContext(createSupabaseServerClient(), parsed.data.programId);
    return { preview: previewCancellation(rows, parsed.data.start, parsed.data.end, Date.now()) };
  } catch {
    return { error: "Não foi possível conferir o serviço do Dia ao 1º Ano. Tente novamente." };
  }
}
export async function cancelPermanencePeriod(
  input: CancellationBatch,
): Promise<{ error?: string; count?: number }> {
  if (!canManageInternship(await getSession()))
    return { error: "Acesso restrito à administração do serviço do Dia ao 1º Ano." };
  const parsed = cancellationBatchSchema.safeParse(input);
  if (!parsed.success)
    return { error: "Confira os turnos e informe um motivo de 5 a 1.000 caracteres." };
  const v = parsed.data;
  const { data, error } = await createSupabaseServerClient().rpc("permanence_cancel_batch", {
    p_program_id: v.programId,
    p_roster_ids: v.rosterIds,
    p_assignment_ids: v.assignmentIds,
    p_reason: v.reason,
  });
  if (error) return { error: error.message };
  refresh();
  return { count: data };
}
export async function publishPermanence(
  input: PermanenceInput,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSession();
  if (!canManageInternship(session))
    return { error: "Acesso restrito à administração do serviço do Dia ao 1º Ano." };
  const parsed = permanenceInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados." };
  const p = parsed.data;
  const { error } = await createSupabaseServerClient().rpc("permanence_publish", {
    p_program_id: p.programId,
    p_starts_at: p.startsAt,
    p_ends_at: p.endsAt,
    p_location: p.location,
    p_uniform_code: p.uniformCode,
    p_students: p.students,
    p_roster_id: p.rosterId,
    p_reason: p.reason,
  });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "Já existe uma escala ou função ocupada nessa data. Recarregue e revise a escala."
          : error.message,
    };
  refresh();
  return { ok: true };
}
export async function publishPermanenceBatch(
  input: PermanenceBatch,
): Promise<{ error?: string; count?: number }> {
  if (!canManageInternship(await getSession()))
    return { error: "Acesso restrito à administração do serviço." };
  const parsed = permanenceBatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise o período." };
  const value = parsed.data;
  const { data, error } = await createSupabaseServerClient().rpc("permanence_publish_batch", {
    p_program_id: value.programId,
    p_location: value.location,
    p_uniform_code: value.uniformCode,
    p_services: value.services,
  });
  if (error) return { error: error.message };
  refresh();
  return { count: data };
}
export async function cancelPermanence(
  rosterId: string,
  reason: string,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSession();
  if (!canManageInternship(session))
    return { error: "Acesso restrito à administração do serviço do Dia ao 1º Ano." };
  if (!z.string().uuid().safeParse(rosterId).success || reason.trim().length < 5)
    return { error: "Informe um motivo com pelo menos cinco caracteres." };
  const { error } = await createSupabaseServerClient().rpc("permanence_cancel", {
    p_roster_id: rosterId,
    p_reason: reason,
  });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
