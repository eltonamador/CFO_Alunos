"use client";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  evaluationActivities,
  evaluationAnswers,
  evaluationCriteria,
  evaluationServiceCode,
  evaluationTechnicalCriteria,
  evaluationTechnicalTitle,
} from "../domain/evaluation";
import { saveEvaluation } from "./evaluationActions";
import {
  EvaluationWhatsAppDelivery,
  type EvaluationWhatsAppDeliveryData,
} from "./EvaluationWhatsAppDelivery";
const field = "w-full rounded-md border border-input bg-background p-3 text-base";
export function EvaluationForm({
  mode,
  token,
  assignmentId,
  recipientName,
  activityName = "",
  disabled = false,
  demoSave,
}: {
  mode: "digital" | "papel";
  token?: string;
  assignmentId?: string;
  recipientName?: string;
  activityName?: string;
  disabled?: boolean;
  demoSave?: (form: FormData) => Promise<{ error?: string; success?: boolean }>;
}) {
  const formId = useId();
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [technicalRatings, setTechnicalRatings] = useState<Record<string, string>>({});
  const [evaluatorFunction, setEvaluatorFunction] = useState(mode === "papel" ? "nao_informado" : "");
  const [feedbackGiven, setFeedbackGiven] = useState(mode === "papel" ? "nao_informado" : "");
  const [incident, setIncident] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [delivery, setDelivery] = useState<EvaluationWhatsAppDeliveryData | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const reinforcement = [...Object.values(ratings), ...Object.values(technicalRatings)].includes("reforco");
  const serviceCode = evaluationServiceCode(activityName);
  const technicalCriteria = evaluationTechnicalCriteria[serviceCode];
  const critical = incident || ratings.seguranca === "reforco" || ratings.postura === "reforco"
    || technicalRatings.usb_abordagem === "reforco" || technicalRatings.ar_preparo === "reforco"
    || technicalRatings.praia_prevencao === "reforco";
  if (done)
    return (
      <div className="space-y-3">
        <p role="status" className="rounded-lg border bg-muted p-4">
          Avaliação recebida. A administração do estágio fará a conferência. Obrigado pelo
          acompanhamento do cadete.
        </p>
        {mode === "digital" && <EvaluationWhatsAppDelivery delivery={delivery} />}
      </div>
    );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        start(async () => {
          try {
            const result = demoSave ? await demoSave(data) : await saveEvaluation(data, mode);
            if (result.error) setMessage(result.error);
            else {
              if ("delivery" in result) {
                setDelivery((result.delivery as EvaluationWhatsAppDeliveryData | null) ?? null);
              }
              setDone(true);
              if (!demoSave) router.refresh();
            }
          } catch {
            setMessage(
              "Falha na conexão. Tente novamente; se já enviou, atualize a página para conferir.",
            );
          }
        });
      }}
      className="space-y-4"
    >
      <input type="hidden" name="token" value={token ?? ""} />
      <input type="hidden" name="assignmentId" value={assignmentId ?? ""} />
      <input type="hidden" name="serviceCode" value={serviceCode} />
      <fieldset disabled={disabled || pending} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span>Oficial avaliador — posto e nome</span>
            <input
              name="evaluatorName"
              required
              minLength={3}
              maxLength={120}
              defaultValue={recipientName ?? ""}
              className={field}
            />
          </label>
          <label className="space-y-1">
            <span>Unidade do avaliador</span>
            <input
              name="evaluatorUnit"
              defaultValue={demoSave ? "GBM fictício" : ""}
              required
              minLength={2}
              maxLength={120}
              className={field}
              placeholder="Ex.: 1º GBM"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span>Função do avaliador na guarnição</span>
            <select
              name="evaluatorFunction"
              required
              value={evaluatorFunction}
              onChange={(event) => setEvaluatorFunction(event.target.value)}
              className={field}
            >
              <option value="">Selecione</option>
              <option value="comandante">Comandante da guarnição</option>
              <option value="chefe">Chefe da equipe</option>
              <option value="outro">Outra função</option>
              {mode === "papel" && <option value="nao_informado">Não consta na ficha</option>}
            </select>
          </label>
          {evaluatorFunction === "outro" && (
            <label className="space-y-1">
              <span>Qual função?</span>
              <input name="evaluatorFunctionOther" required minLength={3} maxLength={80} className={field} />
            </label>
          )}
          {(serviceCode === "usb" || serviceCode === "ar") && (
            <label className="space-y-1">
              <span>Prefixo da viatura (se conhecido)</span>
              <input name="vehiclePrefix" maxLength={30} className={field} />
            </label>
          )}
        </div>
        {mode === "papel" && (
          <label className="block space-y-1">
            <span>Referência da ficha recebida</span>
            <input name="paperReference" required minLength={3} maxLength={200} className={field} />
          </label>
        )}
        <p className="text-sm text-muted-foreground">
          Avalie apenas o que observou e o que o cadete já foi autorizado a fazer. Chegar no
          horário atende ao esperado. Use “Não observado” quando faltar oportunidade de avaliar.
        </p>
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer font-semibold">Atividades acompanhadas</summary>
          <div className="mt-3 space-y-3">
            <label className="block space-y-1">
              <span>Ocorrências acompanhadas</span>
              <input name="occurrenceCount" type="number" min={0} max={99} defaultValue={0} className={field} />
            </label>
            <fieldset>
              <legend className="font-medium">Atividades observadas neste plantão</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {evaluationActivities.map((activity) => (
                  <label key={activity.value} className="flex items-center gap-2">
                    <input type="checkbox" name="activity" value={activity.value} className="h-4 w-4" />
                    {activity.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-xs text-muted-foreground">
              Não inclua nome, documento, endereço nem informação clínica de vítima ou paciente.
            </p>
          </div>
        </details>
        {demoSave && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setRatings(Object.fromEntries(evaluationCriteria.map((c) => [c.key, "esperado"])));
              setTechnicalRatings(Object.fromEntries(technicalCriteria.map((c) => [c.key, "esperado"])));
              setEvaluatorFunction("comandante");
              setFeedbackGiven("sim");
            }}
          >
            Preencher respostas de exemplo
          </Button>
        )}
        <div className="divide-y rounded-lg border px-4">
          {evaluationCriteria.map((criterion, index) => (
            <div
              key={criterion.key}
              className="grid gap-2 py-4 sm:grid-cols-[1fr_220px] sm:items-center"
            >
              <div>
                <label htmlFor={`${formId}-rating-${criterion.key}`} className="font-semibold">
                  {index + 1}. {criterion.title}
                </label>
                <p id={`${formId}-description-${criterion.key}`} className="text-sm text-muted-foreground">
                  {criterion.description}
                </p>
              </div>
              <select
                id={`${formId}-rating-${criterion.key}`}
                aria-describedby={`${formId}-description-${criterion.key}`}
                name={criterion.key}
                required
                value={ratings[criterion.key] ?? ""}
                onChange={(e) => setRatings({ ...ratings, [criterion.key]: e.target.value })}
                className={field}
              >
                <option value="">Selecione</option>
                {evaluationAnswers.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {technicalCriteria.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-semibold">
              Desempenho técnico em {evaluationTechnicalTitle[serviceCode]}
            </h2>
            <p className="text-sm text-muted-foreground">
              Responda conforme as atividades efetivamente observadas neste tipo de serviço.
            </p>
            <div className="divide-y rounded-lg border px-4">
              {technicalCriteria.map((criterion) => (
                <div key={criterion.key} className="grid gap-2 py-4 sm:grid-cols-[1fr_220px] sm:items-center">
                  <div>
                    <label htmlFor={`${formId}-rating-${criterion.key}`} className="font-semibold">
                      {criterion.title}
                    </label>
                    <p id={`${formId}-description-${criterion.key}`} className="text-sm text-muted-foreground">
                      {criterion.description}
                    </p>
                  </div>
                  <select
                    id={`${formId}-rating-${criterion.key}`}
                    aria-describedby={`${formId}-description-${criterion.key}`}
                    name={criterion.key}
                    required
                    value={technicalRatings[criterion.key] ?? ""}
                    onChange={(event) => setTechnicalRatings({ ...technicalRatings, [criterion.key]: event.target.value })}
                    className={field}
                  >
                    <option value="">Selecione</option>
                    {evaluationAnswers.map((answer) => (
                      <option key={answer.value} value={answer.value}>{answer.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
        )}
        <label className="block space-y-1">
          <span>Ponto positivo observado (opcional)</span>
          <textarea name="positiveNote" maxLength={1000} rows={2} className={field} />
        </label>
        <label className="block space-y-1">
          <span>
            Pontos a desenvolver e orientação para o próximo plantão{reinforcement ? " — obrigatório" : " — opcional"}
          </span>
          <textarea
            name="guidance"
            required={reinforcement}
            minLength={reinforcement ? 5 : undefined}
            maxLength={1000}
            rows={3}
            className={field}
            placeholder="Se houver necessidade de reforço, descreva o fato observado e o que deve melhorar."
          />
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="incident"
            checked={incident}
            onChange={(e) => setIncident(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          Houve situação relevante de segurança ou conduta.
        </label>
        {incident && (
          <label className="block space-y-1">
            <span>Fato observado e providência adotada</span>
            <textarea
              name="incidentNote"
              required
              minLength={5}
              maxLength={1000}
              rows={3}
              className={field}
            />
            <span className="block text-sm text-muted-foreground">
              Situações urgentes devem ser comunicadas imediatamente à Coordenação pelos canais de
              serviço.
            </span>
          </label>
        )}
        {critical && (
          <div className="space-y-2 rounded-md border border-amber-500 p-3 text-sm">
            <p>
              Situação de segurança, conduta ou limite de atuação: comunique a Coordenação
              imediatamente pelos canais de serviço, mesmo antes da revisão desta ficha.
            </p>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="coordinationNotified" className="mt-1 h-4 w-4" />
              A Coordenação já foi comunicada.
            </label>
          </div>
        )}
        <label className="block space-y-1">
          <span>O cadete recebeu devolutiva sobre seu desempenho?</span>
          <select
            name="feedbackGiven"
            required
            value={feedbackGiven}
            onChange={(event) => setFeedbackGiven(event.target.value)}
            className={field}
          >
            <option value="">Selecione</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
            {mode === "papel" && <option value="nao_informado">Não consta na ficha</option>}
          </select>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="confirmed" required className="mt-1 h-4 w-4" />
          {mode === "digital"
            ? "Confirmo que acompanhei o cadete e avaliei somente o que pude observar."
            : "Confirmo que transcrevi as respostas da ficha recebida, preservando o conteúdo do avaliador."}
        </label>
        <Button type="submit" disabled={pending || disabled}>
          {pending
            ? "Enviando…"
            : mode === "digital"
              ? "Enviar avaliação"
              : "Registrar ficha em papel"}
        </Button>
      </fieldset>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </form>
  );
}
