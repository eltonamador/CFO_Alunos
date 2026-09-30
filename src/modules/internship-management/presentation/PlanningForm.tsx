"use client";

import { RotationSummary } from "./RotationSummary";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { formatMinutes } from "../domain/workload";
import type { RotationCadet } from "../domain/rotation";
import { suggestInternshipRotation, type RotationResult } from "./rotationActions";
import { scheduleGbmTemplateAction, scheduleLifeguardDayAction } from "./actions";
import { internshipUniforms } from "../domain/uniforms";

const fieldClass = "h-11 w-full rounded-md border border-input bg-background px-3";
type Props = {
  program: { id: string; starts_on: string; ends_on: string };
  cadets: RotationCadet[];
  sites: { id: string; name: string; code: string }[];
  templates?: { code: string; name: string }[];
  lifeguard?: boolean;
};

export function PlanningForm({ program, cadets, sites, templates = [], lifeguard = false }: Props) {
  const [date, setDate] = useState("");
  const [template, setTemplate] = useState(lifeguard ? "GUARDA-VIDA" : "");
  const [siteId, setSiteId] = useState("");
  const [selected, setSelected] = useState<string[]>(Array(lifeguard ? 5 : 1).fill(""));
  const [result, setResult] = useState<RotationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  const invalidate = () => {
    request.current += 1;
    setResult(null);
    setLoading(false);
    setSelected(Array(lifeguard ? 5 : 1).fill(""));
  };
  const consult = async () => {
    const sequence = ++request.current;
    setLoading(true);
    setResult(null);
    try {
      const response = await suggestInternshipRotation({
        programId: program.id,
        shiftDate: date,
        templateCode: template,
        siteId: siteId || undefined,
      });
      if (sequence === request.current) setResult(response);
    } catch {
      if (sequence === request.current)
        setResult({ error: "Não foi possível consultar o rodízio. Tente novamente." });
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  };
  const candidates = result?.candidates;
  const eligible = candidates?.filter((row) => !row.reasons.length) ?? [];
  const selectCadet = (index: number, id: string) =>
    setSelected((current) => current.map((value, i) => (i === index ? id : value)));
  const hasBlockedSelection = selected.some(
    (id) => candidates?.find((row) => row.id === id)?.reasons.length,
  );
  return (
    <form
      action={lifeguard ? scheduleLifeguardDayAction : scheduleGbmTemplateAction}
      className="grid gap-3 md:grid-cols-2"
    >
      <input type="hidden" name="programId" value={program.id} />
      {!lifeguard && (
        <>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Padrão operacional</span>
            <select
              name="templateCode"
              className={fieldClass}
              required
              value={template}
              onChange={(event) => {
                invalidate();
                setTemplate(event.target.value);
              }}
            >
              <option value="" disabled>
                Selecione
              </option>
              {templates.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">GBM</span>
            <select
              name="siteId"
              className={fieldClass}
              required
              value={siteId}
              onChange={(event) => {
                invalidate();
                setSiteId(event.target.value);
              }}
            >
              <option value="" disabled>
                Selecione
              </option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <label className="space-y-1 text-sm">
        <span className="font-medium">
          {lifeguard ? "Data (sábado ou domingo)" : "Data de início"}
        </span>
        <input
          type="date"
          name="shiftDate"
          min={program.starts_on}
          max={program.ends_on}
          className={fieldClass}
          required
          value={date}
          onChange={(event) => {
            invalidate();
            setDate(event.target.value);
          }}
        />
      </label>
      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          disabled={!date || !template || (!lifeguard && !siteId) || loading}
          onClick={consult}
        >
          {loading ? "Consultando…" : "Consultar sugestões de rodízio"}
        </Button>
      </div>
      <div className="space-y-3 rounded-lg border p-3 text-sm md:col-span-2" aria-live="polite">
        <p>
          Prioridade: descanso, fins de semana livres e carga equilibrada; depois tipo e local.
          Com 72h ou mais de intervalo, o equilíbrio dos fins de semana ganha prioridade.
          No máximo três descansos de 24h em qualquer período de 28 dias.
        </p>
        {result?.error && (
          <p role="alert" className="text-destructive">
            {result.error}
          </p>
        )}
        {candidates && (
          <>
            <p>
              {eligible.length} cadetes disponíveis para o rodízio nesta data. A publicação confere
              novamente os conflitos e a capacidade do local.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={eligible.length < selected.length}
              onClick={() => setSelected(eligible.slice(0, selected.length).map((row) => row.id))}
            >
              {lifeguard ? "Preencher cinco postos com sugestões" : "Usar primeiro sugerido"}
            </Button>
            {eligible.length < selected.length && (
              <p role="status">
                Não há cadetes disponíveis suficientes para preencher todas as vagas.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-xs">
                <caption className="pb-2 text-left">
                  Rodízio: descanso, fins de semana, carga e experiência.
                  O serviço do Dia ao 1º Ano não soma horas curriculares.
                </caption>
                <thead>
                  <tr>
                    <th className="p-2">Ordem / cadete</th>
                    <th className="p-2">Homologada</th>
                    <th className="p-2">Reservada</th>
                    <th className="p-2">Estágio comprometido</th>
                    <th className="p-2">Dia ao 1º Ano / soma</th>
                    <th className="p-2">Tipo / local</th>
                    <th className="p-2">Descanso antes / depois</th>
                    <th className="p-2">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((row, index) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-2">
                        {row.reasons.length ? "—" : index + 1}. {row.war_name} —{" "}
                        {String(row.student_number ?? "").padStart(2, "0")}
                      </td>
                      <td className="p-2">{formatMinutes(row.approvedMinutes)}</td>
                      <td className="p-2">{formatMinutes(row.reservedMinutes)}</td>
                      <td className="p-2">{formatMinutes(row.committedMinutes)}</td>
                      <td className="p-2">
                        {formatMinutes(row.permanenceMinutes)} /{" "}
                        {formatMinutes(row.combinedMinutes)}
                        {row.unknownDutyDays > 0 && (
                          <span> · {row.unknownDutyDays} serviços antigos sem horário</span>
                        )}
                      </td>
                      <td className="p-2">
                        {row.sameActivityShifts} / {siteId ? row.sameSiteShifts : "—"}
                      </td>
                      <td className="p-2">
                        {restLabel(row.restBeforeMinutes)} / {restLabel(row.restAfterMinutes)}
                      </td>
                      <td className="p-2">{row.reasons.join("; ") || "Disponível"}<RotationSummary candidate={row} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Descanso calculado pelos horários de estágio e serviço do Dia ao 1º Ano publicados. “Sem plantão”
              indica ausência de compromisso anterior ou seguinte no histórico consultado.
            </p>
          </>
        )}
      </div>
      {selected.map((id, index) => {
        const candidate = candidates?.find((row) => row.id === id);
        const label = lifeguard
          ? (sites.find((site) => site.code === `praia_${index + 1}`)?.name ?? `Posto ${index + 1}`)
          : "Cadete";
        return (
          <label key={index} className="space-y-1 text-sm">
            <span className="font-medium">{label}</span>
            <select
              aria-label={label}
              name={lifeguard ? `student_${index + 1}` : "studentId"}
              required
              className={fieldClass}
              value={id}
              onChange={(event) => selectCadet(index, event.target.value)}
            >
              <option value="">Selecione o cadete</option>
              {(candidates ?? cadets).map((cadet) => (
                <option
                  key={cadet.id}
                  value={cadet.id}
                  disabled={
                    selected.some((value, i) => i !== index && value === cadet.id) ||
                    Boolean(candidates?.find((row) => row.id === cadet.id)?.reasons.length)
                  }
                >
                  {cadet.war_name} — {String(cadet.student_number ?? "").padStart(2, "0")}
                  {candidates?.find((row) => row.id === cadet.id)?.reasons.length
                    ? " · Indisponível"
                    : ""}
                </option>
              ))}
            </select>
            {candidate && (
              <span className="block text-xs text-muted-foreground">
                Com este plantão: {formatMinutes(candidate.projectedMinutes)} comprometidos.
                {candidate.lastServiceEndsAt
                  ? ` Serviço anterior terminou em ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Belem", dateStyle: "short", timeStyle: "short" }).format(new Date(candidate.lastServiceEndsAt))}.`
                  : ""}
              </span>
            )}
          </label>
        );
      })}
      {lifeguard && (
        <label className="space-y-1 text-sm">
          <span className="font-medium">Documento operacional (opcional)</span>
          <input
            name="documentReference"
            maxLength={200}
            className={fieldClass}
            placeholder="Número da ordem de serviço ou plano"
          />
        </label>
      )}
      <label className="space-y-1 text-sm">
        <span className="font-medium">Uniforme</span>
        <select
          name="uniformCode"
          defaultValue={lifeguard ? "4D" : "3A"}
          required
          className={fieldClass}
        >
          {internshipUniforms.map((uniform) => (
            <option key={uniform.code} value={uniform.code}>
              {uniform.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm md:col-span-2">
        <span className="font-medium">
          Oficial responsável pelo serviço (opcional)
        </span>
        <input
          name={lifeguard ? "officerName" : "supervisorName"}
          minLength={3}
          maxLength={120}
          placeholder="Pode ser informado pelo cadete durante o serviço"
          className={fieldClass}
        />
      </label>
      <div className="md:col-span-2">
        <PublishButton disabled={loading || hasBlockedSelection} lifeguard={lifeguard} />
      </div>
    </form>
  );
}
function restLabel(minutes: number | null) {
  return minutes === null ? "Sem plantão" : formatMinutes(Math.floor(minutes));
}
function PublishButton({ disabled, lifeguard }: { disabled: boolean; lifeguard: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending
        ? "Publicando…"
        : lifeguard
          ? "Publicar cinco postos"
          : "Publicar plantão padronizado"}
    </Button>
  );
}
