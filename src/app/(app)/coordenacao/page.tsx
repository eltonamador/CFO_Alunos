import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { requireRole } from "@/components/app/RoleGuard";
import { BirthdayCard } from "@/components/app/BirthdayCard";
import { PushNotificationControl } from "@/components/app/PushNotificationControl";
import { TodayTomorrowDuty } from "@/components/app/schedules/TodayTomorrowDuty";
import { QtsDashboardCard } from "@/components/app/qts/QtsDashboardCard";
import { AcademicInstructionDashboardAlert } from "@/components/app/academic/AcademicInstructionDashboardAlert";
import { getDutyOverview } from "@/modules/schedule-repository/infrastructure/dashboardQueries";
import { getQtsOverview } from "@/modules/qts/infrastructure/queries";
import { getAdministrativeBirthdayAlerts } from "@/modules/student-profile/infrastructure/getAdministrativeBirthdayAlerts";
import { getCoordinationDashboardSummary } from "@/modules/student-profile/infrastructure/getCoordinationDashboardSummary";

export const metadata = { title: "Início — Coordenação" };
export const dynamic = "force-dynamic";

function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  return (
    <div className="space-y-1.5 rounded-lg border bg-card p-4 shadow-card-sm transition-shadow hover:shadow-card-md">
      <div className="flex items-baseline justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className="font-display text-sm font-bold text-foreground">
          {String(done).padStart(2, "0")} / {String(total).padStart(2, "0")}{" "}
          <span className="text-[10px] font-normal text-muted-foreground">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-muted/30">
        <div
          className={pct === 100 ? "h-full rounded bg-green-500" : "h-full rounded bg-primary"}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type AlertTone = "warning" | "success" | "danger" | "info";
function AlertBox({
  icon: Icon,
  title,
  message,
  href,
  action,
  tone,
}: {
  icon: typeof AlertCircle;
  title: string;
  message: string;
  href?: string;
  action?: string;
  tone: AlertTone;
}) {
  const colors: Record<AlertTone, string> = {
    warning:
      "border-orange-200/60 bg-orange-50/20 dark:border-orange-950/40 dark:bg-orange-950/5 text-orange-500",
    success:
      "border-green-200/60 bg-green-50/10 dark:border-green-950/40 dark:bg-green-950/5 text-green-500",
    danger: "border-red-200/60 bg-red-50/20 dark:border-red-950/40 dark:bg-red-950/5 text-red-500",
    info: "border-blue-200/60 bg-blue-50/10 dark:border-blue-950/40 dark:bg-blue-950/5 text-blue-500",
  };
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3.5 ${colors[tone]}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{message}</p>
        {href && action && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 pt-1.5 text-xs font-semibold text-primary hover:underline"
          >
            {action} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

async function DutySection() {
  const overview = await getDutyOverview();
  return <TodayTomorrowDuty overview={overview} schedulesHref="/coordenacao/escalas" />;
}

async function QtsSection() {
  const overview = await getQtsOverview();
  return <QtsDashboardCard overview={overview} />;
}

async function BirthdaySection() {
  const alerts = await getAdministrativeBirthdayAlerts();
  return <BirthdayCard alerts={alerts} />;
}

function DashboardCardFallback() {
  return <div className="h-24 animate-pulse rounded-xl border bg-muted/30" aria-hidden />;
}

export default async function CoordenacaoHome() {
  const session = await requireRole("coordenacao");
  const summary = await getCoordinationDashboardSummary();
  const metrics = summary ?? {
    totalStudents: 0,
    completedProfiles: 0,
    documentsValidated: 0,
    openPendingItems: 0,
    studentsWithDocuments: 0,
    studentsQuarantineEquipment: 0,
    studentsEquipmentCompleted: 0,
    studentsWithoutCanga: 0,
    pendingHealthValidations: 0,
  };
  const kpis = [
    {
      label: "Total de Alunos",
      value: metrics.totalStudents,
      icon: Users,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20",
    },
    {
      label: "Cadastros Completos",
      value: metrics.completedProfiles,
      icon: CheckCircle2,
      color: "text-green-500 bg-green-50 dark:bg-green-950/20",
    },
    {
      label: "Docs Validados",
      value: metrics.documentsValidated,
      icon: FileText,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/20",
    },
    {
      label: "Pendências Abertas",
      value: metrics.openPendingItems,
      icon: AlertCircle,
      color: "text-orange-500 bg-orange-50 dark:bg-orange-950/20",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          CBMAP · ACADEMIA DE BOMBEIRO MILITAR
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Olá, {session.fullName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Bem-vindo ao Painel de Controle Operacional do <strong>CFO 2026.1</strong>.
        </p>
      </header>
      <Suspense fallback={<DashboardCardFallback />}>
        <DutySection />
      </Suspense>
      <Suspense fallback={<DashboardCardFallback />}>
        <QtsSection />
      </Suspense>
      <AcademicInstructionDashboardAlert role="coordenacao" />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card-sm transition-all hover:shadow-card-md"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${kpi.color}`}>
              <kpi.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </p>
              <p className="mt-0.5 font-display text-2xl font-bold tracking-tight text-foreground">
                {String(kpi.value).padStart(2, "0")}
              </p>
            </div>
          </div>
        ))}
      </section>
      <Suspense fallback={null}>
        <BirthdaySection />
      </Suspense>
      <PushNotificationControl />
      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-foreground">
              Progresso Geral da Turma
            </h2>
            <p className="text-xs text-muted-foreground">
              Acompanhamento quantitativo do preenchimento e conformidade dos 30 alunos.
            </p>
          </div>
          <div className="space-y-3.5 pt-2">
            <ProgressBar
              label="Ficha Cadastral (100% preenchida)"
              done={metrics.completedProfiles}
              total={metrics.totalStudents}
            />
            <ProgressBar
              label="Documentação Obrigatória Enviada"
              done={metrics.studentsWithDocuments}
              total={metrics.totalStudents}
            />
            <ProgressBar
              label="Enxoval de Quarentena Entregue"
              done={metrics.studentsQuarantineEquipment}
              total={metrics.totalStudents}
            />
            <ProgressBar
              label="Enxoval Geral Concluído"
              done={metrics.studentsEquipmentCompleted}
              total={metrics.totalStudents}
            />
          </div>
        </section>
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-foreground">Alertas Operacionais</h2>
            <p className="text-xs text-muted-foreground">
              Ações prioritárias e inconsistências identificadas que demandam revisão.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            {metrics.studentsWithoutCanga > 0 ? (
              <AlertBox
                icon={AlertTriangle}
                title="Canga não atribuído"
                message={`Existem ${metrics.studentsWithoutCanga} alunos sem parceiro de canga definido no sistema.`}
                href="/coordenacao/alunos"
                action="Atribuir cangas na lista de alunos"
                tone="warning"
              />
            ) : (
              <AlertBox
                icon={CheckCircle2}
                title="Cangas OK"
                message="Todos os alunos ativos possuem canga atribuído corretamente."
                tone="success"
              />
            )}
            {metrics.pendingHealthValidations > 0 && (
              <AlertBox
                icon={AlertCircle}
                title="Saúde pendente de revisão"
                message={`Existem ${metrics.pendingHealthValidations} restrições médicas/fisiológicas aguardando homologação operacional da coordenação.`}
                href="/coordenacao/alunos"
                action="Homologar restrições na lista"
                tone="danger"
              />
            )}
            {metrics.openPendingItems > 0 && (
              <AlertBox
                icon={FileText}
                title="Fila de Validações"
                message={`Você possui ${metrics.openPendingItems} itens de validação (cadastros, documentos ou materiais) aguardando conferência.`}
                href="/coordenacao/pendencias"
                action="Acessar central de pendências"
                tone="info"
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
