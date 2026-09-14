import { getSession } from "@/modules/identity/presentation/session";
import { calculateAcademicResult, validatePolicyParameters } from "../domain/academic";
import type {
  AcademicDashboard,
  AcademicDetail,
  AcademicPolicy,
  EnrollmentView,
  OfferingView,
} from "../application/types";
import {
  AcademicDataError,
  academicError,
  createAcademicClient,
  type AcademicClient,
  type AcademicTables,
} from "./database";
import { buildStudentSummaries } from "../application/summary";

async function academicSession() {
  const session = await getSession();
  if (!session?.active || session.isFirstAccess)
    throw new AcademicDataError(
      "Sessão inválida. Entre novamente para consultar suas disciplinas.",
    );
  return session;
}

/** PostgREST has a row cap: page through the complete authorized history. */
async function rows<K extends keyof AcademicTables>(
  client: AcademicClient,
  table: K,
  offeringId?: string,
): Promise<AcademicTables[K]["Row"][]> {
  const result: AcademicTables[K]["Row"][] = [];
  for (let start = 0; ; start += 500) {
    let query = client
      .from(table)
      .select("*")
      .order("id")
      .range(start, start + 499);
    if (offeringId) query = query.filter("offering_id", "eq", offeringId);
    const { data, error } = await query;
    if (error) throw academicError(error);
    const batch = (data ?? []) as unknown as AcademicTables[K]["Row"][];
    result.push(...batch);
    if (batch.length < 500) return result;
  }
}

async function loadData(offeringId?: string) {
  const session = await academicSession();
  const client = createAcademicClient();
  const [
    disciplines,
    offerings,
    rawPolicies,
    enrollments,
    assessments,
    grades,
    academicYears,
    calendarEvents,
    sessions,
    sessionInstructors,
    sessionAttendances,
    aliases,
    classesResponse,
    coursesResponse,
    staffResponse,
    studentsResponse,
  ] = await Promise.all([
    rows(client, "academic_disciplines"),
    offeringId
      ? client
          .from("academic_offerings")
          .select("*")
          .eq("id", offeringId)
          .then(({ data, error }) => {
            if (error) throw academicError(error);
            return data ?? [];
          })
      : rows(client, "academic_offerings"),
    rows(client, "academic_policies"),
    rows(client, "academic_enrollments", offeringId),
    rows(client, "academic_assessments", offeringId),
    rows(client, "academic_grades", offeringId),
    rows(client, "academic_years"),
    rows(client, "academic_calendar_events"),
    rows(client, "academic_instruction_sessions", offeringId),
    rows(client, "academic_session_instructors"),
    rows(client, "academic_session_attendances"),
    rows(client, "academic_discipline_aliases"),
    client.from("classes").select("id,name,course_id").order("name"),
    client.from("courses").select("id,code,name,year").order("year", { ascending: false }),
    session.role === "coordenacao"
      ? client
          .from("profiles")
          .select("id,full_name,role")
          .eq("active", true)
          .in("role", ["coordenacao", "instrutor"])
          .order("full_name")
      : Promise.resolve({ data: [], error: null }),
    session.role === "coordenacao"
      ? client
          .from("students")
          .select("id,class_id,war_name,student_number,pelotao")
          .is("deleted_at", null)
          .eq("course_status", "matriculado")
          .order("student_number")
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const response of [classesResponse, coursesResponse, staffResponse, studentsResponse])
    if (response.error) throw academicError(response.error);
  const policies: AcademicPolicy[] = rawPolicies.map((policy) => {
    if (!validatePolicyParameters(policy.parameters))
      throw new AcademicDataError(
        "Há uma versão de regras incompatível. A coordenação deve revisar a configuração antes de calcular resultados.",
      );
    return { ...policy, parameters: policy.parameters };
  });
  const classes = classesResponse.data ?? [];
  const courses = coursesResponse.data ?? [];
  const sessionById = new Map(sessions.map((item) => [item.id, item]));
  const sessionAbsences = new Map<string, { justified: number; unjustified: number }>();
  for (const attendance of sessionAttendances) {
    const session = sessionById.get(attendance.session_id);
    if (!session || session.status !== "validated" || session.taught_hours === null) continue;
    const current = sessionAbsences.get(attendance.enrollment_id) ?? { justified: 0, unjustified: 0 };
    if (attendance.status === "justified_absence") current.justified += session.taught_hours;
    if (attendance.status === "unjustified_absence") current.unjustified += session.taught_hours;
    sessionAbsences.set(attendance.enrollment_id, current);
  }
  const offeringViews: OfferingView[] = offerings.map((offering) => {
    const discipline = disciplines.find((item) => item.id === offering.discipline_id);
    if (!discipline)
      throw new AcademicDataError("A disciplina desta oferta não pôde ser carregada.");
    return {
      ...offering,
      discipline,
      class_name: classes.find((item) => item.id === offering.class_id)?.name ?? "Turma",
    };
  });
  const enrollmentViews: EnrollmentView[] = enrollments.map((enrollment) => {
    const offering = offeringViews.find((item) => item.id === enrollment.offering_id);
    if (!offering) throw new AcademicDataError("A oferta desta matrícula não pôde ser carregada.");
    const policy = policies.find((item) => item.id === offering.policy_id);
    if (offering.policy_id && !policy)
      throw new AcademicDataError("A versão de regras desta oferta não pôde ser carregada.");
    const scoreFor = (kind: "VC" | "VF", sequence: number) => {
      const assessment = assessments.find(
        (item) =>
          item.offering_id === offering.id && item.kind === kind && item.sequence === sequence,
      );
      return (
        grades.find(
          (item) => item.enrollment_id === enrollment.id && item.assessment_id === assessment?.id,
        )?.score ?? null
      );
    };
    const journal = sessionAbsences.get(enrollment.id) ?? { justified: 0, unjustified: 0 };
    // Null no legado significa "ainda não conferido"; não transformamos isso em zero.
    const justifiedAbsences =
      enrollment.justified_absences === null ? null : enrollment.justified_absences + journal.justified;
    const unjustifiedAbsences =
      enrollment.unjustified_absences === null ? null : enrollment.unjustified_absences + journal.unjustified;
    return {
      ...enrollment,
      legacy_justified_absences: enrollment.justified_absences,
      legacy_unjustified_absences: enrollment.unjustified_absences,
      journal_justified_absences: journal.justified,
      journal_unjustified_absences: journal.unjustified,
      result: calculateAcademicResult({
        kind: offering.discipline.kind,
        workloadHours: offering.workload_hours,
        vcCount: offering.vc_count,
        policy: policy?.parameters ?? null,
        vcScores: Array.from({ length: offering.vc_count }, (_, index) =>
          scoreFor("VC", index + 1),
        ),
        vfScore: scoreFor("VF", 1),
        justifiedAbsences,
        unjustifiedAbsences,
      }),
    };
  });
  return {
    client,
    session,
    disciplines,
    offerings: offeringViews,
    policies,
    enrollments: enrollmentViews,
    assessments,
    grades,
    academicYears,
    calendarEvents,
    sessions,
    sessionInstructors,
    sessionAttendances,
    aliases,
    classes,
    courses,
    staff: staffResponse.data ?? [],
    students: studentsResponse.data ?? [],
  };
}

export async function getAcademicDashboard(): Promise<AcademicDashboard> {
  const data = await loadData();
  const student_summaries = buildStudentSummaries(
    data.enrollments,
    data.offerings,
    data.policies,
    data.classes,
  );
  return {
    disciplines: data.disciplines,
    offerings: data.offerings,
    classes: data.classes,
    courses: data.courses,
    academicYears: data.academicYears,
    calendarEvents: data.calendarEvents,
    sessions: data.sessions,
    sessionAttendances: data.sessionAttendances,
    staff: data.staff,
    students: data.students,
    enrollments: data.enrollments,
    student_summaries,
  };
}

export async function getAcademicDetail(id: string): Promise<AcademicDetail | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const data = await loadData(id);
  const offering = data.offerings[0];
  if (!offering) return null;
  const [assignments, audit] = await Promise.all([
    rows(data.client, "academic_assignments", id),
    data.session.role === "coordenacao"
      ? rows(data.client, "academic_audit_events", id)
      : Promise.resolve([]),
  ]);
  return {
    offering,
    discipline: offering.discipline,
    policy: data.policies.find((policy) => policy.id === offering.policy_id) ?? null,
    assignments,
    enrollments: data.enrollments,
    assessments: data.assessments.sort(
      (a, b) => a.kind.localeCompare(b.kind) || a.sequence - b.sequence,
    ),
    grades: data.grades,
    audit: audit.sort(
      (a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
    ),
    staff: data.staff,
    availableStudents: data.students.filter(
      (student) =>
        student.class_id === offering.class_id &&
        !data.enrollments.some((item) => item.student_id === student.id),
    ),
    sessions: data.sessions.sort(
      (a, b) => b.scheduled_on.localeCompare(a.scheduled_on) || b.id.localeCompare(a.id),
    ),
    sessionInstructors: data.sessionInstructors.filter((item) =>
      data.sessions.some((session) => session.id === item.session_id),
    ),
    sessionAttendances: data.sessionAttendances.filter((item) =>
      data.enrollments.some((enrollment) => enrollment.id === item.enrollment_id),
    ),
    aliases: data.aliases.filter((item) => item.discipline_id === offering.discipline_id),
  };
}
