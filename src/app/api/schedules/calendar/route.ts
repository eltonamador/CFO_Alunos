import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/modules/identity/presentation/session";
import { getScheduleCalendar } from "@/modules/schedule-repository/infrastructure/calendarQueries";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.active || session.isFirstAccess)
    return NextResponse.json({ error: "Entre novamente." }, { status: 401, headers });
  const range = z
    .object({ start: z.string().date(), end: z.string().date() })
    .refine(
      ({ start, end }) => end >= start && Date.parse(end) - Date.parse(start) <= 62 * 86400_000,
    )
    .safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!range.success)
    return NextResponse.json({ error: "Intervalo inválido." }, { status: 400, headers });
  try {
    return NextResponse.json(await getScheduleCalendar(range.data.start, range.data.end), {
      headers,
    });
  } catch {
    return NextResponse.json({ error: "Calendário indisponível agora." }, { status: 503, headers });
  }
}
