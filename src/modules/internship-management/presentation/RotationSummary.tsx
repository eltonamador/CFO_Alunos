import type { RotationCandidate } from "../domain/rotation";
import { formatMinutes } from "../domain/workload";

export function RotationSummary({ candidate }: { candidate: RotationCandidate }) {
  const rest = (minutes: number | null) =>
    minutes === null ? "sem serviço próximo cadastrado" : formatMinutes(minutes);
  return (
    <p className="text-xs text-muted-foreground">
      Descanso antes: {rest(candidate.restBeforeMinutes)} · depois:{" "}
      {rest(candidate.restAfterMinutes)}. {candidate.weekendCount} fins de semana comprometidos
      {candidate.isWeekendService &&
        ` · ${candidate.projectedWeekendStreak} consecutivos com esta escolha`}
      . Descansos de 24h nos 28 dias anteriores: {candidate.minimumRestOccurrences}. Máximo de
      descansos de 24h em 28 dias afetados por esta escolha: {candidate.projectedMinimumRestMaximum}
      /3.
    </p>
  );
}
