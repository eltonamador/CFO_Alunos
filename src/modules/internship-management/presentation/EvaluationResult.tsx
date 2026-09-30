import {
  evaluationAnswers,
  evaluationActivities,
  evaluationCriteria,
  evaluationServiceCode,
  evaluationTechnicalCriteria,
  evaluationTechnicalTitle,
  type EvaluationRatings,
} from "../domain/evaluation";
import { evaluationDetailsSchema } from "../domain/evaluationValidation";
export function EvaluationResult({
  ratings,
  guidance,
  details,
  activityName = "",
}: {
  ratings: EvaluationRatings;
  guidance: string | null;
  details?: unknown;
  activityName?: string;
}) {
  const parsed = evaluationDetailsSchema.safeParse(details);
  const data = parsed.success ? parsed.data : null;
  const serviceCode = evaluationServiceCode(activityName);
  const technicalCriteria = evaluationTechnicalCriteria[serviceCode].filter(
    (criterion) => data && criterion.key in data.technicalRatings,
  );
  return (
    <div className="space-y-3">
      <dl className="divide-y">
        {evaluationCriteria.map((c) => (
          <div key={c.key} className="flex flex-wrap justify-between gap-2 py-2">
            <dt>{c.title}</dt>
            <dd className="font-medium">
              {evaluationAnswers.find((a) => a.value === ratings[c.key])?.label ?? "—"}
            </dd>
          </div>
        ))}
      </dl>
      {data && technicalCriteria.length > 0 && (
        <div className="rounded-md border p-3">
          <p className="font-semibold">Desempenho técnico em {evaluationTechnicalTitle[serviceCode]}</p>
          <dl className="divide-y">
            {technicalCriteria.map((criterion) => (
              <div key={criterion.key} className="flex flex-wrap justify-between gap-2 py-2">
                <dt>{criterion.title}</dt>
                <dd className="font-medium">
                  {evaluationAnswers.find((answer) => answer.value === data.technicalRatings[criterion.key])?.label ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {data && (
        <div className="space-y-1 text-sm">
          <p><strong>Ocorrências acompanhadas:</strong> {data.occurrenceCount}</p>
          <p><strong>Atividades observadas:</strong> {data.activities.map((value) => evaluationActivities.find((activity) => activity.value === value)?.label ?? value).join(", ") || "Não informadas"}</p>
          {data.vehiclePrefix && <p><strong>Prefixo da viatura:</strong> {data.vehiclePrefix}</p>}
          <p><strong>Função do avaliador:</strong> {data.evaluatorFunction === "comandante" ? "Comandante da guarnição" : data.evaluatorFunction === "chefe" ? "Chefe da equipe" : data.evaluatorFunction === "outro" ? data.evaluatorFunctionOther : "Não informada"}</p>
          <p><strong>Devolutiva ao cadete:</strong> {data.feedbackGiven === "sim" ? "Sim" : data.feedbackGiven === "nao" ? "Não" : "Não informado"}</p>
          {data.positiveNote && <p className="whitespace-pre-wrap"><strong>Ponto positivo:</strong> {data.positiveNote}</p>}
          {data.coordinationNotified && <p>Coordenação comunicada pelo avaliador.</p>}
        </div>
      )}
      {guidance && (
        <p className="whitespace-pre-wrap rounded-md bg-muted p-3">
          <strong>Orientação: </strong>
          {guidance}
        </p>
      )}
    </div>
  );
}
