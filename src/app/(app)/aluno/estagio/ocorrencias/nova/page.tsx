import Link from "next/link";
import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  newDiaryForm,
  startedShifts,
  suggestedShift,
} from "@/modules/internship-management/domain/occurrenceDiary";
import {
  loadClassmates,
  loadDiaryShifts,
  loadMyVehicles,
} from "@/modules/internship-management/infrastructure/occurrenceDiary";
import { OccurrenceDiaryForm } from "@/modules/internship-management/presentation/OccurrenceDiaryForm";
import { diaryPhotosConfigured } from "@/modules/internship-management/infrastructure/diaryPhotosDrive";

export const metadata = { title: "Registrar ocorrência" };
export const dynamic = "force-dynamic";

export default async function NewDiaryEntryPage({
  searchParams,
}: {
  searchParams?: { plantao?: string };
}) {
  const session = await requireRole("aluno");
  if (!session.studentId) return <p>Conta sem vínculo de cadete. Procure a Coordenação.</p>;
  const db = createSupabaseServerClient();
  const [shifts, classmates, vehicles] = await Promise.all([
    loadDiaryShifts(db),
    loadClassmates(db, session.studentId),
    loadMyVehicles(db, session.studentId),
  ]);
  const now = Date.now();
  const started = startedShifts(shifts, now);
  const chosen =
    started.find((shift) => shift.assignment_id === searchParams?.plantao) ??
    suggestedShift(shifts, now);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/aluno/estagio/ocorrencias" className="text-sm text-primary underline">
        Diário de ocorrências
      </Link>
      <h1 className="font-display text-3xl font-bold">Registrar ocorrência</h1>
      <OccurrenceDiaryForm
        initial={newDiaryForm(chosen, now)}
        shifts={started}
        classmates={classmates}
        vehicles={vehicles}
        photosEnabled={diaryPhotosConfigured()}
      />
    </div>
  );
}
