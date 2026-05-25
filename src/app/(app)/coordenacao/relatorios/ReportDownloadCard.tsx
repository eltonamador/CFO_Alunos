"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { PdfConfigModal, type ReportSlug } from "./PdfConfigModal";

type Format = "xlsx" | "pdf";

interface ReportDownloadCardProps {
  slug: string;
  title: string;
  description: string;
  icon: string;
  sensitive?: boolean;
  statLabel: string;
  statValue: string;
  /** Se false, esconde o botão XLSX (ex.: ficha personalizada só tem PDF). */
  xlsxAvailable?: boolean;
}

const EXPECTED_CONTENT_TYPE: Record<Format, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

function filenameFromDisposition(disposition: string | null, fallback: string) {
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

export function ReportDownloadCard({
  slug,
  title,
  description,
  icon,
  sensitive = false,
  statLabel,
  statValue,
  xlsxAvailable = true,
}: ReportDownloadCardProps) {
  const [loading, setLoading] = React.useState<Format | null>(null);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  async function downloadReport(format: Format, selectedFields?: string[]) {
    setLoading(format);
    setMessage(null);

    try {
      const url = `/api/reports/${slug}?format=${format}`;
      const options: RequestInit = {
        credentials: "same-origin",
        cache: "no-store",
      };

      if (format === "pdf" && selectedFields) {
        options.method = "POST";
        options.headers = {
          "Content-Type": "application/json",
        };
        options.body = JSON.stringify({ selectedFields });
      }

      const response = await fetch(url, options);
      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok || !contentType.includes(EXPECTED_CONTENT_TYPE[format])) {
        let error = "Não foi possível gerar o relatório.";
        if (contentType.includes("application/json")) {
          const payload = await response.json().catch(() => null);
          const main = payload?.error ?? error;
          const detail = payload?.detail;
          // Mostra o detail (mensagem específica do servidor) junto, se houver.
          error = detail ? `${main} — ${detail}` : main;
        }
        throw new Error(error);
      }

      const blob = await response.blob();
      const fallbackName = `${slug}-CFO2026.1.${format}`;
      const filename = filenameFromDisposition(response.headers.get("content-disposition"), fallbackName);
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);

      setMessage({ type: "success", text: `${format.toUpperCase()} gerado para download.` });
      setModalOpen(false); // Close modal on success
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Falha ao baixar relatório.",
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <article
      data-testid={`report-card-${slug}`}
      className="flex min-h-[252px] flex-col rounded-lg border border-border bg-card p-5 shadow-card-sm transition-all hover:border-primary/30 hover:shadow-card-md"
    >
      <div className="flex flex-1 items-start gap-4">
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-secondary text-2xl"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-semibold uppercase tracking-[0.02em] text-foreground">
                {title}
              </h2>
              {sensitive && <Badge variant="warning">LGPD</Badge>}
            </div>
            <p className="max-w-prose text-sm leading-6 text-muted-foreground">{description}</p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{statValue}</span>
            <span>{statLabel}</span>
          </div>
        </div>
      </div>

      <div className={cn("mt-5 grid gap-2", xlsxAvailable ? "sm:grid-cols-2" : "sm:grid-cols-1")}>
        {xlsxAvailable && (
          <button
            type="button"
            data-testid={`download-${slug}-xlsx`}
            onClick={() => downloadReport("xlsx")}
            disabled={loading !== null}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold uppercase tracking-[0.06em] text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Baixar XLSX
          </button>
        )}
        <button
          type="button"
          data-testid={`download-${slug}-pdf`}
          onClick={() => setModalOpen(true)}
          disabled={loading !== null}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold uppercase tracking-[0.06em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileText className="h-4 w-4" />
          {xlsxAvailable ? "Baixar PDF" : "Configurar e baixar PDF"}
        </button>
      </div>

      {message && (
        <p
          className={cn(
            "mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
            message.type === "success"
              ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
              : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.type === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {message.text}
        </p>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Download className="h-3 w-3" />
        Gerado em tempo real pelo Supabase Cloud.
      </p>

      <PdfConfigModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        slug={slug as ReportSlug}
        title={title}
        sensitive={sensitive}
        isGenerating={loading === "pdf"}
        onGenerate={(fields) => downloadReport("pdf", fields)}
      />
    </article>
  );
}
