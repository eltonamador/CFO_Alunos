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
