import type { AcademicResult, PolicyParameters } from "../domain/academic";

export type AcademicKind = "disciplina" | "estagio" | "atividade" | "comportamento" | "tcc";
export interface Discipline {
  id: string;
  code: string;
  name: string;
  phase: number;
  kind: AcademicKind;
  workload_hours: number;
  source_ref: string;
  conflicts: string[];
  active: boolean;
}
export interface AcademicPolicy {
  id: string;
  name: string;
  parameters: PolicyParameters;
  decision_ref: string;
  approved_by: string;
  approved_at: string;
}
export interface Offering {
  id: string;
  class_id: string;
  discipline_id: string;
  academic_year: number;
  workload_hours: number;
  vc_count: number;
  policy_id: string | null;
  decision_ref: string;
  active: boolean;
  created_at: string;
}
export interface Assignment {
  id: string;
  offering_id: string;
  profile_id: string | null;
  display_name: string;
  role: "chefe" | "instrutor";
  designation_ref: string;
  active: boolean;
}
export interface Enrollment {
  id: string;
  offering_id: string;
  student_id: string;
  student_label: string;
  justified_absences: number | null;
  unjustified_absences: number | null;
  revision: number;
  change_reason: string | null;
}
export interface Assessment {
  id: string;
  offering_id: string;
  kind: "VC" | "VF";
  sequence: number;
  title: string;
  held_on: string | null;
}
export interface Grade {
  id: string;
  offering_id: string;
  enrollment_id: string;
  assessment_id: string;
  score: number | null;
  revision: number;
  change_reason: string | null;
  updated_at: string;
}
export interface AcademicAuditEvent {
  id: string;
  offering_id: string | null;
  student_id: string | null;
  entity: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  before_data: unknown;
  after_data: unknown;
  reason: string | null;
  created_at: string;
}
export interface AcademicClass {
  id: string;
  name: string;
  course_id: string;
}
export interface AcademicStaff {
  id: string;
  full_name: string;
  role: string;
}
export interface AcademicStudent {
  id: string;
  class_id: string;
  war_name: string;
  student_number: number | null;
  pelotao: string | null;
}
export interface OfferingView extends Offering {
  discipline: Discipline;
  class_name: string;
}
export interface EnrollmentView extends Enrollment {
  result: AcademicResult;
}
export interface AcademicDashboard {
  disciplines: Discipline[];
  offerings: OfferingView[];
  classes: AcademicClass[];
  staff: AcademicStaff[];
  students: AcademicStudent[];
  /** Todas as matrículas legíveis pela sessão, incluindo outros anos. */
  enrollments: EnrollmentView[];
  /** Alertas informativos; não equivalem a ata ou desligamento. */
  student_summaries: {
    student_id: string;
    student_label: string;
    enrollment_count: number;
    vf_count: number;
    pending_count: number;
    alerts: string[];
  }[];
}
export interface AcademicDetail {
  offering: OfferingView;
  discipline: Discipline;
  policy: AcademicPolicy | null;
  assignments: Assignment[];
  enrollments: EnrollmentView[];
  assessments: Assessment[];
  grades: Grade[];
  audit: AcademicAuditEvent[];
  staff: AcademicStaff[];
  availableStudents: AcademicStudent[];
}
