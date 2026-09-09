"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  submitManifestationAction,
  type ActionResult,
} from "@/modules/cadet-followup/presentation/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Enviando…" : "Enviar manifestação"}
    </Button>
  );
}

/** Manifestação do cadete: texto obrigatório e anexos opcionais. */
export function ManifestationForm({ recordId }: { recordId: string }) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    submitManifestationAction,
    null,
  );
  const [body, setBody] = React.useState("");

  if (state?.ok) {
    return (
      <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        Manifestação enviada. Aguarde a análise da Coordenação.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="recordId" value={recordId} />

      {state && !state.ok && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="body">Apresente sua justificativa</Label>
        <Textarea
          id="body"
          name="body"
          rows={6}
          required
          autoFocus
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Descreva o que aconteceu."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="files">Anexos (opcional)</Label>
        <Input
          id="files"
          name="files"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
        />
        <p className="text-xs text-muted-foreground">Até 3 arquivos JPG, PNG ou PDF (10 MB cada).</p>
      </div>

      <SubmitButton />
    </form>
  );
}
