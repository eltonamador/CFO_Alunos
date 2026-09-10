import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AcademicAuditEvent,
  AcademicPolicy,
  Assessment,
  Assignment,
  Discipline,
  Enrollment,
  Grade,
  Offering,
} from "../application/types";

/** Local extension until the next Supabase generation; generated legacy types stay untouched. */
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
};
type AcademicDatabase = {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & AcademicTables;
    Functions: Database["public"]["Functions"] & {
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
    };
  };
};

export function createAcademicClient() {
  // Same session/cookies and RLS client. This cast only extends schema information.
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
