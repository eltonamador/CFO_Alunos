import { Badge } from "@/components/ui/Badge";
import type { AcademicResult as Result } from "@/modules/academic-management/domain/academic";

export function formatAcademicNumber(value: number | null | undefined): string {
  return value == null
    ? "—"
    : value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 7 });
}

export function AcademicResultSummary({ result }: { result: Result }) {
  const metrics = [
    ["Média corrente (MVC)", result.mvc],
    ["VF de referência para MFVF", result.requiredVf],
    ["VF mínima para aprovação", result.requiredVfForApproval],
    ["Média após VF", result.vfAverage],
    ["Nota final", result.finalGrade],
  ] as const;
  return (
    <div className="space-y-3">
      <Badge
        variant={
          result.status === "approved" || result.status === "approved_vf"
            ? "success"
            : result.status.startsWith("failed")
              ? "destructive"
              : result.status.startsWith("pending")
                ? "warning"
                : result.vfRequired
                  ? "info"
                  : "default"
        }
      >
        {result.label}
      </Badge>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-mono text-base font-semibold">{formatAcademicNumber(value)}</dd>
          </div>
        ))}
      </dl>
      {result.vfRequired && result.requiredVfForApproval == null && (
        <p className="text-sm text-muted-foreground">
          Aprovação por VF não alcançável com os parâmetros atuais. Confira a política e os motivos
          abaixo com a coordenação.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Frequência: {formatAcademicNumber(result.attendancePercent)}
        {result.attendancePercent != null ? "%" : ""} · Desconto por faltas:{" "}
        {formatAcademicNumber(result.absencePenalty)} · MVC antes do desconto:{" "}
        {formatAcademicNumber(result.unadjustedMvc)}
      </p>
      {result.reasons.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          {result.reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
