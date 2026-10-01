"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  COMPETENCE_NOTICE,
  DIARY_NOTICE,
  DIARY_VEHICLES,
  OCCURRENCE_TYPES,
  PARTICIPATIONS,
  PRIVACY_HINT,
  SEVERITIES,
  belemDay,
  shiftLabel,
  shiftVehicle,
  type DiaryFormValues,
  type DiaryShift,
  type DiaryStatus,
} from "../domain/occurrenceDiary";
import { saveDiaryEntry } from "./occurrenceDiaryActions";

type Props = {
  entryId?: string;
  status?: DiaryStatus;
  hiddenReason?: string | null;
  hidden?: boolean;
  initial: DiaryFormValues;
  /** Plantões já iniciados, do mais recente para o mais antigo. */
  shifts: DiaryShift[];
  classmates: { id: string; war_name: string; student_number: number | null }[];
  vehicles?: string[];
};

const DIARY_PATH = "/aluno/estagio/ocorrencias";
const AUTOSAVE_DELAY = 2000;
const field = "h-11 w-full rounded-md border border-input bg-card px-3 text-base";
const area = "min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-base";

function hasContent(values: DiaryFormValues) {
  return Boolean(
    values.summary.trim() ||
    values.occurrenceTypes.length ||
    values.otherType.trim() ||
    values.severity ||
    values.participation ||
    values.vehicles.length ||
    values.perception.trim() ||
    values.description.trim() ||
    values.companionIds.length ||
    values.protocolNumber.trim(),
  );
}

function clock() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function OccurrenceDiaryForm({
  entryId,
  status = "rascunho",
  hidden = false,
  hiddenReason,
  initial,
  shifts,
  classmates,
  vehicles = [],
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [customVehicle, setCustomVehicle] = useState(
    initial.vehicles.find((vehicle) => !(DIARY_VEHICLES as readonly string[]).includes(vehicle)) ??
      "",
  );
  const [draft, setDraft] = useState<{ state: "idle" | "saving" | "saved" | "error"; at?: string }>(
    { state: "idle" },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const summaryRef = useRef<HTMLInputElement>(null);
  const id = useRef(entryId ?? null);
  const latest = useRef(values);
  latest.current = values;
  const saved = useRef(JSON.stringify(initial));
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const finishing = useRef(false);
  const isDraft = status === "rascunho";
  const snapshot = JSON.stringify(values);

  // Salvamentos em fila: o rascunho automático nunca cria dois registros nem atropela o envio.
  const persist = useCallback((intent: DiaryStatus, autosave = false) => {
    const run = queue.current.then(async () => {
      const current = latest.current;
      const result = await saveDiaryEntry({ ...current, id: id.current, intent }, { autosave });
      if (result.id) {
        if (!id.current) {
          id.current = result.id;
          window.history.replaceState(null, "", `${DIARY_PATH}/${result.id}`);
        }
        saved.current = JSON.stringify(current);
      }
      return result;
    });
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  useEffect(() => {
    if (!isDraft || snapshot === saved.current || !hasContent(latest.current)) return;
    const timer = window.setTimeout(() => {
      if (finishing.current) return;
      setDraft({ state: "saving" });
      persist("rascunho", true).then(
        (result) => setDraft(result.error ? { state: "error" } : { state: "saved", at: clock() }),
        () => setDraft({ state: "error" }),
      );
    }, AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [isDraft, persist, snapshot]);

  function set<K extends keyof DiaryFormValues>(key: K, value: DiaryFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function pickShift(assignmentId: string) {
    setValues((current) => {
      const previous = shifts.find((shift) => shift.assignment_id === current.assignmentId);
      const next = shifts.find((shift) => shift.assignment_id === assignmentId);
      const previousVehicle = shiftVehicle(previous);
      const suggestedVehicle =
        !current.vehicles.length ||
        (current.vehicles.length === 1 && current.vehicles[0] === previousVehicle);
      const nextVehicle = next ? shiftVehicle(next) : "";
      return {
        ...current,
        assignmentId,
        occurredOn: next ? belemDay(next.starts_at) : current.occurredOn,
        vehicle: next && suggestedVehicle ? nextVehicle : current.vehicle,
        vehicles: next && suggestedVehicle ? (nextVehicle ? [nextVehicle] : []) : current.vehicles,
      };
    });
  }

  function toggleCompanion(studentId: string, checked: boolean) {
    setValues((current) => ({
      ...current,
      companionIds: checked
        ? [...current.companionIds, studentId]
        : current.companionIds.filter((item) => item !== studentId),
    }));
  }

  function toggleType(type: string, checked: boolean) {
    setValues((current) => ({
      ...current,
      occurrenceTypes: checked
        ? [...new Set([...current.occurrenceTypes, type])].slice(0, 6)
        : current.occurrenceTypes.filter((item) => item !== type),
    }));
  }

  function toggleVehicle(vehicle: string, checked: boolean) {
    setValues((current) => ({
      ...current,
      vehicles: checked
        ? [...new Set([...current.vehicles, vehicle])].slice(0, 6)
        : current.vehicles.filter((item) => item !== vehicle),
    }));
  }

  function changeCustomVehicle(vehicle: string) {
    const next = vehicle.slice(0, 60);
    setValues((current) => ({
      ...current,
      vehicles: [
        ...current.vehicles.filter((item) => item !== customVehicle),
        ...(next.trim() ? [next.trim()] : []),
      ].slice(0, 6),
    }));
    setCustomVehicle(next);
  }

  async function finish(intent: DiaryStatus) {
    if (busy) return;
    if (intent !== "rascunho" && values.summary.trim().length < 3) {
      setError("Conte em uma frase o que aconteceu.");
      summaryRef.current?.focus();
      return;
    }
    if (intent === "rascunho" && !hasContent(values) && !id.current) {
      router.push(DIARY_PATH);
      return;
    }
    finishing.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await persist(intent);
      if (!result.error) {
        router.push(`${DIARY_PATH}?resultado=${intent}`);
        return;
      }
      setError(result.error);
    } catch {
      setError("Sem conexão no momento. Seu texto continua aqui; tente de novo.");
    }
    finishing.current = false;
    setBusy(false);
  }

  const linkedMissing =
    values.assignmentId && !shifts.some((shift) => shift.assignment_id === values.assignmentId);
  const draftMessage = !isDraft
    ? null
    : draft.state === "saving"
      ? "Salvando rascunho…"
      : draft.state === "saved"
        ? `Rascunho salvo automaticamente às ${draft.at}.`
        : draft.state === "error"
          ? "Não deu para salvar o rascunho agora; seu texto continua aqui."
          : "O rascunho é salvo automaticamente enquanto você escreve.";

  return (
    <form
      className="space-y-5 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void finish(isDraft ? "pessoal" : status);
      }}
    >
      <div className="space-y-1 rounded-lg border border-dashed bg-muted/40 p-3">
        <p>{DIARY_NOTICE}</p>
        <p className="text-muted-foreground">{COMPETENCE_NOTICE}</p>
      </div>
      {hidden ? (
        <p role="status" className="rounded-lg border bg-muted p-3">
          A Coordenação ocultou este relato do mural{hiddenReason ? `: ${hiddenReason}` : "."} Ele
          continua no seu diário.
        </p>
      ) : null}

      <label className="block space-y-1">
        <span className="font-medium">O que aconteceu</span>
        <input
          ref={summaryRef}
          value={values.summary}
          onChange={(event) => set("summary", event.target.value)}
          maxLength={200}
          placeholder="Em uma frase. Ex.: queda de moto, vítima consciente, apoiei na imobilização"
          aria-invalid={error === "Conte em uma frase o que aconteceu." || undefined}
          className={field}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <label className="block space-y-1">
          <span className="font-medium">Plantão (opcional)</span>
          <select
            value={values.assignmentId}
            onChange={(event) => pickShift(event.target.value)}
            className={field}
          >
            <option value="">Sem plantão vinculado</option>
            {linkedMissing ? (
              <option value={values.assignmentId}>Plantão já vinculado</option>
            ) : null}
            {shifts.map((shift) => (
              <option key={shift.assignment_id} value={shift.assignment_id}>
                {shiftLabel(shift)}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-medium">Data</span>
          <input
            type="date"
            value={values.occurredOn}
            onChange={(event) => set("occurredOn", event.target.value)}
            className={field}
          />
        </label>
      </div>

      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 font-semibold">Detalhes opcionais</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <fieldset className="space-y-2 sm:col-span-3">
            <legend className="font-medium">Tipos de ocorrência (pode marcar mais de um)</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {OCCURRENCE_TYPES.map((type) => (
                <label key={type.code} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={values.occurrenceTypes.includes(type.code)}
                    disabled={
                      !values.occurrenceTypes.includes(type.code) &&
                      values.occurrenceTypes.length >= 6
                    }
                    onChange={(event) => toggleType(type.code, event.target.checked)}
                  />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block space-y-1">
            <span>Gravidade</span>
            <select
              value={values.severity}
              onChange={(event) => set("severity", event.target.value)}
              className={field}
            >
              <option value="">Não informar</option>
              {SEVERITIES.map((severity) => (
                <option key={severity.value} value={severity.value}>
                  {severity.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span>Sua participação</span>
            <select
              value={values.participation}
              onChange={(event) => set("participation", event.target.value)}
              className={field}
            >
              <option value="">Não informar</option>
              {PARTICIPATIONS.map((participation) => (
                <option key={participation.value} value={participation.value}>
                  {participation.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {values.occurrenceTypes.includes("outro") ? (
          <label className="block space-y-1">
            <span>Qual tipo?</span>
            <input
              value={values.otherType}
              onChange={(event) => set("otherType", event.target.value)}
              maxLength={80}
              className={field}
            />
          </label>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="font-medium">Viaturas (pode marcar mais de uma)</legend>
            <div className="flex flex-wrap gap-3">
              {DIARY_VEHICLES.map((vehicle) => (
                <label key={vehicle} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={values.vehicles.includes(vehicle)}
                    disabled={!values.vehicles.includes(vehicle) && values.vehicles.length >= 6}
                    onChange={(event) => toggleVehicle(vehicle, event.target.checked)}
                  />
                  <span>{vehicle}</span>
                </label>
              ))}
            </div>
            <label className="block space-y-1">
              <span>Outra viatura (opcional)</span>
              <input
                value={customVehicle}
                onChange={(event) => changeCustomVehicle(event.target.value)}
                list="diary-vehicles"
                maxLength={60}
                placeholder="Ex.: SB-12"
                className={field}
              />
            </label>
          </fieldset>
          <label className="block space-y-1">
            <span>Nº da ocorrência, se souber</span>
            <input
              value={values.protocolNumber}
              onChange={(event) => set("protocolNumber", event.target.value)}
              maxLength={40}
              className={field}
            />
          </label>
        </div>
        <datalist id="diary-vehicles">
          {vehicles
            .filter((vehicle) => !(DIARY_VEHICLES as readonly string[]).includes(vehicle))
            .map((vehicle) => (
              <option key={vehicle} value={vehicle} />
            ))}
        </datalist>
        <label className="block space-y-1">
          <span>O que você percebeu ou aprendeu</span>
          <textarea
            value={values.perception}
            onChange={(event) => set("perception", event.target.value)}
            maxLength={2000}
            className={area}
          />
        </label>
        <label className="block space-y-1">
          <span>Relato livre</span>
          <textarea
            value={values.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={4000}
            aria-describedby="diary-privacy-hint"
            className={`${area} min-h-32`}
          />
          <span id="diary-privacy-hint" className="block text-xs text-muted-foreground">
            {PRIVACY_HINT}
          </span>
        </label>
        {classmates.length > 0 ? (
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer">
              Colegas que estavam junto
              {values.companionIds.length ? ` (${values.companionIds.length})` : ""}
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {classmates.map((cadet) => (
                <label key={cadet.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={values.companionIds.includes(cadet.id)}
                    onChange={(event) => toggleCompanion(cadet.id, event.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>
                    {cadet.war_name}
                    {cadet.student_number == null
                      ? ""
                      : ` · ${String(cadet.student_number).padStart(2, "0")}`}
                  </span>
                </label>
              ))}
            </div>
          </details>
        ) : null}
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {isDraft ? (
          <>
            <Button type="submit" variant="outline" disabled={busy}>
              Salvar no meu diário
            </Button>
            <Button type="button" disabled={busy} onClick={() => void finish("compartilhado")}>
              Compartilhar com a turma
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => void finish("rascunho")}
            >
              Salvar rascunho
            </Button>
          </>
        ) : (
          <>
            <Button type="submit" disabled={busy}>
              Salvar alterações
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void finish(status === "compartilhado" ? "pessoal" : "compartilhado")}
            >
              {status === "compartilhado" ? "Tirar do mural" : "Salvar e compartilhar"}
            </Button>
          </>
        )}
      </div>
      {draftMessage ? (
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {draftMessage}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Rascunhos ficam só com você. Registros salvos também podem ser lidos pela Coordenação do
        estágio; os compartilhados aparecem no mural da turma. Dá para editar ou excluir quando
        quiser.
      </p>
    </form>
  );
}
