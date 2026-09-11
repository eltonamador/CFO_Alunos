import type { Tables } from "@/lib/supabase/types";

export type ScheduleType = Tables<"schedule_types">;
export type ScheduleDocument = Tables<"schedule_documents">;
export type ScheduleProcessingRun = Tables<"schedule_processing_runs">;

export interface ScheduleClass {
  id: string;
  name: string;
}

export interface ScheduleDocumentView extends ScheduleDocument {
  class_name: string;
  schedule_type_name: string;
  download_url: string | null;
  latest_run: ScheduleProcessingRun | null;
  review_count: number;
}

export interface ScheduleRepositoryData {
  documents: ScheduleDocumentView[];
  types: ScheduleType[];
  classes: ScheduleClass[];
}

export interface ScheduleFilters {
  turma?: string;
  tipo?: string;
  situacao?: string;
  inicio?: string;
  fim?: string;
}
