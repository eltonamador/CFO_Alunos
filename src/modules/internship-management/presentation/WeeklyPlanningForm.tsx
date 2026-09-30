"use client";
import { RotationSummary } from "./RotationSummary";
import { useMemo, useRef, useState } from "react";
import { ScalePdfLinks } from "./ScalePdfPanel";
import { Button } from "@/components/ui/Button";
import { addDays, calendarDay } from "../domain/rotation";
import { planWeekWithAlternatives, type WeeklyContext } from "../domain/weeklyPlanning";
import { formatMinutes, minutesBetween } from "../domain/workload";
import { previewInternshipWeek, publishInternshipWeek } from "./weeklyActions";
import { internshipUniforms, type InternshipUniformCode } from "../domain/uniforms";

const field = "h-11 w-full rounded-md border border-input bg-background px-3";
type Props = {
  program: { id: string; starts_on: string; ends_on: string };
  sites: { id: string; name: string }[];
  templates: { code: string; name: string; start_weekdays?: number[] }[];
  serviceType?: "gbm" | "praia";
  initialPeriod?: "dia" | "semana";
};
function monday(day: string) {
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay() || 7;
  return addDays(day, 1 - dow);
}
function dateLabel(day: string) {
  return day.split("-").reverse().join("/");
}
function timeLabel(instant: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(instant));
}
export function WeeklyPlanningForm({
  program,
  sites,
  templates,
  serviceType = "gbm",
  initialPeriod = "dia",
}: Props) {
  const today = calendarDay(Date.now(), "America/Belem");
  const [date, setDate] = useState(
    today < program.starts_on
      ? program.starts_on
      : today > program.ends_on
        ? program.ends_on
        : today,
  );
  const [period, setPeriod] = useState(initialPeriod);
  const [siteIds, setSiteIds] = useState(sites.map((s) => s.id));
  const [codes, setCodes] = useState<string[]>([]);
  const [context, setContext] = useState<WeeklyContext | null>(null);
  const [recordedDays, setRecordedDays] = useState<
    NonNullable<WeeklyContext["recordedLifeguardDays"]>
  >([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [supervisor, setSupervisor] = useState("");
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [uniform, setUniform] = useState<InternshipUniformCode>(
    serviceType === "praia" ? "4D" : "3A",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [published, setPublished] = useState(false);
  const requestId = useRef("");
  const sequence = useRef(0);
  const week = date ? monday(date) : "";
  const planning = useMemo(
    () => (context ? planWeekWithAlternatives(context, choices) : null),
    [context, choices],
  );
  const plan = planning?.choices ?? [];
  const weekday = date ? new Date(`${date}T12:00:00Z`).getUTCDay() || 7 : 0;
  const shownTemplates = templates.filter(
    (t) => period === "semana" || !t.start_weekdays || t.start_weekdays.includes(weekday),
  );
  const selectedCodes = codes.filter((code) => shownTemplates.some((t) => t.code === code));
  const beachDays = [...new Set(plan.map((r) => r.slot.date))];
  function invalidate() {
    sequence.current++;
    setContext(null);
    setRecordedDays([]);
    setMessage("");
    setPublished(false);
    setBusy(false);
  }
  const toggle = (values: string[], value: string) =>
    values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  async function generate() {
    const current = ++sequence.current;
    setBusy(true);
    setMessage("");
    setContext(null);
    setRecordedDays([]);
    setPublished(false);
    try {
      const result = await previewInternshipWeek({
        programId: program.id,
        weekStart: week,
        siteIds: serviceType === "gbm" ? siteIds : [],
        templateCodes: serviceType === "gbm" ? selectedCodes : [],
        lifeguard: serviceType === "praia",
      });
      if (current !== sequence.current) return;
      if (!result.context) {
        setMessage(result.error);
        return;
      }
      const next = {
        ...result.context,
        slots: result.context.slots.filter((s) => period === "semana" || s.date === date),
      };
      const recorded = (result.context.recordedLifeguardDays ?? []).filter(
        (r) => period === "semana" || r.date === date,
      );
      setRecordedDays(recorded);
      if (!next.slots.length) {
        setMessage(
          recorded.length
            ? "Já existe uma escala de guarda-vidas para o período escolhido. Consulte abaixo ou escolha outra data para gerar uma nova escala."
            : "Nenhuma vaga nova nessa data. Confira as escalas publicadas ou escolha outra data.",
        );
        return;
      }
      // Only explicit user choices are fixed; automatic suggestions may be rearranged.
      const retainedIds = new Set(next.slots.map((s) => s.id));
      setChoices((previous) =>
        Object.fromEntries(Object.entries(previous).filter(([id]) => retainedIds.has(id))),
      );
      setContext(next);
      requestId.current = crypto.randomUUID();
      setDocuments({});
    } catch {
      if (current === sequence.current)
        setMessage("Não foi possível gerar a escala. Tente novamente.");
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  }
  const complete =
    plan.length > 0 &&
    plan.every((r) => !r.error) &&
    (!supervisor.trim() || supervisor.trim().length >= 3);
  async function publish() {
    if (!complete || busy || published) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await publishInternshipWeek({
        programId: program.id,
        weekStart: week,
        requestId: requestId.current,
        lines: plan.map(({ slot, studentId }) => ({
          date: slot.date,
          templateCode: slot.templateCode,
          siteId: slot.siteId,
          studentId,
          supervisorName: supervisor,
          documentReference: documents[slot.date],
          uniformCode: uniform,
        })),
      });
      if (result.error) setMessage(result.error);
      else {
        setPublished(true);
        setMessage(`${result.count} plantões publicados. Os cadetes já podem consultar a escala.`);
      }
    } catch {
      setMessage(
        "Não foi possível confirmar. Tente publicar esta mesma prévia novamente; os plantões não serão duplicados.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <fieldset disabled={busy} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Período</span>
            <select
              className={field}
              value={period}
              onChange={(e) => {
                invalidate();
                setPeriod(e.target.value as typeof period);
              }}
            >
              <option value="dia">Um dia</option>
              <option value="semana">Semana inteira</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">
              {period === "dia" ? "Data do serviço" : "Escolha um dia da semana"}
            </span>
            <input
              type="date"
              className={field}
              min={program.starts_on}
              max={program.ends_on}
              value={date}
              onChange={(e) => {
                invalidate();
                setDate(e.target.value);
              }}
            />
          </label>
        </div>
        {period === "semana" && week && (
          <p className="text-sm text-muted-foreground">
            De {dateLabel(week)} a {dateLabel(addDays(week, 6))}.
          </p>
        )}
        {serviceType === "gbm" ? (
          <>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-semibold">Serviços e turnos</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {shownTemplates.map((t) => (
                  <label
                    key={t.code}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={codes.includes(t.code)}
                      onChange={() => {
                        invalidate();
                        setCodes(toggle(codes, t.code));
                      }}
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                GBMs: {siteIds.length === sites.length ? "todos" : `${siteIds.length} selecionados`}
              </summary>
              <div className="mt-3 flex flex-wrap gap-4">
                {sites.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={siteIds.includes(s.id)}
                      onChange={() => {
                        invalidate();
                        setSiteIds(toggle(siteIds, s.id));
                      }}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </details>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Cinco praias, um cadete por local. Os horários cadastrados para a data serão aplicados.
          </p>
        )}
        <Button
          type="button"
          onClick={generate}
          disabled={
            !date ||
            (serviceType === "gbm" && (!selectedCodes.length || !siteIds.length)) ||
            (serviceType === "praia" && period === "dia" && weekday < 6)
          }
        >
          {busy ? "Distribuindo cadetes…" : "Gerar escala"}
        </Button>
        {serviceType === "praia" && period === "dia" && weekday < 6 && (
          <p className="text-sm text-muted-foreground">Escolha sábado ou domingo para a praia.</p>
        )}
      </fieldset>
      {message && (
        <p role="status" className="rounded-md border p-3 text-sm">
          {message}
        </p>
      )}
      {recordedDays.map((day) => (
        <section
          key={day.date}
          className="space-y-3 rounded-lg border p-4"
          aria-label={`Guarda-vidas ${dateLabel(day.date)}`}
        >
          <h3 className="font-semibold">Guarda-vidas · {dateLabel(day.date)}</h3>
          <p className="text-sm">
            {day.publishedCount > 0
              ? `${day.publishedCount} postos já publicados.`
              : day.draftCount > 0
                ? `${day.draftCount} postos preparados para conferir e publicar.`
                : "Planejamento já registrado. Consulte a agenda para revisar a situação dos postos."}
          </p>
          <a
            className="inline-block text-sm font-semibold text-primary underline"
            href={`/coordenacao/estagio/agenda?inicio=${day.date}&fim=${day.date}&modalidade=guarda_vida&situacao=${day.publishedCount ? "ativos" : day.draftCount ? "rascunhos" : "todos"}`}
          >
            {day.publishedCount ? "Ver escala publicada" : "Conferir planejamento"}
          </a>
          {day.publishedCount > 0 && (
            <ScalePdfLinks start={day.date} end={day.date} service="praia" />
          )}
        </section>
      ))}
      {context && (
        <fieldset disabled={busy || published} className="space-y-4 border-t pt-5">
          <div>
            <h3 className="text-lg font-semibold">Confira os {plan.length} plantões</h3>
            <p className="text-sm text-muted-foreground">
              A sugestão prioriza descanso e equilíbrio dos fins de semana, depois carga, tipo e
              local. Você pode trocar os cadetes disponíveis.
            </p>
          </div>
          {planning && planning.recoveredSlots > 0 && (
            <p role="status" className="text-sm text-emerald-700">
              Sugestões reorganizadas para preencher {planning.recoveredSlots} vaga(s) que ficariam
              vazias. Suas escolhas manuais foram mantidas.
            </p>
          )}
          {planning?.searchStatus === "limited" && (
            <p role="status" className="text-sm text-amber-800">
              Ainda não foi encontrada uma combinação completa. Isso não confirma falta de cadetes.
              Revise as vagas pendentes e suas escolhas manuais antes de publicar.
            </p>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            {plan.map((row) => {
              const cadet = row.candidates.find((c) => c.id === row.studentId);
              const noAvailableCadet =
                !row.studentId && row.candidates.every((c) => c.reasons.length > 0);
              const commonReason = row.candidates[0]?.reasons.find((reason) =>
                row.candidates.every((c) => c.reasons.includes(reason)),
              );
              return (
                <article key={row.slot.id} className="space-y-3 rounded-lg border p-4">
                  <div>
                    <p className="font-semibold">
                      {row.slot.siteName} · {dateLabel(row.slot.date)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {templates.find((t) => t.code === row.slot.templateCode)?.name ??
                        "Guarda-vidas"}{" "}
                      · {timeLabel(row.slot.startsAt)}–{timeLabel(row.slot.endsAt)}
                      {calendarDay(row.slot.endsAt, "America/Belem") !== row.slot.date
                        ? " do dia seguinte"
                        : ""}{" "}
                      · {formatMinutes(minutesBetween(row.slot.startsAt, row.slot.endsAt))}
                    </p>
                  </div>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium">Cadete</span>
                    <select
                      aria-label={`Cadete ${row.slot.siteName} ${row.slot.date} ${row.slot.templateCode}`}
                      className={field}
                      value={row.studentId}
                      onChange={(e) => setChoices({ ...choices, [row.slot.id]: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      {row.candidates.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          disabled={!!c.reasons.length && c.id !== row.studentId}
                        >
                          {String(c.student_number ?? "").padStart(2, "0")} · {c.war_name}
                          {c.reasons.length ? " · indisponível" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className={`text-sm ${row.error ? "text-destructive" : "text-emerald-700"}`}>
                    {noAvailableCadet
                      ? (commonReason ??
                        "Vaga pendente nesta combinação. Revise as escolhas manuais, escolha outra data ou retire este plantão.")
                      : (row.error ?? "Disponível · descanso mínimo de 24h respeitado")}
                  </p>
                  {cadet && <RotationSummary candidate={cadet} />}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">
                      Ver distribuição ou retirar plantão
                    </summary>
                    {cadet && (
                      <p className="mt-2">
                        Carga de serviços: {formatMinutes(cadet.combinedMinutes)} ·{" "}
                        {cadet.sameActivityShifts} neste tipo · {cadet.sameSiteShifts} neste local.
                      </p>
                    )}
                    <button
                      type="button"
                      className="mt-3 min-h-9 text-destructive underline"
                      onClick={() =>
                        setContext({
                          ...context,
                          slots: context.slots.filter((s) =>
                            row.slot.templateCode === "GUARDA-VIDA"
                              ? !(s.templateCode === "GUARDA-VIDA" && s.date === row.slot.date)
                              : s.id !== row.slot.id,
                          ),
                        })
                      }
                    >
                      {serviceType === "praia"
                        ? "Retirar as cinco praias deste dia"
                        : "Retirar este plantão"}
                    </button>
                  </details>
                </article>
              );
            })}
          </div>
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Dados opcionais e uniforme
            </summary>
            {serviceType === "praia" &&
              beachDays.map((day) => (
                <label key={day} className="block space-y-1 text-sm">
                  <span className="font-medium">
                    Documento operacional (opcional) · {dateLabel(day)}
                  </span>
                  <input
                    className={field}
                    value={documents[day] ?? ""}
                    maxLength={200}
                    placeholder="Preencha quando estiver disponível"
                    onChange={(e) => setDocuments({ ...documents, [day]: e.target.value })}
                  />
                </label>
              ))}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>Uniforme</span>
                <select
                  className={field}
                  value={uniform}
                  onChange={(e) => setUniform(e.target.value as InternshipUniformCode)}
                >
                  {internshipUniforms.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span>Oficial responsável pelo serviço (opcional)</span>
                <input
                  className={field}
                  value={supervisor}
                  maxLength={120}
                  onChange={(e) => setSupervisor(e.target.value)}
                />
              </label>
            </div>
          </details>
          {!complete && (
            <p className="text-sm text-amber-700">Revise os campos pendentes antes de publicar.</p>
          )}
          <Button type="button" disabled={!complete || busy || published} onClick={publish}>
            {busy ? "Publicando…" : "Publicar escala"}
          </Button>
        </fieldset>
      )}
      {published && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm">
            A escala já aparece no início do aplicativo quando estiver nos próximos 7 dias.
          </p>
          {serviceType === "gbm" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {sites.map((site) => (
                <div key={site.id} className="rounded-lg border p-3">
                  <p className="mb-2 font-semibold">{site.name}</p>
                  <ScalePdfLinks
                    start={period === "dia" ? date : week}
                    end={period === "dia" ? date : addDays(week, 6)}
                    service="gbm"
                    gbm={site}
                  />
                </div>
              ))}
            </div>
          ) : (
            <ScalePdfLinks
              start={period === "dia" ? date : week}
              end={period === "dia" ? date : addDays(week, 6)}
              service={serviceType}
            />
          )}
          <a
            href="/coordenacao/estagio/agenda"
            className="inline-block text-sm font-semibold text-primary underline"
          >
            Ver escala publicada
          </a>
        </div>
      )}
    </div>
  );
}
