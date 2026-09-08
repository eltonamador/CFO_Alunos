"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyFollowUpRegistered } from "../infrastructure/notificationDelivery";
import { getSession, type SessionProfile } from "@/modules/identity/presentation/session";
import {
  FOLLOW_UP_TYPES,
  PUNISHMENT_STATUSES,
  deadlineFrom,
  initialStatus,
  normalizeLabel,
  requiresManifestation,
  type FollowUpType,
  type PunishmentStatus,
} from "../domain/followUp";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function revalidateFollowUp(studentId?: string) {
  revalidatePath("/coordenacao/acompanhamento");
  revalidatePath("/aluno/acompanhamento");
  revalidatePath("/aluno");
  if (studentId) revalidatePath(`/coordenacao/alunos/${studentId}`);
}

async function requireCoord(): Promise<
  { ok: true; session: SessionProfile } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada." };
  if (session.role !== "coordenacao") {
    return { ok: false, error: "Apenas a Coordenação pode executar esta ação." };
  }
  return { ok: true, session };
}

async function logEvent(
  supabase: any,
  recordId: string,
  eventType: string,
  description: string,
  session: SessionProfile | null,
  payload?: Record<string, unknown>,
) {
  await supabase.from("follow_up_events").insert({
    record_id: recordId,
    event_type: eventType,
    description,
    payload: payload ?? null,
    actor_id: session?.userId ?? null,
    actor_name: session?.fullName ?? "Sistema",
  });
}

/**
 * Encontra o motivo equivalente já existente ou cria um novo.
 * Nunca bloqueia um motivo inédito — apenas evita duplicar o que já existe
 * com escrita equivalente (acento, caixa, pontuação, espaços).
 */
async function resolveReason(
  supabase: any,
  kind: FollowUpType,
  label: string,
  userId: string,
): Promise<{ id: string | null; label: string }> {
  const clean = label.trim().replace(/\s+/g, " ");
  const normalized = normalizeLabel(clean);
  if (!normalized) return { id: null, label: clean };

  const { data: existing } = await supabase
    .from("fo_reasons")
    .select("id, label")
    .eq("kind", kind)
    .eq("normalized_label", normalized)
    .maybeSingle();

  if (existing?.id) return { id: existing.id, label: existing.label };

  const { data: created } = await supabase
    .from("fo_reasons")
    .insert({
      kind,
      label: clean,
      normalized_label: normalized,
      created_by: userId,
    })
    .select("id, label")
    .maybeSingle();

  return { id: created?.id ?? null, label: created?.label ?? clean };
}

async function resolvePunishmentOption(
  supabase: any,
  label: string,
  userId: string,
): Promise<{ id: string | null; label: string }> {
  const clean = label.trim().replace(/\s+/g, " ");
  const normalized = normalizeLabel(clean);
  if (!normalized) return { id: null, label: clean };

  const { data: existing } = await supabase
    .from("punishment_options")
    .select("id, label")
    .eq("normalized_label", normalized)
    .maybeSingle();

  if (existing?.id) return { id: existing.id, label: existing.label };

  const { data: created } = await supabase
    .from("punishment_options")
    .insert({ label: clean, normalized_label: normalized, created_by: userId })
    .select("id, label")
    .maybeSingle();

  return { id: created?.id ?? null, label: created?.label ?? clean };
}

// =====================================================================
// 1. Registro rápido (Coordenação)
// =====================================================================
const createSchema = z.object({
  studentId: z.string().uuid("Selecione o cadete."),
  type: z.enum(FOLLOW_UP_TYPES),
  reasonText: z
    .string()
    .trim()
    .min(3, "Descreva o fato em pelo menos 3 caracteres.")
    .max(160, "Use até 160 caracteres no motivo — detalhe na observação."),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export async function createFollowUpAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireCoord();
  if (!auth.ok) return auth;

  const parsed = createSchema.safeParse({
    studentId: formData.get("studentId"),
    type: formData.get("type"),
    reasonText: formData.get("reasonText"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { studentId, type, reasonText, notes } = parsed.data;
  const supabase = createSupabaseServerClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, war_name, student_number, class_id")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return { ok: false, error: "Cadete não encontrado." };

  const reason = await resolveReason(supabase, type, reasonText, auth.session.userId);
  const now = new Date();
  const needsManifestation = requiresManifestation(type);

  const { data: record, error } = await supabase
    .from("follow_up_records")
    .insert({
      student_id: studentId,
      class_id: (student as any).class_id ?? null,
      type,
      reason_id: reason.id,
      reason_text: reason.label,
      notes: notes ?? null,
      status: initialStatus(type),
      requires_manifestation: needsManifestation,
      deadline_at: needsManifestation ? deadlineFrom(now).toISOString() : null,
      occurred_at: now.toISOString(),
      created_by: auth.session.userId,
      created_by_name: auth.session.fullName,
    })
    .select("id")
    .maybeSingle();

  if (error || !record) {
    return { ok: false, error: error?.message ?? "Não foi possível registrar." };
  }

  await logEvent(
    supabase,
    record.id,
    "registrado",
    needsManifestation
      ? "FO− registrado. Cadete tem 24 horas para se manifestar."
      : "Registro criado.",
    auth.session,
    { type, reason: reason.label },
  );

  // Aviso ao cadete: o registro ja esta salvo, entao um canal externo
  // lento ou fora do ar nao pode atrasar nem derrubar a resposta. Damos
  // um teto de tempo e seguimos — o lembrete de prazo cobre o resto.
  if (needsManifestation) {
    await Promise.race([
      notifyFollowUpRegistered(record.id),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  }

  revalidateFollowUp(studentId);

  const label = (student as any).student_number
    ? `${(student as any).war_name} — ${String((student as any).student_number).padStart(2, "0")}`
    : (student as any).war_name;

  return { ok: true, message: `Registrado para ${label}: ${reason.label}` };
}

// =====================================================================
// 2. Manifestação do cadete
// =====================================================================
const manifestationSchema = z.object({
  recordId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(10, "Escreva sua justificativa com pelo menos 10 caracteres.")
    .max(4000),
});

export async function submitManifestationAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada." };
  if (session.role !== "aluno" || !session.studentId) {
    return { ok: false, error: "Apenas o cadete pode se manifestar." };
  }

  const parsed = manifestationSchema.safeParse({
    recordId: formData.get("recordId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createSupabaseServerClient();

  // Fecha prazos vencidos antes de aceitar — evita manifestação fora do prazo.
  await supabase.rpc("expire_follow_up_deadlines");

  const { data: record } = await supabase
    .from("follow_up_records")
    .select("id, student_id, status, deadline_at")
    .eq("id", parsed.data.recordId)
    .maybeSingle();

  if (!record || (record as any).student_id !== session.studentId) {
    return { ok: false, error: "Registro não encontrado." };
  }
  if ((record as any).status !== "aguardando_manifestacao") {
    return { ok: false, error: "Este FO não está mais aberto para manifestação." };
  }

  const files = formData
    .getAll("files")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length > MAX_ATTACHMENTS) {
    return { ok: false, error: `Envie no máximo ${MAX_ATTACHMENTS} anexos.` };
  }
  for (const file of files) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      return { ok: false, error: "Anexos aceitos: JPG, PNG, WEBP ou PDF." };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: "Cada anexo deve ter no máximo 10 MB." };
    }
  }

  // A gravação da manifestação + transição de status + evento acontecem
  // numa única transação no banco: o cadete não tem (nem deve ter) permissão
  // de UPDATE sobre o próprio FO.
  const { data: manifestationId, error } = await supabase.rpc(
    "submit_follow_up_manifestation",
    { p_record_id: parsed.data.recordId, p_body: parsed.data.body },
  );

  if (error || !manifestationId) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível enviar a manifestação.",
    };
  }

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${session.studentId}/${parsed.data.recordId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("followup-attachments")
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) continue;

    await supabase.from("follow_up_attachments").insert({
      record_id: parsed.data.recordId,
      manifestation_id: manifestationId,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      uploaded_by: session.userId,
    });
  }

  revalidateFollowUp(session.studentId);
  revalidatePath(`/aluno/acompanhamento/${parsed.data.recordId}`);
  return { ok: true, message: "Manifestação enviada." };
}

// =====================================================================
// 3. Análise da Coordenação
// =====================================================================
const decisionSchema = z.object({
  recordId: z.string().uuid(),
  outcome: z.enum(["deferido", "indeferido"]),
  rationale: z.string().trim().max(2000).optional(),
  punishmentText: z.string().trim().max(160).optional(),
  instructions: z.string().trim().max(2000).optional(),
});

export async function decideFollowUpAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireCoord();
  if (!auth.ok) return auth;

  const parsed = decisionSchema.safeParse({
    recordId: formData.get("recordId"),
    outcome: formData.get("outcome"),
    rationale: formData.get("rationale") || undefined,
    punishmentText: formData.get("punishmentText") || undefined,
    instructions: formData.get("instructions") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { recordId, outcome, rationale, punishmentText, instructions } = parsed.data;
  const supabase = createSupabaseServerClient();

  const { data: record } = await supabase
    .from("follow_up_records")
    .select("id, student_id, status")
    .eq("id", recordId)
    .maybeSingle();
  if (!record) return { ok: false, error: "Registro não encontrado." };

  const analysable = ["aguardando_analise", "prazo_expirado"];
  if (!analysable.includes((record as any).status)) {
    return { ok: false, error: "Este registro não está aguardando análise." };
  }

  const { error: decisionError } = await supabase.from("follow_up_decisions").insert({
    record_id: recordId,
    outcome,
    rationale: rationale ?? null,
    decided_by: auth.session.userId,
    decided_by_name: auth.session.fullName,
  });
  if (decisionError) return { ok: false, error: decisionError.message };

  const now = new Date().toISOString();
  let nextStatus: string;

  if (outcome === "deferido") {
    nextStatus = "deferido";
  } else if (punishmentText) {
    const option = await resolvePunishmentOption(supabase, punishmentText, auth.session.userId);
    const { error: punishmentError } = await supabase.from("follow_up_punishments").insert({
      record_id: recordId,
      punishment_option_id: option.id,
      punishment_text: option.label,
      instructions: instructions ?? null,
      status: "aguardando_cumprimento",
      created_by: auth.session.userId,
      updated_by: auth.session.userId,
    });
    if (punishmentError) return { ok: false, error: punishmentError.message };
    nextStatus = "aguardando_cumprimento";

    await logEvent(
      supabase,
      recordId,
      "punicao_definida",
      `Punição definida: ${option.label}.`,
      auth.session,
      { punishment: option.label },
    );
  } else {
    nextStatus = "indeferido";
  }

  await supabase
    .from("follow_up_records")
    .update({
      status: nextStatus,
      closed_at: nextStatus === "aguardando_cumprimento" ? null : now,
    })
    .eq("id", recordId);

  await logEvent(
    supabase,
    recordId,
    "decisao",
    outcome === "deferido"
      ? "Coordenação DEFERIU a justificativa. FO encerrado sem punição."
      : "Coordenação INDEFERIU a justificativa.",
    auth.session,
    { outcome },
  );

  revalidateFollowUp((record as any).student_id);
  revalidatePath(`/coordenacao/acompanhamento/${recordId}`);
  return { ok: true, message: outcome === "deferido" ? "FO deferido." : "FO indeferido." };
}

// =====================================================================
// 4. Cumprimento da punição
// =====================================================================
const punishmentStatusSchema = z.object({
  recordId: z.string().uuid(),
  status: z.enum(PUNISHMENT_STATUSES),
  statusNotes: z.string().trim().max(1000).optional(),
});

/**
 * `cumprida` e `cancelada` encerram o registro; `parcialmente_cumprida` e
 * `nao_cumprida` mantêm o FO na fila de acompanhamento da Coordenação.
 */
function recordStatusForPunishment(status: PunishmentStatus): {
  status: string;
  closed: boolean;
} {
  if (status === "cumprida" || status === "cancelada") {
    return { status: "concluido", closed: true };
  }
  return { status: "aguardando_cumprimento", closed: false };
}

export async function updatePunishmentStatusAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireCoord();
  if (!auth.ok) return auth;

  const parsed = punishmentStatusSchema.safeParse({
    recordId: formData.get("recordId"),
    status: formData.get("status"),
    statusNotes: formData.get("statusNotes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createSupabaseServerClient();
  const { data: record } = await supabase
    .from("follow_up_records")
    .select("id, student_id")
    .eq("id", parsed.data.recordId)
    .maybeSingle();
  if (!record) return { ok: false, error: "Registro não encontrado." };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("follow_up_punishments")
    .update({
      status: parsed.data.status,
      status_notes: parsed.data.statusNotes ?? null,
      completed_at: parsed.data.status === "cumprida" ? now : null,
      updated_by: auth.session.userId,
    })
    .eq("record_id", parsed.data.recordId);
  if (error) return { ok: false, error: error.message };

  const next = recordStatusForPunishment(parsed.data.status);
  await supabase
    .from("follow_up_records")
    .update({ status: next.status, closed_at: next.closed ? now : null })
    .eq("id", parsed.data.recordId);

  await logEvent(
    supabase,
    parsed.data.recordId,
    "punicao_atualizada",
    `Cumprimento atualizado para "${parsed.data.status.replace(/_/g, " ")}".`,
    auth.session,
    { punishmentStatus: parsed.data.status },
  );

  revalidateFollowUp((record as any).student_id);
  revalidatePath(`/coordenacao/acompanhamento/${parsed.data.recordId}`);
  return { ok: true, message: "Cumprimento atualizado." };
}

// =====================================================================
// 5. Cancelamento (registro feito por engano)
// =====================================================================
const cancelSchema = z.object({
  recordId: z.string().uuid(),
  reason: z.string().trim().min(5, "Informe o motivo do cancelamento.").max(500),
});

export async function cancelFollowUpAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireCoord();
  if (!auth.ok) return auth;

  const parsed = cancelSchema.safeParse({
    recordId: formData.get("recordId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createSupabaseServerClient();
  const { data: record } = await supabase
    .from("follow_up_records")
    .select("id, student_id")
    .eq("id", parsed.data.recordId)
    .maybeSingle();
  if (!record) return { ok: false, error: "Registro não encontrado." };

  const { error } = await supabase
    .from("follow_up_records")
    .update({ status: "cancelado", closed_at: new Date().toISOString() })
    .eq("id", parsed.data.recordId);
  if (error) return { ok: false, error: error.message };

  await logEvent(
    supabase,
    parsed.data.recordId,
    "cancelado",
    `Registro cancelado: ${parsed.data.reason}`,
    auth.session,
  );

  revalidateFollowUp((record as any).student_id);
  revalidatePath(`/coordenacao/acompanhamento/${parsed.data.recordId}`);
  return { ok: true, message: "Registro cancelado." };
}
