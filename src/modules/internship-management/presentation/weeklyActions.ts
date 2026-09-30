"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { canManageInternship } from "../domain/access";
import { getSession } from "@/modules/identity/presentation/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadWeeklyContext } from "../infrastructure/weeklyContext";
import type { WeeklyContext } from "../domain/weeklyPlanning";
import { internshipUniforms } from "../domain/uniforms";

const configSchema = z.object({
  programId: z.string().uuid(),
  weekStart: z.string().date(),
  siteIds: z.array(z.string().uuid()).max(10),
  templateCodes: z.array(z.string().min(3).max(30)).max(20),
  lifeguard: z.boolean(),
});
export type WeeklyConfig = z.infer<typeof configSchema>;
export async function previewInternshipWeek(
  input: WeeklyConfig,
): Promise<{ context: WeeklyContext; error?: never } | { error: string; context?: never }> {
  const session = await getSession();
  if (!canManageInternship(session))
    return { error: "Acesso restrito à administração do estágio." };
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) return { error: "Revise a semana e os serviços escolhidos." };
  try {
    return { context: await loadWeeklyContext(createSupabaseServerClient(), parsed.data) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível montar a semana." };
  }
}
const lineSchema = z.object({
  date: z.string().date(),
  templateCode: z.string().min(3).max(30),
  siteId: z.string().uuid(),
  studentId: z.string().uuid(),
  supervisorName: z
    .string()
    .trim()
    .max(120)
    .refine((value) => !value || value.length >= 3)
    .optional()
    .default(""),
  documentReference: z.string().trim().max(200).optional(),
  uniformCode: z
    .enum(internshipUniforms.map((item) => item.code) as ["3A", "2C", "4A", "4D"])
    .optional(),
});
const publicationSchema = z.object({
  programId: z.string().uuid(),
  weekStart: z.string().date(),
  requestId: z.string().uuid(),
  lines: z.array(lineSchema).min(1).max(100),
});
export type WeeklyPublication = z.infer<typeof publicationSchema>;
export async function publishInternshipWeek(
  input: WeeklyPublication,
): Promise<{ count: number; error?: never } | { error: string; count?: never }> {
  const session = await getSession();
  if (!canManageInternship(session))
    return { error: "Acesso restrito à administração do estágio." };
  const parsed = publicationSchema.safeParse(input);
  if (!parsed.success)
    return { error: "Confira os cadetes, as datas e os dados opcionais antes de publicar." };
  const { programId, weekStart, requestId, lines } = parsed.data;
  const { data, error } = await createSupabaseServerClient().rpc("internship_publish_week", {
    p_program_id: programId,
    p_week_start: weekStart,
    p_request_id: requestId,
    p_lines: lines,
  });
  if (error)
    return {
      error:
        error.code === "23514"
          ? error.message
          : "Não foi possível publicar a semana. Atualize a prévia e confira os conflitos.",
    };
  revalidatePath("/coordenacao/estagio");
  revalidatePath("/coordenacao/estagio/agenda");
  revalidatePath("/aluno/estagio");
  for (const dashboard of ["/aluno", "/coordenacao", "/instrutor", "/secretaria"])
    revalidatePath(dashboard);
  return { count: data?.length ?? 0 };
}
