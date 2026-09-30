import { formatMinutes } from "../domain/workload";
import { internshipProgress } from "../domain/progress";

function dateLabel(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function ProgressTrack({
  label,
  percent,
  tone = "primary",
  valueLabel,
}: {
  label: string;
  percent: number;
  tone?: "primary" | "muted";
  valueLabel?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, Math.max(0, Math.round(percent)))}
      className={`relative overflow-hidden rounded-full bg-muted ${valueLabel ? "h-8" : "h-3"}`}
    >
      <div
        className={`h-full rounded-full transition-[width] ${tone === "primary" ? "bg-primary" : "bg-slate-500"}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
      {valueLabel && (
        <span className="absolute inset-y-0 right-2 flex items-center">
          <span className="rounded bg-background/90 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
            {valueLabel}
          </span>
        </span>
      )}
    </div>
  );
}

export function InternshipProgress({
  startsOn,
  endsOn,
  validatedMinutes,
  requiredMinutes,
  plannedMinutes,
  shiftEnds,
  now,
  title = "Progresso do estágio",
}: {
  startsOn: string;
  endsOn: string;
  validatedMinutes: number;
  requiredMinutes: number;
  plannedMinutes: number;
  shiftEnds: readonly string[];
  now: Date;
  title?: string;
}) {
  const progress = internshipProgress({
    startsOn,
    endsOn,
    validatedMinutes,
    requiredMinutes,
    shiftEnds,
    now,
  });

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5" aria-label={title}>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Período de {dateLabel(startsOn)} a {dateLabel(endsOn)} · somente horas homologadas entram na carga.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <span className="font-medium">Período do estágio</span>
            <strong className="text-xl tabular-nums">{progress.periodPercent}%</strong>
          </div>
          <ProgressTrack
            label="Período do estágio"
            percent={progress.periodPercent}
            tone="muted"
            valueLabel={`${progress.elapsedDays}/${progress.totalDays} dias completos`}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <span className="font-medium">Horas homologadas</span>
            <strong className="text-xl tabular-nums">{progress.hoursPercent}%</strong>
          </div>
          <ProgressTrack
            label="Horas homologadas para o mínimo"
            percent={progress.hoursBarPercent}
            valueLabel={`${formatMinutes(validatedMinutes)} / ${formatMinutes(requiredMinutes)}`}
          />
          <p className="text-xs text-muted-foreground">
            Faltam {formatMinutes(progress.missingMinutes)} para o mínimo.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-sm">
        <span>
          <strong className="tabular-nums">{progress.endedShifts}/{progress.totalShifts}</strong> plantões publicados encerrados ({progress.shiftsPercent}%)
        </span>
        <span>
          <strong className="tabular-nums">{formatMinutes(plannedMinutes)}</strong> previstas na escala
        </span>
      </div>
    </section>
  );
}
