"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import { canManageInternship } from "../domain/access";
const pointSchema = z.object({
  assignmentId: z.string().uuid(),
  pointType: z.enum(["entrada", "saida"]),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(100000),
  supervisorName: z
    .string()
    .trim()
    .max(120)
    .refine((v) => !v || v.length >= 3),
  earlyExitReason: z.string().trim().min(5).max(500).optional(),
});
export async function recordInternshipPoint(
  input: z.infer<typeof pointSchema>,
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  if (!session?.active || session.role !== "aluno" || !session.studentId)
    return { error: "Acesso restrito ao cadete." };
  const parsed = pointSchema.safeParse(input);
  if (!parsed.success) return { error: "Revise a localização, o oficial responsável e o motivo da saída." };
  const p = parsed.data;
  const args = {
    p_assignment_id: p.assignmentId,
    p_point_type: p.pointType,
    p_latitude: p.latitude,
    p_longitude: p.longitude,
    p_accuracy_m: p.accuracy,
    p_supervisor_name: p.supervisorName,
  };
  const { error } = p.earlyExitReason
    ? await createSupabaseServerClient().rpc("internship_record_point_with_reason", {
        ...args,
        p_early_exit_reason: p.earlyExitReason,
      })
    : await createSupabaseServerClient().rpc("internship_record_point", args);
  if (error)
    return {
      error:
        error.code === "23514"
          ? error.message
          : "Não foi possível registrar seu ponto. Tente novamente ou procure a administração do estágio.",
    };
  revalidatePath("/aluno/estagio");
  revalidatePath("/coordenacao/estagio");
  return { success: true };
}
const locationSchema = z.object({
  siteId: z.string().uuid(),
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
  radius: z.coerce.number().int().min(50).max(5000),
});
export async function saveInternshipLocation(form: FormData): Promise<void> {
  const session = await getSession();
  if (!canManageInternship(session)) throw Error("Acesso restrito à administração do estágio.");
  const parsed = locationSchema.safeParse({
    siteId: form.get("siteId"),
    latitude: form.get("latitude"),
    longitude: form.get("longitude"),
    radius: form.get("radius"),
  });
  if (
    !parsed.success ||
    !String(form.get("latitude") ?? "").trim() ||
    !String(form.get("longitude") ?? "").trim()
  )
    redirect("/coordenacao/estagio?resultado=localizacao_invalida#ponto");
  const p = parsed.data;
  const { data: site, error: siteError } = await createSupabaseServerClient()
    .from("internship_sites")
    .select("site_type")
    .eq("id", p.siteId)
    .maybeSingle();
  if (siteError || site?.site_type !== "gbm")
    redirect("/coordenacao/estagio?resultado=localizacao_invalida#ponto");
  const { error } = await createSupabaseServerClient()
    .from("internship_site_locations")
    .upsert({
      site_id: p.siteId,
      latitude: p.latitude,
      longitude: p.longitude,
      radius_m: p.radius,
      updated_by: session!.userId,
    });
  revalidatePath("/coordenacao/estagio");
  redirect(
    `/coordenacao/estagio?resultado=${error ? "falha_localizacao" : "localizacao_salva"}#ponto`,
  );
}
