import type {
  AcademicClass,
  AcademicDashboard,
  AcademicPolicy,
  EnrollmentView,
  OfferingView,
} from "./types";

/** VF counts distinct disciplines in the course, including transfers between its classes. */
export function buildStudentSummaries(
  enrollments: EnrollmentView[],
  offerings: OfferingView[],
  policies: AcademicPolicy[],
  courseClasses: AcademicClass[] = [],
): AcademicDashboard["student_summaries"] {
  const byStudent = new Map<string, EnrollmentView[]>();
  for (const enrollment of enrollments)
    byStudent.set(enrollment.student_id, [
      ...(byStudent.get(enrollment.student_id) ?? []),
      enrollment,
    ]);
  return [...byStudent].map(([student_id, items]) => {
    const counted = new Set<string>();
    const classes = new Map<string, { name: string; vf: Set<string>; limits: Set<number> }>();
    for (const item of items) {
      const offering = offerings.find((entry) => entry.id === item.offering_id);
      if (!offering) continue;
      const courseId =
        courseClasses.find((entry) => entry.id === offering.class_id)?.course_id ??
        offering.class_id;
      const group = classes.get(courseId) ?? {
        name: offering.class_name,
        vf: new Set<string>(),
        limits: new Set<number>(),
      };
      const policy = policies.find((entry) => entry.id === offering.policy_id);
      if (policy) group.limits.add(policy.parameters.maxVfDisciplines);
      if (item.result.vfRequired) {
        group.vf.add(offering.discipline_id);
        counted.add(`${courseId}:${offering.discipline_id}`);
      }
      classes.set(courseId, group);
    }
    const alerts = [
      "Resumo das matrículas disponíveis. Não certifica conclusão, classificação nem frequência total do curso; pesos e histórico completo precisam ser conferidos.",
    ];
    for (const group of classes.values()) {
      if (group.limits.size > 1)
        alerts.push(
          `${group.name}: as versões de regras têm limites de VF diferentes. A coordenação deve compatibilizá-las antes de avaliar o curso.`,
        );
      else {
        const limit = [...group.limits][0];
        if (limit !== undefined && group.vf.size > limit)
          alerts.push(
            `${group.name}: ${group.vf.size} disciplinas distintas indicam VF, acima do limite ${limit} configurado. Requer análise da coordenação (RI art. 40).`,
          );
      }
    }
    return {
      student_id,
      student_label: items[0]?.student_label ?? "Cadete",
      enrollment_count: items.length,
      vf_count: counted.size,
      pending_count: items.filter(
        (item) =>
          item.result.status.startsWith("pending") || item.result.status.startsWith("invalid"),
      ).length,
      alerts,
    };
  });
}
