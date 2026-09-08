import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente Supabase para Server Components / Server Actions / Route Handlers.
 * Respeita RLS via cookies de sessão do usuário autenticado.
 *
 * O tipo de retorno é fixado em `SupabaseClient<Database>` porque o
 * `@supabase/ssr` 0.5.2 ainda declara a assinatura de genéricos antiga do
 * supabase-js; sem isso o schema resolve para `never` e todas as consultas
 * ficam sem tipo. O objeto em si é o mesmo — só a declaração muda.
 * Ao atualizar o `@supabase/ssr`, remova o cast e confira o typecheck.
 */
export function createSupabaseServerClient(): SupabaseClient<Database> {
  const cookieStore = cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `cookies().set` falha em Server Components puros — ok, o middleware atualiza.
          }
        },
      },
    },
  ) as unknown as SupabaseClient<Database>;
}

/**
 * Cliente Supabase com SERVICE_ROLE — bypassa RLS.
 * USAR APENAS em operações administrativas server-side (provisionamento, jobs).
 */
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurado");
  }
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: (_: { name: string; value: string; options: CookieOptions }[]) => {},
      },
    },
  ) as unknown as SupabaseClient<Database>;
}
