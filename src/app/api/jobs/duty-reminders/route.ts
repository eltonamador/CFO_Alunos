import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendDutyReminders } from "@/modules/schedule-repository/infrastructure/reminderDelivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!env.CRON_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Lembretes ainda não configurados." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const slot = request.nextUrl.searchParams.get("slot") ?? "evening";
  if (slot !== "evening" && slot !== "morning") {
    return NextResponse.json({ error: "Horário inválido" }, { status: 400 });
  }
  try {
    const result = await sendDutyReminders(slot);
    return NextResponse.json(result, { status: result.failed ? 503 : 200 });
  } catch {
    return NextResponse.json({ error: "Não foi possível concluir os lembretes." }, { status: 503 });
  }
}
