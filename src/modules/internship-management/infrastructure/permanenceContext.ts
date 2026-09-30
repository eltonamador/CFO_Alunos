import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { permanenceRowSchema } from "../domain/permanence";
export async function loadPermanenceContext(
  db: ReturnType<typeof createSupabaseServerClient>,
  programId: string,
) {
  const result = await db.rpc("permanence_planning_context", { p_program_id: programId });
  if (result.error) throw new Error("Não foi possível consultar o histórico de permanência.");
  return permanenceRowSchema.array().parse(result.data);
}
