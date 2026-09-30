import { z } from "zod";
export const instructionInputSchema = z
  .object({
    programId: z.string().uuid(),
    id: z.string().uuid().optional(),
    expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
    title: z.string().trim().min(3).max(120),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    sourceReference: z.string().trim().max(500).default(""),
    active: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    const duration = Date.parse(v.endsAt) - Date.parse(v.startsAt);
    if (duration <= 0 || duration > 24 * 60 * 60 * 1000)
      ctx.addIssue({
        code: "custom",
        message: "Informe um período de até 24 horas, com término após o início.",
      });
    if (v.id && !v.expectedUpdatedAt)
      ctx.addIssue({ code: "custom", message: "Atualize a instrução antes de salvar." });
  });
export type InstructionInput = z.input<typeof instructionInputSchema>;
export type InstructionBlock = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  source_reference: string;
  active: boolean;
  updated_at: string;
};
export type InstructionConflict = {
  review_context: Record<string, unknown> | null;
  standby_confirmed: boolean;
  instruction_id: string;
  instruction_title: string;
  assignment_id: string;
  service_id: string;
  service_kind: string;
  site_name: string;
  war_name: string;
  starts_at: string;
  ends_at: string;
};
export type InstructionState = { blocks: InstructionBlock[]; conflicts: InstructionConflict[] };
