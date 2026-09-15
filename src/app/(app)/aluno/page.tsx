import { Suspense } from "react";
import { requireRole } from "@/components/app/RoleGuard";
import { PendingFollowUpAlert } from "@/components/app/followup/PendingFollowUpAlert";
import { PushNotificationControl } from "@/components/app/PushNotificationControl";
import { UpcomingScheduleAssignments } from "@/components/app/schedules/UpcomingScheduleAssignments";
import { TodayTomorrowDuty } from "@/components/app/schedules/TodayTomorrowDuty";
import { QtsDashboardCard } from "@/components/app/qts/QtsDashboardCard";
import { AcademicInstructionDashboardAlert } from "@/components/app/academic/AcademicInstructionDashboardAlert";
import { getUpcomingScheduleAssignments } from "@/modules/schedule-repository/infrastructure/queries";
import { getDutyOverview } from "@/modules/schedule-repository/infrastructure/dashboardQueries";
import { getQtsOverview } from "@/modules/qts/infrastructure/queries";
import { getStudentDashboardSummary } from "@/modules/student-profile/infrastructure/getStudentDashboardSummary";

export const metadata = { title: "Portal do Aluno" };

const REQUIRED_DOC_LABELS: Record<string, string> = {
  rg_cpf: "RG / CPF",
  cnh: "CNH",
  comprovante_residencia: "Comprovante de Residência",
  foto_3x4: "Foto 3×4",
  declaracao_medica: "Declaração Médica",
};

function LoadingCard() {
  return <div className="h-28 animate-pulse rounded-xl border bg-muted/30" aria-hidden />;
}

async function StudentOperationalSections({ studentId }: { studentId: string | null }) {
  const [assignments, dutyOverview, qtsOverview] = await Promise.all([
    getUpcomingScheduleAssignments(),
    getDutyOverview(),
    getQtsOverview(),
  ]);
  return (
    <>
      <TodayTomorrowDuty overview={dutyOverview} schedulesHref="/aluno/escalas" />
      <QtsDashboardCard overview={qtsOverview} />
      <AcademicInstructionDashboardAlert role="aluno" />
      <PendingFollowUpAlert studentId={studentId} />
      <UpcomingScheduleAssignments assignments={assignments} />
    </>
  );
}

async function StudentProgressSection({ studentId }: { studentId: string | null }) {
  const summary = studentId ? await getStudentDashboardSummary() : null;
  const progress = summary
    ? [
        { label: "Cadastro", value: summary.profileCompletionPercent },
        { label: "Documentos", value: summary.documentsCompletionPercent },
        { label: "Materiais (quarentena)", value: summary.quarantineEquipmentCompletionPercent },
        { label: "Materiais (geral)", value: summary.equipmentCompletionPercent },
      ]
    : [
        { label: "Cadastro", value: 0 },
        { label: "Documentos", value: 0 },
        { label: "Materiais (quarentena)", value: 0 },
        { label: "Materiais (geral)", value: 0 },
      ];
  const pendencias = summary
    ? [
        ...summary.missingDocumentTypes.map((type) => ({
          label: `Documento: ${REQUIRED_DOC_LABELS[type] ?? type}`,
        })),
        ...(summary.pendingQuarantineEquipment > 0
          ? [
              {
                label: `${summary.pendingQuarantineEquipment} item${summary.pendingQuarantineEquipment > 1 ? "s" : ""} de quarentena a providenciar`,
              },
            ]
          : []),
      ]
    : [];

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2">
        {progress.map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">{item.label}</p>
              <p
                className={`text-sm font-semibold tabular-nums ${item.value === 100 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
              >
                {item.value}%
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded bg-muted">
              <div
                className={`h-full transition-all ${item.value === 100 ? "bg-green-500" : "bg-primary"}`}
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </section>
      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold">Pendências</h2>
        {pendencias.length === 0 ? (
          <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
            ✔ Nenhuma pendência no momento.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {pendencias.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default async function AlunoHome() {
  const session = await requireRole("aluno");
  const number = session.studentNumber ? String(session.studentNumber).padStart(2, "0") : null;
  const greeting = session.warName
    ? number
      ? `${session.warName} — ${number}`
      : session.warName
    : session.fullName;
  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">Portal do Aluno</p>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
          {greeting}
        </h1>
        {!session.studentId && (
          <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Sua conta ainda não está vinculada a um aluno. Procure a Coordenação.
          </p>
        )}
      </header>
      <Suspense fallback={<LoadingCard />}>
        <StudentOperationalSections studentId={session.studentId} />
      </Suspense>
      <Suspense fallback={<LoadingCard />}>
        <StudentProgressSection studentId={session.studentId} />
      </Suspense>
      <PushNotificationControl description="Receba avisos de escala, de FO− e lembretes de prazo mesmo com o app fechado." />
    </div>
  );
}
