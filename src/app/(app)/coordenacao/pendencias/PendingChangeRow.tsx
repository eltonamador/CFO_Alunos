"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import {
  resolvePendingChangeAction,
  type ActionResult,
} from "@/modules/student-profile/presentation/actions/studentActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import type { PendingChangeWithStudent } from "@/lib/supabase/queries/pending";

function SubmitVariant({ decision, label }: { decision: "validar" | "recusar"; label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      variant={decision === "validar" ? "default" : "destructive"}
      size="sm"
      disabled={pending}
    >
      {pending ? "..." : label}
    </Button>
  );
}

export function PendingChangeRow({ pending }: { pending: PendingChangeWithStudent }) {
  const [showReason, setShowReason] = useState(false);
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    resolvePendingChangeAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="pendingId" value={pending.id} />

      <details className="rounded-md border bg-muted/30 p-3 text-xs">
        <summary className="cursor-pointer text-sm font-medium">
          Ver alteração (antes / depois)
        </summary>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-muted-foreground">Antes</p>
            <pre className="overflow-auto rounded bg-background p-2">
              {JSON.stringify(pending.previous_value, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-muted-foreground">Depois</p>
            <pre className="overflow-auto rounded bg-background p-2">
              {JSON.stringify(pending.new_value, null, 2)}
            </pre>
          </div>
        </div>
      </details>

      {showReason && (
        <Input
          name="reason"
          placeholder="Motivo da recusa (obrigatório)"
          aria-label="Motivo da recusa"
          required
        />
      )}

      {state?.ok === false && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Pendência resolvida.</Alert>}

      <div className="flex flex-wrap gap-2">
        <SubmitVariant decision="validar" label="Validar" />
        {showReason ? (
          <SubmitVariant decision="recusar" label="Confirmar recusa" />
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowReason(true)}>
            Recusar
          </Button>
        )}
      </div>
    </form>
  );
}
