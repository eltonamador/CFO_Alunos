import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AcademicAuditEvent,
  AcademicCalendarEvent,
  AcademicPolicy,
  AcademicYear,
  DisciplineAlias,
  InstructionSession,
  SessionAttendance,
  SessionInstructor,
  Assessment,
  Assignment,
  Discipline,
  Enrollment,
  Grade,
  Offering,
} from "../application/types";

/**
 * Ajustes do contrato gerado para campos preenchidos por trigger e para a nota
 * NULL (lançamento pendente), que o gerador do Supabase não consegue inferir.
 */
type Table<Row> = {
  Row: { [Key in keyof Row]: Row[Key] };
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
export type AcademicTables = {
  academic_disciplines: Table<Discipline>;
  academic_policies: Table<Omit<AcademicPolicy, "parameters"> & { parameters: Json }>;
  academic_offerings: Table<Offering>;
  academic_assignments: Table<Assignment>;
  academic_enrollments: Table<Enrollment>;
  academic_assessments: Table<Assessment>;
  academic_grades: Table<Grade>;
  academic_audit_events: Table<AcademicAuditEvent>;
  academic_years: Table<AcademicYear>;
  academic_calendar_events: Table<AcademicCalendarEvent>;
  academic_discipline_aliases: Table<DisciplineAlias>;
  academic_instruction_sessions: Table<InstructionSession>;
  academic_session_instructors: Table<SessionInstructor>;
  academic_session_attendances: Table<SessionAttendance>;
};
type AcademicFunctions = {
  academic_save_grade: {
    Args: {
      p_assessment_id: string;
      p_enrollment_id: string;
      p_score: number | null;
      p_expected_revision: number;
      p_reason: string;
    };
    Returns: Grade;
  };
  academic_configure_policy: {
    Args: { p_offering_id: string; p_name: string; p_parameters: Json; p_decision_ref: string };
    Returns: string;
  };
  academic_save_attendance: {
    Args: {
      p_enrollment_id: string;
      p_justified: number;
      p_unjustified: number;
      p_expected_revision: number;
      p_reason: string;
    };
    Returns: Enrollment;
  };
  academic_create_offering_ri: {
    Args: {
      p_class_id: string;
      p_discipline_id: string;
      p_academic_year: number;
      p_workload_hours: number;
      p_vc_count: number;
      p_decision_ref: string;
    };
    Returns: string;
  };
  academic_create_year: {
    Args: { p_course_id: string; p_year: number; p_starts_on: string; p_ends_on: string; p_source_ref: string; p_status?: string; p_source_verified?: boolean };
    Returns: string;
  };
  academic_open_year: { Args: { p_academic_year_id: string; p_reason: string }; Returns: string };
  academic_update_year: {
    Args: {
      p_academic_year_id: string;
      p_starts_on: string;
      p_ends_on: string;
      p_source_ref: string;
      p_expected_revision: number;
      p_reason: string;
      p_source_verified?: boolean;
    };
    Returns: string;
  };
  academic_save_calendar_event: {
    Args: { p_event_id: string | null; p_academic_year_id: string; p_class_id: string | null; p_event_date: string; p_event_type: string; p_title: string; p_blocks_instruction: boolean; p_source_ref: string; p_reason: string };
    Returns: string;
  };
  academic_set_offering_year: { Args: { p_offering_id: string; p_academic_year_id: string; p_reason: string }; Returns: string };
  academic_save_discipline_alias: { Args: { p_discipline_id: string; p_alias: string }; Returns: string };
  academic_link_qts_document: { Args: { p_document_id: string; p_academic_year_id: string; p_reason: string }; Returns: number };
  academic_map_qts_session: { Args: { p_session_id: string; p_offering_id: string | null; p_classification: string; p_reason: string; p_expected_revision: number }; Returns: string };
  academic_create_manual_session: { Args: { p_offering_id: string; p_scheduled_on: string; p_starts_at: string; p_ends_at: string; p_title: string; p_location?: string | null; p_rescheduled_from_id?: string | null }; Returns: string };
  academic_propose_session: { Args: { p_session_id: string; p_actual_starts_at: string | null; p_actual_ends_at: string | null; p_content: string; p_location: string; p_outcome: string; p_assignment_ids: Json }; Returns: string };
  academic_validate_session: { Args: { p_session_id: string; p_expected_revision: number; p_outcome: string; p_attendance: Json; p_reason: string }; Returns: string };
  academic_close_year: { Args: { p_academic_year_id: string; p_reason: string }; Returns: string };
  academic_reopen_year: { Args: { p_academic_year_id: string; p_reason: string }; Returns: string };
};

type AcademicDatabase = {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Omit<Database["public"]["Tables"], keyof AcademicTables> & AcademicTables;
    Functions: Omit<Database["public"]["Functions"], keyof AcademicFunctions> & AcademicFunctions;
  };
};

export function createAcademicClient() {
  // Mesma sessão/cookies e RLS; o cast corrige apenas limitações do gerador SQL→TS.
  return createSupabaseServerClient() as unknown as SupabaseClient<AcademicDatabase>;
}
export type AcademicClient = ReturnType<typeof createAcademicClient>;

export class AcademicDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AcademicDataError";
  }
}
export function academicError(error: unknown): AcademicDataError {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (["42P01", "PGRST205", "PGRST202"].includes(code)) {
    return new AcademicDataError(
      "Gestão Acadêmica aguardando instalação do banco. A coordenação deve concluir a implantação das migrations acadêmicas.",
    );
  }
  if (code === "23505")
    return new AcademicDataError("Este registro já existe. Atualize a tela antes de continuar.");
  if (code === "40001")
    return new AcademicDataError(
      "O registro foi alterado por outra pessoa. Atualize a página e confira a versão mais recente.",
    );
  if (code === "42501")
    return new AcademicDataError("Seu perfil não tem permissão para esta operação.");
  if (["23514", "23503", "22023", "P0001"].includes(code)) {
    return new AcademicDataError(
      "Operação recusada pelo banco. Confira vínculos, regras da oferta, quantidade de avaliações e versão do registro; atualize a tela antes de tentar novamente.",
    );
  }
  return new AcademicDataError(
    "Não foi possível acessar a Gestão Acadêmica. Verifique a conexão e tente novamente.",
  );
}
