"use client";

import { useMemo, useState, useTransition } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CheckCircle2, FileUp, Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import type { QtsDraftActivity } from "@/modules/qts/domain/qts";
import type { QtsDatabase } from "@/modules/qts/infrastructure/qtsDatabase";

type Preview = {
  file: File;
  periodStart: string;
  periodEnd: string;
  qtsNumber: string | null;
  pages: number;
  rows: QtsDraftActivity[];
};

const emptyRow = (): QtsDraftActivity => ({
  id: `manual-${crypto.randomUUID()}`,
  date: "",
  sequence: 0,
  startsAt: "",
  endsAt: "",
  activity: "",
  instructor: null,
  workload: null,
  uniform: null,
  location: null,
  isBreak: false,
  sourceLine: "Inclusão manual pela coordenação",
});

async function checksum(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function normalizeRows(rows: QtsDraftActivity[]) {
  return rows.map((row, index) => ({
    ...row,
    sequence: index + 1,
    startsAt: row.startsAt || "",
    endsAt: row.endsAt || "",
    activity: row.activity.trim(),
    instructor: row.instructor?.trim() || null,
    workload: row.workload?.trim() || null,
    uniform: row.uniform?.trim() || null,
    location: row.location?.trim() || null,
  }));
}

export function QtsPublicationForm({
  classes,
  academicYears,
  documents,
  qtsTypeId,
}: {
  classes: { id: string; name: string; course_id: string }[];
  academicYears: { id: string; course_id: string; year: number; starts_on: string; ends_on: string; status: string }[];
  documents: { id: string; class_id: string; original_filename: string; period_start: string | null; period_end: string | null }[];
  qtsTypeId: string;
}) {
  const [classId, setClassId] = useState(classes.length === 1 ? classes[0]!.id : "");
  const [academicYearId, setAcademicYearId] = useState("");
  const [supersedesDocumentId, setSupersedesDocumentId] = useState("");
  const [historicalDocumentId, setHistoricalDocumentId] = useState("");
  const [historicalYearId, setHistoricalYearId] = useState("");
  const selectedClass = classes.find((item) => item.id === classId);
  const availableAcademicYears = academicYears.filter(
    (item) => item.course_id === selectedClass?.course_id && item.status === "open",
  );
  const replaceableDocuments = documents.filter((item) => item.class_id === classId);
  const historicalDocument = documents.find((item) => item.id === historicalDocumentId);
  const historicalClass = classes.find((item) => item.id === historicalDocument?.class_id);
  const historicalYears = academicYears.filter(
    (item) => item.course_id === historicalClass?.course_id && item.status === "open",
  );
  const [source, setSource] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rows, setRows] = useState<QtsDraftActivity[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const period = useMemo(
    () => ({ start: preview?.periodStart ?? "", end: preview?.periodEnd ?? "" }),
    [preview?.periodEnd, preview?.periodStart],
  );

  function updateRow(id: string, patch: Partial<QtsDraftActivity>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setReviewed(false);
  }

  async function extract() {
    if (!source) {
      setError("Selecione o PDF original do QTS.");
      return;
    }
    setError(null);
    setDone(null);
    setProgress("Preparando a leitura…");
    try {
      const { readQtsFile } = await import("@/modules/qts/infrastructure/browserImport");
      const result = await readQtsFile(source, setProgress);
      const next = {
        file: result.file,
        periodStart: result.periodStart,
        periodEnd: result.periodEnd,
        qtsNumber: result.qtsNumber,
        pages: result.pages,
        rows: result.rows,
      };
      setPreview(next);
      setRows(next.rows);
      setReviewed(false);
      if (!next.rows.length) setError("Não identifiquei atividades. Adicione as linhas manualmente antes de publicar.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível ler este QTS.");
    } finally {
      setProgress("");
    }
  }

  function publish() {
    if (!preview || !classId || !academicYearId) {
      setError("Selecione a turma, o ano letivo e leia o PDF antes de publicar.");
      return;
    }
    const values = normalizeRows(rows);
    if (!reviewed) {
      setError("Confirme que conferiu a tabela extraída antes de publicar.");
      return;
    }
    if (
      !values.length ||
      values.some(
        (row) =>
          !row.date ||
          !row.activity ||
          Boolean(row.startsAt) !== Boolean(row.endsAt),
      )
    ) {
      setError("Revise data, atividade e horários. Uma atividade pode ficar sem horário, mas início e término devem ser informados juntos.");
      return;
    }
    if (period.end < period.start || values.some((row) => row.date < period.start || row.date > period.end)) {
      setError("Todas as atividades devem ficar dentro da vigência indicada no PDF.");
      return;
    }
    startTransition(() => {
      void (async () => {
        setError(null);
        setProgress("Reservando e enviando o PDF…");
        try {
          const client = createSupabaseBrowserClient() as SupabaseClient<QtsDatabase>;
          const reserved = await client.rpc("schedule_register_document", {
            p_class_id: classId,
            p_schedule_type_id: qtsTypeId,
            p_original_filename: preview.file.name,
            p_size_bytes: preview.file.size,
            p_checksum_sha256: await checksum(preview.file),
            p_period_start: period.start,
            p_period_end: period.end,
            p_supersedes_document_id: supersedesDocumentId || undefined,
          });
          if (reserved.error || !reserved.data)
            throw new Error(reserved.error?.message ?? "Não foi possível reservar o QTS.");
          const document = reserved.data;
          const upload = await client.storage.from("schedule-pdfs").upload(document.storage_path, preview.file, {
            contentType: "application/pdf",
            upsert: false,
          });
          if (upload.error) {
            await client.rpc("schedule_fail_upload", {
              p_document_id: document.id,
              p_reason: "Falha no envio do QTS conferido",
            });
            throw new Error(`O PDF não pôde ser enviado: ${upload.error.message}`);
          }
          setProgress("Publicando a agenda conferida…");
          const published = await client.rpc("qts_publish_reviewed_document", {
            p_document_id: document.id,
            p_activities: values as unknown as Json,
            p_academic_year_id: academicYearId,
          });
          if (published.error) throw new Error(published.error.message);
          setDone(`QTS${preview.qtsNumber ? ` nº ${preview.qtsNumber}` : ""} publicado com ${values.length} atividades.`);
          setPreview(null);
          setRows([]);
          setSource(null);
          setReviewed(false);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Não foi possível publicar o QTS.");
        } finally {
          setProgress("");
        }
      })();
    });
  }

  function linkPublishedQts() {
    if (!historicalDocumentId || !historicalYearId) {
      setError("Selecione o QTS publicado e o ano letivo correspondente.");
      return;
    }
    startTransition(() => {
      void (async () => {
        setError(null);
        setDone(null);
        try {
          const client = createSupabaseBrowserClient() as SupabaseClient<QtsDatabase>;
          const linked = await client.rpc("academic_link_qts_document", {
            p_document_id: historicalDocumentId,
            p_academic_year_id: historicalYearId,
            p_reason: "Vínculo de QTS publicado anteriormente ao diário acadêmico",
          });
          if (linked.error) throw new Error(linked.error.message);
          setDone(`QTS vinculado ao ano letivo; ${linked.data ?? 0} aula(s) planejada(s) foram verificadas.`);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Não foi possível vincular o QTS.");
        }
      })();
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card-sm">
      <div>
        <p className="section-eyebrow">Coordenação</p>
        <h2 className="font-display text-lg font-bold">Publicar novo QTS</h2>
        <p className="mt-1 text-sm text-muted-foreground">O sistema lê o PDF nativo e exige a conferência da tabela antes da publicação.</p>
      </div>
      {done && <Alert variant="success" className="mt-4"><CheckCircle2 className="h-4 w-4" />{done}</Alert>}
      {error && <Alert variant="destructive" className="mt-4">{error}</Alert>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          Turma
          <Select
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value);
              setAcademicYearId("");
              setSupersedesDocumentId("");
            }}
            disabled={busy || Boolean(preview)}
          >
            <option value="">Selecione</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Ano letivo acadêmico
          <Select value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)} disabled={busy || Boolean(preview) || !classId}>
            <option value="">Selecione</option>
            {availableAcademicYears.map((item) => <option key={item.id} value={item.id}>{item.year} · {item.starts_on.split("-").reverse().join("/")} a {item.ends_on.split("-").reverse().join("/")}</option>)}
          </Select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Substitui QTS anterior
          <Select
            value={supersedesDocumentId}
            onChange={(event) => setSupersedesDocumentId(event.target.value)}
            disabled={busy || Boolean(preview) || !classId}
          >
            <option value="">Não é uma substituição</option>
            {replaceableDocuments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.original_filename} · {item.period_start?.split("-").reverse().join("/") ?? "sem vigência"}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          PDF do QTS
          <Input
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy || Boolean(preview)}
            onChange={(event) => setSource(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      {!preview && (
        <Button className="mt-4" type="button" disabled={!source || busy} onClick={() => void extract()}>
          <FileUp className="h-4 w-4" aria-hidden /> Ler e conferir QTS
        </Button>
      )}
      {progress && <p role="status" className="mt-3 text-sm text-muted-foreground">{progress}</p>}
      {preview && (
        <div className="mt-5 space-y-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {preview.qtsNumber ? `QTS nº ${preview.qtsNumber}` : "QTS"} · {preview.pages} página(s) · {rows.length} atividade(s)
            </p>
            <span className="text-sm font-semibold">Vigência: {period.start.split("-").reverse().join("/")} a {period.end.split("-").reverse().join("/")}</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-[1050px] w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground">
                <tr>{["Data", "Início", "Término", "Atividade", "CH", "Instrutor", "Uniforme", "Local", "Pausa", ""].map((label) => <th key={label} className="p-2 font-semibold">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="p-1"><Input className="h-8 min-w-32" type="date" value={row.date} onChange={(event) => updateRow(row.id, { date: event.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 w-24" type="time" value={row.startsAt ?? ""} onChange={(event) => updateRow(row.id, { startsAt: event.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 w-24" type="time" value={row.endsAt ?? ""} onChange={(event) => updateRow(row.id, { endsAt: event.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 min-w-44" value={row.activity} onChange={(event) => updateRow(row.id, { activity: event.target.value })} /></td>
                    <td className="p-1"><Input className="h-8 w-20" value={row.workload ?? ""} onChange={(event) => updateRow(row.id, { workload: event.target.value || null })} /></td>
                    <td className="p-1"><Input className="h-8 min-w-32" value={row.instructor ?? ""} onChange={(event) => updateRow(row.id, { instructor: event.target.value || null })} /></td>
                    <td className="p-1"><Input className="h-8 min-w-28" value={row.uniform ?? ""} onChange={(event) => updateRow(row.id, { uniform: event.target.value || null })} /></td>
                    <td className="p-1"><Input className="h-8 min-w-24" value={row.location ?? ""} onChange={(event) => updateRow(row.id, { location: event.target.value || null })} /></td>
                    <td className="p-1 text-center"><input aria-label={`Marcar ${row.activity || "atividade"} como pausa`} type="checkbox" checked={row.isBreak} onChange={(event) => updateRow(row.id, { isBreak: event.target.checked })} /></td>
                    <td className="p-1"><Button type="button" variant="ghost" size="icon" aria-label="Remover atividade" onClick={() => { setRows((current) => current.filter((item) => item.id !== row.id)); setReviewed(false); }}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => { setRows((current) => [...current, { ...emptyRow(), date: period.start }]); setReviewed(false); }}>
            <Plus className="h-4 w-4" aria-hidden /> Adicionar atividade
          </Button>
          <label className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
            <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
            <span>Conferi horários, atividades, uniforme, local e responsável com o PDF original. Atividades sem horário ficam pendentes de complementação; uma correção exige nova versão do QTS.</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={publish}>Publicar QTS conferido</Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => { setPreview(null); setRows([]); setReviewed(false); setError(null); }}>Cancelar</Button>
          </div>
        </div>
      )}
      {documents.length > 0 && (
        <details className="mt-5 border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-semibold">Vincular QTS já publicado ao calendário</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              QTS publicado
              <Select value={historicalDocumentId} onChange={(event) => { setHistoricalDocumentId(event.target.value); setHistoricalYearId(""); }} disabled={busy}>
                <option value="">Selecione</option>
                {documents.map((item) => <option key={item.id} value={item.id}>{item.original_filename} · {item.period_start?.split("-").reverse().join("/") ?? "sem vigência"}</option>)}
              </Select>
            </label>
            <label className="space-y-1 text-sm font-medium">
              Ano letivo
              <Select value={historicalYearId} onChange={(event) => setHistoricalYearId(event.target.value)} disabled={busy || !historicalDocumentId}>
                <option value="">Selecione</option>
                {historicalYears.map((item) => <option key={item.id} value={item.id}>{item.year} · {item.starts_on.split("-").reverse().join("/")} a {item.ends_on.split("-").reverse().join("/")}</option>)}
              </Select>
            </label>
          </div>
          <Button className="mt-3" type="button" variant="secondary" disabled={busy || !historicalDocumentId || !historicalYearId} onClick={linkPublishedQts}>Vincular e gerar planejamento</Button>
        </details>
      )}
    </section>
  );
}
