import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildOccurrenceDiaryPDF } from "@/lib/reports/internship-occurrence-diary-pdf";
import { getSession } from "@/modules/identity/presentation/session";
import {
  DIARY_ENTRY_COLUMNS,
  diaryBadges,
  shiftLabel,
  summarizeReactions,
  type DiaryEntry,
} from "@/modules/internship-management/domain/occurrenceDiary";
import {
  cadetLabel,
  loadCadets,
  loadDiaryShifts,
  loadReactions,
} from "@/modules/internship-management/infrastructure/occurrenceDiary";
import { readAll } from "@/modules/internship-management/infrastructure/readAll";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PDF pessoal do diário: só o próprio cadete baixa, com os registros salvos (sem rascunhos). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.active || session.role !== "aluno" || !session.studentId)
    return NextResponse.json({ error: "Acesso restrito ao cadete" }, { status: 403 });
  const studentId = session.studentId;
  const db = createSupabaseServerClient();
  let entries: DiaryEntry[];
  try {
    entries = (await readAll((from, to) =>
      db
        .from("internship_diary_entries")
        .select(DIARY_ENTRY_COLUMNS)
        .eq("student_id", studentId)
        .neq("status", "rascunho")
        .order("occurred_on")
        .order("created_at")
        .order("id")
        .range(from, to),
    )) as unknown as DiaryEntry[];
  } catch {
    return NextResponse.json({ error: "Diário indisponível" }, { status: 503 });
  }
  if (!entries.length)
    return NextResponse.json({ error: "Nenhum registro salvo no diário" }, { status: 404 });
  const [shifts, reactionRows, cadets] = await Promise.all([
    loadDiaryShifts(db),
    loadReactions(
      db,
      entries.map((entry) => entry.id),
    ),
    loadCadets(
      db,
      entries.flatMap((entry) => entry.companion_ids),
    ),
  ]);
  const reactionTotals = new Map(
    [...summarizeReactions(reactionRows, session.userId)].map(([id, summary]) => [id, summary.total]),
  );
  const pdf = await buildOccurrenceDiaryPDF({
    cadet: cadetLabel(
      session.warName
        ? { id: studentId, war_name: session.warName, student_number: session.studentNumber }
        : undefined,
    ),
    entries,
    shiftLabels: new Map(shifts.map((shift) => [shift.assignment_id, shiftLabel(shift)])),
    names: new Map([...cadets].map(([id, cadet]) => [id, cadetLabel(cadet)])),
    reactionTotals,
    badges: diaryBadges(entries, reactionTotals),
    issuedAt: new Date().toISOString(),
  });
  const number = session.studentNumber == null ? "cadete" : String(session.studentNumber).padStart(2, "0");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="diario-de-ocorrencias-${number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
