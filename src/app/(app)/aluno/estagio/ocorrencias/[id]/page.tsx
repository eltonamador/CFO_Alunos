import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DIARY_ENTRY_COLUMNS,
  diaryFormFromEntry,
  startedShifts,
  type DiaryEntry,
} from "@/modules/internship-management/domain/occurrenceDiary";
import {
  loadClassmates,
  loadDiaryShifts,
  loadMyVehicles,
} from "@/modules/internship-management/infrastructure/occurrenceDiary";
import { OccurrenceDiaryForm } from "@/modules/internship-management/presentation/OccurrenceDiaryForm";
import { diaryPhotosConfigured } from "@/modules/internship-management/infrastructure/diaryPhotosDrive";

export const metadata = { title: "Editar registro do diário" };
export const dynamic = "force-dynamic";

export default async function EditDiaryEntryPage({ params }: { params: { id: string } }) {
  const session = await requireRole("aluno");
  if (!session.studentId) return <p>Conta sem vínculo de cadete. Procure a Coordenação.</p>;
  if (!z.string().uuid().safeParse(params.id).success) notFound();
  const db = createSupabaseServerClient();
  const [{ data }, shifts, classmates, vehicles] = await Promise.all([
    db
      .from("internship_diary_entries")
      .select(DIARY_ENTRY_COLUMNS)
      .eq("id", params.id)
      .eq("student_id", session.studentId)
      .maybeSingle(),
    loadDiaryShifts(db),
    loadClassmates(db, session.studentId),
    loadMyVehicles(db, session.studentId),
  ]);
  if (!data) notFound();
  const entry = data as unknown as DiaryEntry;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/aluno/estagio/ocorrencias" className="text-sm text-primary underline">
        Diário de ocorrências
      </Link>
      <h1 className="font-display text-3xl font-bold">
        {entry.status === "rascunho" ? "Continuar rascunho" : "Editar registro"}
      </h1>
      <OccurrenceDiaryForm
        entryId={entry.id}
        status={entry.status}
        hidden={Boolean(entry.hidden_at)}
        hiddenReason={entry.hidden_reason}
        initial={diaryFormFromEntry(entry)}
        shifts={startedShifts(shifts, Date.now())}
        classmates={classmates}
        vehicles={vehicles}
        photosEnabled={diaryPhotosConfigured()}
      />
    </div>
  );
}
