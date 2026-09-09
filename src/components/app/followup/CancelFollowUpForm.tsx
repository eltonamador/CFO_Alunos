"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  cancelFollowUpAction,
  type ActionResult,
} from "@/modules/cadet-followup/presentation/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      {pending ? "Cancelando…" : "Cancelar registro"}
    </Button>
  );
}

/** Saída para registros lançados por engano durante a revista. */
export function CancelFollowUpForm({ recordId }: { recordId: string }) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    cancelFollowUpAction,
    null,
  );

  return (
    <details className="rounded-md border border-border p-3">
      <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
        Cancelar este registro
      </summary>
      <form action={formAction} className="mt-3 space-y-2">
        <input type="hidden" name="recordId" value={recordId} />
        {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
        <Input name="reason" placeholder="Motivo do cancelamento" required />
        <SubmitButton />
      </form>
    </details>
  );
}
