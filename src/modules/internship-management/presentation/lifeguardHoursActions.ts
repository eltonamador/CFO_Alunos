"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import { canManageInternship } from "../domain/access";
import { lifeguardHoursSchema, type LifeguardHoursInput } from "../domain/lifeguardHours";
export async function adjustLifeguardHours(
  input: LifeguardHoursInput,
): Promise<{ error?: string; count?: number }> {
  if (!canManageInternship(await getSession()))
    return { error: "Acesso restrito à administração do estágio." };
  const parsed = lifeguardHoursSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Revise os horários e o motivo." };
  const v = parsed.data;
  const { data, error } = await createSupabaseServerClient().rpc(
    "internship_reschedule_lifeguard_day",
    {
      p_program_id: v.programId,
      p_shift_date: v.date,
      p_starts_at: v.startsAt,
      p_ends_at: v.endsAt,
      p_expected_assignments: v.assignmentIds,
      p_expected_start: v.expectedStart,
      p_expected_end: v.expectedEnd,
      p_reason: v.reason,
    },
  );
  if (error)
    return {
      error: ["23514", "40001"].includes(error.code)
        ? error.message
        : "Não foi possível ajustar. Atualize a página e confira a escala.",
    };
  for (const path of [
    "/coordenacao/estagio",
    "/coordenacao/estagio/agenda",
    "/aluno/estagio",
    "/coordenacao",
    "/aluno",
    "/secretaria",
    "/instrutor",
  ])
    revalidatePath(path);
  return { count: data };
}
