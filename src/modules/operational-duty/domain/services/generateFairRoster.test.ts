import { describe, expect, it } from "vitest";
import { generateFairRoster, type DutyRoleInput, type RosterStudentInput } from "./generateFairRoster";

const roles: DutyRoleInput[] = [
  { id: "role-aluno-dia", code: "aluno_dia", name: "Aluno de Dia", sortOrder: 1 },
  { id: "role-subxerife", code: "subxerife", name: "Subxerife", sortOrder: 2 },
  { id: "role-alimentacao", code: "aluno_alimentacao", name: "Aluno Alimentacao", sortOrder: 3 },
  { id: "role-logistica", code: "aluno_logistica", name: "Aluno Logistica", sortOrder: 4 },
];

function makeStudents(count: number): RosterStudentInput[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `student-${index + 1}`,
    warName: `ALUNO ${index + 1}`,
    studentNumber: index + 1,
    situation: "matriculado",
  }));
}

describe("generateFairRoster", () => {
  it("nao escala o mesmo aluno em duas funcoes no mesmo dia", () => {
    const result = generateFairRoster({
      students: makeStudents(6),
      roles,
      startDate: "2026-06-01",
      endDate: "2026-06-01",
      historicalAssignments: [],
      impediments: [],
    });

    expect(result.assignments).toHaveLength(4);
    expect(new Set(result.assignments.map((a) => a.studentId)).size).toBe(4);
    expect(result.alerts).toHaveLength(0);
  });

  it("prioriza aluno que ainda nao exerceu a funcao antes de repetir o ciclo", () => {
    const students = makeStudents(5);
    const [s1, s2, s3, s4, s5] = students;

    const result = generateFairRoster({
      students,
      roles: [roles[0]!],
      startDate: "2026-06-10",
      endDate: "2026-06-10",
      historicalAssignments: [s1!, s2!, s3!, s4!].map((student, index) => ({
        studentId: student.id,
        roleId: roles[0]!.id,
        dutyDate: `2026-06-0${index + 1}`,
      })),
      impediments: [],
    });

    expect(result.assignments[0]?.studentId).toBe(s5!.id);
  });

  it("respeita impedimento ativo para a funcao", () => {
    const students = makeStudents(3);
    const [s1, s2] = students;

    const result = generateFairRoster({
      students,
      roles: [roles[0]!],
      startDate: "2026-06-10",
      endDate: "2026-06-10",
      historicalAssignments: [],
      impediments: [
        {
          studentId: s1!.id,
          startsOn: "2026-06-09",
          endsOn: "2026-06-11",
          affectedRoleIds: [roles[0]!.id],
        },
      ],
    });

    expect(result.assignments[0]?.studentId).toBe(s2!.id);
  });

  it("evita dias consecutivos quando existe outro candidato viavel", () => {
    const students = makeStudents(3);
    const [s1, s2] = students;

    const result = generateFairRoster({
      students,
      roles: [roles[0]!],
      startDate: "2026-06-10",
      endDate: "2026-06-10",
      historicalAssignments: [
        {
          studentId: s1!.id,
          roleId: roles[1]!.id,
          dutyDate: "2026-06-09",
        },
      ],
      impediments: [],
    });

    expect(result.assignments[0]?.studentId).toBe(s2!.id);
  });
});
