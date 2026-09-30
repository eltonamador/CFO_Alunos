"use client";

import { useState } from "react";
import { requestInternshipPairSwapAction } from "./changeApprovalActions";

export type PairSwapOption = {
  assignmentId: string;
  shiftDate: string;
  cadet: string;
  service: string;
  site: string;
  startsAt: string;
  endsAt: string;
  minutes: number;
};

function time(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    timeZone: "America/Belem", hour: "2-digit", minute: "2-digit",
  });
}

function label(option: PairSwapOption) {
  return `${option.cadet} · ${option.service} · ${option.site} · ${time(option.startsAt)}–${time(option.endsAt)} · ${option.minutes / 60}h`;
}

export function PairSwapForm({ options, initialAssignmentId }: {
  options: PairSwapOption[];
  initialAssignmentId?: string;
}) {
  const [firstId, setFirstId] = useState(
    options.some((option) => option.assignmentId === initialAssignmentId) ? initialAssignmentId! : "",
  );
  const [secondId, setSecondId] = useState("");
  const first = options.find((option) => option.assignmentId === firstId);
  const second = options.find((option) => option.assignmentId === secondId);
  const secondOptions = options.filter((option) =>
    option.assignmentId !== firstId && (!first || option.shiftDate === first.shiftDate),
  );
  return (
    <form action={requestInternshipPairSwapAction} className="space-y-3 text-sm">
      <input type="hidden" name="shiftDate" value={first?.shiftDate ?? ""} />
      <label className="block space-y-1">
        <span className="font-medium">1. Plantão atual do primeiro cadete</span>
        <select name="firstAssignmentId" required value={firstId} onChange={(event) => {
          setFirstId(event.target.value);
          setSecondId("");
        }} className="h-11 w-full rounded-md border border-input bg-background px-3">
          <option value="">Selecione um plantão</option>
          {options.map((option) => <option key={option.assignmentId} value={option.assignmentId}>{label(option)}</option>)}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="font-medium">2. Plantão do outro cadete</span>
        <select name="secondAssignmentId" required value={secondId}
          onChange={(event) => setSecondId(event.target.value)}
          disabled={!firstId}
          className="h-11 w-full rounded-md border border-input bg-background px-3">
          <option value="">Selecione outro plantão do mesmo dia</option>
          {secondOptions.map((option) => <option key={option.assignmentId} value={option.assignmentId}>{label(option)}</option>)}
        </select>
      </label>
      {first && second && (
        <div className="rounded-md border bg-muted/40 p-3" aria-live="polite">
          <p className="font-semibold">Como ficará após a homologação</p>
          <p>{first.cadet} → {second.service} · {second.site} · {second.minutes / 60}h
            {second.minutes !== first.minutes && ` (${(second.minutes - first.minutes) / 60 > 0 ? "+" : ""}${(second.minutes - first.minutes) / 60}h)`}</p>
          <p>{second.cadet} → {first.service} · {first.site} · {first.minutes / 60}h
            {first.minutes !== second.minutes && ` (${(first.minutes - second.minutes) / 60 > 0 ? "+" : ""}${(first.minutes - second.minutes) / 60}h)`}</p>
        </div>
      )}
      <label className="block space-y-1">
        <span className="font-medium">Motivo registrado no histórico</span>
        <input name="reason" required minLength={5} maxLength={500}
          defaultValue="Permuta consensual por logística de deslocamento."
          className="h-11 w-full rounded-md border border-input bg-background px-3" />
      </label>
      <p className="text-muted-foreground">
        A proposta não altera a escala. Só a Coordenação pode homologar; na decisão,
        o sistema confere novamente impedimentos, conflitos e descanso de 24 horas.
      </p>
      <button type="submit" disabled={!first || !second}
        className="min-h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">
        Enviar permuta para homologação
      </button>
    </form>
  );
}
