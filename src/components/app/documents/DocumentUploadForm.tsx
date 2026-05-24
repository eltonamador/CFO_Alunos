"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRef } from "react";
import {
  uploadDocumentAction,
  type ActionResult,
} from "@/modules/documents/presentation/actions/documentActions";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import { DOCUMENT_TYPES } from "@/lib/supabase/queries/documents";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enviando..." : "Enviar documento"}
    </Button>
  );
}

export function DocumentUploadForm({ studentId }: { studentId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<ActionResult | null, FormData>(async (prev, fd) => {
    const result = await uploadDocumentAction(prev, fd);
    if (result.ok) formRef.current?.reset();
    return result;
  }, null);

  return (
    <form ref={formRef} action={formAction} className="space-y-3" encType="multipart/form-data">
      <input type="hidden" name="studentId" value={studentId} />

      <div className="space-y-2">
        <Label htmlFor="docType">Tipo</Label>
        <Select id="docType" name="docType" required>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
              {t.required ? " *" : ""}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Arquivo (JPG, PNG ou PDF — máx. 10 MB)</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          required
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
        />
      </div>

      {state?.ok === false && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Documento enviado para validação.</Alert>}

      <Submit />
    </form>
  );
}
