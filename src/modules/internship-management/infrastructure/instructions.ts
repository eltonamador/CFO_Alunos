import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { InstructionState } from "../domain/instructions";
import { readAll } from "./readAll";
export async function loadInstructions(
  db: ReturnType<typeof createSupabaseServerClient>,
  programId: string,
): Promise<InstructionState> {
  const [blocks, conflicts] = await Promise.all([
    readAll((from, to) =>
      db
        .from("internship_instruction_blocks")
        .select("id,title,starts_at,ends_at,source_reference,active,updated_at")
        .eq("program_id", programId)
        .order("starts_at")
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      db
        .rpc("internship_review_instruction_conflicts", { p_program_id: programId })
        .order("starts_at")
        .order("instruction_id")
        .order("assignment_id")
        .range(from, to),
    ),
  ]);
  return {
    blocks,
    conflicts: conflicts.map((c) => ({
      ...c,
      review_context: c.review_context as Record<string, unknown> | null,
    })),
  };
}
