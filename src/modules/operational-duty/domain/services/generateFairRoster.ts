export type DutyRoleCode =
  | "aluno_dia"
  | "subxerife"
  | "aluno_alimentacao"
  | "aluno_logistica"
  | string;

export interface DutyRoleInput {
  id: string;
  code: DutyRoleCode;
  name: string;
  sortOrder: number;
}

export interface RosterStudentInput {
  id: string;
  warName: string;
  studentNumber: number | null;
  situation: string;
}

export interface HistoricalAssignmentInput {
  studentId: string;
  roleId: string;
  dutyDate: string;
}

export interface DutyImpedimentInput {
  studentId: string;
  startsOn: string;
  endsOn: string;
  affectedRoleIds?: string[] | null;
}

export interface GeneratedDutyAssignment {
  dutyDate: string;
  roleId: string;
  roleCode: DutyRoleCode;
  roleName: string;
  studentId: string;
  assignmentSource: "automatica";
}

export type RosterAlertType =
  | "sem_candidato"
  | "ciclo_relaxado"
  | "consecutivo_inevitavel";

export interface GeneratedRosterAlert {
  type: RosterAlertType;
  dutyDate: string;
  roleId: string;
  message: string;
}

export interface GenerateFairRosterInput {
  students: RosterStudentInput[];
  roles: DutyRoleInput[];
  startDate: string;
  endDate: string;
  historicalAssignments: HistoricalAssignmentInput[];
  impediments: DutyImpedimentInput[];
}

export interface GenerateFairRosterResult {
  assignments: GeneratedDutyAssignment[];
  alerts: GeneratedRosterAlert[];
}

const INELIGIBLE_SITUATIONS = new Set(["afastado", "desligado", "concluido"]);

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function previousDateKey(dateKey: string): string {
  return toDateKey(addDays(new Date(`${dateKey}T00:00:00.000Z`), -1));
}

function daysBetween(later: string, earlier: string): number {
  const laterTime = new Date(`${later}T00:00:00.000Z`).getTime();
  const earlierTime = new Date(`${earlier}T00:00:00.000Z`).getTime();
  return Math.round((laterTime - earlierTime) / 86_400_000);
}

function dateRange(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const dates: string[] = [];

  for (let current = start; current <= end; current = addDays(current, 1)) {
    dates.push(toDateKey(current));
  }

  return dates;
}

function isStudentEligible(student: RosterStudentInput): boolean {
  return !INELIGIBLE_SITUATIONS.has(student.situation);
}

function isImpeded(params: {
  studentId: string;
  roleId: string;
  dutyDate: string;
  impediments: DutyImpedimentInput[];
}): boolean {
  return params.impediments.some((impediment) => {
    if (impediment.studentId !== params.studentId) return false;
    if (params.dutyDate < impediment.startsOn || params.dutyDate > impediment.endsOn) return false;
    if (!impediment.affectedRoleIds || impediment.affectedRoleIds.length === 0) return true;
    return impediment.affectedRoleIds.includes(params.roleId);
  });
}

function countAssignments(
  assignments: HistoricalAssignmentInput[],
  studentId: string,
  roleId?: string,
): number {
  return assignments.filter(
    (assignment) =>
      assignment.studentId === studentId && (!roleId || assignment.roleId === roleId),
  ).length;
}

function wasAssignedOnDate(
  assignments: HistoricalAssignmentInput[],
  studentId: string,
  dutyDate: string,
): boolean {
  return assignments.some(
    (assignment) => assignment.studentId === studentId && assignment.dutyDate === dutyDate,
  );
}

function sameRoleRecencyPenalty(
  assignments: HistoricalAssignmentInput[],
  studentId: string,
  roleId: string,
  dutyDate: string,
): number {
  const mostRecent = assignments
    .filter((assignment) => assignment.studentId === studentId && assignment.roleId === roleId)
    .map((assignment) => assignment.dutyDate)
    .sort()
    .at(-1);

  if (!mostRecent) return 0;
  const distance = daysBetween(dutyDate, mostRecent);
  return distance > 0 && distance <= 7 ? 500 : 0;
}

export function generateFairRoster(input: GenerateFairRosterInput): GenerateFairRosterResult {
  const eligibleStudents = input.students
    .filter(isStudentEligible)
    .sort((a, b) => (a.studentNumber ?? 9999) - (b.studentNumber ?? 9999));
  const orderedRoles = [...input.roles].sort((a, b) => a.sortOrder - b.sortOrder);
  const assignments: GeneratedDutyAssignment[] = [];
  const alerts: GeneratedRosterAlert[] = [];
  const assignmentHistory: HistoricalAssignmentInput[] = [...input.historicalAssignments];

  for (const dutyDate of dateRange(input.startDate, input.endDate)) {
    const assignedToday = new Set(
      assignmentHistory
        .filter((assignment) => assignment.dutyDate === dutyDate)
        .map((assignment) => assignment.studentId),
    );

    for (const role of orderedRoles) {
      const candidates = eligibleStudents.filter((student) => {
        if (assignedToday.has(student.id)) return false;
        return !isImpeded({
          studentId: student.id,
          roleId: role.id,
          dutyDate,
          impediments: input.impediments,
        });
      });

      if (candidates.length === 0) {
        alerts.push({
          type: "sem_candidato",
          dutyDate,
          roleId: role.id,
          message: `Sem candidato elegivel para ${role.name} em ${dutyDate}.`,
        });
        continue;
      }

      const previousDay = previousDateKey(dutyDate);
      const hasNonConsecutiveCandidate = candidates.some(
        (student) => !wasAssignedOnDate(assignmentHistory, student.id, previousDay),
      );
      const minRoleCount = Math.min(
        ...eligibleStudents.map((student) => countAssignments(assignmentHistory, student.id, role.id)),
      );

      const ranked = candidates
        .map((student) => {
          const roleCount = countAssignments(assignmentHistory, student.id, role.id);
          const totalCount = countAssignments(assignmentHistory, student.id);
          const consecutive =
            hasNonConsecutiveCandidate &&
            wasAssignedOnDate(assignmentHistory, student.id, previousDay);
          const score =
            roleCount * 1000 +
            totalCount * 100 +
            (consecutive ? 10000 : 0) +
            sameRoleRecencyPenalty(assignmentHistory, student.id, role.id, dutyDate) +
            (student.studentNumber ?? 9999) / 1000;

          return { student, roleCount, consecutive, score };
        })
        .sort((a, b) => a.score - b.score);

      const selected = ranked[0]!;

      if (selected.roleCount > minRoleCount) {
        alerts.push({
          type: "ciclo_relaxado",
          dutyDate,
          roleId: role.id,
          message: `Ciclo de ${role.name} flexibilizado por impedimento ou conflito de escala.`,
        });
      }

      if (selected.consecutive) {
        alerts.push({
          type: "consecutivo_inevitavel",
          dutyDate,
          roleId: role.id,
          message: `Escala consecutiva inevitavel para ${role.name} em ${dutyDate}.`,
        });
      }

      assignments.push({
        dutyDate,
        roleId: role.id,
        roleCode: role.code,
        roleName: role.name,
        studentId: selected.student.id,
        assignmentSource: "automatica",
      });
      assignedToday.add(selected.student.id);
      assignmentHistory.push({
        dutyDate,
        roleId: role.id,
        studentId: selected.student.id,
      });
    }
  }

  return { assignments, alerts };
}
