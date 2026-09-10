import { describe, expect, it } from "vitest";
import { buildStudentSummaries } from "./summary";
import { DEFAULT_POLICY_PARAMETERS, calculateAcademicResult } from "../domain/academic";
import type { AcademicPolicy, EnrollmentView, OfferingView } from "./types";

const policy: AcademicPolicy = {
  id: "policy",
  name: "Teste",
  parameters: { ...DEFAULT_POLICY_PARAMETERS },
  decision_ref: "Ata teste",
  approved_at: "2026-09-10",
  approved_by: "coord",
};
function offering(id: string, disciplineId: string, classId = "class-1"): OfferingView {
  return {
    id,
    discipline_id: disciplineId,
    class_id: classId,
    class_name: classId,
    academic_year: 2026,
    workload_hours: 30,
    vc_count: 1,
    policy_id: "policy",
    decision_ref: "Ata teste",
    active: true,
    created_at: "2026-09-10",
    discipline: {
      id: disciplineId,
      code: disciplineId,
      name: disciplineId,
      phase: 1,
      kind: "disciplina",
      workload_hours: 30,
      source_ref: "Teste",
      conflicts: [],
      active: true,
    },
  };
}
function enrollment(offeringId: string): EnrollmentView {
  return {
    id: offeringId,
    offering_id: offeringId,
    student_id: "cadete-1",
    student_label: "TESTE — 01",
    justified_absences: 0,
    unjustified_absences: 0,
    revision: 1,
    change_reason: null,
    result: calculateAcademicResult({
      kind: "disciplina",
      workloadHours: 30,
      vcCount: 1,
      policy: { ...DEFAULT_POLICY_PARAMETERS },
      vcScores: [6],
      vfScore: null,
      justifiedAbsences: 0,
      unjustifiedAbsences: 0,
    }),
  };
}
describe("student summary across phases and offerings", () => {
  it("keeps the course VF counter after transfer between classes of the same course", () => {
    const offers = [
      offering("a", "a"),
      offering("b", "b"),
      offering("c", "c", "class-2"),
      offering("d", "d", "class-2"),
    ];
    const classes = [
      { id: "class-1", name: "Turma A", course_id: "course" },
      { id: "class-2", name: "Turma B", course_id: "course" },
    ];
    const result = buildStudentSummaries(
      offers.map((item) => enrollment(item.id)),
      offers,
      [policy],
      classes,
    )[0];
    expect(result?.vf_count).toBe(4);
    expect(result?.alerts.some((message) => message.includes("acima do limite"))).toBe(true);
  });
  it("counts a repeated offering of one discipline only once", () => {
    const offers = [
      offering("a", "same"),
      offering("b", "same"),
      offering("c", "other"),
      offering("d", "third"),
    ];
    const result = buildStudentSummaries(
      offers.map((item) => enrollment(item.id)),
      offers,
      [policy],
    )[0];
    expect(result?.vf_count).toBe(3);
    expect(result?.alerts.some((message) => message.includes("acima do limite"))).toBe(false);
  });
  it("warns about four distinct disciplines but never merges different classes for a course threshold", () => {
    const offers = ["a", "b", "c", "d"].map((id) => offering(id, id));
    expect(
      buildStudentSummaries(
        offers.map((item) => enrollment(item.id)),
        offers,
        [policy],
      )[0]?.alerts.some((message) => message.includes("acima do limite")),
    ).toBe(true);
    offers[3] = offering("d", "d", "class-2");
    expect(
      buildStudentSummaries(
        offers.map((item) => enrollment(item.id)),
        offers,
        [policy],
      )[0]?.alerts.some((message) => message.includes("acima do limite")),
    ).toBe(false);
  });
  it("counts invalid data as a pending review, with a warning for incompatible limits", () => {
    const offers = [offering("a", "a"), { ...offering("b", "b"), policy_id: "other-policy" }];
    const items = offers.map((item) => enrollment(item.id));
    items[0]!.result.status = "invalid_input";
    items[0]!.result.vfRequired = false;
    const result = buildStudentSummaries(items, offers, [
      policy,
      { ...policy, id: "other-policy", parameters: { ...policy.parameters, maxVfDisciplines: 2 } },
    ])[0];
    expect(result?.pending_count).toBe(2);
    expect(result?.alerts.some((message) => message.includes("limites de VF diferentes"))).toBe(
      true,
    );
  });
});
