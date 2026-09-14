import type { Database, Json } from "@/lib/supabase/types";

export type QtsCalendarRow = {
  id: string;
  document_id: string;
  activity_date: string;
  sequence: number;
  starts_at: string | null;
  ends_at: string | null;
  activity: string;
  instructor: string | null;
  workload: string | null;
  uniform: string | null;
  location: string | null;
  is_break: boolean;
  original_filename: string;
};

export type QtsDocumentRow = {
  id: string;
  period_start: string | null;
  period_end: string | null;
  original_filename: string;
  storage_path: string;
};

export type QtsDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & {
      qts_calendar: { Args: { p_start: string; p_end: string }; Returns: QtsCalendarRow[] };
      qts_published_documents: {
        Args: { p_start: string; p_end: string };
        Returns: QtsDocumentRow[];
      };
      qts_publish_reviewed_document: {
        Args: { p_document_id: string; p_activities: Json };
        Returns: string;
      };
    };
  };
};
