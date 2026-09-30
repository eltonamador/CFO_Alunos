/** Carga operacional é medida em minutos de relógio, nunca em horas-aula. */
export type Workload = {
  plannedMinutes: number;
  performedMinutes: number;
  validatedMinutes: number;
};

export type Approval = {
  actualStartsAt: string;
  actualEndsAt: string;
  approvedMinutes: number;
  supervisorName: string;
  paperReference: string;
  decisionReason?: string | null;
};

const WITH_OFFSET = /(?:Z|[+-](?:0\d|1\d|2[0-3]):[0-5]\d)$/i;

export function minutesBetween(startsAt: string, endsAt: string): number {
  if (!WITH_OFFSET.test(startsAt) || !WITH_OFFSET.test(endsAt)) {
    throw new Error("Informe data, hora e fuso nos dois horários.");
  }
  const starts = Date.parse(startsAt);
  const ends = Date.parse(endsAt);
  const difference = ends - starts;
  if (!Number.isFinite(difference) || difference <= 0 || difference % 60_000 !== 0) {
    throw new Error("O período deve ser positivo e definido em minutos completos.");
  }
  return difference / 60_000;
}

export function formatMinutes(minutes: number): string {
  if (!Number.isSafeInteger(minutes) || minutes < 0) {
    throw new Error("A carga deve ser um número inteiro de minutos não negativo.");
  }
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

export function validateApproval(approval: Approval): number {
  const performedMinutes = minutesBetween(approval.actualStartsAt, approval.actualEndsAt);
  if (!Number.isSafeInteger(approval.approvedMinutes) || approval.approvedMinutes < 0) {
    throw new Error("A carga homologada deve conter minutos inteiros não negativos.");
  }
  if (!approval.supervisorName.trim() || !approval.paperReference.trim()) {
    throw new Error("Identifique o supervisor e a ficha física.");
  }
  if (
    approval.approvedMinutes !== performedMinutes &&
    (approval.decisionReason?.trim().length ?? 0) < 5
  ) {
    throw new Error("Justifique a diferença entre carga realizada e homologada.");
  }
  return performedMinutes;
}

export function sumWorkload(rows: readonly Workload[]): Workload {
  return rows.reduce(
    (total, row) => {
      for (const value of [row.plannedMinutes, row.performedMinutes, row.validatedMinutes]) {
        if (!Number.isSafeInteger(value) || value < 0) {
          throw new Error("Carga inválida no extrato.");
        }
      }
      total.plannedMinutes += row.plannedMinutes;
      total.performedMinutes += row.performedMinutes;
      total.validatedMinutes += row.validatedMinutes;
      return total;
    },
    { plannedMinutes: 0, performedMinutes: 0, validatedMinutes: 0 },
  );
}

export function completion(
  validatedMinutes: number,
  requiredMinutes: number,
  targetMinutes: number,
) {
  if (
    ![validatedMinutes, requiredMinutes, targetMinutes].every(Number.isSafeInteger) ||
    validatedMinutes < 0 ||
    requiredMinutes <= 0 ||
    targetMinutes < requiredMinutes
  ) {
    throw new Error("Parâmetros de integralização inválidos.");
  }
  return {
    concluded: validatedMinutes >= requiredMinutes,
    missingRequiredMinutes: Math.max(0, requiredMinutes - validatedMinutes),
    missingTargetMinutes: Math.max(0, targetMinutes - validatedMinutes),
    excessMinutes: Math.max(0, validatedMinutes - requiredMinutes),
  };
}
