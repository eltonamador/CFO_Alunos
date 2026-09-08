"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import type { ReasonSuggestion } from "@/modules/cadet-followup/domain/followUp";
import {
  decideFollowUpAction,
  type ActionResult,
} from "@/modules/cadet-followup/presentation/actions";
import { ReasonAutocomplete } from "./ReasonAutocomplete";

function SubmitButton({ outcome }: { outcome: "deferido" | "indeferido" | null }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      variant={outcome === "deferido" ? "success" : "default"}
      className="w-full"
      disabled={pending || !outcome}
    >
      {pending ? "Registrando…" : "Registrar decisão"}
    </Button>
  );
}

/**
 * Análise da Coordenação: DEFERIDO encerra o FO; INDEFERIDO permite
 * escolher uma punição já usada (autocomplete) ou escrever uma nova.
 */
export function DecisionForm({
  recordId,
  punishmentSuggestions,
}: {
  recordId: string;
  punishmentSuggestions: ReasonSuggestion[];
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    decideFollowUpAction,
    null,
  );
  const [outcome, setOutcome] = React.useState<"deferido" | "indeferido" | null>(null);
  const [punishment, setPunishment] = React.useState("");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="recordId" value={recordId} />
      <input type="hidden" name="outcome" value={outcome ?? ""} />

      {state && !state.ok && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={outcome === "deferido"}
          onClick={() => setOutcome("deferido")}
          className={cn(
            "min-h-[56px] rounded-md border px-4 font-display text-sm font-bold uppercase tracking-[0.06em] transition-colors",
            outcome === "deferido"
              ? "border-emerald-700 bg-emerald-700 text-white"
              : "border-border bg-card text-foreground/80 hover:bg-secondary",
          )}
        >
          Deferido
        </button>
        <button
          type="button"
          aria-pressed={outcome === "indeferido"}
          onClick={() => setOutcome("indeferido")}
          className={cn(
            "min-h-[56px] rounded-md border px-4 font-display text-sm font-bold uppercase tracking-[0.06em] transition-colors",
            outcome === "indeferido"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground/80 hover:bg-secondary",
          )}
        >
          Indeferido
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {outcome === "deferido"
          ? "Justificativa aceita — o FO é encerrado sem punição."
          : outcome === "indeferido"
            ? "Justificativa não aceita. A punição é opcional neste momento."
            : "Escolha o resultado da análise."}
      </p>

      <div className="space-y-2">
        <Label htmlFor="rationale">Fundamentação (opcional)</Label>
        <Textarea id="rationale" name="rationale" rows={3} />
      </div>

      {outcome === "indeferido" && (
        <div className="space-y-4 rounded-md border border-border bg-secondary/50 p-3">
          <div className="space-y-2">
            <Label htmlFor="punishmentText">Punição (opcional)</Label>
            <ReasonAutocomplete
              id="punishmentText"
              name="punishmentText"
              value={punishment}
              onChange={setPunishment}
              suggestions={punishmentSuggestions}
              placeholder="Ex.: Serviço extra"
            />
            <p className="text-xs text-muted-foreground">
              Escolha uma punição já utilizada ou escreva uma nova.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instruções para cumprimento (opcional)</Label>
            <Textarea id="instructions" name="instructions" rows={3} />
          </div>
        </div>
      )}

      <SubmitButton outcome={outcome} />
    </form>
  );
}
