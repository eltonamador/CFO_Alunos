"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { ScheduleManagedAssignmentView } from "@/modules/schedule-repository/application/types";
import {
  cancelScheduleAssignmentAction,
  correctScheduleAssignmentAction,
  type ScheduleActionResult,
} from "@/modules/schedule-repository/presentation/actions";

const statusLabel: Record<string, string> = {
  published: "Vigente",
  corrected: "Corrigida",
  cancelled: "Cancelada",
  superseded: "PDF substituído",
};

function Submit({ label, destructive = false }: { label: string; destructive?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button variant={destructive ? "destructive" : "default"} disabled={pending}>
      {pending ? "Registrando…" : label}
    </Button>
  );
}

function CorrectionForm({ assignment }: { assignment: ScheduleManagedAssignmentView }) {
  const [state, action] = useFormState<ScheduleActionResult | null, FormData>(
    correctScheduleAssignmentAction,
    null,
  );
  return (
    <form action={action} className="mt-3 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="assignment_id" value={assignment.id} />
      <label className="space-y-1 text-sm font-medium">
        <span>Cadete</span>
        <Select name="student_id" defaultValue={assignment.student_id} required>
          {assignment.students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.student_number ? `${String(student.student_number).padStart(2, "0")} · ` : ""}
              {student.war_name} — {student.full_name}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1 text-sm font-medium">
        <span>Data</span>
        <Input name="duty_date" type="date" defaultValue={assignment.duty_date ?? ""} required />
      </label>
      <label className="space-y-1 text-sm font-medium md:col-span-2">
        <span>Função</span>
        <Input
          name="duty_function"
          defaultValue={assignment.duty_function ?? assignment.schedule_type_name}
          required
          minLength={2}
          maxLength={200}
        />
      </label>
      <label className="space-y-1 text-sm font-medium md:col-span-2">
        <span>Motivo da correção</span>
        <Textarea name="reason" required minLength={5} maxLength={500} />
      </label>
      {state && (
        <Alert className="md:col-span-2" variant={state.ok ? "success" : "destructive"}>
          {state.message}
        </Alert>
      )}
      <div className="md:col-span-2">
        <Submit label="Registrar correção" />
      </div>
    </form>
  );
}

function CancellationForm({ assignmentId }: { assignmentId: string }) {
  const [state, action] = useFormState<ScheduleActionResult | null, FormData>(
    cancelScheduleAssignmentAction,
    null,
  );
  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <Textarea
        name="reason"
        required
        minLength={5}
        maxLength={500}
        placeholder="Motivo do cancelamento"
      />
      {state && <Alert variant={state.ok ? "success" : "destructive"}>{state.message}</Alert>}
      <Submit label="Confirmar cancelamento" destructive />
    </form>
  );
}

export function ScheduleAssignmentManager({
  assignments,
}: {
  assignments: ScheduleManagedAssignmentView[];
}) {
  if (!assignments.length) return null;
  const current = assignments.filter((assignment) => assignment.status === "published");
  const history = assignments.filter((assignment) => assignment.status !== "published");
  return (
    <section className="space-y-3" aria-labelledby="schedule-assignments-title">
      <div>
        <h2 id="schedule-assignments-title" className="font-display text-xl font-semibold">
          Atribuições e histórico
        </h2>
        <p className="text-sm text-muted-foreground">
          Correções criam uma nova versão e preservam todos os registros anteriores.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {current.map((assignment) => (
          <Card key={assignment.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{assignment.student_name}</p>
                <p className="text-xs text-muted-foreground">
                  {assignment.schedule_type_name} · {assignment.class_name}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="success">Vigente</Badge>
                {assignment.notification_status && (
                  <Badge variant="outline">Aviso: {assignment.notification_status}</Badge>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm">
              {assignment.duty_date ?? "Data não informada"} · {assignment.duty_function || "Função não informada"}
            </p>
            <details className="mt-3 rounded-md border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold">Corrigir atribuição</summary>
              <CorrectionForm assignment={assignment} />
            </details>
            <details className="mt-2 rounded-md border border-destructive/30 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-destructive">
                Cancelar atribuição
              </summary>
              <CancellationForm assignmentId={assignment.id} />
            </details>
          </Card>
        ))}
      </div>
      {history.length > 0 && (
        <details className="rounded-lg border border-border bg-card p-4">
          <summary className="cursor-pointer font-semibold">
            Histórico preservado ({history.length})
          </summary>
          <div className="mt-3 space-y-2">
            {history.map((assignment) => (
              <div key={assignment.id} className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{assignment.student_name}</span>
                  <Badge variant="outline">{statusLabel[assignment.status] ?? assignment.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {assignment.document_name} · {assignment.duty_date ?? "sem data"} · {assignment.duty_function || "sem função"}
                </p>
                {assignment.correction_reason && (
                  <p className="mt-1 text-xs">Motivo: {assignment.correction_reason}</p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
