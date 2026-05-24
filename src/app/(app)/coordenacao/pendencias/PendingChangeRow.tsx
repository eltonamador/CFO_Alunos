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
import { Badge } from "@/components/ui/Badge";
import { DiffTable } from "./DiffTable";
import type { PendingChangeWithStudent } from "@/lib/supabase/queries/pending";

const CONTEXT_LABELS: Record<
  string,
  { label: string; variant: "warning" | "outline" | "gold" | "success" }
> = {
  health: { label: "Saúde", variant: "warning" },
  contato: { label: "Contato", variant: "outline" },
  endereco: { label: "Endereço", variant: "outline" },
  identificacao: { label: "Identificação", variant: "gold" },
  emergencia: { label: "Emergência", variant: "warning" },
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

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

  const ctx = CONTEXT_LABELS[pending.context] ?? {
    label: pending.context,
    variant: "outline" as const,
  };

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="pendingId" value={pending.id} />

      {/* Cabeçalho com contexto e timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={ctx.variant}>{ctx.label}</Badge>
          <span className="text-muted-foreground">
            Solicitado em <span className="num-mono">{formatDateTime(pending.created_at)}</span>
          </span>
        </div>
      </div>

      {/* Diff visual destacando campos alterados */}
      <DiffTable
        previous={pending.previous_value}
        next={pending.new_value}
        context={pending.context}
      />

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
