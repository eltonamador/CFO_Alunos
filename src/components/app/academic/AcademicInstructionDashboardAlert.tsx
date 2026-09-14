import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { macapaDate } from "@/modules/qts/domain/qts";
import { projectedWorkload } from "@/modules/academic-management/domain/instructionJournal";
import { getAcademicDashboard } from "@/modules/academic-management/infrastructure/queries";
import type { UserRoleValue } from "@/shared/domain";

export async function AcademicInstructionDashboardAlert({ role }: { role: UserRoleValue }) {
  try {
    const data = await getAcademicDashboard();
    const today = macapaDate();
    const projections = data.offerings.map((offering) => {
      const future = data.sessions
        .filter(
          (session) =>
            session.offering_id === offering.id &&
            ["planned", "proposed"].includes(session.status) &&
            session.scheduled_on >= today,
        )
        .reduce((total, session) => total + session.planned_hours, 0);
      const taught = data.sessions
        .filter((session) => session.offering_id === offering.id && session.status === "validated")
        .reduce((total, session) => total + (session.taught_hours ?? 0), 0);
      return {
        offering,
        projection: projectedWorkload({
          adoptedHours: offering.workload_hours,
          taughtHours: taught,
          scheduledFutureHours: future,
          hasAcademicYear: Boolean(offering.academic_year_id),
          hasMappedFuturePlan: future > 0,
        }),
      };
    });
    const risk = projections.filter(({ projection }) => projection.status === "deficit_risk");
    const insufficient = projections.filter(
      ({ projection }) => projection.status === "insufficient_data",
    );
    const overdue = data.sessions.filter(
      (session) =>
        session.classification === "instruction" &&
        ["planned", "proposed"].includes(session.status) &&
        session.scheduled_on < today,
    );
    if (!risk.length && !overdue.length && !insufficient.length) return null;
    return (
      <Card className="space-y-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
        <p className="font-semibold">Acompanhamento instrucional</p>
        <Alert className="border-0 bg-transparent p-0 text-sm">
          {risk.length > 0 && `${risk.length} disciplina(s) estão com risco de déficit de carga. `}
          {overdue.length > 0 &&
            `${overdue.length} aula(s) já passaram e ainda precisam de diário ou validação. `}
          {insufficient.length > 0 &&
            `${insufficient.length} disciplina(s) precisam de calendário ou planejamento futuro para projetar a carga.`}
        </Alert>
        <Link
          href={`/${role}/academico`}
          className="inline-flex min-h-10 items-center text-sm font-semibold text-primary"
        >
          Abrir disciplinas e diário →
        </Link>
      </Card>
    );
  } catch {
    // O painel principal continua utilizável durante a primeira instalação da migration acadêmica.
    return null;
  }
}

export async function AcademicInstructionPendingSummary() {
  try {
    const data = await getAcademicDashboard();
    const today = macapaDate();
    const overdue = data.sessions.filter(
      (session) =>
        session.classification === "instruction" &&
        ["planned", "proposed"].includes(session.status) &&
        session.scheduled_on < today,
    );
    const unmapped = data.sessions.filter(
      (session) => session.classification === "unmapped" && session.status === "planned",
    );
    const incompleteAttendance = data.sessions.filter((session) => {
      if (session.status !== "validated" || !session.offering_id) return false;
      const expected = data.enrollments.filter(
        (enrollment) => enrollment.offering_id === session.offering_id,
      ).length;
      const marked = data.sessionAttendances.filter(
        (attendance) => attendance.session_id === session.id,
      ).length;
      return marked < expected;
    });
    if (!overdue.length && !unmapped.length && !incompleteAttendance.length) return null;
    return (
      <Card className="space-y-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
        <p className="font-semibold">Pendências do diário instrucional</p>
        <p className="text-sm text-muted-foreground">
          {overdue.length > 0 && `${overdue.length} diário(s) vencido(s). `}
          {unmapped.length > 0 && `${unmapped.length} item(ns) de QTS sem disciplina. `}
          {incompleteAttendance.length > 0 &&
            `${incompleteAttendance.length} chamada(s) incompleta(s).`}
        </p>
        <Link
          href="/coordenacao/academico"
          className="inline-flex min-h-10 items-center text-sm font-semibold text-primary"
        >
          Resolver na Gestão Acadêmica →
        </Link>
      </Card>
    );
  } catch {
    return null;
  }
}
