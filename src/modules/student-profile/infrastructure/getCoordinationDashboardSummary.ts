import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CoordinationDashboardSummary {
  totalStudents: number;
  completedProfiles: number;
  documentsValidated: number;
  openPendingItems: number;
  studentsWithDocuments: number;
  studentsQuarantineEquipment: number;
  studentsEquipmentCompleted: number;
  studentsWithoutCanga: number;
  pendingHealthValidations: number;
}

export async function getCoordinationDashboardSummary(): Promise<CoordinationDashboardSummary | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("coordination_dashboard_summary");
  if (error) {
    console.error("Falha ao carregar KPIs da Coordenação:", error);
    return null;
  }

  const summary = data?.[0];
  if (!summary) return null;
  return {
    totalStudents: summary.total_students,
    completedProfiles: summary.completed_profiles,
    documentsValidated: summary.documents_validated,
    openPendingItems: summary.open_pending_items,
    studentsWithDocuments: summary.students_with_documents,
    studentsQuarantineEquipment: summary.students_quarantine_equipment,
    studentsEquipmentCompleted: summary.students_equipment_completed,
    studentsWithoutCanga: summary.students_without_canga,
    pendingHealthValidations: summary.pending_health_validations,
  };
}
