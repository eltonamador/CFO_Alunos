import { z } from "zod";
export const permanenceRowSchema = z.object({
  id: z.string().uuid(),
  rosterId: z.string().uuid(),
  studentId: z.string().uuid(),
  date: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  location: z.string().nullable(),
  uniformCode: z.string().nullable(),
  role: z.string(),
  status: z.string(),
  editable: z.boolean(),
  studentNumber: z.number().nullable(),
  warName: z.string().nullable(),
});
export type PermanenceRow = z.infer<typeof permanenceRowSchema>;
export type PermanenceStageConflict = {
  duty_assignment_id: string;
  roster_id: string;
  student_id: string;
  student_number: number | null;
  war_name: string;
  duty_role: string;
  duty_starts_at: string;
  duty_ends_at: string;
  shift_id: string;
  stage_starts_at: string;
  stage_ends_at: string;
  conflict_kind: "mesmo_dia" | "folga";
};
export type RotationDuty = {
  studentId: string;
  date: string;
  startsAt: string | null;
  endsAt: string | null;
};
export const permanenceInputSchema = z
  .object({
    programId: z.string().uuid(),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    location: z.string().trim().min(2).max(200),
    uniformCode: z.enum(["3A", "2C", "4A", "4D"]),
    students: z
      .array(z.string().uuid())
      .min(2, "Selecione o Dia ao 1º Ano e pelo menos um apoio.")
      .max(5, "Selecione no máximo quatro apoios."),
    rosterId: z.string().uuid().optional(),
    reason: z.string().trim().max(1000).default(""),
  })
  .superRefine((value, ctx) => {
    if (Date.parse(value.endsAt) <= Date.parse(value.startsAt))
      ctx.addIssue({ code: "custom", message: "O término deve ser posterior ao início." });
    if (new Set(value.students).size !== value.students.length)
      ctx.addIssue({ code: "custom", message: "Cada função exige um cadete diferente." });
    if (value.rosterId && value.reason.length < 5)
      ctx.addIssue({ code: "custom", message: "Informe o motivo da alteração." });
  });
export type PermanenceInput = z.input<typeof permanenceInputSchema>;
export const permanenceBatchSchema = z
  .object({
    programId: z.string().uuid(),
    location: z.string().trim().min(2).max(200),
    uniformCode: z.enum(["3A", "2C", "4A", "4D"]),
    services: z
      .array(
        z.object({
          startsAt: z.string().datetime({ offset: true }),
          endsAt: z.string().datetime({ offset: true }),
          students: z.array(z.string().uuid()).min(2).max(5),
        }),
      )
      .min(1)
      .max(14),
  })
  .superRefine((value, ctx) => {
    const days = new Set<string>();
    for (const [index, service] of value.services.entries()) {
      const from = Date.parse(service.startsAt);
      const to = Date.parse(service.endsAt);
      if (
        to - from !== 24 * 60 * 60 * 1000 ||
        !service.startsAt.endsWith("06:00:00-03:00") ||
        !service.endsAt.endsWith("06:00:00-03:00")
      )
        ctx.addIssue({
          code: "custom",
          message: "Cada serviço deve ser das 06h às 06h do dia seguinte.",
          path: ["services", index],
        });
      if (new Set(service.students).size !== service.students.length)
        ctx.addIssue({
          code: "custom",
          message: "Não repita cadetes no mesmo serviço.",
          path: ["services", index],
        });
      const day = service.startsAt.slice(0, 10);
      if (days.has(day))
        ctx.addIssue({ code: "custom", message: "Há datas repetidas no período." });
      days.add(day);
    }
  });
export type PermanenceBatch = z.input<typeof permanenceBatchSchema>;
