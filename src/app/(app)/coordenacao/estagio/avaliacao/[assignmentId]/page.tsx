import { notFound } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireInternshipManager } from "@/modules/internship-management/presentation/access";
import { EvaluationInvite } from "@/modules/internship-management/presentation/EvaluationInvite";
import { EvaluationForm } from "@/modules/internship-management/presentation/EvaluationForm";
import { EvaluationReview } from "@/modules/internship-management/presentation/EvaluationReview";
import { EvaluationResult } from "@/modules/internship-management/presentation/EvaluationResult";
import {
  evaluationDate,
  evaluationStatus,
  type EvaluationContext,
  type EvaluationRatings,
} from "@/modules/internship-management/domain/evaluation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Ficha de avaliação do estágio" };
export default async function ManageEvaluation({ params }: { params: { assignmentId: string } }) {
  await requireInternshipManager();
  if (!z.string().uuid().safeParse(params.assignmentId).success) notFound();
  const db = createSupabaseServerClient();
  const [contextResult, rows] = await Promise.all([
    db.rpc("internship_evaluation_assignment", { p_assignment_id: params.assignmentId }),
    db
      .from("internship_evaluations")
      .select("*")
      .eq("assignment_id", params.assignmentId)
      .order("version", { ascending: false }),
  ]);
  if (contextResult.error || rows.error)
    return <p role="alert">Não foi possível carregar a ficha. Tente novamente.</p>;
  const c = (contextResult.data ?? rows.data?.[0]?.context) as EvaluationContext | null;
  if (!c) notFound();
  const available = Boolean(contextResult.data);
  const open = rows.data?.find((e) => e.status === "aguardando");
  const latest = rows.data?.[0];
  const pendingReview = rows.data?.find((e) => e.status === "respondida");
  const recipient = rows.data?.find((e) => e.source === "digital");
  const studentId = latest?.student_id;
  const back = studentId
    ? `/coordenacao/estagio?cadete=${studentId}#fichas`
    : "/coordenacao/estagio#fichas";
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <a href={back} className="text-sm font-semibold text-primary underline">
        Voltar às fichas e horas
      </a>
      <header>
        <p className="text-sm text-muted-foreground">Estágio supervisionado</p>
        <h1 className="font-display text-3xl font-bold">Ficha de avaliação</h1>
        <p>
          {String(c.student_number).padStart(2, "0")} · {c.war_name} · {c.course_phase}
        </p>
        <p>
          {c.activity_name} · {c.site_name}
        </p>
        <p className="text-sm">
          {evaluationDate(c.starts_at)} a {evaluationDate(c.ends_at)}
        </p>
      </header>
      <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
        <p className="font-semibold">1. Confira a avaliação do oficial. 2. Volte à ficha do plantão para homologar as horas.</p>
        <p>A liberação da avaliação e a homologação das horas são duas confirmações separadas.</p>
        {pendingReview && (
          <a href="#avaliacao-recebida" className="font-semibold text-primary underline">Avaliação recebida: conferir agora</a>
        )}
        {!pendingReview && latest?.status === "liberada" && (
          <a href={back} className="font-semibold text-primary underline">Avaliação liberada: ir para a ficha e homologar horas</a>
        )}
      </div>
      {available ? (
        <>
          <a
            href={`/api/estagio/avaliacao/${params.assignmentId}/imprimir`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center rounded-md border px-4 font-semibold"
          >
            Imprimir ficha / salvar PDF
          </a>
        </>
      ) : (
        <p>
          Esta participação foi encerrada ou substituída. O histórico abaixo permanece disponível.
        </p>
      )}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Avaliações e conferência</h2>
        {!rows.data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum convite ou avaliação registrado.</p>
        ) : (
          rows.data.map((e) => (
            <article key={e.id} id={e.id === pendingReview?.id ? "avaliacao-recebida" : undefined} className="scroll-mt-24 space-y-3 rounded-lg border bg-card p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-semibold">
                  Versão {e.version} · {evaluationStatus[e.status]}
                </h3>
                <span>{e.source === "papel" ? "Ficha em papel" : "Convite digital"}</span>
              </div>
              <p>
                {e.evaluator_name ?? e.recipient_name}
                {e.evaluator_unit ? ` · ${e.evaluator_unit}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Criada em {evaluationDate(e.created_at)}
                {e.submitted_at ? ` · Respondida em ${evaluationDate(e.submitted_at)}` : ""}
                {e.status === "aguardando" && e.expires_at
                  ? ` · ${Date.parse(e.expires_at) < Date.now() ? "Expirou" : "Válida até"} ${evaluationDate(e.expires_at)}`
                  : ""}
              </p>
              {e.source === "digital" && e.submitted_at && (
                <p className="rounded-md border bg-muted p-3 text-xs">
                  Protocolo para conferir no WhatsApp: <strong>AV-{e.id.toUpperCase()}</strong>
                  {e.whatsapp_targets.length > 0 && (
                    <> · Destino{e.whatsapp_targets.length > 1 ? "s" : ""}: {e.whatsapp_targets.map((phone) => `+${phone}`).join(" e ")}</>
                  )}
                  {e.whatsapp_sender_phone && (
                    <> · Remetente conferido: +{e.whatsapp_sender_phone}</>
                  )}
                </p>
              )}
              {e.ratings && (
                <>
                  <EvaluationResult
                    ratings={e.ratings as EvaluationRatings}
                    guidance={e.guidance}
                    details={e.details}
                    activityName={c.activity_name}
                  />
                  {(e.incident || (e.ratings as EvaluationRatings).seguranca === "reforco" ||
                    (e.ratings as EvaluationRatings).postura === "reforco" ||
                    (e.details && typeof e.details === "object" && "technicalRatings" in e.details &&
                      e.details.technicalRatings && typeof e.details.technicalRatings === "object" &&
                      ("usb_abordagem" in e.details.technicalRatings && e.details.technicalRatings.usb_abordagem === "reforco" ||
                        "ar_preparo" in e.details.technicalRatings && e.details.technicalRatings.ar_preparo === "reforco" ||
                        "praia_prevencao" in e.details.technicalRatings && e.details.technicalRatings.praia_prevencao === "reforco"))) &&
                    !(e.details && typeof e.details === "object" &&
                      "coordinationNotified" in e.details && e.details.coordinationNotified === true) && (
                      <p role="alert" className="rounded-md border border-amber-500 p-3 text-sm">
                        Confira a comunicação imediata à Coordenação sobre segurança ou conduta.
                      </p>
                    )}
                  {e.incident && (
                    <div role="status" className="rounded-md border border-amber-500 p-3">
                      <strong>Situação relevante relatada</strong>
                      <p className="whitespace-pre-wrap">{e.incident_note}</p>
                    </div>
                  )}
                  <a
                    href={`/api/estagio/avaliacao/${params.assignmentId}/imprimir?avaliacao=${e.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary underline"
                  >
                    Imprimir resposta / salvar PDF
                  </a>
                  {e.status === "respondida" && (
                    <EvaluationReview
                      id={e.id}
                      assignmentId={params.assignmentId}
                      needsWhatsApp={e.source === "digital" && e.whatsapp_targets.length > 0}
                      recipientContact={e.recipient_contact}
                    />
                  )}
                  {e.reviewed_at && (
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      Revisada em {evaluationDate(e.reviewed_at)}. {e.review_note}
                    </p>
                  )}
                  {e.status === "devolvida" && (
                    <p>Gere um novo convite e encaminhe a solicitação de correção ao oficial.</p>
                  )}
                </>
              )}
            </article>
          ))
        )}
      </section>
      {available && (
        <section className="space-y-4">
          <details className="rounded-lg border p-4" open={!latest || latest.status === "aguardando"}>
            <summary className="cursor-pointer font-semibold">Enviar nova avaliação ao oficial</summary>
            <div className="mt-4">
              {pendingReview && (
                <p className="mb-3 text-sm text-amber-800">Já existe uma resposta aguardando conferência. Envie outro convite apenas se precisar substituí-la.</p>
              )}
              <EvaluationInvite
                assignmentId={params.assignmentId}
                openId={open?.id}
                recipientName={recipient?.recipient_name}
                recipientContact={recipient?.recipient_contact}
              />
            </div>
          </details>
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer font-semibold">Recebi a ficha em papel — lançar avaliação</summary>
            <div className="mt-4">
              <EvaluationForm
                mode="papel"
                assignmentId={params.assignmentId}
                activityName={c.activity_name}
                disabled={Date.parse(c.ends_at) > Date.now()}
              />
              {Date.parse(c.ends_at) > Date.now() && (
                <p className="mt-2 text-sm">Aguarde o término do plantão para registrar.</p>
              )}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
