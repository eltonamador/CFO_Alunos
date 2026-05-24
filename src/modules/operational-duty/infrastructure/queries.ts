/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DutyImpedimentInput,
  DutyRoleInput,
  HistoricalAssignmentInput,
  RosterStudentInput,
} from "../domain/services/generateFairRoster";

export interface DutyAssignmentView {
  id: string;
  dutyDate: string;
  status: string;
  assignmentSource: string;
  manualReason: string | null;
  role: DutyRoleInput;
  student: RosterStudentInput;
  studentLabel: string;
}

export interface DutyImpedimentView {
  id: string;
  studentId: string;
  studentLabel: string;
  impedimentType: string;
  startsOn: string;
  endsOn: string;
  reason: string;
  operationalNote: string | null;
  affectedRoleIds: string[] | null;
  active: boolean;
}

export interface DutyLogView {
  id: string;
  action: string;
  reason: string | null;
  createdAt: string;
}

export function formatStudentLabel(student: {
  war_name?: string | null;
  warName?: string | null;
  student_number?: number | null;
  studentNumber?: number | null;
}) {
  const warName = student.war_name ?? student.warName ?? "ALUNO";
  const number = student.student_number ?? student.studentNumber;
  return number ? `${warName} - ${String(number).padStart(2, "0")}` : warName;
}

export async function getDefaultClassId(supabase: SupabaseClient<any, any, any>) {
  const { data, error } = await supabase
    .from("classes")
    .select("id")
    .order("start_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id as string | undefined;
}

export async function getDutyRoles(supabase: SupabaseClient<any, any, any>): Promise<DutyRoleInput[]> {
  const { data, error } = await supabase
    .from("duty_roles")
    .select("id, code, name, sort_order")
    .eq("active", true)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []).map((role: any) => ({
    id: role.id,
    code: role.code,
    name: role.name,
    sortOrder: role.sort_order,
  }));
}

export async function getEligibleStudents(
  supabase: SupabaseClient<any, any, any>,
  classId: string,
): Promise<RosterStudentInput[]> {
  const { data, error } = await supabase
    .from("students")
    .select("id, war_name, student_number, situation")
    .eq("class_id", classId)
    .is("deleted_at", null)
    .order("student_number");

  if (error) throw new Error(error.message);
  return (data ?? []).map((student: any) => ({
    id: student.id,
    warName: student.war_name,
    studentNumber: student.student_number,
    situation: student.situation,
  }));
}

export async function getHistoricalAssignments(
  supabase: SupabaseClient<any, any, any>,
  classId: string,
): Promise<HistoricalAssignmentInput[]> {
  const { data, error } = await supabase
    .from("duty_assignments")
    .select("student_id, role_id, duty_date")
    .eq("class_id", classId)
    .in("status", ["prevista", "confirmada"])
    .order("duty_date");

  if (error) throw new Error(error.message);
  return (data ?? []).map((assignment: any) => ({
    studentId: assignment.student_id,
    roleId: assignment.role_id,
    dutyDate: assignment.duty_date,
  }));
}

export async function getActiveImpediments(
  supabase: SupabaseClient<any, any, any>,
): Promise<DutyImpedimentInput[]> {
  const { data, error } = await supabase
    .from("duty_impediments")
    .select("student_id, starts_on, ends_on, affected_role_ids")
    .eq("active", true);

  if (error) throw new Error(error.message);
  return (data ?? []).map((impediment: any) => ({
    studentId: impediment.student_id,
    startsOn: impediment.starts_on,
    endsOn: impediment.ends_on,
    affectedRoleIds: impediment.affected_role_ids,
  }));
}

export async function getDutyAssignmentsForDate(
  supabase: SupabaseClient<any, any, any>,
  dutyDate: string,
): Promise<DutyAssignmentView[]> {
  const { data: assignments, error } = await supabase
    .from("duty_assignments")
    .select("id, duty_date, role_id, student_id, status, assignment_source, manual_reason")
    .eq("duty_date", dutyDate)
    .in("status", ["prevista", "confirmada"])
    .order("duty_date");

  if (error) throw new Error(error.message);
  if (!assignments?.length) return [];

  const roleIds = [...new Set(assignments.map((item: any) => item.role_id))];
  const studentIds = [...new Set(assignments.map((item: any) => item.student_id))];

  const [{ data: roles }, { data: students }] = await Promise.all([
    supabase.from("duty_roles").select("id, code, name, sort_order").in("id", roleIds),
    supabase.from("students").select("id, war_name, student_number, situation").in("id", studentIds),
  ]);

  const rolesById = new Map((roles ?? []).map((role: any) => [role.id, role]));
  const studentsById = new Map((students ?? []).map((student: any) => [student.id, student]));

  return assignments
    .map((assignment: any) => {
      const role = rolesById.get(assignment.role_id);
      const student = studentsById.get(assignment.student_id);
      if (!role || !student) return null;

      return {
        id: assignment.id,
        dutyDate: assignment.duty_date,
        status: assignment.status,
        assignmentSource: assignment.assignment_source,
        manualReason: assignment.manual_reason,
        role: {
          id: role.id,
          code: role.code,
          name: role.name,
          sortOrder: role.sort_order,
        },
        student: {
          id: student.id,
          warName: student.war_name,
          studentNumber: student.student_number,
          situation: student.situation,
        },
        studentLabel: formatStudentLabel(student),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.role.sortOrder - b.role.sortOrder) as DutyAssignmentView[];
}

export async function getActiveImpedimentViews(
  supabase: SupabaseClient<any, any, any>,
  onDate: string,
): Promise<DutyImpedimentView[]> {
  const { data, error } = await supabase
    .from("duty_impediments")
    .select(
      "id, student_id, impediment_type, starts_on, ends_on, reason, operational_note, affected_role_ids, active",
    )
    .eq("active", true)
    .lte("starts_on", onDate)
    .gte("ends_on", onDate)
    .order("starts_on");

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const studentIds = [...new Set(data.map((item: any) => item.student_id))];
  const { data: students } = await supabase
    .from("students")
    .select("id, war_name, student_number")
    .in("id", studentIds);
  const studentsById = new Map((students ?? []).map((student: any) => [student.id, student]));

  return data.map((item: any) => ({
    id: item.id,
    studentId: item.student_id,
    studentLabel: formatStudentLabel(studentsById.get(item.student_id) ?? {}),
    impedimentType: item.impediment_type,
    startsOn: item.starts_on,
    endsOn: item.ends_on,
    reason: item.reason,
    operationalNote: item.operational_note,
    affectedRoleIds: item.affected_role_ids,
    active: item.active,
  }));
}

export async function getRecentDutyLogs(
  supabase: SupabaseClient<any, any, any>,
  limit = 5,
): Promise<DutyLogView[]> {
  const { data, error } = await supabase
    .from("duty_assignment_logs")
    .select("id, action, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((log: any) => ({
    id: log.id,
    action: log.action,
    reason: log.reason,
    createdAt: log.created_at,
  }));
}
