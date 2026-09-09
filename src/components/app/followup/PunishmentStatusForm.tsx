"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  PUNISHMENT_STATUSES,
  PUNISHMENT_STATUS_LABELS,
  type PunishmentStatus,
} from "@/modules/cadet-followup/domain/followUp";
import {
  updatePunishmentStatusAction,
  type ActionResult,
} from "@/modules/cadet-followup/presentation/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Salvando…" : "Atualizar cumprimento"}
    </Button>
  );
}

export function PunishmentStatusForm({
  recordId,
  current,
}: {
  recordId: string;
  current: PunishmentStatus;
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    updatePunishmentStatusAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="recordId" value={recordId} />

      {state && !state.ok && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="punishment-status">Situação do cumprimento</Label>
        <Select id="punishment-status" name="status" defaultValue={current}>
          {PUNISHMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PUNISHMENT_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="statusNotes">Observação (opcional)</Label>
        <Textarea id="statusNotes" name="statusNotes" rows={2} />
      </div>

      <SubmitButton />
    </form>
  );
}
