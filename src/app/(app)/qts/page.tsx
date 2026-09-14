import { requireRole } from "@/components/app/RoleGuard";
import { QtsPublicationForm } from "@/components/app/qts/QtsPublicationForm";
import { QtsViewer } from "@/components/app/qts/QtsViewer";
import { macapaDate } from "@/modules/qts/domain/qts";
import { getQtsCalendar, getQtsPublicationOptions } from "@/modules/qts/infrastructure/queries";

export const metadata = { title: "QTS — Quadro de Trabalho Semanal" };
export const dynamic = "force-dynamic";

export default async function QtsPage({ searchParams }: { searchParams: { data?: string } }) {
  const session = await requireRole(["aluno", "instrutor", "secretaria", "coordenacao"]);
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.data ?? "")
    ? searchParams.data!
    : macapaDate();
  const [snapshot, options] = await Promise.all([
    getQtsCalendar(selected, selected),
    session.role === "coordenacao" ? getQtsPublicationOptions() : Promise.resolve(null),
  ]);
  return (
    <div className="space-y-6">
      <QtsViewer initial={snapshot} initialDate={selected} />
      {options && <QtsPublicationForm classes={options.classes} academicYears={options.academicYears} documents={options.documents} qtsTypeId={options.qtsTypeId} />}
    </div>
  );
}
