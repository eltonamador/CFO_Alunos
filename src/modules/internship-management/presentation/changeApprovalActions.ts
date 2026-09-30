"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import { canManageInternship } from "../domain/access";

const pairSchema = z.object({
  firstAssignmentId: z.string().uuid(),
  secondAssignmentId: z.string().uuid(),
  shiftDate: z.string().date(),
  reason: z.string().trim().min(5).max(500),
}).refine((value) => value.firstAssignmentId !== value.secondAssignmentId);

export async function requestInternshipPairSwapAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!canManageInternship(session)) throw new Error("Acesso restrito à administração do estágio.");
  const parsed = pairSchema.safeParse({
    firstAssignmentId: formData.get("firstAssignmentId"),
    secondAssignmentId: formData.get("secondAssignmentId"),
    shiftDate: formData.get("shiftDate"),
    reason: formData.get("reason"),
  });
  if (!parsed.success)
    redirect("/coordenacao/estagio/agenda?resultado=permuta_invalida#permuta");
  const { data, error } = await createSupabaseServerClient().rpc("internship_request_pair_swap", {
    p_first_assignment_id: parsed.data.firstAssignmentId,
    p_second_assignment_id: parsed.data.secondAssignmentId,
    p_reason: parsed.data.reason,
  });
  if (error || !data) {
    const result = error?.code === "23505" ? "troca_ja_pendente" : "permuta_falhou";
    redirect(`/coordenacao/estagio/agenda?inicio=${parsed.data.shiftDate}&fim=${parsed.data.shiftDate}&resultado=${result}#permuta`);
  }
  revalidatePath("/coordenacao/estagio/agenda");
  redirect(`/coordenacao/estagio/permuta/${data}`);
}

const decisionSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["homologar", "recusar"]),
  note: z.string().trim().max(500),
});

export async function decideInternshipChangeAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session?.active || session.role !== "coordenacao")
    throw new Error("Somente a Coordenação homologa trocas de plantão.");
  const parsed = decisionSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success || (parsed.data.decision === "recusar" && parsed.data.note.length < 5))
    redirect("/coordenacao/estagio/agenda?resultado=decisao_invalida#trocas-pendentes");
  const db = createSupabaseServerClient();
  const { data: request } = await db.from("internship_change_requests")
    .select("change_type")
    .eq("id", parsed.data.requestId)
    .maybeSingle();
  const { error } = await db.rpc("internship_decide_change", {
    p_request_id: parsed.data.requestId,
    p_approve: parsed.data.decision === "homologar",
    p_note: parsed.data.note || null,
  });
  if (!error) {
    for (const path of [
      "/coordenacao/estagio",
      "/coordenacao/estagio/agenda",
      "/coordenacao/estagio/relatorios",
      "/aluno/estagio",
      "/aluno",
      "/coordenacao",
      "/instrutor",
      "/secretaria",
    ]) revalidatePath(path);
  }
  const result = error ? "decisao_falhou"
    : parsed.data.decision === "homologar" ? "troca_homologada" : "troca_recusada";
  if (request?.change_type === "permuta") {
    const query = error ? "?resultado=decisao_falhou" : "";
    redirect(`/coordenacao/estagio/permuta/${parsed.data.requestId}${query}`);
  }
  redirect(`/coordenacao/estagio/agenda?resultado=${result}#trocas-pendentes`);
}
