import type { InternshipScheduleReportRow } from "@/lib/reports/internship-report-data";

type Evaluation = {
  assignment_id: string;
  version: number;
  status: string;
  source: string;
  expires_at: string | null;
};

type Point = { assignment_id: string; point_type: string };

export type CompletedAssignment = InternshipScheduleReportRow & {
  evaluationLabel: string;
  evaluationKey: "recebida" | "aguardando" | "sem_convite" | "concluida" | "corrigir";
  pointLabel: string;
  homologated: boolean;
};

export function completedAssignments(
  schedule: InternshipScheduleReportRow[],
  evaluations: Evaluation[],
  points: Point[],
  now: number,
): CompletedAssignment[] {
  const latest = new Map<string, Evaluation>();
  for (const evaluation of evaluations) {
    const current = latest.get(evaluation.assignment_id);
    if (!current || evaluation.version > current.version) latest.set(evaluation.assignment_id, evaluation);
  }
  const pointTypes = new Map<string, Set<string>>();
  for (const point of points) {
    const types = pointTypes.get(point.assignment_id) ?? new Set<string>();
    types.add(point.point_type);
    pointTypes.set(point.assignment_id, types);
  }

  return schedule
    .filter((row) =>
      row.assignment_id && row.shift_status === "publicado" &&
      row.assignment_status === "prevista" && Date.parse(row.ends_at) <= now,
    )
    .map((row) => {
      const evaluation = latest.get(row.assignment_id!);
      const types = pointTypes.get(row.assignment_id!);
      const entry = types?.has("entrada") ?? false;
      const exit = types?.has("saida") ?? false;
      let evaluationKey: CompletedAssignment["evaluationKey"] = "sem_convite";
      let evaluationLabel = "Sem convite ou ficha registrada";
      if (evaluation?.status === "respondida") {
        evaluationKey = "recebida";
        evaluationLabel = "Recebida · revisar";
      } else if (evaluation?.status === "aguardando") {
        evaluationKey = "aguardando";
        evaluationLabel = evaluation.expires_at && Date.parse(evaluation.expires_at) <= now
          ? "Convite expirado · renovar"
          : "Convite gerado · aguardar oficial";
      } else if (evaluation?.status === "liberada") {
        evaluationKey = "concluida";
        evaluationLabel = "Avaliação revisada";
      } else if (evaluation?.status === "devolvida" || evaluation?.status === "revogada") {
        evaluationKey = "corrigir";
        evaluationLabel = "Pedir nova avaliação";
      }
      return {
        ...row,
        evaluationKey,
        evaluationLabel,
        pointLabel: entry && exit ? "Entrada e saída" : entry ? "Só entrada" : exit ? "Só saída" : "Sem ponto",
        homologated: row.validation_status === "homologado",
      };
    })
    .sort((a, b) => (a.student_number ?? 0) - (b.student_number ?? 0) || a.ends_at.localeCompare(b.ends_at));
}
