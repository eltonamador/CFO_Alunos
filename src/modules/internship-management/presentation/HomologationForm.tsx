"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { formatMinutes } from "../domain/workload";
import { homologateInternshipAction } from "./actions";

type RecordData = {
  validation_status: string;
  attendance_status: string;
  actual_starts_at: string | null;
  actual_ends_at: string | null;
  approved_minutes: number | null;
  supervisor_name: string | null;
  paper_reference: string | null;
  occurrence_reason: string | null;
  decision_reason: string | null;
};
type Props = {
  assignmentId: string;
  studentId: string;
  startsAt: string;
  endsAt: string;
  plannedMinutes: number;
  supervisor: string | null;
  current?: RecordData;
  evaluationReference?: string;
  evaluationStatus?: string;
  evaluationUrl?: string;
  earlyExitAt?: string | null;
  earlyExitReason?: string | null;
  now: string;
};
const field = "h-11 w-full rounded-md border border-input bg-background px-3";
export function toBelemInput(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Belem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const p = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}`;
}
export function HomologationForm(props: Props) {
  const current = props.current;
  const correction = current?.validation_status === "homologado";
  const reportedEarlyExit = Boolean(props.earlyExitAt && !current);
  const [exception, setException] = useState(
    Boolean(
      reportedEarlyExit ||
      (current &&
      (current.attendance_status !== "integral" ||
        current.occurrence_reason ||
        current.approved_minutes !== props.plannedMinutes)),
    ),
  );
  const [attendance, setAttendance] = useState(current?.attendance_status ?? (props.earlyExitAt ? "parcial" : "integral"));
  const noAttendance = exception && ["falta", "dispensa"].includes(attendance);
  const future = Date.parse(props.endsAt) > Date.parse(props.now);
  const mode = exception ? attendance : "integral";
  const approved = current?.approved_minutes ?? props.plannedMinutes;
  return (
    <form action={homologateInternshipAction} className="grid gap-3 border-t pt-3 md:grid-cols-2">
      <input type="hidden" name="assignmentId" value={props.assignmentId} />
      <input type="hidden" name="studentId" value={props.studentId} />
      <input type="hidden" name="attendanceStatus" value={mode} />
      <div className="space-y-2 rounded-md bg-muted p-3 md:col-span-2">
        <p className="font-semibold">Homologar {formatMinutes(props.plannedMinutes)} deste plantão</p>
        <p>Confira a avaliação ou ficha física, o oficial responsável e os horários. As horas passam a contar para o cadete depois da confirmação.</p>
        {props.earlyExitAt && !current && (
          <p className="text-amber-800">Saída antecipada informada às {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Belem", dateStyle: "short", timeStyle: "short" }).format(new Date(props.earlyExitAt))}. A hora da saída foi preenchida; a carga prevista permanece sugerida. Confira a orientação da Coordenação e justifique se decidir homologar a carga integral.</p>
        )}
        {props.evaluationStatus === "respondida" && props.evaluationUrl && (
          <p className="text-amber-800">A avaliação do oficial aguarda revisão. <a className="font-semibold underline" href={props.evaluationUrl}>Conferir avaliação</a> antes de homologar.</p>
        )}
        {props.evaluationStatus === "liberada" && <p className="text-green-800">Avaliação do oficial liberada. A referência foi preenchida abaixo.</p>}
        {current?.decision_reason && <p>Observação anterior: {current.decision_reason}</p>}
      </div>
      {future && (
        <p role="status" className="text-amber-700 md:col-span-2">
          Plantão ainda não encerrado. A publicação registra somente horas previstas. A homologação
          normal ficará disponível após o término; uma saída antecipada pode ser analisada com justificativa.
        </p>
      )}
      <label className="flex items-center gap-2 md:col-span-2">
        <input
          type="checkbox"
          checked={exception}
          disabled={reportedEarlyExit}
          onChange={(e) => setException(e.target.checked)}
        />{" "}
        {reportedEarlyExit ? "Saída antecipada informada pelo cadete" : "Houve diferença na jornada ou ocorrência a registrar?"}
      </label>
      {exception && (
        <label className="space-y-1">
          <span>Presença na ficha</span>
          <select
            className={field}
            value={attendance}
            onChange={(e) => setAttendance(e.target.value)}
          >
            <option value="integral">Integral, com ocorrência</option>
            <option value="parcial">Parcial</option>
            <option value="falta">Falta</option>
            <option value="dispensa">Dispensa</option>
          </select>
        </label>
      )}
      <label className="space-y-1">
        <span>Referência da avaliação ou ficha física</span>
        <input
          name="paperReference"
          minLength={3}
          maxLength={200}
          required
          defaultValue={current?.paper_reference ?? props.evaluationReference ?? ""}
          placeholder="Identificação da avaliação digital ou ficha em papel"
          className={field}
        />
        <span className="block text-xs text-muted-foreground">Obrigatória para rastrear a decisão. Se a avaliação digital foi liberada, o sistema preenche este campo.</span>
      </label>
      {exception ? (
        <>
          {" "}
          <label className="space-y-1">
            <span>Início considerado</span>
            <input
              key={`start-${exception}-${noAttendance}`}
              type="datetime-local"
              name="actualStartsAt"
              readOnly={!exception}
              disabled={noAttendance}
              defaultValue={toBelemInput(
                exception ? (current?.actual_starts_at ?? props.startsAt) : props.startsAt,
              )}
              className={field}
            />
          </label>
          <label className="space-y-1">
            <span>Término considerado</span>
            <input
              key={`end-${exception}-${noAttendance}`}
              type="datetime-local"
              name="actualEndsAt"
              readOnly={!exception}
              disabled={noAttendance}
              defaultValue={toBelemInput(
                exception ? (current?.actual_ends_at ?? props.earlyExitAt ?? props.endsAt) : props.endsAt,
              )}
              className={field}
            />
          </label>
          <label className="space-y-1">
            <span>Horas a homologar</span>
            <input
              key={`hours-${exception}-${noAttendance}`}
              name="approvedHours"
              type="number"
              min={0}
              step={1}
              required
              readOnly={!exception}
              defaultValue={
                noAttendance ? 0 : Math.floor((exception ? approved : props.plannedMinutes) / 60)
              }
              className={field}
            />
          </label>
          <label className="space-y-1">
            <span>Minutos adicionais</span>
            <input
              key={`minutes-${exception}-${noAttendance}`}
              name="approvedExtraMinutes"
              type="number"
              min={0}
              max={59}
              step={1}
              required
              readOnly={!exception}
              defaultValue={noAttendance ? 0 : (exception ? approved : props.plannedMinutes) % 60}
              className={field}
            />
          </label>
        </>
      ) : (
        <>
          <input type="hidden" name="actualStartsAt" value={toBelemInput(props.startsAt)} />
          <input type="hidden" name="actualEndsAt" value={toBelemInput(props.endsAt)} />
          <input type="hidden" name="approvedHours" value={Math.floor(props.plannedMinutes / 60)} />
          <input type="hidden" name="approvedExtraMinutes" value={props.plannedMinutes % 60} />
        </>
      )}
      <label className="space-y-1 md:col-span-2">
        <span>Oficial responsável identificado após o serviço</span>
        <input
          name="supervisorName"
          minLength={3}
          maxLength={120}
          required
          defaultValue={current?.supervisor_name ?? props.supervisor ?? ""}
          placeholder="Posto e nome do oficial responsável pelo serviço"
          className={field}
        />
      </label>
      {exception && (
        <>
          <label className="space-y-1 md:col-span-2">
            <span>O que aconteceu?</span>
            <input
              name="occurrenceReason"
              maxLength={500}
              minLength={5}
              required
              defaultValue={current?.occurrence_reason ?? props.earlyExitReason ?? ""}
              className={field}
            />
          </label>
          <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" name="occurrenceJustified" /> Saída ou ocorrência justificada pela Coordenação
          </label>
        </>
      )}
      <label className="space-y-1 md:col-span-2">
          <span>{correction ? "Justificativa da correção" : exception ? "Justificativa da decisão" : "Observação administrativa sobre esta homologação (opcional)"}</span>
          <input
            name="decisionReason"
            minLength={5}
            maxLength={500}
            required={correction || Boolean(props.earlyExitAt)}
            placeholder={exception || correction ? "Explique a decisão sobre as horas" : "Ex.: erro de registro de ponto, sem alteração da jornada cumprida"}
            className={field}
          />
      </label>
      <div className="md:col-span-2">
        <Submit disabled={future && !exception} correction={correction} />
      </div>
    </form>
  );
}
function Submit({ disabled, correction }: { disabled: boolean; correction: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending
        ? "Salvando…"
        : correction
          ? "Corrigir por nova versão"
          : "Confirmar ficha e homologar"}
    </Button>
  );
}
