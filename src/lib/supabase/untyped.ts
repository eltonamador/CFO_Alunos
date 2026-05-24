/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./server";

/**
 * Variante untyped do server client para mutações em tabelas
 * que ainda não estão completamente declaradas em `types.ts`.
 *
 * Será substituída quando rodarmos `supabase gen types typescript`
 * sobre o schema real (F4 aplicada).
 */
export function createServerClientUntyped(): SupabaseClient<any, any, any> {
  return createSupabaseServerClient() as unknown as SupabaseClient<any, any, any>;
}
