import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fecha os prazos de 24 horas vencidos e gera o FO− por ausência de
 * manifestação. A mesma rotina roda quando a Coordenação ou o cadete
 * abrem as telas de acompanhamento — o cron apenas garante que o prazo
 * seja fechado mesmo sem ninguém acessar o sistema.
 *
 * Idempotente: só afeta registros ainda em `aguardando_manifestacao` e o
 * índice único sobre `origin_record_id` impede uma segunda geração.
 */
export async function GET(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 503 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("expire_follow_up_deadlines");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expired: typeof data === "number" ? data : 0 });
}
