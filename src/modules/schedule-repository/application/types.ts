import type { Tables } from "@/lib/supabase/types";

export type ScheduleType = Tables<"schedule_types">;
export type ScheduleDocument = Tables<"schedule_documents">;
export type ScheduleProcessingRun = Tables<"schedule_processing_runs">;
export type ScheduleCandidate = Tables<"schedule_candidates">;
export type ScheduleAssignment = Tables<"schedule_assignments">;
export type ScheduleOfficerAssignment = Tables<"schedule_officer_assignments">;

export interface ScheduleClass {
  id: string;
  name: string;
}

export interface ScheduleDocumentView extends ScheduleDocument {
  class_name: string;
  schedule_type_name: string;
  download_url: string | null;
  has_active_duplicate: boolean;
  latest_run: ScheduleProcessingRun | null;
  review_count: number;
  candidates: ScheduleCandidate[];
  officer_assignments: ScheduleOfficerAssignment[];
}

export interface ScheduleRepositoryData {
  documents: ScheduleDocumentView[];
  types: ScheduleType[];
  classes: ScheduleClass[];
  reviewCandidates: ScheduleReviewCandidateView[];
  assignments: ScheduleAssignmentView[];
  managedAssignments: ScheduleManagedAssignmentView[];
}

export interface ScheduleStudentOption {
  id: string;
  class_id: string;
  student_number: number | null;
  war_name: string;
  full_name: string;
}

export interface ScheduleReviewCandidateView extends ScheduleCandidate {
  class_id: string;
  class_name: string;
  document_name: string;
  students: ScheduleStudentOption[];
}

export interface ScheduleAssignmentView extends ScheduleAssignment {
  schedule_type_name: string;
  document_name: string;
}

export interface ScheduleManagedAssignmentView extends ScheduleAssignmentView {
  class_id: string;
  class_name: string;
  student_name: string;
  notification_status: string | null;
  notification_type: string | null;
  students: ScheduleStudentOption[];
}

export interface ScheduleFilters {
  turma?: string;
  tipo?: string;
  situacao?: string;
  inicio?: string;
  fim?: string;
}
