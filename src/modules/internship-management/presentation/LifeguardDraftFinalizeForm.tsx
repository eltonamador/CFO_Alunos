"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { finalizeLifeguardDraftAction } from "./lifeguardDraftActions";

export function LifeguardDraftFinalizeForm({
  programId,
  shiftDate,
  count,
  published = false,
}: {
  programId: string;
  shiftDate: string;
  count: number;
  published?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const date = `${shiftDate.slice(8, 10)}/${shiftDate.slice(5, 7)}/${shiftDate.slice(0, 4)}`;

  return (
    <form
      className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError("");
        startTransition(async () => {
          const result = await finalizeLifeguardDraftAction({
            programId,
            shiftDate,
            documentReference: String(data.get("documentReference") ?? ""),
            officerName: String(data.get("officerName") ?? ""),
            published,
          });
          if (result.error) setError(result.error);
          else {
            setDone(true);
            router.refresh();
          }
        });
      }}
    >
      <div className="md:col-span-2">
        <h3 className="font-semibold">Guarda-vidas · {date}</h3>
        <p className="text-sm text-muted-foreground">
          {published
            ? `${count} postos publicados. Complete o documento e o nome do oficial quando forem conhecidos.`
            : `${count} dos cinco postos preparados. A escala fica visível aos cadetes após a publicação.`}
        </p>
      </div>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Documento operacional{published ? "" : " (opcional)"}</span>
        <input
          name="documentReference"
          required={published}
          minLength={published ? 5 : undefined}
          maxLength={200}
          className="h-11 w-full rounded-md border border-input bg-background px-3"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Oficial responsável pelo serviço{published ? "" : " (opcional)"}</span>
        <input
          name="officerName"
          required={published}
          minLength={3}
          maxLength={120}
          className="h-11 w-full rounded-md border border-input bg-background px-3"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive md:col-span-2">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="text-sm md:col-span-2">
          {published ? "Documento e oficial registrados." : "Escala publicada."}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || count !== 5 || done}
        className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {pending
          ? "Salvando…"
          : published
            ? "Registrar documento e oficial"
            : "Publicar os cinco postos"}
      </button>
    </form>
  );
}
