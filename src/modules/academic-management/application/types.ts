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
  academic_year_id?: string | null;
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
export interface AcademicCourse {
  id: string;
  code: string;
  name: string;
  year: number;
}
export type AcademicYearStatus = "draft" | "open" | "closed";
export interface AcademicYear {
  id: string;
  course_id: string;
  year: number;
  starts_on: string;
  ends_on: string;
  status: AcademicYearStatus;
  source_ref: string;
  revision: number;
  change_reason: string | null;
  created_at: string;
}
export type CalendarEventType =
  | "holiday"
  | "recess"
  | "suspension"
  | "institutional"
  | "class_exception";
export interface AcademicCalendarEvent {
  id: string;
  academic_year_id: string;
  class_id: string | null;
  event_date: string;
  event_type: CalendarEventType;
  title: string;
  blocks_instruction: boolean;
  source_ref: string;
  revision: number;
  change_reason: string | null;
}
export type SessionStatus =
  | "planned"
  | "proposed"
  | "validated"
  | "cancelled"
  | "rescheduled"
  | "superseded";
export type SessionClassification = "instruction" | "non_instruction" | "unmapped";
export interface InstructionSession {
  id: string;
  academic_year_id: string;
  class_id: string;
  offering_id: string | null;
  qts_activity_id: string | null;
  rescheduled_from_id: string | null;
  scheduled_on: string;
  planned_starts_at: string | null;
  planned_ends_at: string | null;
  actual_starts_at: string | null;
  actual_ends_at: string | null;
  title: string;
  content: string | null;
  location: string | null;
  planned_instructor: string | null;
  classification: SessionClassification;
  status: SessionStatus;
  proposed_outcome: "validated" | "cancelled" | "rescheduled";
  planned_hours: number;
  taught_hours: number | null;
  revision: number;
  change_reason: string | null;
  proposed_at: string | null;
  proposed_by: string | null;
  validated_at: string | null;
  validated_by: string | null;
}
export interface SessionInstructor {
  id: string;
  session_id: string;
  assignment_id: string | null;
  profile_id: string | null;
  display_name: string;
}
export type AttendanceStatus = "present" | "justified_absence" | "unjustified_absence";
export interface SessionAttendance {
  id: string;
  session_id: string;
  enrollment_id: string;
  status: AttendanceStatus;
  revision: number;
  change_reason: string | null;
}
export interface DisciplineAlias {
  id: string;
  discipline_id: string;
  alias: string;
  normalized_alias: string;
  active: boolean;
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
  legacy_justified_absences?: number | null;
  legacy_unjustified_absences?: number | null;
  journal_justified_absences?: number;
  journal_unjustified_absences?: number;
  result: AcademicResult;
}
export interface AcademicDashboard {
  disciplines: Discipline[];
  offerings: OfferingView[];
  classes: AcademicClass[];
  courses: AcademicCourse[];
  academicYears: AcademicYear[];
  calendarEvents: AcademicCalendarEvent[];
  sessions: InstructionSession[];
  sessionAttendances: SessionAttendance[];
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
  sessions: InstructionSession[];
  sessionInstructors: SessionInstructor[];
  sessionAttendances: SessionAttendance[];
  aliases: DisciplineAlias[];
}
