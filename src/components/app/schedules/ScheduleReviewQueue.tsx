"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { ScheduleReviewCandidateView } from "@/modules/schedule-repository/application/types";
import {
  confirmScheduleCandidateAction,
  type ScheduleActionResult,
} from "@/modules/schedule-repository/presentation/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Confirmando…" : "Confirmar vínculo"}</Button>;
}

function CandidateForm({ candidate }: { candidate: ScheduleReviewCandidateView }) {
  const [state, action] = useFormState<ScheduleActionResult | null, FormData>(
    confirmScheduleCandidateAction,
    null,
  );
  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{candidate.raw_name || "Nome não identificado"}</p>
          <p className="text-xs text-muted-foreground">
            {candidate.class_name} · {candidate.document_name}
          </p>
        </div>
        <Badge variant="warning">
          {candidate.match_status === "not_found" ? "Não encontrado" : "Revisar"}
        </Badge>
      </div>
      <blockquote className="rounded-md border-l-4 border-primary/40 bg-muted/50 p-3 font-mono text-xs">
        {candidate.original_line}
      </blockquote>
      <form action={action} className="space-y-3">
        <input type="hidden" name="candidate_id" value={candidate.id} />
        <label className="block space-y-1 text-sm font-medium">
          <span>Cadete correto</span>
          <Select name="student_id" required defaultValue="">
            <option value="" disabled>
              Selecione na turma
            </option>
            {candidate.students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.student_number
                  ? `${String(student.student_number).padStart(2, "0")} · `
                  : ""}
                {student.war_name} — {student.full_name}
                {candidate.candidate_student_ids.includes(student.id) ? " (sugerido)" : ""}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Justificativa da conferência</span>
          <Textarea name="reason" required minLength={5} maxLength={500} />
        </label>
        {state && <Alert variant={state.ok ? "success" : "destructive"}>{state.message}</Alert>}
        <SubmitButton />
      </form>
    </Card>
  );
}

export function ScheduleReviewQueue({ candidates }: { candidates: ScheduleReviewCandidateView[] }) {
  if (!candidates.length) return null;
  return (
    <section className="space-y-3" aria-labelledby="schedule-review-title">
      <div>
        <h2 id="schedule-review-title" className="font-display text-xl font-semibold">
          Mesa de revisão
        </h2>
        <p className="text-sm text-muted-foreground">
          Confirme somente após comparar a linha extraída com o PDF oficial.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {candidates.map((candidate) => (
          <CandidateForm key={candidate.id} candidate={candidate} />
        ))}
      </div>
    </section>
  );
}
