"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { evaluationPublicClient } from "../infrastructure/evaluationClient";
import { requireInternshipManager } from "./access";
import { parseEvaluationForm } from "../domain/evaluationValidation";
import type { EvaluationWhatsAppDeliveryData } from "./EvaluationWhatsAppDelivery";
import { normalizeEvaluatorWhatsApp } from "../domain/whatsappSender";
const uuid = z.string().uuid();
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
function invalidate(assignmentId?: string) {
  revalidatePath("/coordenacao/estagio");
  revalidatePath("/aluno/estagio");
  if (assignmentId) revalidatePath(`/coordenacao/estagio/avaliacao/${assignmentId}`);
}
export async function createEvaluationInvite(form: FormData) {
  await requireInternshipManager();
  const parsed = z
    .object({
      assignmentId: uuid,
      name: z.string().trim().min(3).max(120),
      contact: z.string().trim().min(3).max(200),
    })
    .safeParse({
      assignmentId: form.get("assignmentId"),
      name: form.get("recipientName"),
      contact: form.get("recipientContact"),
    });
  if (!parsed.success) return { error: "Informe o oficial (posto e nome) e o contato para envio." };
  const { data, error } = await createSupabaseServerClient().rpc(
    "internship_create_evaluation_invite",
    {
      p_assignment_id: parsed.data.assignmentId,
      p_recipient_name: parsed.data.name,
      p_recipient_contact: parsed.data.contact,
    },
  );
  if (error)
    return { error: "Não foi possível criar o convite. Confira se a participação está vigente." };
  invalidate(parsed.data.assignmentId);
  return { invite: data as { id: string; token: string; expires_at: string } };
}
export async function createCadetEvaluationInvite(form: FormData) {
  const parsed = z.object({
    assignmentId: uuid,
    name: z.string().trim().min(3).max(120),
    contact: z.string().trim().min(3).max(200),
  }).safeParse({
    assignmentId: form.get("assignmentId"),
    name: form.get("recipientName"),
    contact: form.get("recipientContact"),
  });
  if (!parsed.success) return { error: "Informe o nome do oficial e o contato para envio." };
  const { data, error } = await createSupabaseServerClient().rpc(
    "internship_create_cadet_evaluation_invite",
    {
      p_assignment_id: parsed.data.assignmentId,
      p_recipient_name: parsed.data.name,
      p_recipient_contact: parsed.data.contact,
    },
  );
  if (error) return { error: "Não foi possível gerar o link. Confira se o plantão já começou e se a avaliação ainda está pendente." };
  revalidatePath("/aluno/estagio");
  revalidatePath(`/coordenacao/estagio/avaliacao/${parsed.data.assignmentId}`);
  return { invite: data as { id: string; token: string; expires_at: string } };
}
export async function saveEvaluation(form: FormData, mode: "digital" | "papel") {
  const parsed = parseEvaluationForm(form);
  if (!parsed.success)
    return {
      error:
        "Confira a identificação, os critérios gerais e técnicos, a devolutiva e a confirmação. Reforço e situação relevante exigem descrição.",
    };
  const x = parsed.data;
  if (!x.details) return { error: "Preencha os dados operacionais da ficha." };
  const args = {
    p_evaluator_name: x.evaluatorName,
    p_evaluator_unit: x.evaluatorUnit,
    p_ratings: x.ratings,
    p_guidance: x.guidance,
    p_incident: x.incident,
    p_incident_note: x.incidentNote,
    p_details: x.details,
  };
  if (mode === "papel") {
    await requireInternshipManager();
    const id = uuid.safeParse(form.get("assignmentId"));
    const reference = z.string().trim().min(3).max(200).safeParse(form.get("paperReference"));
    if (!id.success || !reference.success)
      return { error: "Identifique a ficha em papel recebida." };
    const { error } = await createSupabaseServerClient().rpc("internship_record_paper_evaluation_v2", {
      ...args,
      p_assignment_id: id.data,
      p_paper_reference: reference.data,
    });
    if (error)
      return { error: "Não foi possível registrar. O plantão deve estar vigente e encerrado." };
    invalidate(id.data);
    return { success: true };
  }
  const token = tokenSchema.safeParse(form.get("token"));
  if (!token.success)
    return { error: "Link inválido. Solicite um novo link à administração do estágio." };
  const publicClient = evaluationPublicClient();
  const { error } = await publicClient.rpc("internship_submit_evaluation_v2", {
    ...args,
    p_token: token.data,
    p_confirmed: true,
  });
  if (error)
    return {
      error:
        "Não foi possível enviar. Confira se já passou metade do plantão e se o link ainda está válido e sem resposta. Atualize a página e tente novamente.",
    };
  invalidate();
  const delivery = await publicClient.rpc("internship_evaluation_whatsapp_delivery", {
    p_token: token.data,
  });
  return {
    success: true,
    delivery: delivery.error ? null : delivery.data as EvaluationWhatsAppDeliveryData | null,
  };
}
export async function reviewEvaluation(form: FormData) {
  await requireInternshipManager();
  const parsed = z
    .object({
      id: uuid,
      assignmentId: uuid,
      decision: z.enum(["liberada", "devolvida"]),
      note: z.string().trim().max(1000),
    })
    .safeParse({
      id: form.get("id"),
      assignmentId: form.get("assignmentId"),
      decision: form.get("decision"),
      note: form.get("note") ?? "",
    });
  if (!parsed.success) return { error: "Revise a decisão." };
  const x = parsed.data;
  const rawSender = String(form.get("whatsappSenderPhone") ?? "");
  const sender = rawSender.trim() ? normalizeEvaluatorWhatsApp(rawSender) : null;
  if (x.decision === "liberada" && sender === null && rawSender.trim())
    return { error: "Informe os 9 dígitos do celular com DDD 96, ou o DDD e o número completo para outro estado." };
  const { error } = await createSupabaseServerClient().rpc("internship_review_evaluation_with_whatsapp", {
    p_id: x.id,
    p_decision: x.decision,
    p_note: x.note,
    p_identity_confirmed: form.get("identityConfirmed") === "on",
    p_whatsapp_sender_phone: sender,
  });
  if (error)
    return {
      error:
        "Para liberar, confira o protocolo e informe o celular remetente do oficial. Para solicitar nova avaliação, informe o motivo.",
    };
  invalidate(x.assignmentId);
  return { success: true };
}
export async function revokeEvaluationInvite(id: string, assignmentId: string) {
  await requireInternshipManager();
  if (!uuid.safeParse(id).success || !uuid.safeParse(assignmentId).success)
    return { error: "Convite inválido." };
  const { error } = await createSupabaseServerClient().rpc("internship_revoke_evaluation_invite", {
    p_id: id,
  });
  if (error) return { error: "O convite não está mais disponível para cancelamento." };
  invalidate(assignmentId);
  return { success: true };
}
