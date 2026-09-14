import { NextResponse, type NextRequest } from "next/server";
import { getQtsCalendar } from "@/modules/qts/infrastructure/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const start = request.nextUrl.searchParams.get("start") ?? "";
  const end = request.nextUrl.searchParams.get("end") ?? start;
  try {
    const snapshot = await getQtsCalendar(start, end);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível consultar o QTS.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
