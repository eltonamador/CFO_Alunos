"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { recordInternshipHandover } from "./handoverActions";
import { toBelemInput } from "./HomologationForm";
import { handoverMinutes } from "../domain/handover";
import { formatMinutes } from "../domain/workload";

type Props = {
  assignmentId: string;
  studentId: string;
  startsAt: string;
  endsAt: string;
  now: string;
  cadets: { id: string; war_name: string; student_number: number | null }[];
  requiresApproval?: boolean;
};
const field = "h-11 w-full rounded-md border border-input bg-background px-3";
export function HandoverForm(props: Props) {
  const router = useRouter();
  const latest = Math.min(Date.parse(props.now), Date.parse(props.endsAt) - 60_000);
  const [when, setWhen] = useState(toBelemInput(new Date(latest).toISOString()));
  const [student, setStudent] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  let minutes: ReturnType<typeof handoverMinutes> | null = null;
  try {
    minutes = handoverMinutes(props.startsAt, props.endsAt, `${when}:00-03:00`);
  } catch {
    /* The form explains invalid boundaries. */
  }
  const valid = minutes !== null && Date.parse(`${when}:00-03:00`) <= Date.parse(props.now);
  return (
    <details className="rounded-md border p-3">
      <summary className="cursor-pointer font-semibold text-primary">
        Substituir durante o plantão
      </summary>
      <form
        className="mt-3 space-y-3 text-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!valid || busy || saved) return;
          setBusy(true);
          setError("");
          try {
            const result = await recordInternshipHandover({
              assignmentId: props.assignmentId,
              newStudentId: student,
              handoverAt: `${when}:00-03:00`,
              reason,
            });
            if (result.error) setError(result.error);
            else {
              setSaved(true);
              router.refresh();
            }
          } catch {
            setError("Não foi possível confirmar a passagem. Confira a conexão e tente novamente.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>
          {props.requiresApproval
            ? "Informe a passagem para homologação da Coordenação. A escala só muda depois da aprovação."
            : "Registre a passagem já realizada. O horário encerra o período do primeiro cadete e inicia o do substituto. A carga continua sujeita à homologação."}
        </p>
        <label className="block space-y-1">
          <span>Data e horário da passagem</span>
          <input
            type="datetime-local"
            required
            step={60}
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            min={toBelemInput(new Date(Date.parse(props.startsAt) + 60_000).toISOString())}
            max={toBelemInput(new Date(latest).toISOString())}
            className={field}
            disabled={busy || saved}
          />
        </label>
        {minutes && valid ? (
          <p className="rounded bg-muted p-2">
            Quem sai: <strong>{formatMinutes(minutes.outgoing)}</strong>. Quem entra:{" "}
            <strong>{formatMinutes(minutes.incoming)}</strong>.
          </p>
        ) : (
          <p role="status">Informe um horário já ocorrido, após o início e antes do término.</p>
        )}
        <label className="block space-y-1">
          <span>Cadete substituto</span>
          <select
            required
            value={student}
            onChange={(e) => setStudent(e.target.value)}
            className={field}
            disabled={busy || saved}
          >
            <option value="">Selecione</option>
            {props.cadets
              .filter((c) => c.id !== props.studentId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.war_name} · {String(c.student_number ?? "").padStart(2, "0")}
                </option>
              ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span>Motivo, sem diagnóstico ou detalhes de saúde</span>
          <input
            required
            minLength={5}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={field}
            disabled={busy || saved}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          O sistema confere impedimentos, instruções, outros serviços e descanso mínimo de 24h antes
          de confirmar.
        </p>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {saved && (
          <p role="status">
            {props.requiresApproval
              ? "Solicitação enviada. A escala permanece como está até a Coordenação homologar."
              : "Passagem registrada. Os períodos individuais estão na escala e nas fichas."}
          </p>
        )}
        <Button
          type="submit"
          disabled={!valid || !student || reason.trim().length < 5 || busy || saved}
        >
          {busy ? "Conferindo…" : props.requiresApproval ? "Solicitar homologação" : "Confirmar passagem"}
        </Button>
      </form>
    </details>
  );
}
