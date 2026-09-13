import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import { dispatchNextScheduleNotification } from "@/modules/schedule-repository/infrastructure/notificationDelivery";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.active || session.isFirstAccess || session.role !== "coordenacao")
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  const input = z
    .object({ documentId: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Documento inválido" }, { status: 400 });
  const client = createSupabaseServerClient();
  const document = await client
    .from("schedule_documents")
    .select("id")
    .eq("id", input.data.documentId)
    .eq("publication_status", "published")
    .maybeSingle();
  if (document.error || !document.data)
    return NextResponse.json({ error: "Publicação não encontrada" }, { status: 404 });
  let processed = 0;
  const deadline = Date.now() + 40_000;
  try {
    while (processed < 60 && Date.now() < deadline) {
      const results = await Promise.all(
        [0, 1, 2].map(() => dispatchNextScheduleNotification(input.data.documentId)),
      );
      const count = results.filter(Boolean).length;
      if (!count) break;
      processed += count;
    }
    return NextResponse.json({ processed });
  } catch {
    return NextResponse.json(
      { error: "Os avisos pendentes serão retomados pela fila." },
      { status: 503 },
    );
  }
}
