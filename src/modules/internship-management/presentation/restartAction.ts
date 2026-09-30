"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/modules/identity/presentation/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  programId: z.string().uuid(),
  snapshot: z.string().regex(/^[a-f0-9]{32}$/),
  reason: z.string().trim().min(5).max(1000),
});
export async function restartInternshipScheduleAction(
  input: z.input<typeof schema>,
): Promise<
  | { error: string; cancelledShifts?: never; cancelledAssignments?: never; revokedInvites?: never }
  | { error?: never; cancelledShifts: number; cancelledAssignments: number; revokedInvites: number }
> {
  const session = await getSession();
  if (session?.role !== "coordenacao" || !session.active)
    return { error: "Somente a Coordenação pode recomeçar a escala." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Recarregue a página e informe o motivo do reinício." };
  const db = createSupabaseServerClient();
  const result = await db.rpc("internship_schedule_restart", {
    p_program_id: parsed.data.programId,
    p_snapshot: parsed.data.snapshot,
    p_reason: parsed.data.reason,
  });
  if (result.error) return { error: result.error.message };
  const { data, error } = await db
    .from("internship_schedule_restarts")
    .select("cancelled_shifts,cancelled_assignments,revoked_invites")
    .eq("id", result.data)
    .single();
  for (const path of [
    "/coordenacao/estagio",
    "/coordenacao/estagio/agenda",
    "/coordenacao/estagio/semana",
    "/coordenacao/estagio/pendencias",
    "/coordenacao/estagio/relatorios",
    "/aluno/estagio",
    "/coordenacao",
    "/aluno",
  ])
    revalidatePath(path);
  if (error || !data)
    return { error: "A escala foi reiniciada. Recarregue a página para conferir os totais." };
  return {
    cancelledShifts: data.cancelled_shifts,
    cancelledAssignments: data.cancelled_assignments,
    revokedInvites: data.revoked_invites,
  };
}
