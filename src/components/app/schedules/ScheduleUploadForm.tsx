"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/supabase/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type {
  ScheduleClass,
  ScheduleDocumentView,
  ScheduleType,
} from "@/modules/schedule-repository/application/types";

const MAX_BYTES = 20 * 1024 * 1024;
type RegisterArgs = Database["public"]["Functions"]["schedule_register_document"]["Args"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function isPdf(file: File) {
  if (!file.name.toLowerCase().endsWith(".pdf")) return false;
  const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  return signature === "%PDF-";
}

export function ScheduleUploadForm({
  classes,
  types,
  documents,
}: {
  classes: ScheduleClass[];
  types: ScheduleType[];
  documents: ScheduleDocumentView[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [pending, startTransition] = useTransition();
  const activeTypes = types.filter((item) => item.active);

  async function submit(formData: FormData) {
    setMessage(null);
    const file = formData.get("file");
    const classId = String(formData.get("class_id") ?? "");
    const scheduleTypeId = String(formData.get("schedule_type_id") ?? "");
    const periodStart = String(formData.get("period_start") ?? "");
    const periodEnd = String(formData.get("period_end") ?? "");
    const supersedes = String(formData.get("supersedes_document_id") ?? "");
    if (!(file instanceof File) || !file.size) {
      setMessage({ ok: false, text: "Selecione um arquivo PDF." });
      return;
    }
    if (!classId || !scheduleTypeId) {
      setMessage({ ok: false, text: "Selecione a turma e o tipo de escala." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setMessage({ ok: false, text: "O PDF excede o limite de 20 MiB." });
      return;
    }
    if (!(await isPdf(file))) {
      setMessage({
        ok: false,
        text: "O arquivo selecionado não possui uma assinatura PDF válida.",
      });
      return;
    }
    if (periodStart && periodEnd && periodEnd < periodStart) {
      setMessage({ ok: false, text: "A data final deve ser posterior à data inicial." });
      return;
    }
    const client = createSupabaseBrowserClient();
    const args: RegisterArgs = {
      p_class_id: classId,
      p_schedule_type_id: scheduleTypeId,
      p_original_filename: file.name,
      p_size_bytes: file.size,
      p_checksum_sha256: await sha256(file),
      ...(periodStart ? { p_period_start: periodStart } : {}),
      ...(periodEnd ? { p_period_end: periodEnd } : {}),
      ...(supersedes ? { p_supersedes_document_id: supersedes } : {}),
    };
    const reservation = await client.rpc("schedule_register_document", args);
    if (reservation.error || !reservation.data) {
      setMessage({ ok: false, text: "Não foi possível reservar o documento para envio." });
      return;
    }
    const document = reservation.data;
    const upload = await client.storage.from("schedule-pdfs").upload(document.storage_path, file, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (upload.error) {
      await client.rpc("schedule_fail_upload", {
        p_document_id: document.id,
        p_reason: `Falha no Storage: ${upload.error.message}`.slice(0, 500),
      });
      setMessage({
        ok: false,
        text: "O envio falhou. A ocorrência foi registrada para auditoria.",
      });
      router.refresh();
      return;
    }
    const finalized = await client.rpc("schedule_finalize_document", {
      p_document_id: document.id,
    });
    if (finalized.error) {
      setMessage({
        ok: false,
        text: "O arquivo chegou ao Storage, mas a publicação precisa ser concluída novamente.",
      });
      router.refresh();
      return;
    }
    const queued = await client.rpc("schedule_request_reprocess", {
      p_document_id: document.id,
      p_method: "auto",
    });
    formRef.current?.reset();
    setSelectedClass("");
    setSelectedType("");
    setMessage({
      ok: true,
      text: queued.error
        ? "Escala publicada. O processamento automático precisa ser solicitado novamente."
        : "Escala publicada e adicionada à fila de processamento.",
    });
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      className="space-y-4"
      action={(formData) => startTransition(() => void submit(formData))}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Turma">
          <Select
            name="class_id"
            required
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
          >
            <option value="" disabled>
              Selecione a turma
            </option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo de escala">
          <Select
            name="schedule_type_id"
            required
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
          >
            <option value="" disabled>
              Selecione o tipo
            </option>
            {activeTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Início da vigência">
          <Input name="period_start" type="date" />
        </Field>
        <Field label="Fim da vigência">
          <Input name="period_end" type="date" />
        </Field>
        <Field label="Substitui uma publicação anterior">
          <Select name="supersedes_document_id" defaultValue="">
            <option value="">Não substitui</option>
            {documents
              .filter(
                (item) =>
                  item.publication_status === "published" &&
                  item.processing_status !== "superseded" &&
                  item.class_id === selectedClass &&
                  item.schedule_type_id === selectedType,
              )
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.schedule_type_name} · {item.class_name} · {item.original_filename}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Arquivo PDF">
          <Input name="file" type="file" accept="application/pdf,.pdf" required />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Máximo de 20 MiB. O arquivo original será preservado no histórico e não poderá ser
        sobrescrito.
      </p>
      {message && <Alert variant={message.ok ? "success" : "destructive"}>{message.text}</Alert>}
      <Button type="submit" disabled={pending || !classes.length || !activeTypes.length}>
        {pending ? "Enviando e publicando…" : "Publicar PDF"}
      </Button>
    </form>
  );
}
