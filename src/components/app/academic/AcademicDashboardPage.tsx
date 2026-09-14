import Link from "next/link";
import { requireRole } from "@/components/app/RoleGuard";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { getAcademicDashboard } from "@/modules/academic-management/infrastructure/queries";
import { AcademicDataError } from "@/modules/academic-management/infrastructure/database";
import type { UserRoleValue } from "@/shared/domain";
import { AcademicField, AcademicRetryButton } from "./AcademicActionForm";
import { NewDisciplineForm, NewOfferingForm } from "./AcademicSetupForms";
import { AcademicCalendarPanel } from "./AcademicCalendarPanel";
import { AcademicQtsMappingPanel } from "./AcademicQtsMappingPanel";
import { macapaDate } from "@/modules/qts/domain/qts";
import { AcademicResultSummary } from "./AcademicResult";
import { instructionalDays, projectedWorkload } from "@/modules/academic-management/domain/instructionJournal";

export type AcademicSearchParams = { fase?: string; turma?: string; cadete?: string };
export const phaseLabel = (phase: number) =>
  ["", "CFO I", "CFO II", "CFO III"][phase] ?? "Fase a conferir";

export function AcademicLoadError({ message }: { message?: string }) {
  return (
    <div className="space-y-3">
      <Alert variant="destructive">
        {message ??
          "Não foi possível carregar a gestão acadêmica. Verifique a conexão e tente novamente."}
      </Alert>
      <AcademicRetryButton />
    </div>
  );
}

export async function AcademicDashboardPage({
  role,
  searchParams,
}: {
  role: UserRoleValue;
  searchParams: AcademicSearchParams;
}) {
  const session = await requireRole(role);
  if (!session.active)
    return <Alert variant="destructive">Conta inativa. Procure a coordenação.</Alert>;
  let data;
  try {
    data = await getAcademicDashboard();
  } catch (error) {
    return (
      <AcademicLoadError message={error instanceof AcademicDataError ? error.message : undefined} />
    );
  }
  const phase = ["1", "2", "3"].includes(searchParams.fase ?? "") ? Number(searchParams.fase) : 1;
  const classId = searchParams.turma ?? "";
  const studentId = searchParams.cadete ?? "";
  const offerings = data.offerings.filter(
    (item) =>
      item.discipline.phase === phase &&
      (!classId || item.class_id === classId) &&
      (!studentId ||
        data.enrollments.some(
          (enrollment) => enrollment.offering_id === item.id && enrollment.student_id === studentId,
        )),
  );
  const disciplines = data.disciplines.filter((item) => item.phase === phase);
  const summaries = data.student_summaries.filter(
    (item) => !studentId || item.student_id === studentId,
  );
  const base = `/${role}/academico`;
  const canManage = role === "coordenacao";
  const today = macapaDate();
  const validatedSessions = data.sessions.filter((item) => item.status === "validated");
  const pendingSessions = data.sessions.filter(
    (item) => item.classification === "instruction" && ["planned", "proposed"].includes(item.status),
  );
  const unmappedSessions = data.sessions.filter((item) => item.classification === "unmapped");
  const overdueSessions = pendingSessions.filter((item) => item.scheduled_on < today);
  const workloadAlerts = data.offerings.map((offering) => {
    const year = data.academicYears.find((item) => item.id === offering.academic_year_id);
    const offeringSessions = data.sessions.filter((item) => item.offering_id === offering.id);
    const taught = offeringSessions.filter((item) => item.status === "validated").reduce((sum, item) => sum + (item.taught_hours ?? 0), 0);
    const future = offeringSessions.filter((item) => ["planned", "proposed"].includes(item.status) && item.scheduled_on >= today).reduce((sum, item) => sum + item.planned_hours, 0);
    const blockedDates = year
      ? data.calendarEvents.filter((item) => item.academic_year_id === year.id && item.blocks_instruction && (!item.class_id || item.class_id === offering.class_id)).map((item) => item.event_date)
      : [];
    const cadence = year ? instructionalDays({ startsOn: year.starts_on, endsOn: year.ends_on, blockedDates, asOf: today }) : null;
    return {
      offering,
      cadence,
      projection: projectedWorkload({ adoptedHours: offering.workload_hours, taughtHours: taught, scheduledFutureHours: future, hasAcademicYear: Boolean(year), hasMappedFuturePlan: future > 0 }),
    };
  });
  const deficitAlerts = workloadAlerts.filter((item) => item.projection.status === "deficit_risk");
  const insufficientAlerts = workloadAlerts.filter((item) => item.projection.status === "insufficient_data");
  return (
    <div className="space-y-5">
      <header>
        <SectionEyebrow>Gestão acadêmica</SectionEyebrow>
        <h1 className="font-display text-2xl font-bold">
          {role === "aluno" ? "Minhas disciplinas e notas" : "Disciplinas e notas"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ofertas, avaliações e histórico de CFO I, CFO II e CFO III.
        </p>
      </header>
      <Tabs
        param="fase"
        defaultValue="1"
        items={[
          { value: "1", label: "CFO I" },
          { value: "2", label: "CFO II" },
          { value: "3", label: "CFO III" },
        ]}
      />
      <form className="flex flex-wrap items-end gap-3" method="get">
        <input name="fase" type="hidden" value={phase} />
        <div className="min-w-[180px] flex-1">
          <AcademicField label="Turma">
            <Select name="turma" defaultValue={classId}>
              <option value="">Todas as turmas disponíveis</option>
              {data.classes.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </AcademicField>
        </div>
        {role !== "aluno" && (
          <div className="min-w-[200px] flex-1">
            <AcademicField label="Cadete">
              <Select name="cadete" defaultValue={studentId}>
                <option value="">Todos os cadetes disponíveis</option>
                {data.student_summaries.map((item) => (
                  <option key={item.student_id} value={item.student_id}>
                    {item.student_label}
                  </option>
                ))}
              </Select>
            </AcademicField>
          </div>
        )}
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Ofertas de {phaseLabel(phase)}</p>
          <p className="font-display text-3xl font-bold">{offerings.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Sem política aprovada</p>
          <p className="font-display text-3xl font-bold">
            {offerings.filter((item) => !item.policy_id).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Componentes no catálogo da fase</p>
          <p className="font-display text-3xl font-bold">{disciplines.length}</p>
        </Card>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do diário de instrução">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Aulas validadas</p>
          <p className="font-display text-2xl font-bold">{validatedSessions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Aulas pendentes</p>
          <p className="font-display text-2xl font-bold">{pendingSessions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">QTS sem disciplina</p>
          <p className="font-display text-2xl font-bold">{unmappedSessions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Diários vencidos</p>
          <p className="font-display text-2xl font-bold">{overdueSessions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Risco de déficit</p>
          <p className="font-display text-2xl font-bold">{deficitAlerts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Projeções incompletas</p>
          <p className="font-display text-2xl font-bold">{insufficientAlerts.length}</p>
        </Card>
      </section>
      {(overdueSessions.length > 0 || unmappedSessions.length > 0 || deficitAlerts.length > 0 || insufficientAlerts.length > 0) && (
        <Alert>
          {overdueSessions.length > 0 && `${overdueSessions.length} aula(s) já ocorreram e ainda aguardam proposta ou validação. `}
          {unmappedSessions.length > 0 && `${unmappedSessions.length} item(ns) do QTS precisam ser classificados pela coordenação. `}
          {deficitAlerts.length > 0 && `${deficitAlerts.length} disciplina(s) têm risco de déficit de carga. `}
          {insufficientAlerts.length > 0 && `${insufficientAlerts.length} disciplina(s) ainda não têm calendário ou planejamento futuro suficiente.`}
        </Alert>
      )}
      {deficitAlerts.length > 0 && (
        <Card className="p-4">
          <h2 className="font-semibold">Cadência e carga que exigem atenção</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {deficitAlerts.map(({ offering, projection, cadence }) => (
              <li key={offering.id}>
                <strong>{offering.discipline.name}</strong>: faltam {projection.deficitHours.toFixed(2).replace(".", ",")} h/a
                {cadence ? ` em ${cadence.remaining} dia(s) instrucional(is) restante(s)` : ""}.
              </li>
            ))}
          </ul>
        </Card>
      )}
      <section className="space-y-3" aria-labelledby="academic-calendar-workspace">
        <AcademicCalendarPanel
          canManage={canManage}
          courses={data.courses}
          classes={data.classes}
          years={data.academicYears}
          events={data.calendarEvents}
          offerings={data.offerings}
        />
      </section>
      {canManage && <AcademicQtsMappingPanel sessions={data.sessions} offerings={data.offerings} />}
      <section aria-labelledby="academic-offerings" className="space-y-3">
        <h2 id="academic-offerings" className="font-display text-xl font-semibold">
          Ofertas da fase
        </h2>
        {!offerings.length && (
          <Card className="p-5 text-sm text-muted-foreground">
            Nenhuma oferta disponível com estes filtros.
            {canManage
              ? " Crie uma oferta a partir do catálogo abaixo."
              : " As disciplinas aparecerão após o cadastro e a vinculação pela coordenação."}
          </Card>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {offerings.map((offering) => {
            const ownEnrollments = data.enrollments.filter(
              (item) =>
                item.offering_id === offering.id &&
                (role === "aluno" || studentId === item.student_id),
            );
            return (
              <Card key={offering.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{phaseLabel(offering.discipline.phase)}</Badge>
                  <Badge variant={offering.policy_id ? "success" : "warning"}>
                    {offering.policy_id ? "Política aprovada" : "Decisão normativa pendente"}
                  </Badge>
                </div>
                <h3 className="font-display text-lg font-semibold">
                  <Link
                    className="underline decoration-border underline-offset-4 hover:text-primary"
                    href={`${base}/${offering.id}${studentId ? `?cadete=${encodeURIComponent(studentId)}` : ""}`}
                  >
                    {offering.discipline.name}
                  </Link>
                </h3>
                <p className="text-sm text-muted-foreground">
                  {offering.class_name} · {offering.academic_year} · {offering.workload_hours} h/a ·{" "}
                  {offering.vc_count} VC
                </p>
                {ownEnrollments.map((enrollment) => (
                  <div key={enrollment.id} className="border-t border-border pt-3">
                    <p className="mb-2 text-sm font-medium">{enrollment.student_label}</p>
                    <AcademicResultSummary result={enrollment.result} />
                  </div>
                ))}
                <Link
                  href={`${base}/${offering.id}${studentId ? `?cadete=${encodeURIComponent(studentId)}` : ""}`}
                  className="inline-flex min-h-11 items-center font-semibold text-primary"
                >
                  Abrir disciplina →
                </Link>
              </Card>
            );
          })}
        </div>
      </section>
      {summaries.length > 0 && (
        <section className="space-y-3" aria-labelledby="academic-students">
          <h2 id="academic-students" className="font-display text-xl font-semibold">
            Histórico por cadete
          </h2>
          <p className="text-sm text-muted-foreground">
            Resumo das matrículas disponíveis em todas as fases. Alertas dependem de análise da
            coordenação.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {summaries.map((summary) => (
              <Card key={summary.student_id} className="space-y-2 p-4">
                <h3 className="font-semibold">{summary.student_label}</h3>
                <p className="text-sm text-muted-foreground">
                  {summary.enrollment_count} matrícula(s) · {summary.vf_count} disciplina(s) em VF ·{" "}
                  {summary.pending_count} pendência(s)
                </p>
                {summary.alerts.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {summary.alerts.map((alert, index) => (
                      <li key={index}>{alert}</li>
                    ))}
                  </ul>
                )}
                {role !== "aluno" && (
                  <Link
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
                    href={`${base}?fase=${phase}&cadete=${encodeURIComponent(summary.student_id)}`}
                  >
                    Ver disciplinas do cadete →
                  </Link>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
      {canManage && (
        <section className="space-y-3" aria-labelledby="academic-management">
          <h2 id="academic-management" className="font-display text-xl font-semibold">
            Cadastro acadêmico
          </h2>
          <details className="rounded-lg border border-border bg-card p-4">
            <summary className="cursor-pointer font-semibold">Criar oferta para a turma</summary>
            <div className="mt-4">
              <NewOfferingForm
                classes={data.classes}
                disciplines={data.disciplines.filter((item) => item.active)}
                academicYears={data.academicYears}
              />
            </div>
          </details>
          <details className="rounded-lg border border-border bg-card p-4">
            <summary className="cursor-pointer font-semibold">
              Cadastrar componente curricular
            </summary>
            <div className="mt-4">
              <NewDisciplineForm />
            </div>
          </details>
        </section>
      )}
      <details className="rounded-lg border border-border bg-card p-4">
        <summary className="cursor-pointer font-semibold">
          Catálogo de {phaseLabel(phase)} e referências normativas
        </summary>
        <div className="mt-4 divide-y divide-border">
          {disciplines.length === 0 && (
            <p className="text-sm text-muted-foreground">
              O catálogo desta fase ainda não está disponível.
            </p>
          )}
          {disciplines.map((discipline) => (
            <div key={discipline.id} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{discipline.name}</h3>
                <Badge>{discipline.workload_hours} h/a</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {discipline.code} · {discipline.source_ref}
              </p>
              {discipline.conflicts.length > 0 && (
                <ul className="list-disc space-y-1 pl-4 text-sm text-amber-800 dark:text-amber-300">
                  {discipline.conflicts.map((conflict, index) => (
                    <li key={index}>{conflict}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
