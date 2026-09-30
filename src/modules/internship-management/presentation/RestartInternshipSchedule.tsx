"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restartInternshipScheduleAction } from "./restartAction";

export type RestartPreview = {
  published_shifts: number;
  active_assignments: number;
  future_shifts: number;
  attendance_points: number;
  cadet_reports: number;
  execution_records: number;
  open_invites: number;
  answered_evaluations: number;
  snapshot: string;
};

export function RestartInternshipSchedule({
  programId,
  preview,
}: {
  programId: string;
  preview: RestartPreview;
}) {
  const [reason, setReason] = useState("Replanejamento da escala para publicação definitiva.");
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const protectedRecords =
    preview.published_shifts !== preview.future_shifts ||
    preview.attendance_points > 0 ||
    preview.cadet_reports > 0 ||
    preview.execution_records > 0 ||
    preview.answered_evaluations > 0;
  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer font-semibold">Recomeçar a escala de estágio</summary>
      <div className="mt-4 space-y-3 text-sm">
        <p>
          Plantões publicados: <strong>{preview.published_shifts}</strong> · participações ativas:{" "}
          <strong>{preview.active_assignments}</strong> · convites pendentes de avaliação:{" "}
          <strong>{preview.open_invites}</strong>.
        </p>
        <p>
          Esta ação cancela os plantões e participações ativos e invalida os convites pendentes em
          uma única operação. A carga prevista deixa de contar. O histórico continua na Agenda, em
          “Movimentados”. O programa, os locais e os padrões ficam disponíveis para criar outra
          escala.
        </p>
        {protectedRecords ? (
          <p role="alert" className="rounded border border-amber-500 p-3">
            Há plantão iniciado, ponto, relato, execução ou avaliação respondida. Confira esses
            registros individualmente antes de recomeçar.
          </p>
        ) : null}
        <label className="block font-medium">
          Motivo do reinício
          <textarea
            className="mt-1 block min-h-20 w-full rounded border bg-background p-2"
            value={reason}
            maxLength={1000}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="rounded border border-destructive px-4 py-3 font-semibold text-destructive disabled:opacity-50"
          disabled={
            pending ||
            protectedRecords ||
            preview.published_shifts === 0 ||
            reason.trim().length < 5
          }
          onClick={() =>
            startTransition(async () => {
              const result = await restartInternshipScheduleAction({
                programId,
                snapshot: preview.snapshot,
                reason,
              });
              setFeedback(
                result.error ??
                  `Escala reiniciada: ${result.cancelledShifts} plantões e ${result.cancelledAssignments} participações cancelados. ${result.revokedInvites} convite(s) invalidados.`,
              );
              if (!result.error) router.refresh();
            })
          }
        >
          {pending ? "Reiniciando…" : `Cancelar ${preview.published_shifts} plantões e recomeçar`}
        </button>
        {feedback ? (
          <p role="status" className="rounded bg-muted p-3">
            {feedback}
          </p>
        ) : null}
      </div>
    </details>
  );
}
