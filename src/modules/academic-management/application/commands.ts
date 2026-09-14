import { z } from "zod";
import { validatePolicyParameters } from "../domain/academic";

const id = z.string().uuid("Identificador inválido.");
const text = (min: number, max = 500) =>
  z.string().trim().min(min, "Preencha os campos obrigatórios.").max(max);
const number = (min: number, max: number, integer = false) =>
  z.preprocess(
    (value) =>
      typeof value === "string"
        ? value.trim()
          ? Number(value.replace(",", "."))
          : undefined
        : value,
    integer ? z.number().int().min(min).max(max) : z.number().finite().min(min).max(max),
  );
const optionalProfile = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  id.optional(),
);
const date = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value),
    "Data inválida.",
  )
  .optional();
const score = z.preprocess(
  (value) =>
    value === null || (typeof value === "string" && value.trim() === "")
      ? null
      : typeof value === "string"
        ? Number(value.trim().replace(",", "."))
        : value,
  z
    .number()
    .finite()
    .min(0)
    .max(10)
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
      "Use no máximo duas casas decimais.",
    )
    .nullable(),
);

const requiredDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.");
const nullableTime = z.preprocess((value) => (value === "" ? null : value), time.nullable());
const nullableId = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  id.nullable(),
);
const jsonArray = z.string().max(20_000).transform((value, ctx) => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // A mensagem abaixo é suficiente para a tela.
  }
  ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Lista inválida." });
  return z.NEVER;
});

const parameters = z
  .string()
  .max(5000)
  .transform((value, ctx) => {
    try {
      const parsed: unknown = JSON.parse(value);
      if (validatePolicyParameters(parsed)) return parsed;
    } catch {
      /* Validation message below is safe to show. */
    }
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Revise todos os parâmetros e as decisões normativas.",
    });
    return z.NEVER;
  });

export const academicCommandSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("create_discipline"),
    code: text(3, 60).regex(/^[A-Za-z0-9_-]+$/),
    name: text(3, 200),
    phase: number(1, 3, true),
    kind: z.enum(["disciplina", "estagio", "atividade", "comportamento", "tcc"]),
    workload_hours: number(1, 5000, true),
    source_ref: text(5, 2000),
  }),
  z.object({
    operation: z.literal("create_offering"),
    class_id: id,
    discipline_id: id,
    academic_year: number(2020, 2200, true),
    academic_year_id: nullableId,
    workload_hours: number(1, 5000, true),
    vc_count: number(1, 12, true),
    decision_ref: text(5, 2000),
  }),
  z.object({
    operation: z.literal("configure_policy"),
    offering_id: id,
    name: text(3, 150),
    decision_ref: text(5, 2000),
    parameters,
  }),
  z.object({
    operation: z.literal("assign"),
    offering_id: id,
    profile_id: optionalProfile,
    display_name: text(3, 150),
    role: z.enum(["chefe", "instrutor"]),
    designation_ref: text(5, 2000),
  }),
  z.object({ operation: z.literal("deactivate_assignment"), assignment_id: id, offering_id: id }),
  z.object({ operation: z.literal("enroll"), offering_id: id, student_id: id }),
  z.object({
    operation: z.literal("create_assessment"),
    offering_id: id,
    kind: z.enum(["VC", "VF"]),
    sequence: number(1, 12, true),
    title: text(2, 200),
    held_on: date,
  }),
  z.object({
    operation: z.literal("save_grade"),
    offering_id: id,
    assessment_id: id,
    enrollment_id: id,
    score,
    expected_revision: number(0, 1_000_000, true),
    reason: z.string().trim().max(2000).default(""),
  }),
  z.object({
    operation: z.literal("save_attendance"),
    offering_id: id,
    enrollment_id: id,
    justified_absences: number(0, 5000),
    unjustified_absences: number(0, 5000),
    expected_revision: number(1, 1_000_000, true),
    reason: text(5, 2000),
  }),
  z.object({
    operation: z.literal("create_academic_year"),
    course_id: id,
    year: number(2020, 2200, true),
    starts_on: requiredDate,
    ends_on: requiredDate,
    source_ref: text(5, 2000),
    status: z.enum(["draft", "open"]),
  }),
  z.object({ operation: z.literal("open_academic_year"), academic_year_id: id, reason: text(5, 2000) }),
  z.object({
    operation: z.literal("save_calendar_event"),
    event_id: nullableId,
    academic_year_id: id,
    class_id: nullableId,
    event_date: requiredDate,
    event_type: z.enum(["holiday", "recess", "suspension", "institutional", "class_exception"]),
    title: text(3, 200),
    blocks_instruction: z.preprocess((value) => value === "true" || value === true || value === "on", z.boolean()),
    source_ref: text(5, 2000),
    reason: z.string().trim().max(2000).default("Inclusão no calendário letivo"),
  }),
  z.object({ operation: z.literal("link_offering_year"), offering_id: id, academic_year_id: id, reason: text(5, 2000) }),
  z.object({ operation: z.literal("save_discipline_alias"), discipline_id: id, alias: text(2, 220) }),
  z.object({
    operation: z.literal("map_qts_session"),
    session_id: id,
    offering_id: nullableId,
    classification: z.enum(["instruction", "non_instruction"]),
    reason: text(5, 2000),
    expected_revision: number(1, 1_000_000, true),
  }),
  z.object({
    operation: z.literal("create_manual_session"),
    offering_id: id,
    scheduled_on: requiredDate,
    starts_at: time,
    ends_at: time,
    title: text(2, 220),
    location: z.string().trim().max(150).default(""),
    rescheduled_from_id: nullableId,
  }),
  z.object({
    operation: z.literal("propose_session"),
    session_id: id,
    actual_starts_at: nullableTime,
    actual_ends_at: nullableTime,
    content: z.string().trim().max(4000).default(""),
    location: z.string().trim().max(150).default(""),
    outcome: z.enum(["validated", "cancelled", "rescheduled"]),
    assignment_ids: jsonArray,
  }),
  z.object({
    operation: z.literal("validate_session"),
    session_id: id,
    expected_revision: number(1, 1_000_000, true),
    outcome: z.enum(["validated", "cancelled", "rescheduled"]),
    attendance: jsonArray,
    reason: z.string().trim().max(2000).default("Validação da coordenação"),
  }),
  z.object({ operation: z.literal("close_academic_year"), academic_year_id: id, reason: text(5, 2000) }),
  z.object({ operation: z.literal("reopen_academic_year"), academic_year_id: id, reason: text(5, 2000) }),
]);
export type AcademicCommand = z.infer<typeof academicCommandSchema>;
