"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { calendarDay } from "../domain/rotation";
import { nextWeekend, type CancellationPreview } from "../domain/permanenceCancellation";
import { previewPermanenceCancellation, cancelPermanencePeriod } from "./permanenceActions";

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Belem",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function CancelPermanencePanel({ programId }: { programId: string }) {
  const router = useRouter();
  const weekend = nextWeekend(calendarDay(Date.now(), "America/Belem"));
  const [start, setStart] = useState(weekend.start);
  const [end, setEnd] = useState(weekend.end);
  const [preview, setPreview] = useState<CancellationPreview>();
  const [reason, setReason] = useState(
    "Suspensão do serviço do Dia ao 1º Ano para priorizar estágio operacional e guarda-vidas.",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function clear() {
    setPreview(undefined);
    setError("");
    setMessage("");
  }
  async function review() {
    clear();
    setBusy(true);
    try {
      const result = await previewPermanenceCancellation({ programId, start, end });
      if (result.error) setError(result.error);
      else setPreview(result.preview);
    } catch {
      setError("Não foi possível conferir. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!preview?.rosterIds.length) return;
    setBusy(true);
    setError("");
    try {
      const result = await cancelPermanencePeriod({
        programId,
        rosterIds: preview.rosterIds,
        assignmentIds: preview.assignmentIds,
        reason,
      });
      setPreview(undefined);
      if (result.error) setError(result.error);
      else {
        setMessage(
          `${result.count} turnos cancelados. Escalas, PDF e tela inicial atualizados. As próximas sugestões considerarão essa liberação e o descanso mínimo de 24 horas.`,
        );
        router.refresh();
      }
    } catch {
      setPreview(undefined);
      setError(
        "Não foi possível confirmar o resultado. Confira novamente o período antes de tentar cancelar.",
      );
    } finally {
      setBusy(false);
    }
  }
  const field = "mt-1 min-h-11 w-full rounded-md border bg-background px-3";
  return (
    <details id="cancelar-permanencia" className="rounded-xl border bg-card p-4">
      <summary className="min-h-8 cursor-pointer font-semibold text-primary">
        Cancelar serviço do Dia ao 1º Ano
      </summary>
      <p className="mt-3 text-sm text-muted-foreground">
        Libere os cadetes dos serviços do Dia ao 1º Ano que começam no período escolhido. Somente
        turnos ainda não iniciados; o histórico fica registrado.
      </p>
      <fieldset disabled={busy} className="my-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          De (serviço do Dia ao 1º Ano)
          <input
            type="date"
            className={field}
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              clear();
            }}
          />
        </label>
        <label className="text-sm">
          Até (serviço do Dia ao 1º Ano)
          <input
            type="date"
            className={field}
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              clear();
            }}
          />
        </label>
      </fieldset>
      <button
        type="button"
        disabled={busy || !start || !end || start > end}
        onClick={review}
        className="min-h-11 rounded-md border px-4 text-sm font-semibold disabled:opacity-50"
      >
        {busy ? "Processando…" : "Conferir cancelamento"}
      </button>
      {preview && (
        <div className="mt-4 space-y-3">
          {preview.rosterIds.length === 0 ? (
            <p role="status">Nenhum serviço futuro para cancelar nesse período.</p>
          ) : (
            <>
              <p className="text-sm">
                <strong>
                  {preview.rosterIds.length} turnos · {preview.assignmentIds.length} participações ·{" "}
                  {preview.cadetCount} cadetes
                </strong>
              </p>
              <ul className="space-y-2 text-sm">
                {preview.rosterIds.map((id) => {
                  const rows = preview.rows.filter((r) => r.rosterId === id);
                  const first = rows[0]!;
                  return (
                    <li key={id} className="rounded border p-3">
                      <strong>
                        {formatDate(first.startsAt!)} → {formatDate(first.endsAt!)} ·{" "}
                        {first.location}
                      </strong>
                      <br />
                      {rows
                        .map(
                          (r) => `${r.studentNumber ?? "—"} ${r.warName ?? "Cadete"} (${r.role})`,
                        )
                        .join("; ")}
                    </li>
                  );
                })}
              </ul>
              <p className="text-sm text-muted-foreground">
                Após cancelar, gere a escala de GBM ou praia para distribuir os cadetes, respeitando
                os outros serviços e 24 horas de descanso.
              </p>
              <label className="block text-sm">
                Motivo
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={busy}
                  maxLength={1000}
                  className={field}
                />
              </label>
              <button
                type="button"
                disabled={busy || reason.trim().length < 5}
                onClick={cancel}
                className="min-h-11 rounded-md bg-destructive px-4 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
              >
                Cancelar {preview.rosterIds.length} serviços do Dia ao 1º Ano
              </button>
            </>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </details>
  );
}
