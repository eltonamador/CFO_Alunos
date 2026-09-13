"use client";

import { useFormState } from "react-dom";
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

const errorLabel: Record<string, string> = {
  PDF_INVALID: "O arquivo não pôde ser interpretado como PDF válido.",
  PDF_READ_FAILED: "O servidor não conseguiu ler o PDF.",
  PDF_WORKER_UNAVAILABLE: "O leitor de PDF não está disponível no servidor.",
  OCR_REQUIRED: "O PDF parece digitalizado; a leitura por imagem ainda não está habilitada.",
  OCR_FAILED: "A leitura por imagem falhou.",
  PROCESSING_FAILED: "O processamento falhou.",
};

const candidateLabel: Record<string, string> = {
  auto_confirmed: "Vínculo automático",
  needs_review: "Conferir",
  not_found: "Aluno não localizado",
  manually_confirmed: "Vínculo confirmado",
  superseded: "Versão anterior",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function registrationInLine(line: string) {
  return line.match(/\b(\d{8})\s+CADETE\b/i)?.[1] ?? "—";
}

function statusVariant(status: string) {
  if (status === "processed") return "success" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "processing" || status === "processed_with_issues") return "warning" as const;
  return "outline" as const;
}

export function ScheduleProcessingStatus({ document }: { document: ScheduleDocumentView }) {
  const [reprocessResult, reprocessAction] = useFormState(reprocessScheduleAction, null);
  const run = document.latest_run;
  const metrics = (run?.metrics ?? {}) as Record<string, unknown>;
  const extractedText = typeof metrics.extractedText === "string" ? metrics.extractedText : "";
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
          {Number(metrics.officerCount ?? 0) > 0 && (
            <>
              <dt className="text-muted-foreground">Oficiais</dt>
              <dd>{String(metrics.officerCount)}</dd>
            </>
          )}
          {run.error_code && (
            <>
              <dt className="text-muted-foreground">Erro</dt>
              <dd>{errorLabel[run.error_code] ?? run.error_code}</dd>
            </>
          )}
        </dl>
      )}
      {run?.error_message && (
        <p className="rounded-md bg-destructive/5 p-2 text-xs text-destructive">
          Detalhes: {run.error_message}
        </p>
      )}
      {document.candidates.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">Dados identificados neste processamento</p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead className="bg-muted/60">
                <tr>
                  <th className="p-2">Data</th>
                  <th className="p-2">Pessoa</th>
                  <th className="p-2">Matrícula no PDF</th>
                  <th className="p-2">Função</th>
                  <th className="p-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {document.candidates.map((candidate) => (
                  <tr key={candidate.id} className="border-t border-border">
                    <td className="p-2">{formatDate(candidate.duty_date)}</td>
                    <td className="p-2" title={candidate.original_line}>
                      {candidate.raw_name || candidate.original_line}
                    </td>
                    <td className="p-2">{registrationInLine(candidate.original_line)}</td>
                    <td className="p-2">{candidate.duty_function || "—"}</td>
                    <td className="p-2">
                      {candidateLabel[candidate.match_status] ?? candidate.match_status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {document.officer_assignments?.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">Oficiais identificados na escala</p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[550px] text-left text-xs">
              <thead className="bg-muted/60">
                <tr>
                  <th className="p-2">Data</th>
                  <th className="p-2">Turno</th>
                  <th className="p-2">Militar</th>
                  <th className="p-2">Função</th>
                </tr>
              </thead>
              <tbody>
                {document.officer_assignments.map((entry) => (
                  <tr key={entry.id} className="border-t border-border">
                    <td className="p-2">{formatDate(entry.duty_date)}</td>
                    <td className="p-2">{{ manha: "Manhã", tarde: "Tarde", noite: "Noite", diurno: "Diurno", noturno: "Noturno" }[entry.shift] ?? entry.shift} · {entry.starts_at.slice(0, 5)}–{entry.ends_at.slice(0, 5)}</td>
                    <td className="p-2">{entry.display_name}</td>
                    <td className="p-2">{entry.duty_function}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {extractedText && (
        <details className="rounded-md border border-border p-2" open={!document.candidates.length}>
          <summary className="cursor-pointer font-medium">Conferir texto extraído do PDF</summary>
          <p className="mt-1 text-xs text-muted-foreground">
            Compare com o PDF oficial antes de confirmar vínculos.
            {metrics.extractedTextTruncated
              ? " Exibição limitada aos primeiros 100 mil caracteres."
              : ""}
          </p>
          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words bg-background p-2 text-xs">
            {extractedText}
          </pre>
        </details>
      )}
      {run?.status === "partial" && !document.candidates.length && (
        <p className="text-xs text-muted-foreground">
          Nenhum aluno da turma foi identificado automaticamente. Confira o texto extraído e o PDF
          oficial.
        </p>
      )}
      {canReprocess && (
        <form action={reprocessAction}>
          <input type="hidden" name="document_id" value={document.id} />
          <Button type="submit" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            {run ? "Solicitar reprocessamento" : "Solicitar processamento"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            A solicitação entra na fila de processamento automático.
          </p>
          {reprocessResult && (
            <p
              role="status"
              className={reprocessResult.ok ? "text-foreground" : "text-destructive"}
            >
              {reprocessResult.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
