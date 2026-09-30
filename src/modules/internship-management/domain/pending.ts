export type PendingEvaluation = {
  assignment_id: string;
  version: number;
  status: string;
  expires_at: string | null;
};
export function internshipPending(
  row: {
    assignment_id: string | null;
    ends_at: string;
    shift_status: string;
    assignment_status: string | null;
    validation_status: string | null;
  },
  evaluations: PendingEvaluation[],
  now: number,
) {
  if (row.shift_status !== "publicado" || row.assignment_status !== "prevista") return [];
  const latest = evaluations
    .filter((e) => e.assignment_id === row.assignment_id)
    .sort((a, b) => b.version - a.version)[0];
  const ended = Date.parse(row.ends_at) <= now;
  const tasks: { key: string; label: string; action: "avaliacao" | "horas" }[] = [];
  if (latest?.status === "respondida")
    tasks.push({ key: "revisar", label: "Revisar avaliação recebida", action: "avaliacao" });
  else if (latest?.status === "devolvida")
    tasks.push({ key: "corrigir", label: "Solicitar nova avaliação", action: "avaliacao" });
  else if (
    latest?.status === "aguardando" &&
    latest.expires_at &&
    Date.parse(latest.expires_at) <= now
  )
    tasks.push({ key: "renovar", label: "Renovar link expirado", action: "avaliacao" });
  else if (ended && latest?.status === "aguardando")
    tasks.push({ key: "aguardar", label: "Aguardar resposta do oficial", action: "avaliacao" });
  else if (ended && (!latest || latest.status === "revogada"))
    tasks.push({
      key: "solicitar",
      label: "Solicitar avaliação ou registrar papel",
      action: "avaliacao",
    });
  if (ended && row.validation_status !== "homologado")
    tasks.push({ key: "homologar", label: "Conferir ficha e homologar horas", action: "horas" });
  return tasks;
}
