"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  reuploadDocumentAction,
  type ActionResult,
} from "@/modules/documents/presentation/actions/documentActions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Enviando..." : "Reenviar"}
    </Button>
  );
}

export function ReuploadButton({ documentId }: { documentId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    reuploadDocumentAction,
    null,
  );

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reenviar arquivo
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-2" encType="multipart/form-data">
      <input type="hidden" name="documentId" value={documentId} />
      <input
        ref={fileRef}
        name="file"
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        required
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
      />
      {state?.ok === false && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Documento reenviado.</Alert>}
      <div className="flex gap-2">
        <Submit />
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
