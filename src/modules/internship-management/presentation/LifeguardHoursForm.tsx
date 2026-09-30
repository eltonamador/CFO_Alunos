"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LifeguardDay } from "../domain/lifeguardHours";
import { adjustLifeguardHours } from "./lifeguardHoursActions";
const localTime = (s: string) => new Date(Date.parse(s) - 3 * 3600000).toISOString().slice(11, 16);
export function LifeguardHoursForm({ programId, day }: { programId: string; day: LifeguardDay }) {
  const router = useRouter();
  const [start, setStart] = useState(localTime(day.startsAt));
  const [end, setEnd] = useState(localTime(day.endsAt));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const minutes =
    (Date.parse(`${day.date}T${end}:00-03:00`) - Date.parse(`${day.date}T${start}:00-03:00`)) /
    60000;
  return (
    <details className="rounded border p-3">
      <summary className="min-h-8 cursor-pointer text-sm font-semibold text-primary">
        Ajustar horário de praia · {day.date.split("-").reverse().join("/")}
      </summary>
      <form
        className="mt-3 space-y-3 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || saved) return;
          setBusy(true);
          setError("");
          try {
            const result = await adjustLifeguardHours({
              programId,
              date: day.date,
              startsAt: `${day.date}T${start}:00-03:00`,
              endsAt: `${day.date}T${end}:00-03:00`,
              expectedStart: day.startsAt,
              expectedEnd: day.endsAt,
              assignmentIds: day.assignmentIds,
              reason,
            });
            if (result.error) setError(result.error);
            else {
              setSaved(true);
              router.refresh();
            }
          } catch {
            setError(
              "Não foi possível confirmar o resultado. Atualize a página antes de tentar novamente.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>
          Altera os cinco postos deste dia. Cadetes, praias e uniformes serão mantidos. O sistema
          confere instruções, impedimentos, outros serviços, 24h de descanso e o limite de folgas
          mínimas.
        </p>
        <p>
          <strong>Cadetes:</strong> {day.cadets.join(", ")}.
        </p>
        <fieldset disabled={busy || saved} className="grid gap-3 sm:grid-cols-2">
          <label>
            Entrada do GV
            <input
              className="mt-1 h-11 w-full rounded border bg-background px-3"
              type="time"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Saída do GV
            <input
              className="mt-1 h-11 w-full rounded border bg-background px-3"
              type="time"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label className="sm:col-span-2">
            Motivo do ajuste
            <input
              className="mt-1 h-11 w-full rounded border bg-background px-3"
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </fieldset>
        <p>
          Horários de Macapá.{" "}
          {Number.isFinite(minutes) && minutes >= 60 && minutes <= 480
            ? `Nova carga prevista: ${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")} por cadete.`
            : "Escolha de 1 a 8 horas no mesmo dia."}{" "}
          Inclua o tempo necessário de deslocamento após a instrução ao escolher a entrada.
        </p>
        <button
          disabled={busy || saved || minutes < 60 || minutes > 480 || !Number.isFinite(minutes)}
          className="min-h-11 rounded bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Conferindo…" : "Validar e salvar horário do dia"}
        </button>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {saved && (
          <p role="status">
            Horário atualizado. Baixe e envie o PDF retificado. Gere novos links de avaliação para
            os plantões remanejados.
          </p>
        )}
      </form>
    </details>
  );
}
