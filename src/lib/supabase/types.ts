/**
 * Tipos do schema Supabase — placeholder.
 *
 * Para regenerar a partir do schema real após `supabase start`:
 *   supabase gen types typescript --local > src/lib/supabase/types.ts
 *
 * Estrutura segue o formato esperado pelo @supabase/supabase-js
 * (Relationships obrigatório para o type inference do PostgrestJS).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ProfileRow = {
  id: string;
  role: "coordenacao" | "secretaria" | "instrutor" | "aluno";
  full_name: string;
  active: boolean;
  student_id: string | null;
  created_at: string;
  updated_at: string;
};

type CourseRow = {
  id: string;
  code: string;
  name: string;
  year: number;
  created_at: string;
};

type ClassRow = {
  id: string;
  course_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

type StudentRow = {
  id: string;
  class_id: string;
  pelotao: string | null;
  student_number: number | null;
  situation: string;
  full_name: string;
  war_name: string;
  sex: "M" | "F" | null;
  birth_date: string | null;
  photo_path: string | null;
  cpf: string | null;
  rg: string | null;
  created_at: string;
  updated_at: string;
};

type StudentCardInstructorRow = {
  id: string;
  class_id: string;
  student_number: number | null;
  war_name: string;
  full_name: string;
  pelotao: string | null;
  photo_path: string | null;
  whatsapp: string | null;
  email_institutional: string | null;
  origin_label: "amapa" | "outro_estado" | null;
  has_vehicle: boolean;
  has_restriction: boolean;
  operational_summary: string | null;
  canga_war_name: string | null;
  canga_number: number | null;
};

type DutyRoleRow = {
  id: string;
  code: "aluno_dia" | "subxerife" | "aluno_alimentacao" | "aluno_logistica";
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type DutyRosterRow = {
  id: string;
  class_id: string;
  period_start: string;
  period_end: string;
  status: "rascunho" | "publicada" | "arquivada";
  generated_by: string | null;
  generated_at: string | null;
  published_by: string | null;
  published_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type DutyAssignmentRow = {
  id: string;
  roster_id: string;
  class_id: string;
  duty_date: string;
  role_id: string;
  student_id: string;
  status: "prevista" | "confirmada" | "substituida" | "cancelada";
  assignment_source: "automatica" | "manual" | "substituicao_automatica";
  manual_reason: string | null;
  replaced_assignment_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type DutyImpedimentRow = {
  id: string;
  student_id: string;
  impediment_type:
    | "ausencia"
    | "dispensa"
    | "restricao_medica"
    | "missao_externa"
    | "problema_administrativo"
    | "outro";
  starts_on: string;
  ends_on: string;
  reason: string;
  affected_role_ids: string[] | null;
  operational_note: string | null;
  active: boolean;
  registered_by: string | null;
  created_at: string;
  updated_at: string;
};

type DutyAssignmentLogRow = {
  id: string;
  assignment_id: string | null;
  roster_id: string | null;
  action: "generated" | "published" | "manual_change" | "auto_substitution" | "cancelled";
  actor_id: string | null;
  actor_role: string | null;
  before_data: Json | null;
  after_data: Json | null;
  reason: string | null;
  created_at: string;
};

type AnnouncementRow = {
  id: string;
  class_id: string | null;
  title: string;
  body: string;
  audience_type: "turma" | "individual" | "perfil";
  target_role: "coordenacao" | "secretaria" | "instrutor" | "aluno" | null;
  target_student_ids: string[] | null;
  priority: "normal" | "alta" | "urgente";
  status: "rascunho" | "publicado" | "arquivado";
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type AnnouncementAttachmentRow = {
  id: string;
  announcement_id: string;
  storage_path: string | null;
  external_url: string | null;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number | null;
  attachment_type: "documento" | "planilha" | "imagem" | "video" | "link";
  sort_order: number;
  uploaded_by: string;
  created_at: string;
};

type AnnouncementReadRow = {
  id: string;
  announcement_id: string;
  student_id: string;
  read_by: string;
  read_at: string;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

type NotificationDeliveryRow = {
  id: string;
  student_id: string;
  alert_on: string;
  birthday_on: string;
  alert_kind: "today" | "tomorrow";
  channel: "web_push" | "email";
  recipient_key: string;
  status: "pending" | "sent" | "failed";
  payload: Json;
  provider_message_id: string | null;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id" | "role" | "full_name">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      courses: {
        Row: CourseRow;
        Insert: Partial<CourseRow> & Pick<CourseRow, "code" | "name" | "year">;
        Update: Partial<CourseRow>;
        Relationships: [];
      };
      classes: {
        Row: ClassRow;
        Insert: Partial<ClassRow> & Pick<ClassRow, "course_id" | "name">;
        Update: Partial<ClassRow>;
        Relationships: [];
      };
      students: {
        Row: StudentRow;
        Insert: Partial<StudentRow> & Pick<StudentRow, "class_id" | "full_name" | "war_name">;
        Update: Partial<StudentRow>;
        Relationships: [];
      };
      duty_roles: {
        Row: DutyRoleRow;
        Insert: Partial<DutyRoleRow> & Pick<DutyRoleRow, "code" | "name" | "sort_order">;
        Update: Partial<DutyRoleRow>;
        Relationships: [];
      };
      duty_rosters: {
        Row: DutyRosterRow;
        Insert: Partial<DutyRosterRow> & Pick<DutyRosterRow, "class_id" | "period_start" | "period_end">;
        Update: Partial<DutyRosterRow>;
        Relationships: [];
      };
      duty_assignments: {
        Row: DutyAssignmentRow;
        Insert: Partial<DutyAssignmentRow> &
          Pick<DutyAssignmentRow, "roster_id" | "class_id" | "duty_date" | "role_id" | "student_id">;
        Update: Partial<DutyAssignmentRow>;
        Relationships: [];
      };
      duty_impediments: {
        Row: DutyImpedimentRow;
        Insert: Partial<DutyImpedimentRow> &
          Pick<DutyImpedimentRow, "student_id" | "impediment_type" | "starts_on" | "ends_on" | "reason">;
        Update: Partial<DutyImpedimentRow>;
        Relationships: [];
      };
      duty_assignment_logs: {
        Row: DutyAssignmentLogRow;
        Insert: Partial<DutyAssignmentLogRow> & Pick<DutyAssignmentLogRow, "action">;
        Update: Partial<DutyAssignmentLogRow>;
        Relationships: [];
      };
      announcements: {
        Row: AnnouncementRow;
        Insert: Partial<AnnouncementRow> &
          Pick<AnnouncementRow, "title" | "body" | "audience_type" | "created_by">;
        Update: Partial<AnnouncementRow>;
        Relationships: [];
      };
      announcement_attachments: {
        Row: AnnouncementAttachmentRow;
        Insert: Partial<AnnouncementAttachmentRow> &
          Pick<
            AnnouncementAttachmentRow,
            "announcement_id" | "original_filename" | "mime_type" | "attachment_type" | "uploaded_by"
          >;
        Update: Partial<AnnouncementAttachmentRow>;
        Relationships: [];
      };
      announcement_reads: {
        Row: AnnouncementReadRow;
        Insert: Partial<AnnouncementReadRow> &
          Pick<AnnouncementReadRow, "announcement_id" | "student_id" | "read_by">;
        Update: Partial<AnnouncementReadRow>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Partial<PushSubscriptionRow> &
          Pick<PushSubscriptionRow, "user_id" | "endpoint" | "p256dh" | "auth">;
        Update: Partial<PushSubscriptionRow>;
        Relationships: [];
      };
      notification_deliveries: {
        Row: NotificationDeliveryRow;
        Insert: Partial<NotificationDeliveryRow> &
          Pick<
            NotificationDeliveryRow,
            | "student_id"
            | "alert_on"
            | "birthday_on"
            | "alert_kind"
            | "channel"
            | "recipient_key"
          >;
        Update: Partial<NotificationDeliveryRow>;
        Relationships: [];
      };
    };
    Views: {
      v_student_card_instructor: { Row: StudentCardInstructorRow; Relationships: [] };
      v_student_class_basic: {
        Row: {
          id: string;
          class_id: string;
          student_number: number | null;
          war_name: string;
          pelotao: string | null;
          photo_path: string | null;
        };
        Relationships: [];
      };
      v_health_indicator_secretaria: {
        Row: { student_id: string; has_restriction: boolean; validation_status: string };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
}
