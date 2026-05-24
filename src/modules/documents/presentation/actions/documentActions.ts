"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import { getSession } from "@/modules/identity/presentation/session";
import type { DocumentType } from "@/lib/supabase/queries/documents";

export type ActionResult = { ok: true } | { ok: false; error: string };

const DOC_TYPES = [
  "rg_cpf",
  "cnh",
  "comprovante_residencia",
  "foto_3x4",
  "declaracao_medica",
  "outro",
] as const;

const ALLOWED_MIME = ["image/jpeg", "image/png", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB (alinhado com bucket)

function isAdmin(role: string): boolean {
  return role === "coordenacao" || role === "secretaria";
}
function canActOnStudent(
  session: { role: string; studentId: string | null },
  studentId: string,
): boolean {
  if (isAdmin(session.role)) return true;
  return session.role === "aluno" && session.studentId === studentId;
}

// =====================================================================
// Upload (aluno ou admin) — envia para Storage e cria registro
// =====================================================================
export async function uploadDocumentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };

  const studentId = formData.get("studentId");
  const docType = formData.get("docType");
  const file = formData.get("file");

  const schema = z.object({
    studentId: z.string().uuid(),
    docType: z.enum(DOC_TYPES),
  });
  const parsed = schema.safeParse({ studentId, docType });
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Arquivo excede 10 MB" };
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { ok: false, error: "Formato inválido. Use JPG, PNG ou PDF." };
  }
  if (!canActOnStudent(session, parsed.data.studentId)) {
    return { ok: false, error: "Sem permissão" };
  }

  const supabase = createServerClientUntyped();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const objectName = `${parsed.data.studentId}/${parsed.data.docType}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("student-documents")
    .upload(objectName, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) return { ok: false, error: `Falha no upload: ${uploadError.message}` };

  const { error: insertError } = await supabase.from("documents").insert({
    student_id: parsed.data.studentId,
    doc_type: parsed.data.docType,
    storage_path: objectName,
    status: "enviado",
  });
  if (insertError) {
    // Tenta limpar o arquivo do storage para evitar órfão
    await supabase.storage.from("student-documents").remove([objectName]);
    return { ok: false, error: insertError.message };
  }

  revalidatePath(`/aluno/ficha`);
  revalidatePath(`/aluno/documentos`);
  revalidatePath(`/coordenacao/alunos/${parsed.data.studentId}`);
  revalidatePath(`/secretaria/documentos`);
  return { ok: true };
}

// =====================================================================
// Reupload (aluno substitui um documento recusado)
// =====================================================================
const reuploadSchema = z.object({
  documentId: z.string().uuid(),
});

export async function reuploadDocumentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };

  const parsed = reuploadSchema.safeParse({ documentId: formData.get("documentId") });
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo" };
  }
  if (file.size > MAX_BYTES) return { ok: false, error: "Arquivo excede 10 MB" };
  if (!ALLOWED_MIME.includes(file.type)) {
    return { ok: false, error: "Formato inválido. Use JPG, PNG ou PDF." };
  }

  const supabase = createServerClientUntyped();
  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", parsed.data.documentId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Documento não encontrado" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any;
  if (!canActOnStudent(session, d.student_id)) return { ok: false, error: "Sem permissão" };
  if (d.status !== "recusado") {
    return { ok: false, error: "Só é possível reenviar documentos recusados" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const newPath = `${d.student_id}/${d.doc_type}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("student-documents")
    .upload(newPath, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: `Falha no upload: ${upErr.message}` };

  const { error: updErr } = await supabase
    .from("documents")
    .update({
      storage_path: newPath,
      status: "enviado",
      rejection_reason: null,
      validated_by: null,
      validated_at: null,
    })
    .eq("id", parsed.data.documentId);
  if (updErr) {
    await supabase.storage.from("student-documents").remove([newPath]);
    return { ok: false, error: updErr.message };
  }

  // Remove o arquivo antigo (best-effort)
  await supabase.storage.from("student-documents").remove([d.storage_path]);

  revalidatePath(`/aluno/ficha`);
  revalidatePath(`/aluno/documentos`);
  revalidatePath(`/coordenacao/alunos/${d.student_id}`);
  revalidatePath(`/secretaria/documentos`);
  return { ok: true };
}

// =====================================================================
// Validar / Recusar (Coordenação ou Secretaria)
// =====================================================================
const decideSchema = z.object({
  documentId: z.string().uuid(),
  decision: z.enum(["validar", "recusar"]),
  reason: z.string().optional(),
});

export async function decideDocumentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sessão expirada" };
  if (!isAdmin(session.role)) return { ok: false, error: "Sem permissão" };

  const parsed = decideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const { documentId, decision, reason } = parsed.data;
  if (decision === "recusar" && !reason?.trim()) {
    return { ok: false, error: "Informe o motivo da recusa" };
  }

  const supabase = createServerClientUntyped();
  const update =
    decision === "validar"
      ? {
          status: "validado",
          validated_by: session.userId,
          validated_at: new Date().toISOString(),
          rejection_reason: null,
        }
      : {
          status: "recusado",
          validated_by: session.userId,
          validated_at: new Date().toISOString(),
          rejection_reason: reason,
        };

  const { error } = await supabase.from("documents").update(update).eq("id", documentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/secretaria/documentos");
  revalidatePath("/coordenacao/alunos");
  revalidatePath("/aluno/documentos");
  return { ok: true };
}
