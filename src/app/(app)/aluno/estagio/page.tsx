import { EvaluationResult } from "@/modules/internship-management/presentation/EvaluationResult";
import { EvaluationInvite } from "@/modules/internship-management/presentation/EvaluationInvite";
import {
  evaluationDate,
  type EvaluationContext,
  type EvaluationRatings,
} from "@/modules/internship-management/domain/evaluation";
import { AttendancePoint } from "@/modules/internship-management/presentation/AttendancePoint";
import { InternshipProgress } from "@/modules/internship-management/presentation/InternshipProgress";
import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMinutes } from "@/modules/internship-management/domain/workload";
import { reportInternshipEarlyExitAction } from "@/modules/internship-management/presentation/cadetActions";

export const metadata = { title: "Meu Estágio Supervisionado" };
export const dynamic = "force-dynamic";

const feedback: Record<string, string> = {
  presenca_confirmada: "Sua confirmação de presença foi registrada.",
  saida_registrada: "Seu relato de saída foi enviado à Coordenação. Ele não altera automaticamente as horas homologadas.",
  relato_invalido: "Revise os dados informados.",
  falha_relato: "Não foi possível registrar. Confira se o plantão ainda está publicado.",
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function MyInternshipPage({
  searchParams,
}: {
  searchParams?: { resultado?: string };
}) {
  const session = await requireRole("aluno");
  if (!session.studentId) {
    return <p>Conta sem vínculo de cadete. Procure a Coordenação.</p>;
  }
  const supabase = createSupabaseServerClient();
  const [scheduleResult, workloadResult, programResult, pointResult, reportResult] = await Promise.all([
    supabase.rpc("internship_my_shifts"),
    supabase.rpc("internship_my_workload"),
    supabase.from("internship_programs")
      .select("starts_on, ends_on")
      .eq("course_phase", "CFO I")
      .eq("status", "publicado")
      .maybeSingle(),
    supabase.from("internship_attendance_points").select("*").eq("student_id", session.studentId),
    supabase.from("internship_cadet_reports")
      .select("assignment_id, report_type, reason, reported_exit_at")
      .eq("student_id", session.studentId)
      .eq("report_type", "saida_antecipada"),
  ]);
  if (scheduleResult.error || workloadResult.error || programResult.error || pointResult.error || reportResult.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estágio ainda não disponível</CardTitle>
          <CardDescription>Aguarde a configuração do programa pela Coordenação.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const [evaluationResult, invitationResult] = await Promise.all([
    supabase.rpc("internship_my_evaluations"),
    supabase.rpc("internship_my_evaluation_invites"),
  ]);
  const invitations = (invitationResult.data ?? []) as {
    assignment_id: string;
    id: string;
    status: string;
    recipient_name: string;
    recipient_contact: string;
    expires_at: string | null;
  }[];
  const evaluations = (evaluationResult.data ?? []) as {
    id: string;
    context: EvaluationContext;
    ratings: EvaluationRatings;
    details?: unknown;
    guidance: string | null;
    reviewed_at: string;
  }[];
  const workload = workloadResult.data?.[0];
  const message = searchParams?.resultado ? feedback[searchParams.resultado] : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          CFO 2026.1
        </p>
        <h1 className="font-display text-3xl font-bold">Meu Estágio</h1>
        <p className="text-sm text-muted-foreground">
          Registre entrada e saída com GPS e informe o oficial responsável pelo serviço. A Coordenação
          da ABM confere a ficha e homologa a carga, inclusive quando houver saída antecipada autorizada.
        </p>
      </header>
      <Link
        href="/aluno/estagio/ocorrencias"
        className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm hover:bg-secondary"
      >
        <NotebookPen className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <span>
          <span className="block font-semibold">Diário de ocorrências</span>
          <span className="text-muted-foreground">
            Conte o que você viveu nos plantões e veja o mural da turma. Extraoficial, sem nota.
          </span>
        </span>
      </Link>
      {message ? (
        <p role="status" className="rounded-lg border bg-muted p-3 text-sm">
          {message}
        </p>
      ) : null}
      {!workload || !programResult.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Programa ainda não publicado</CardTitle>
            <CardDescription>
              Sua escala e carga aparecerão após a publicação pela Coordenação.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <InternshipProgress
          startsOn={programResult.data.starts_on}
          endsOn={programResult.data.ends_on}
          validatedMinutes={Number(workload.validated_minutes)}
          requiredMinutes={workload.required_minutes}
          plannedMinutes={Number(workload.planned_minutes)}
          shiftEnds={(scheduleResult.data ?? []).map((shift) => shift.ends_at)}
          now={new Date()}
          title="Meu progresso"
        />
      )}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Meus plantões</h2>
        {(scheduleResult.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum plantão publicado para você.</p>
        ) : (
          (scheduleResult.data ?? []).map((shift) => {
            const assignmentPoints = (pointResult.data ?? []).filter(
              (point) => point.assignment_id === shift.assignment_id,
            );
            const hasEntry = assignmentPoints.some((point) => point.point_type === "entrada");
            const hasExit = assignmentPoints.some((point) => point.point_type === "saida");
            const invitation = invitations.find((item) => item.assignment_id === shift.assignment_id);
            const now = Date.now();
            const started = Date.parse(shift.starts_at) <= now;
            const inInvitationWindow = started && now <= Date.parse(shift.ends_at) + 7 * 24 * 60 * 60 * 1000;
            const invitationClosed = invitation?.status === "respondida" || invitation?.status === "liberada";
            const recordedSupervisor = (pointResult.data ?? []).find(
              (point) => point.assignment_id === shift.assignment_id && point.supervisor_name,
            )?.supervisor_name;
            return (
              <Card key={shift.assignment_id}>
              <CardHeader>
                <CardTitle>
                  {shift.activity_name} · {shift.site_name}
                </CardTitle>
                <CardDescription>
                  {dateTime(shift.starts_at)} a {dateTime(shift.ends_at)} · {shift.resource_name} ·{" "}
                  {formatMinutes(shift.planned_minutes)} previstos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p>Oficial responsável previsto: {shift.supervisor_name ?? "A confirmar"}</p>
                {started ? (
                  <Link
                    href={`/aluno/estagio/ocorrencias/nova?plantao=${shift.assignment_id}`}
                    className="inline-flex text-primary underline"
                  >
                    Registrar ocorrência no diário
                  </Link>
                ) : null}
                <details
                  open={hasEntry && inInvitationWindow && !invitationClosed}
                  className={`rounded-lg border p-3 ${hasEntry && inInvitationWindow && !invitationClosed ? "border-primary bg-primary/5" : ""}`}
                >
                  <summary className="cursor-pointer font-semibold">
                    Avaliação do oficial · enviar link
                  </summary>
                  <div className="mt-3 space-y-3">
                    {hasEntry && inInvitationWindow && !invitationClosed && (
                      <p className="font-semibold text-primary">
                        Oficial avaliador: informe o oficial e envie o link. Ele responde após metade do plantão.
                      </p>
                    )}
                    {invitation?.status === "aguardando" && (
                      <p className="font-medium">✓ Convite gerado — aguardando avaliação do oficial.</p>
                    )}
                    {invitation?.status === "aguardando" && invitation.expires_at && Date.parse(invitation.expires_at) <= now ? (
                      <p>O convite anterior expirou. Procure a Coordenação se ainda precisar registrar a avaliação.</p>
                    ) : invitation?.status === "aguardando" && (
                      <p>Convite pendente para {invitation.recipient_name}. Se o oficial mudou ou o link foi perdido, gere outro; o anterior será cancelado.</p>
                    )}
                    {invitation?.status === "respondida" && <p>Avaliação recebida. Aguarde a revisão da Coordenação.</p>}
                    {invitation?.status === "liberada" && <p>Avaliação revisada. Ela aparece em “Minhas avaliações” abaixo.</p>}
                    {invitation?.status === "devolvida" && <p>A Coordenação solicitou nova avaliação. Gere e envie outro link ao oficial.</p>}
                    {!started && <p>O link poderá ser gerado a partir do início deste plantão.</p>}
                    {started && !inInvitationWindow && !invitationClosed && <p>O prazo de sete dias após o plantão terminou. Procure a Coordenação para encaminhar a ficha.</p>}
                    {invitationResult.error && <p>Não foi possível consultar o estado do convite. Atualize a página antes de gerar outro.</p>}
                    {inInvitationWindow && !invitationClosed && !invitationResult.error && (
                      <EvaluationInvite
                        mode="cadet"
                        assignmentId={shift.assignment_id}
                        openId={invitation?.status === "aguardando" ? invitation.id : undefined}
                        recipientName={invitation?.recipient_name ?? recordedSupervisor ?? shift.supervisor_name ?? undefined}
                        recipientContact={invitation?.recipient_contact}
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Envie somente ao oficial que acompanhou seu serviço. Ele responde após metade do plantão; a Coordenação confere a resposta antes de liberá-la.
                    </p>
                  </div>
                </details>
                <AttendancePoint
                  assignmentId={shift.assignment_id}
                  supervisor={shift.supervisor_name}
                  endsAt={shift.ends_at}
                  points={assignmentPoints}
                  earlyExitReason={reportResult.data?.find((report) => report.assignment_id === shift.assignment_id)?.reason}
                  available={
                    belemDay(new Date().toISOString()) >= belemDay(shift.starts_at) &&
                    belemDay(new Date().toISOString()) <= belemDay(shift.ends_at)
                  }
                />
                {started && !hasExit && <details className="rounded-lg border p-3">
                  <summary className="cursor-pointer font-medium">Não consegui registrar a saída com GPS</summary>
                  <p className="mt-2 text-sm text-muted-foreground">Se o GPS ou a conexão falhou, informe o horário real e o motivo à Coordenação. Esse relato não registra ponto nem homologa horas automaticamente.</p>
                <form action={reportInternshipEarlyExitAction} className="mt-3 space-y-2">
                  <input type="hidden" name="assignmentId" value={shift.assignment_id} />
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="datetime-local"
                      name="exitAt"
                      required
                      aria-label="Data e horário da saída"
                      className="h-11 rounded-md border border-input bg-background px-3"
                    />
                    <input
                      name="reason"
                      required
                      minLength={5}
                      maxLength={500}
                      placeholder="Ex.: instrução na ABM por orientação da Coordenação"
                      aria-label="Motivo da saída"
                      className="h-11 min-w-56 flex-1 rounded-md border border-input bg-background px-3"
                    />
                    <Button type="submit" variant="outline">
                      Enviar relato para conferência
                    </Button>
                  </div>
                </form>
                </details>}
              </CardContent>
              </Card>
            );
          })
        )}
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Minhas avaliações</h2>
        {evaluationResult.error ? (
          <p>Não foi possível carregar suas avaliações.</p>
        ) : evaluations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            As avaliações aparecerão após a conferência da administração do estágio.
          </p>
        ) : (
          evaluations.map((e) => (
            <details key={e.id} className="rounded-lg border bg-card p-4 text-sm">
              <summary className="cursor-pointer font-semibold">
                {e.context.activity_name} · {e.context.site_name} ·{" "}
                {evaluationDate(e.context.starts_at)}
              </summary>
              <div className="mt-3">
                <EvaluationResult ratings={e.ratings} guidance={e.guidance} details={e.details} activityName={e.context.activity_name} />
              </div>
            </details>
          ))
        )}
      </section>
    </div>
  );
}

function belemDay(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Belem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
