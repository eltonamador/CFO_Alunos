import {
  evaluationActivities,
  evaluationAnswers,
  evaluationCriteria,
  evaluationDate,
  evaluationServiceCode,
  evaluationTechnicalCriteria,
  evaluationTechnicalTitle,
  type EvaluationContext,
  type EvaluationRatings,
} from "@/modules/internship-management/domain/evaluation";
import { evaluationDetailsSchema } from "@/modules/internship-management/domain/evaluationValidation";

const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );

export function evaluationPrintHtml(
  context: EvaluationContext,
  response?: {
    id: string;
    evaluator_name: string | null;
    evaluator_unit: string | null;
    ratings: EvaluationRatings;
    details?: unknown;
    guidance: string | null;
    incident: boolean | null;
    incident_note: string | null;
    submitted_at: string | null;
    whatsapp_targets?: string[];
    whatsapp_sender_phone?: string | null;
    whatsapp_verified_at?: string | null;
  },
) {
  const serviceCode = evaluationServiceCode(context.activity_name);
  const detailsResult = evaluationDetailsSchema.safeParse(response?.details);
  const details = detailsResult.success ? detailsResult.data : null;
  const technicalCriteria = !response || (details && evaluationTechnicalCriteria[serviceCode].every(
    (criterion) => criterion.key in details.technicalRatings,
  )) ? evaluationTechnicalCriteria[serviceCode] : [];
  const rating = (key: string) =>
    key in (response?.ratings ?? {})
      ? response?.ratings[key as keyof EvaluationRatings]
      : details?.technicalRatings[key];
  const matrix = (criteria: readonly { key: string; title: string; description: string }[]) =>
    `<table><thead><tr><th>Critério e indicador observável</th><th>R</th><th>E</th><th>A</th><th>N</th></tr></thead><tbody>${criteria.map((criterion) =>
      `<tr><td><strong>${escape(criterion.title)}</strong><small>${escape(criterion.description)}</small></td>${evaluationAnswers.map((answer) =>
        `<td>${rating(criterion.key) === answer.value ? "●" : "○"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const activityLabels = details?.activities.map((value) =>
    evaluationActivities.find((activity) => activity.value === value)?.label ?? value,
  ) ?? [];
  const functionLabel = details?.evaluatorFunction === "comandante" ? "Comandante da guarnição"
    : details?.evaluatorFunction === "chefe" ? "Chefe da equipe"
      : details?.evaluatorFunction === "outro" ? details.evaluatorFunctionOther
        : details ? "Não informado" : "____________________________";
  const printResponse = Boolean(response);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Ficha de avaliação — ${escape(context.war_name)}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1f2937;max-width:185mm;margin:18px auto;font-size:11px;line-height:1.38}header{display:grid;grid-template-columns:55px 1fr 55px;align-items:center;gap:10px;border-bottom:2px solid #173b5f;padding-bottom:8px;text-align:center}header img{width:49px;height:49px;object-fit:contain}header strong{display:block}h1{font-size:18px;margin:12px 0 3px;text-align:center;color:#111}h2{font-size:12px;background:#173b5f;color:white;padding:6px 8px;margin:13px 0 6px}p{margin:5px 0}.summary{display:grid;grid-template-columns:1fr 1fr;gap:5px 18px}.hint{font-size:10px;color:#4b5563}small{display:block;font-size:9px;font-weight:normal;color:#555;margin-top:3px}table{width:100%;border-collapse:collapse;margin:6px 0 10px}td,th{border:1px solid #cbd5e1;padding:6px;vertical-align:middle}th{background:#e8eef4;text-align:left}th:not(:first-child),td:not(:first-child){text-align:center;width:7%}.writing{white-space:pre-wrap;overflow-wrap:anywhere;min-height:25px;border-bottom:1px solid #9ca3af;padding:4px 0}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:24px;text-align:center}.signatures div{border-top:1px solid #6b7280;padding-top:4px}.button{padding:9px;margin-bottom:12px}footer{margin-top:14px;font-size:9px;color:#555}@media print{.button{display:none}body{margin:0}tr,h2,.signatures{break-inside:avoid}}@media screen and (max-width:650px){body{margin:12px}.summary{grid-template-columns:1fr}}
  </style></head><body><button type="button" class="button" onclick="window.print()">Imprimir / salvar como PDF</button><header><img src="/brasao-abm.png" alt="ABM"><div><strong>CORPO DE BOMBEIROS MILITAR DO AMAPÁ</strong><strong>ACADEMIA BOMBEIRO MILITAR · ESCOLA DE FORMAÇÃO DE OFICIAIS</strong><strong>CFO 2026 · 1º ANO</strong></div><img src="/brasao-efo.png" alt="EFO"></header><h1>FICHA DE AVALIAÇÃO DO ESTÁGIO SUPERVISIONADO</h1><p style="text-align:center">${escape(context.activity_name)}</p>
  <h2>Identificação do plantão e do avaliador</h2><div class="summary"><p><strong>Cadete:</strong> ${escape(context.student_number)} · ${escape(context.war_name)}</p><p><strong>Fase do CFO:</strong> ${escape(context.course_phase)}</p><p><strong>Local:</strong> ${escape(context.site_name)}</p><p><strong>Jornada:</strong> ${escape(evaluationDate(context.starts_at))} a ${escape(evaluationDate(context.ends_at))}</p><p><strong>Avaliador:</strong> ${escape(response?.evaluator_name) || "____________________________"}</p><p><strong>Unidade:</strong> ${escape(response?.evaluator_unit) || "____________________________"}</p><p><strong>Função:</strong> ${escape(functionLabel)}</p><p><strong>Prefixo:</strong> ${escape(details?.vehiclePrefix) || "____________"}</p></div>
  <h2>Atividades acompanhadas</h2><p><strong>Ocorrências:</strong> ${details ? escape(details.occurrenceCount) : "____"} · <strong>Atividades:</strong> ${activityLabels.length ? activityLabels.map(escape).join(", ") : printResponse ? "Não informadas" : "________________________________________________"}</p><p class="hint">Não registre nome, documento, endereço nem dado clínico que identifique paciente ou vítima.</p>
  <h2>Desempenho comum</h2><p class="hint">R = Necessita de reforço · E = Atende ao esperado · A = Acima do esperado · N = Não observado</p>${matrix(evaluationCriteria)}
  ${technicalCriteria.length ? `<h2>Desempenho técnico em ${evaluationTechnicalTitle[serviceCode]}</h2><p class="hint">Avalie somente atividades observadas e autorizadas para a fase do cadete.</p>${matrix(technicalCriteria)}` : ""}
  <h2>Devolutiva do avaliador</h2><p><strong>Ponto positivo observado:</strong></p><div class="writing">${escape(details?.positiveNote)}</div><p><strong>Pontos a desenvolver e orientação para o próximo plantão:</strong></p><div class="writing">${escape(response?.guidance)}</div><p><strong>Situação relevante de segurança ou conduta:</strong> ${response ? (response.incident ? "Sim" : "Não") : "☐ Não  ☐ Sim"}</p><div class="writing">${escape(response?.incident_note)}</div><p><strong>Devolutiva ao cadete:</strong> ${details ? (details.feedbackGiven === "sim" ? "Sim" : details.feedbackGiven === "nao" ? "Não" : "Não informado") : "☐ Sim  ☐ Não"} · <strong>Coordenação comunicada:</strong> ${details ? (details.coordinationNotified ? "Sim" : "Não informado") : "☐ Sim  ☐ Não"}</p>
  <p class="hint">“Não observado” não é desempenho insuficiente. Quando houver reforço em segurança, conduta ou limites de atuação, descreva o fato e comunique a Coordenação pelos canais de serviço. A avaliação não altera automaticamente a carga horária.</p>
  ${response ? "" : "<div class=\"signatures\"><div>Avaliador · nome e posto/graduação</div><div>Cadete · ciência opcional</div></div>"}
  <footer>${response ? `Protocolo AV-${escape(response.id.toUpperCase())} · Recebida no sistema em ${escape(response.submitted_at ? evaluationDate(response.submitted_at) : "")}${response.whatsapp_targets?.length ? ` · Confirmação pelo WhatsApp: ${response.whatsapp_verified_at && response.whatsapp_sender_phone ? `remetente +${escape(response.whatsapp_sender_phone)} conferido em ${escape(evaluationDate(response.whatsapp_verified_at))}` : "aguardando conferência da Coordenação"}` : ""}` : "Data do preenchimento: ____/____/______ · Encaminhar à Coordenação do CFO."}</footer></body></html>`;
}
