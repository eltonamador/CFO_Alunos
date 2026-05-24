/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProfileRow {
  id: string;
  role: "coordenacao" | "secretaria" | "instrutor" | "aluno";
  full_name: string;
  active: boolean;
  student_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Helper fortemente tipado para `select * from profiles`.
 * Aceita qualquer SupabaseClient para evitar atrito com a inferência
 * genérica do PostgrestJS — o retorno é narrowed via cast manual.
 */
export async function fetchProfile(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<ProfileRow | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as ProfileRow | null) ?? null;
}
