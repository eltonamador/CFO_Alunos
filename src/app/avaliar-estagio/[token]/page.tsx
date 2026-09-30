import type { Metadata } from "next";
import { evaluationPublicClient } from "@/modules/internship-management/infrastructure/evaluationClient";
import { EvaluationAvailability } from "@/modules/internship-management/presentation/EvaluationAvailability";
import {
  EvaluationWhatsAppDelivery,
  type EvaluationWhatsAppDeliveryData,
} from "@/modules/internship-management/presentation/EvaluationWhatsAppDelivery";
import {
  evaluationDate,
  type EvaluationContext,
} from "@/modules/internship-management/domain/evaluation";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Avaliação do estágio",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function EvaluationPage({ params }: { params: { token: string } }) {
  const valid = /^[a-f0-9]{64}$/.test(params.token);
  const result = valid
    ? await evaluationPublicClient().rpc("internship_read_evaluation_invite", {
        p_token: params.token,
      })
    : { data: null, error: null };
  const invite = result.data as {
    status: string;
    context: EvaluationContext;
    recipient_name: string;
    can_submit: boolean;
    available_at: string;
    expires_at: string;
  } | null;
  const deliveryResult = valid && (!invite || invite.status !== "aguardando")
    ? await evaluationPublicClient().rpc("internship_evaluation_whatsapp_delivery", {
        p_token: params.token,
      })
    : null;
  const delivery = deliveryResult?.error
    ? null
    : deliveryResult?.data as EvaluationWhatsAppDeliveryData | null;
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          CFO Alunos · CBMAP
        </p>
        <h1 className="font-display text-3xl font-bold">Avaliação do cadete</h1>
      </header>
      {result.error ? (
        <p role="alert">Não foi possível carregar a ficha. Tente novamente em instantes.</p>
      ) : !invite && delivery ? (
        <EvaluationWhatsAppDelivery delivery={delivery} />
      ) : !invite ? (
        <p>
          Este link está indisponível, expirou ou o plantão foi alterado. Solicite um novo convite à
          administração do estágio.
        </p>
      ) : invite.status !== "aguardando" ? (
        <div className="space-y-3">
          <p role="status" className="rounded-lg border bg-card p-5">
            Avaliação já recebida. A administração do estágio fará a conferência. Para corrigir uma
            resposta, solicite um novo convite.
          </p>
          {delivery && <EvaluationWhatsAppDelivery delivery={delivery} />}
        </div>
      ) : (
        <>
          <section className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold">
              {String(invite.context.student_number).padStart(2, "0")} · {invite.context.war_name}
            </h2>
            <p>
              {invite.context.course_phase} · {invite.context.activity_name} ·{" "}
              {invite.context.site_name}
            </p>
            <p className="text-sm">
              {evaluationDate(invite.context.starts_at)} a {evaluationDate(invite.context.ends_at)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Convite destinado a {invite.recipient_name}. Se você não é o avaliador indicado,
              procure a administração.
            </p>
          </section>
          <EvaluationAvailability
            availableAt={invite.available_at}
            canSubmit={invite.can_submit}
            token={params.token}
            recipientName={invite.recipient_name}
            activityName={invite.context.activity_name}
          />
          <p className="text-xs text-muted-foreground">
            Validade do convite: {evaluationDate(invite.expires_at)}. Registre apenas fatos
            profissionais pertinentes ao estágio, sem identificar vítimas ou incluir dados clínicos.
          </p>
        </>
      )}
    </main>
  );
}
