/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

export type DocumentType =
  | "rg_cpf"
  | "cnh"
  | "comprovante_residencia"
  | "foto_3x4"
  | "declaracao_medica"
  | "outro";

export type DocumentStatus = "pendente" | "enviado" | "em_analise" | "validado" | "recusado";

export interface DocumentRow {
  id: string;
  student_id: string;
  doc_type: DocumentType;
  storage_path: string;
  status: DocumentStatus;
  rejection_reason: string | null;
  validated_by: string | null;
  validated_at: string | null;
  linked_health_restriction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentWithStudent extends DocumentRow {
  student: { id: string; war_name: string; student_number: number | null; sex: "M" | "F" | null } | null;
}

export const DOCUMENT_TYPES: { value: DocumentType; label: string; required: boolean }[] = [
  { value: "rg_cpf", label: "RG / CPF", required: true },
  { value: "cnh", label: "CNH", required: false },
  { value: "comprovante_residencia", label: "Comprovante de Residência", required: true },
  { value: "foto_3x4", label: "Foto 3x4", required: true },
  { value: "declaracao_medica", label: "Declaração Médica", required: false },
  { value: "outro", label: "Outro", required: false },
];

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  pendente: "Pendente",
  enviado: "Enviado",
  em_analise: "Em análise",
  validado: "Validado",
  recusado: "Recusado",
};

export function documentTypeLabel(t: DocumentType): string {
  return DOCUMENT_TYPES.find((x) => x.value === t)?.label ?? t;
}

export async function listDocumentsByStudent(
  supabase: SupabaseClient<any, any, any>,
  studentId: string,
): Promise<DocumentRow[]> {
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return (data ?? []) as DocumentRow[];
}

export async function listDocumentsPendingValidation(
  supabase: SupabaseClient<any, any, any>,
  filter: { status?: DocumentStatus; docType?: DocumentType } = {},
): Promise<DocumentWithStudent[]> {
  let q = supabase
    .from("documents")
    .select("*, student:students!inner(id, war_name, student_number, sex)")
    .order("created_at", { ascending: false });
  if (filter.status) q = q.eq("status", filter.status);
  else q = q.in("status", ["enviado", "em_analise"]);
  if (filter.docType) q = q.eq("doc_type", filter.docType);
  const { data } = await q;
  return (data ?? []) as DocumentWithStudent[];
}

export async function countDocumentsByStatus(
  supabase: SupabaseClient<any, any, any>,
): Promise<Record<DocumentStatus, number>> {
  const counts: Record<DocumentStatus, number> = {
    pendente: 0,
    enviado: 0,
    em_analise: 0,
    validado: 0,
    recusado: 0,
  };
  const { data } = await supabase.from("documents").select("status");
  for (const row of (data ?? []) as { status: DocumentStatus }[]) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

export async function signedDocumentUrl(
  supabase: SupabaseClient<any, any, any>,
  path: string | null,
  ttlSeconds = 300,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("student-documents")
    .createSignedUrl(path, ttlSeconds);
  return data?.signedUrl ?? null;
}
