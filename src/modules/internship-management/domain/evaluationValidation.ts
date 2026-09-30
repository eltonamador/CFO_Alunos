import { z } from "zod";
import {
  evaluationActivities,
  evaluationCriteria,
  evaluationTechnicalCriteria,
} from "./evaluation";

const answer = z.enum(["reforco", "esperado", "acima", "nao_observado"]);
const serviceCode = z.enum(["usb", "ar", "guarda_vida", "geral"]);
export const evaluationDetailsSchema = z.object({
  formVersion: z.literal(2),
  evaluatorFunction: z.enum(["comandante", "chefe", "outro", "nao_informado"]),
  evaluatorFunctionOther: z.string().trim().max(80),
  vehiclePrefix: z.string().trim().max(30),
  occurrenceCount: z.number().int().min(0).max(99),
  activities: z.array(z.enum(evaluationActivities.map((item) => item.value) as ["materiais", "cena", "apoio", "comunicacao", "prontificacao"])).max(5),
  technicalRatings: z.record(answer),
  positiveNote: z.string().trim().max(1000),
  feedbackGiven: z.enum(["sim", "nao", "nao_informado"]),
  coordinationNotified: z.boolean(),
}).strict().refine(
  (details) => details.evaluatorFunction !== "outro" || details.evaluatorFunctionOther.length >= 3,
);

export const evaluationBodySchema = z
  .object({
    evaluatorName: z.string().trim().min(3).max(120),
    evaluatorUnit: z.string().trim().min(2).max(120),
    serviceCode: serviceCode.default("geral"),
    ratings: z.object({
      pontualidade: answer,
      seguranca: answer,
      tecnica: answer,
      equipe: answer,
      postura: answer,
      aprendizagem: answer,
    }).strict(),
    details: evaluationDetailsSchema.optional(),
    guidance: z.string().trim().max(1000),
    incident: z.boolean(),
    incidentNote: z.string().trim().max(1000),
    confirmed: z.literal(true),
  })
  .refine((x) => ![
    ...Object.values(x.ratings),
    ...Object.values(x.details?.technicalRatings ?? {}),
  ].includes("reforco") || x.guidance.length >= 5)
  .refine((x) => !x.incident || x.incidentNote.length >= 5)
  .superRefine((x, context) => {
    if (!x.details) return;
    const expected = evaluationTechnicalCriteria[x.serviceCode].map((item) => item.key);
    const actual = Object.keys(x.details.technicalRatings);
    if (actual.length !== expected.length || actual.some((key) => !expected.some((expectedKey) => expectedKey === key))) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["details", "technicalRatings"], message: "Responda apenas aos critérios técnicos deste serviço." });
    }
    if (new Set(x.details.activities).size !== x.details.activities.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["details", "activities"], message: "Atividade repetida." });
    }
  });

export type EvaluationBody = z.infer<typeof evaluationBodySchema>;
export function parseEvaluationForm(form: FormData) {
  const code = serviceCode.safeParse(form.get("serviceCode"));
  const technicalCriteria = code.success ? evaluationTechnicalCriteria[code.data] : [];
  return evaluationBodySchema.safeParse({
    evaluatorName: form.get("evaluatorName"),
    evaluatorUnit: form.get("evaluatorUnit"),
    serviceCode: form.get("serviceCode") ?? "geral",
    ratings: Object.fromEntries(evaluationCriteria.map((c) => [c.key, form.get(c.key)])),
    details: {
      formVersion: 2,
      evaluatorFunction: form.get("evaluatorFunction"),
      evaluatorFunctionOther: form.get("evaluatorFunctionOther") ?? "",
      vehiclePrefix: form.get("vehiclePrefix") ?? "",
      occurrenceCount: Number(form.get("occurrenceCount") ?? 0),
      activities: form.getAll("activity"),
      technicalRatings: Object.fromEntries(
        technicalCriteria.map((criterion) => [criterion.key, form.get(criterion.key)]),
      ),
      positiveNote: form.get("positiveNote") ?? "",
      feedbackGiven: form.get("feedbackGiven"),
      coordinationNotified: form.get("coordinationNotified") === "on",
    },
    guidance: form.get("guidance") ?? "",
    incident: form.get("incident") === "on",
    incidentNote: form.get("incidentNote") ?? "",
    confirmed: form.get("confirmed") === "on",
  });
}
