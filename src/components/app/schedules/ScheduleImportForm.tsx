"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import type {
  ScheduleClass,
  ScheduleDocumentView,
  ScheduleType,
} from "@/modules/schedule-repository/application/types";
import type { ScheduleDatabase } from "@/modules/schedule-repository/infrastructure/extendedDatabase";
import type { BrowserImportResult } from "@/modules/schedule-repository/infrastructure/browserImport";
import {
  emptyImportRow,
  type ImportOfficer,
  type ImportRow,
  type ImportStudent,
} from "@/modules/schedule-repository/domain/importPreview";

export function ScheduleImportForm({
  classes,
  types,
  documents,
  students,
  officers,
}: {
  classes: ScheduleClass[];
  types: ScheduleType[];
  documents: ScheduleDocumentView[];
  students: ImportStudent[];
  officers: ImportOfficer[];
}) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes.length === 1 ? classes[0]!.id : "");
  const [typeId, setTypeId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [supersedes, setSupersedes] = useState("");
  const [source, setSource] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [preview, setPreview] = useState<BrowserImportResult | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [reservation, setReservation] = useState<{ id: string; storage_path: string } | null>(null);
  const selectedStudents = students.filter((student) => student.classId === classId);
  const typeName = types.find((type) => type.id === typeId)?.name ?? "Serviço de escala";
  useEffect(() => {
    if (!source) {
      setSourceUrl("");
      return;
    }
    const url = URL.createObjectURL(source);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [source]);
  function updateRow(index: number, patch: Partial<ImportRow>) {
    setRows((values) => values.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setReviewed(false);
  }
  async function extract() {
    if (!source || !classId || !typeId) {
      setError("Selecione turma, tipo e arquivo.");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress("Preparando a leitura…");
    try {
      const { readScheduleFile } =
        await import("@/modules/schedule-repository/infrastructure/browserImport");
      const result = await readScheduleFile(
        source,
        selectedStudents,
        officers,
        typeName,
        setProgress,
      );
      setPreview(result);
      setRows(result.rows);
      setReviewed(false);
      const dates = result.rows
        .map((row) => row.date)
        .filter(Boolean)
        .sort();
      if (!start && dates.length) setStart(dates[0]!);
      if (!end && dates.length) setEnd(dates[dates.length - 1]!);
      if (!result.rows.length)
        setError(
          "Não consegui identificar atribuições neste formato. Consulte o original e adicione as linhas para conferência.",
        );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível ler o arquivo.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!preview || !rows.length || !reviewed) return;
    setBusy(true);
    setError(null);
    setProgress("Salvando a publicação conferida…");
    try {
      if (end < start) throw new Error("Revise as datas de vigência.");
      if (
        rows.some(
          (row) =>
            !row.date ||
            row.date < start ||
            row.date > end ||
            row.dutyFunction.trim().length < 2 ||
            (row.kind === "cadet" && !row.studentId) ||
            (row.kind === "officer" &&
              (!row.person.trim() || !row.startsAt || !row.endsAt || !row.shift)),
        )
      )
        throw new Error(
          "Revise nomes, datas, funções e horários. Todas as datas devem estar dentro da vigência.",
        );
      const keys = rows.map((row) =>
        [
          row.kind,
          row.studentId || row.profileId || row.person,
          row.date,
          row.dutyFunction,
          row.shift,
        ].join("|"),
      );
      if (new Set(keys).size !== keys.length)
        throw new Error("Há linhas repetidas. Remova a duplicidade antes de publicar.");
      const client = createSupabaseBrowserClient() as SupabaseClient<ScheduleDatabase>;
      let document = reservation;
      if (!document) {
        const digest = await crypto.subtle.digest("SHA-256", await preview.file.arrayBuffer());
        const checksum = [...new Uint8Array(digest)]
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
        const registered = await client.rpc("schedule_register_document", {
          p_class_id: classId,
          p_schedule_type_id: typeId,
          p_original_filename: preview.file.name,
          p_size_bytes: preview.file.size,
          p_checksum_sha256: checksum,
          p_period_start: start,
          p_period_end: end,
          ...(supersedes ? { p_supersedes_document_id: supersedes } : {}),
        });
        if (registered.error || !registered.data)
          throw new Error(registered.error?.message ?? "Não foi possível reservar o documento.");
        document = registered.data;
        setReservation(document);
        const upload = await client.storage
          .from("schedule-pdfs")
          .upload(document.storage_path, preview.file, {
            contentType: "application/pdf",
            upsert: false,
          });
        if (upload.error) {
          await client.rpc("schedule_fail_upload", {
            p_document_id: document.id,
            p_reason: "Falha de envio durante a importação conferida",
          });
          setReservation(null);
          throw new Error("O envio do arquivo falhou. Tente novamente.");
        }
      }
      const result = await client.rpc("schedule_publish_reviewed_import", {
        p_document_id: document.id,
        p_rows: rows as unknown as Json,
        p_extraction: {
          pages: preview.pages,
          extractionMethod: preview.method,
          extractedText: preview.text,
          sourceFilename: source?.name ?? preview.file.name,
        },
      });
      if (result.error) throw new Error(result.error.message);
      setDone(true);
      router.refresh();
      // O disparo exige sessão de coordenação no servidor; não espera pelo cron noturno.
      void fetch("/api/schedules/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id }),
      }).catch(() => undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir a publicação.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  if (done)
    return (
      <Alert variant="success">
        Escala publicada com {rows.length} atribuições. Os nomes já estão disponíveis no painel e no
        calendário.
      </Alert>
    );
  return (
    <form onSubmit={(event) => void publish(event)} className="space-y-4">
      <fieldset disabled={busy || Boolean(preview)} className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          Turma
          <Select required value={classId} onChange={(event) => setClassId(event.target.value)}>
            <option value="">Selecione</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          Tipo de escala
          <Select required value={typeId} onChange={(event) => setTypeId(event.target.value)}>
            <option value="">Selecione</option>
            {types
              .filter((item) => item.active)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          PDF ou foto da escala
          <Input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
            onChange={(event) => setSource(event.target.files?.[0] ?? null)}
          />
        </label>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Até 20 MiB e 15 páginas. A leitura da foto acontece neste aparelho. A imagem será preservada
        dentro do PDF da publicação.
      </p>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm text-primary underline"
        >
          Abrir arquivo original para conferir
        </a>
      )}
      {!preview && (
        <Button
          type="button"
          onClick={() => void extract()}
          disabled={busy || !source || !classId || !typeId}
        >
          Ler arquivo e conferir
        </Button>
      )}
      {preview && (
        <>
          <fieldset disabled={busy || Boolean(reservation)} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              Início da vigência
              <Input
                required
                type="date"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              Fim da vigência
              <Input
                required
                type="date"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              Substitui publicação anterior
              <Select value={supersedes} onChange={(event) => setSupersedes(event.target.value)}>
                <option value="">Não substitui</option>
                {documents
                  .filter(
                    (item) =>
                      item.class_id === classId &&
                      item.schedule_type_id === typeId &&
                      item.publication_status === "published" &&
                      item.processing_status !== "superseded",
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.original_filename}
                    </option>
                  ))}
              </Select>
            </label>
          </fieldset>
          <h3 className="font-display text-lg font-semibold">Conferir {rows.length} atribuições</h3>
          <p className="text-sm text-muted-foreground">
            Compare com o original. Corrija os nomes não identificados, funções, datas e turnos
            antes de publicar.
          </p>
          <fieldset disabled={busy} className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={index}
                className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-2 ${row.kind === "cadet" && !row.studentId ? "border-amber-500 bg-amber-50/30" : "border-border"}`}
              >
                <div className="flex items-center justify-between gap-2 sm:col-span-2">
                  <span className="text-sm font-semibold">
                    Linha {index + 1} · {row.person || "Selecione o militar"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Remover linha ${index + 1}`}
                    onClick={() => {
                      setRows((values) => values.filter((_, i) => i !== index));
                      setReviewed(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <label className="space-y-1 text-sm">
                  Categoria
                  <Select
                    value={row.kind}
                    onChange={(event) =>
                      updateRow(index, {
                        kind: event.target.value as ImportRow["kind"],
                        studentId: "",
                        profileId: "",
                        shift: "",
                      })
                    }
                  >
                    <option value="cadet">Cadete</option>
                    <option value="officer">Oficial</option>
                  </Select>
                </label>
                {row.kind === "cadet" ? (
                  <label className="space-y-1 text-sm">
                    Cadete e matrícula
                    <Select
                      required
                      value={row.studentId}
                      onChange={(event) => {
                        const student = students.find((item) => item.id === event.target.value);
                        updateRow(index, {
                          studentId: event.target.value,
                          person: student?.warName ?? row.person,
                        });
                      }}
                    >
                      <option value="">Não identificado — selecione</option>
                      {selectedStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.warName} — {String(student.studentNumber ?? "").padStart(2, "0")}{" "}
                          · Mat. {student.registration ?? "não cadastrada"}
                        </option>
                      ))}
                    </Select>
                  </label>
                ) : (
                  <>
                    <label className="space-y-1 text-sm">
                      Conta do oficial
                      <Select
                        value={row.profileId}
                        onChange={(event) => {
                          const officer = officers.find(
                            (item) => item.profileId === event.target.value,
                          );
                          updateRow(index, {
                            profileId: event.target.value,
                            ...(officer ? { person: officer.person } : {}),
                          });
                        }}
                      >
                        <option value="">Sem conta vinculada</option>
                        {officers
                          .filter((item) => item.profileId)
                          .map((item) => (
                            <option key={item.profileId} value={item.profileId!}>
                              {item.person} · Mat. {item.registration}
                            </option>
                          ))}
                      </Select>
                    </label>
                    <label className="space-y-1 text-sm">
                      Nome do oficial
                      <Input
                        required
                        value={row.person}
                        readOnly={Boolean(row.profileId)}
                        onChange={(event) => updateRow(index, { person: event.target.value })}
                      />
                    </label>
                    {!row.profileId && (
                      <p className="text-xs text-amber-800">
                        Este oficial aparecerá na escala, mas não receberá lembrete pessoal até ter
                        uma conta vinculada.
                      </p>
                    )}
                  </>
                )}
                <label className="space-y-1 text-sm">
                  Data
                  <Input
                    required
                    type="date"
                    value={row.date}
                    onChange={(event) => updateRow(index, { date: event.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  Função
                  <Input
                    required
                    maxLength={160}
                    value={row.dutyFunction}
                    onChange={(event) => updateRow(index, { dutyFunction: event.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  Turno
                  {row.kind === "officer" ? (
                    <Select
                      required
                      value={row.shift}
                      onChange={(event) => updateRow(index, { shift: event.target.value })}
                    >
                      <option value="">Selecione</option>
                      {["manha", "tarde", "noite", "diurno", "noturno"].map((shift) => (
                        <option key={shift} value={shift}>
                          {shift === "manha" ? "Manhã" : shift}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      maxLength={35}
                      value={row.shift}
                      placeholder="Único, 1º turno, 2º turno…"
                      onChange={(event) => updateRow(index, { shift: event.target.value })}
                    />
                  )}
                </label>
                {row.kind === "officer" && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-sm">
                      Início
                      <Input
                        required
                        type="time"
                        value={row.startsAt}
                        onChange={(event) => updateRow(index, { startsAt: event.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      Término
                      <Input
                        required
                        type="time"
                        value={row.endsAt}
                        onChange={(event) => updateRow(index, { endsAt: event.target.value })}
                      />
                    </label>
                  </div>
                )}
                <details className="text-xs text-muted-foreground sm:col-span-2">
                  <summary>Texto extraído</summary>
                  <p className="mt-1 break-words">{row.sourceLine}</p>
                </details>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRows((values) => [...values, emptyImportRow(typeName, start)]);
                setReviewed(false);
              }}
              disabled={rows.length >= 500}
            >
              <Plus className="h-4 w-4" />
              Adicionar linha
            </Button>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(event) => setReviewed(event.target.checked)}
                className="mt-1"
              />
              Conferi nomes, matrículas, datas e turnos com o arquivo original.
            </label>
            <Button type="submit" disabled={!rows.length || !reviewed}>
              Publicar {rows.length} atribuições
            </Button>
          </fieldset>
        </>
      )}
      {busy && (
        <p role="status" className="text-sm font-semibold">
          {progress}
        </p>
      )}
      {error && <Alert variant="destructive">{error}</Alert>}
    </form>
  );
}
