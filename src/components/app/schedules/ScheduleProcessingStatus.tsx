import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ScheduleDocumentView } from "@/modules/schedule-repository/application/types";
import { reprocessScheduleAction } from "@/modules/schedule-repository/presentation/actions";

const statusLabel: Record<string, string> = {
  uploaded: "Aguardando processamento",
  processing: "Na fila ou em processamento",
  processed: "Processado",
  processed_with_issues: "Revisão necessária",
  failed: "Falha no processamento",
  superseded: "Versão superada",
};

function statusVariant(status: string) {
  if (status === "processed") return "success" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "processing" || status === "processed_with_issues") return "warning" as const;
  return "outline" as const;
}

export function ScheduleProcessingStatus({ document }: { document: ScheduleDocumentView }) {
  const run = document.latest_run;
  const metrics = (run?.metrics ?? {}) as Record<string, unknown>;
  const canReprocess =
    document.publication_status === "published" &&
    document.processing_status !== "superseded" &&
    !["queued", "running"].includes(run?.status ?? "");
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(document.processing_status)}>
          {statusLabel[document.processing_status] ?? document.processing_status}
        </Badge>
        {document.review_count > 0 && (
          <Badge variant="warning">{document.review_count} pendência(s)</Badge>
        )}
      </div>
      {run && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Tentativa</dt>
          <dd>{run.attempt}</dd>
          <dt className="text-muted-foreground">Método</dt>
          <dd>{String(metrics.extractionMethod ?? run.method)}</dd>
          <dt className="text-muted-foreground">Candidatos</dt>
          <dd>{String(metrics.candidateCount ?? "—")}</dd>
          {run.error_code && (
            <>
              <dt className="text-muted-foreground">Erro</dt>
              <dd title={run.error_message ?? undefined}>{run.error_code}</dd>
            </>
          )}
        </dl>
      )}
      {canReprocess && (
        <form action={reprocessScheduleAction}>
          <input type="hidden" name="document_id" value={document.id} />
          <Button type="submit" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            {run ? "Reprocessar" : "Processar agora"}
          </Button>
        </form>
      )}
    </div>
  );
}
