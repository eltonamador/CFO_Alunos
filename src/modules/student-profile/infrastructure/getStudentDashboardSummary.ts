import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface StudentDashboardSummary {
  profileCompletionPercent: number;
  documentsCompletionPercent: number;
  quarantineEquipmentCompletionPercent: number;
  equipmentCompletionPercent: number;
  missingDocumentTypes: string[];
  pendingQuarantineEquipment: number;
}

/**
 * Resumo do portal do aluno. A RPC deriva o estudante de auth.uid() e mantém
 * SECURITY INVOKER, portanto a RLS continua sendo aplicada no banco.
 */
export async function getStudentDashboardSummary(): Promise<StudentDashboardSummary | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("student_dashboard_summary");

  if (error) {
    console.error("Falha ao carregar o resumo do painel do aluno:", error);
    return null;
  }

  const summary = data?.[0];
  if (!summary) return null;

  return {
    profileCompletionPercent: summary.profile_completion_percent,
    documentsCompletionPercent: summary.documents_completion_percent,
    quarantineEquipmentCompletionPercent: summary.quarantine_equipment_completion_percent,
    equipmentCompletionPercent: summary.equipment_completion_percent,
    missingDocumentTypes: summary.missing_document_types,
    pendingQuarantineEquipment: summary.pending_quarantine_equipment,
  };
}
