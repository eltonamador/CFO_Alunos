/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PendingChangeRow {
  id: string;
  student_id: string;
  context: string;
  entity: string;
  field: string;
  previous_value: unknown;
  new_value: unknown;
  requested_by: string;
  status: "pendente" | "validado" | "recusado";
  resolved_by: string | null;
  resolved_at: string | null;
  reason: string | null;
  created_at: string;
}

export interface PendingChangeWithStudent extends PendingChangeRow {
  student: { id: string; war_name: string; student_number: number | null; sex: "M" | "F" | null } | null;
}

export async function listPendingChanges(
  supabase: SupabaseClient<any, any, any>,
  filter: { status?: "pendente" | "validado" | "recusado"; studentId?: string } = {},
): Promise<PendingChangeWithStudent[]> {
  let q = supabase
    .from("pending_changes")
    .select("*, student:students!inner(id, war_name, student_number, sex)")
    .order("created_at", { ascending: false });

  if (filter.status) q = q.eq("status", filter.status);
  if (filter.studentId) q = q.eq("student_id", filter.studentId);

  const { data } = await q;
  return (data ?? []) as PendingChangeWithStudent[];
}
