import type { Database, Json } from "@/lib/supabase/types";

export type LiveRosterRow = {
  id: string;
  class_id: string;
  profile_id: string | null;
  student_id: string | null;
  kind: "cadet" | "officer";
  duty_date: string;
  person: string;
  duty: string;
  account_role: string | null;
};

type ReminderDelivery = {
  id: string;
  profile_id: string;
  duty_date: string;
  slot: string;
  channel: string;
  recipient_key: string;
  status: string;
  lease_token: string;
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
  updated_at: string;
};

export type ScheduleDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions" | "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      schedule_reminder_deliveries: {
        Row: ReminderDelivery;
        Insert: Partial<ReminderDelivery>;
        Update: Partial<ReminderDelivery>;
        Relationships: [];
      };
    };
    Functions: Database["public"]["Functions"] & {
      schedule_claim_document_notification: {
        Args: { p_document_id: string };
        Returns: Database["public"]["Functions"]["schedule_claim_notification_event"]["Returns"];
      };
      schedule_publish_reviewed_import: {
        Args: { p_document_id: string; p_rows: Json; p_extraction: Json };
        Returns: string;
      };
      schedule_live_roster: { Args: { p_start: string; p_end: string }; Returns: LiveRosterRow[] };
      schedule_calendar: {
        Args: { p_start: string; p_end: string };
        Returns: {
          id: string;
          kind: "cadet" | "officer";
          date: string;
          person: string;
          duty: string;
          mine: boolean;
        }[];
      };
      schedule_reserve_reminder: {
        Args: {
          p_profile_id: string;
          p_duty_date: string;
          p_slot: string;
          p_channel: string;
          p_recipient_key: string;
        };
        Returns: { id: string; lease_token: string }[];
      };
    };
  };
};
