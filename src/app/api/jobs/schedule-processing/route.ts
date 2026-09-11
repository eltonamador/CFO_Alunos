import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processNextSchedule } from "@/modules/schedule-repository/infrastructure/processor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const results = [];
  for (let index = 0; index < 3; index += 1) {
    const result = await processNextSchedule();
    if (!result) break;
    results.push(result);
  }
  return NextResponse.json({ processed: results.length, results });
}
