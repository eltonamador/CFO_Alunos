"use client";
import { RotationSummary } from "./RotationSummary";
import { useState, useTransition } from "react";
import { ScalePdfLinks, ScaleVersionHistory } from "./ScalePdfPanel";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  type PermanenceRow,
  type PermanenceStageConflict,
  permanenceBatchSchema,
  permanenceInputSchema,
} from "../domain/permanence";
import {
  addDays,
  calendarDay,
  rankRotationCandidates,
  type RotationAssignment,
  type RotationCadet,
} from "../domain/rotation";
import { formatMinutes } from "../domain/workload";
import { internshipUniforms, internshipUniformLabel } from "../domain/uniforms";
import { evaluationDate } from "../domain/evaluation";
import { weeklyWindowOverlaps, type WeeklyUnavailability } from "../domain/blackouts";
import { publishPermanence, publishPermanenceBatch, cancelPermanence } from "./permanenceActions";
type Props = {
  embedded?: boolean;
  program: { id: string; name: string; starts_on: string; ends_on: string };
  canManage: boolean;
  defaultDate: string;
  duties: PermanenceRow[];
  conflicts: PermanenceStageConflict[];
  cadets: RotationCadet[];
  assignments: RotationAssignment[];
  constraints: { student_id: string; starts_on: string; ends_on: string; kind: string }[];
  blackouts: ({
    student_id: string;
    blocked_weekdays: number[];
  } & WeeklyUnavailability)[];
};
const field = "block min-h-11 w-full rounded border bg-background p-2";
type Draft = { date: string; students: string[] };
function serviceTimes(date: string) {
  return { startsAt: `${date}T06:00:00-03:00`, endsAt: `${addDays(date, 1)}T06:00:00-03:00` };
}
function blockedFor(props: Props, startsAt: string, endsAt: string) {
  const blocked: Record<string, string[]> = {};
  const block = (id: string, label: string) => {
    (blocked[id] ??= []).push(label);
  };
  const first = calendarDay(startsAt, "America/Belem");
  const last = calendarDay(Date.parse(endsAt) - 1, "America/Belem");
  props.constraints
    .filter((c) => c.kind === "impedimento" && c.starts_on <= last && c.ends_on >= first)
    .forEach((c) => block(c.student_id, "Impedimento operacional"));
  for (const b of props.blackouts) {
    if (weeklyWindowOverlaps(b, startsAt, endsAt)) {
      block(b.student_id, "Indisponibilidade cadastrada para o horário");
      continue;
    }
    for (let d = first; d <= last; d = addDays(d, 1))
      if (
        d >= b.starts_on &&
        d <= b.ends_on &&
        b.blocked_weekdays.includes(new Date(`${d}T12:00:00Z`).getUTCDay())
      ) {
        block(b.student_id, "Indisponibilidade cadastrada");
        break;
      }
  }
  return blocked;
}
function civil(value: string) {
  return `${calendarDay(value, "America/Belem")}T${new Intl.DateTimeFormat("en-GB", { timeZone: "America/Belem", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value))}`;
}
function roleOrder(role: string) {
  return role === "Dia ao 1º Ano" || role === "Aluno de Dia"
    ? 0
    : Number(role.match(/Apoio (\d+)/)?.[1] ?? 9);
}
export function PermanencePlanner(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [start, setStart] = useState(`${props.defaultDate}T06:00`);
  const [end, setEnd] = useState(`${addDays(props.defaultDate, 1)}T06:00`);
  const [periodEnd, setPeriodEnd] = useState(props.defaultDate);
  const [supportCount, setSupportCount] = useState(1);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [location, setLocation] = useState("ABM");
  const [uniform, setUniform] = useState<"3A" | "2C" | "4A" | "4D">("3A");
  const [students, setStudents] = useState<string[]>(["", ""]);
  const [editing, setEditing] = useState<string>();
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState(false);
  const [publishedDate, setPublishedDate] = useState<string>();
  const [publishedEndDate, setPublishedEndDate] = useState<string>();
  const [message, setMessage] = useState("");
  const [cancelId, setCancelId] = useState<string>();
  const [cancelReason, setCancelReason] = useState("");
  const change = () => {
    setPublishedDate(undefined);
    setPublishedEndDate(undefined);
    setPreview(false);
    setDrafts([]);
    setMessage("");
  };
  const startsAt = start ? `${start}:00-03:00` : "";
  const endsAt = end ? `${end}:00-03:00` : "";
  const validTimes =
    z.string().datetime({ offset: true }).safeParse(startsAt).success &&
    z.string().datetime({ offset: true }).safeParse(endsAt).success &&
    Date.parse(endsAt) > Date.parse(startsAt);
  const blocked = validTimes ? blockedFor(props, startsAt, endsAt) : {};
  const candidates = validTimes
    ? rankRotationCandidates({
        cadets: props.cadets,
        assignments: props.assignments,
        commitments: props.assignments.filter((a) => a.active),
        duties: props.duties.filter((d) => d.rosterId !== editing),
        startsAt,
        endsAt,
        timezone: "America/Belem",
        blocked,
      })
    : [];
  const groups = [...new Set(props.duties.filter((d) => d.editable).map((d) => d.rosterId))].map(
    (id) =>
      props.duties
        .filter((d) => d.rosterId === id)
        .sort((a, b) => roleOrder(a.role) - roleOrder(b.role)),
  );
  const input = {
    programId: props.program.id,
    startsAt,
    endsAt,
    location,
    uniformCode: uniform,
    students,
    rosterId: editing,
    reason,
  };
  const errors = students.flatMap((id) => {
    const c = candidates.find((c) => c.id === id);
    return c ? c.reasons : [];
  });
  const rangeDays =
    start && periodEnd
      ? Math.round(
          (Date.parse(`${periodEnd}T12:00:00Z`) - Date.parse(`${start.slice(0, 10)}T12:00:00Z`)) /
            86400000,
        ) + 1
      : 0;
  function candidatesForDay(date: string, otherDrafts: Draft[]) {
    const { startsAt: from, endsAt: to } = serviceTimes(date);
    return rankRotationCandidates({
      cadets: props.cadets,
      assignments: props.assignments,
      commitments: props.assignments.filter((a) => a.active),
      duties: [
        ...props.duties,
        ...otherDrafts.flatMap((draft) =>
          draft.students.filter(Boolean).map((studentId) => ({
            studentId,
            date: draft.date,
            ...serviceTimes(draft.date),
          })),
        ),
      ],
      startsAt: from,
      endsAt: to,
      timezone: "America/Belem",
      blocked: blockedFor(props, from, to),
    });
  }
  const batchInput = {
    programId: props.program.id,
    location,
    uniformCode: uniform,
    services: drafts.map((draft) => ({ ...serviceTimes(draft.date), students: draft.students })),
  };
  const batchErrors = drafts.flatMap((draft, index) => {
    const ranked = candidatesForDay(
      draft.date,
      drafts.filter((_, i) => i !== index),
    );
    return draft.students.flatMap(
      (id) =>
        ranked.find((c) => c.id === id)?.reasons.map((reason) => `${draft.date}: ${reason}`) ?? [],
    );
  });
  function reset() {
    setEditing(undefined);
    setStart(`${props.defaultDate}T06:00`);
    setEnd(`${addDays(props.defaultDate, 1)}T06:00`);
    setPeriodEnd(props.defaultDate);
    setDrafts([]);
    setSupportCount(1);
    setStudents(["", ""]);
    setPreview(false);
    setReason("");
  }
  return (
    <div className="space-y-6">
      {!props.embedded && (
        <header className="space-y-2">
          <a className="text-sm text-primary underline" href="/coordenacao/estagio">
            Voltar ao estágio
          </a>
          <h1 className="text-2xl font-bold">Serviço do Dia ao 1º Ano</h1>
        </header>
      )}
      <p className="text-sm text-muted-foreground">
        Jornada de 24 horas: das 06h às 06h do dia seguinte para o Dia ao 1º Ano e todos os apoios.
        Escolha de um a quatro apoios; a sugestão considera estágio e descanso mínimo de 24 horas.
      </p>
      {props.conflicts.length > 0 && (
        <section className="space-y-3 rounded-lg border border-amber-500 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-xl font-bold">
            Conflitos com o estágio para revisar ({props.conflicts.length})
          </h2>
          <p className="text-sm">
            A escala de Dia ao 1º Ano foi registrada como recebida. Os plantões de estágio abaixo
            continuam publicados e não foram remanejados. Revise cada participação antes do serviço.
          </p>
          <div className="space-y-2">
            {props.conflicts.map((conflict) => (
              <article
                key={`${conflict.duty_assignment_id}:${conflict.shift_id}`}
                className="rounded border border-amber-300 bg-white p-3 text-sm"
              >
                <p className="font-semibold">
                  {conflict.student_number != null && `${conflict.student_number} · `}
                  {conflict.war_name} · {conflict.duty_role} ·{" "}
                  {conflict.conflict_kind === "mesmo_dia" ? "Mesmo dia" : "Descanso inferior a 24h"}
                </p>
                <p>
                  Dia ao 1º Ano/apoio: {evaluationDate(conflict.duty_starts_at)} a{" "}
                  {evaluationDate(conflict.duty_ends_at)}
                </p>
                <p>
                  Estágio: {evaluationDate(conflict.stage_starts_at)} a{" "}
                  {evaluationDate(conflict.stage_ends_at)}
                </p>
              </article>
            ))}
          </div>
          <a className="font-semibold underline" href="/coordenacao/estagio/agenda">
            Ver agenda do estágio
          </a>
        </section>
      )}
      {props.canManage ? (
        <section className="space-y-4 rounded-lg border p-5">
          <h2 className="text-xl font-bold">
            {editing ? "Alterar serviço publicado" : "Novo serviço do Dia ao 1º Ano"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Primeiro dia do serviço
              <input
                className={field}
                type="date"
                min={props.program.starts_on}
                max={props.program.ends_on}
                value={start.slice(0, 10)}
                onChange={(e) => {
                  setStart(e.target.value ? `${e.target.value}T06:00` : "");
                  setEnd(e.target.value ? `${addDays(e.target.value, 1)}T06:00` : "");
                  setPeriodEnd(e.target.value);
                  change();
                }}
              />
            </label>
            {!editing && (
              <label className="text-sm">
                Último dia do período
                <input
                  className={field}
                  type="date"
                  min={start.slice(0, 10)}
                  max={props.program.ends_on}
                  value={periodEnd}
                  onChange={(e) => {
                    setPeriodEnd(e.target.value);
                    change();
                  }}
                />
              </label>
            )}
            <label className="text-sm">
              Quantos apoios por dia?
              <select
                className={field}
                value={supportCount}
                onChange={(e) => {
                  const count = Number(e.target.value);
                  setSupportCount(count);
                  setStudents((previous) =>
                    previous
                      .slice(0, count + 1)
                      .concat(Array(Math.max(0, count + 1 - previous.length)).fill("")),
                  );
                  change();
                }}
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? "apoio" : "apoios"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!editing && (
            <p className="text-sm text-muted-foreground">
              Um único dia ou um período de até 14 dias. Cada data terá sua equipe para conferência
              antes da publicação.
            </p>
          )}
          <details className="rounded border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {editing ? "Ajustar horário, local ou uniforme" : "Local e uniforme"}
            </summary>
            <p className="text-sm text-muted-foreground">
              Jornada: 06h às 06h do dia seguinte, 24 horas para todos os escalados.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {editing && (
                <>
                  <label>
                    Início (Belém)
                    <input
                      className={field}
                      type="datetime-local"
                      value={start}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (
                          start.slice(0, 10) !== next.slice(0, 10) &&
                          end === `${addDays(start.slice(0, 10), 1)}T06:00`
                        )
                          setEnd(`${addDays(next.slice(0, 10), 1)}T06:00`);
                        setStart(next);
                        change();
                      }}
                    />
                  </label>
                  <label>
                    Término (Belém)
                    <input
                      className={field}
                      type="datetime-local"
                      value={end}
                      onChange={(e) => {
                        setEnd(e.target.value);
                        change();
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded border p-3 text-sm font-semibold"
                    onClick={() => {
                      const day = start.slice(0, 10) || props.defaultDate;
                      setStart(`${day}T06:00`);
                      setEnd(`${addDays(day, 1)}T06:00`);
                      change();
                    }}
                  >
                    Aplicar horário padrão 06h–06h
                  </button>
                </>
              )}
              <label>
                Local
                <input
                  className={field}
                  value={location}
                  maxLength={200}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    change();
                  }}
                />
              </label>
              <label>
                Uniforme
                <select
                  className={field}
                  value={uniform}
                  onChange={(e) => {
                    setUniform(e.target.value as typeof uniform);
                    change();
                  }}
                >
                  {internshipUniforms.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="self-end rounded border p-3 text-sm">
                O Dia ao 1º Ano e os apoios cumprem as mesmas 24 horas. Este serviço não soma horas
                curriculares do estágio.
              </p>
            </div>
          </details>
          <button
            className="rounded border p-3 font-semibold disabled:opacity-50"
            disabled={!validTimes || pending || (!editing && (rangeDays < 1 || rangeDays > 14))}
            onClick={() => {
              if (!editing && rangeDays > 1) {
                const nextDrafts: Draft[] = [];
                for (let day = start.slice(0, 10); day <= periodEnd; day = addDays(day, 1)) {
                  const available = candidatesForDay(day, nextDrafts)
                    .filter((c) => !c.reasons.length)
                    .slice(0, supportCount + 1);
                  nextDrafts.push({
                    date: day,
                    students: available
                      .map((c) => c.id)
                      .concat(Array(supportCount + 1 - available.length).fill("")),
                  });
                }
                setDrafts(nextDrafts);
                setPreview(false);
                setMessage(
                  nextDrafts.some((draft) => draft.students.some((id) => !id))
                    ? "Algumas datas não têm cadetes disponíveis para todas as funções. Revise os conflitos e ajuste o período ou a quantidade de apoios."
                    : "Confira os nomes de cada dia antes de publicar o período.",
                );
                return;
              }
              setDrafts([]);
              const available = candidates
                .filter((c) => !c.reasons.length)
                .slice(0, supportCount + 1);
              setStudents(
                available
                  .map((c) => c.id)
                  .concat(Array(supportCount + 1 - available.length).fill("")),
              );
              setPreview(available.length === supportCount + 1);
              setMessage(
                available.length === supportCount + 1
                  ? ""
                  : "Não há cadetes disponíveis para todas as funções com 24h de descanso. Revise os apoios ou a data.",
              );
            }}
          >
            Gerar sugestão de escala
          </button>
          {drafts.length > 0 && (
            <section className="space-y-4 rounded border border-primary p-4">
              <h3 className="font-bold">
                Conferir período: {drafts[0]?.date} a {drafts[drafts.length - 1]?.date}
              </h3>
              <p className="text-sm">
                Cada equipe cumpre 06h–06h. Uma falha cancela a publicação de todo o período.
              </p>
              {drafts.map((draft, index) => {
                const ranked = candidatesForDay(
                  draft.date,
                  drafts.filter((_, i) => i !== index),
                );
                return (
                  <div key={draft.date} className="space-y-2 rounded border p-3">
                    <h4 className="font-semibold">
                      {new Date(`${draft.date}T12:00:00-03:00`).toLocaleDateString("pt-BR")} · 06h
                      até 06h do dia seguinte
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {draft.students.map((id, position) => (
                        <label key={position} className="text-sm">
                          {position === 0 ? "Dia ao 1º Ano" : `Apoio ${position}`}
                          <select
                            className={field}
                            value={id}
                            onChange={(e) => {
                              setDrafts((current) =>
                                current.map((item, i) =>
                                  i === index
                                    ? {
                                        ...item,
                                        students: item.students.map((student, j) =>
                                          j === position ? e.target.value : student,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                              setMessage("");
                            }}
                          >
                            <option value="">Selecione o cadete</option>
                            {ranked.map((candidate) => (
                              <option
                                key={candidate.id}
                                value={candidate.id}
                                disabled={
                                  candidate.reasons.length > 0 ||
                                  draft.students.some(
                                    (student, i) => i !== position && student === candidate.id,
                                  )
                                }
                              >
                                {candidate.student_number} · {candidate.war_name}
                                {candidate.reasons.length
                                  ? ` — ${candidate.reasons.join("; ")}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {batchErrors.length > 0 && (
                <p role="alert" className="text-destructive">
                  {[...new Set(batchErrors)].join("; ")}
                </p>
              )}
              <button
                className="rounded bg-primary p-3 text-primary-foreground disabled:opacity-50"
                disabled={
                  pending ||
                  batchErrors.length > 0 ||
                  !permanenceBatchSchema.safeParse(batchInput).success
                }
                onClick={() =>
                  startTransition(async () => {
                    const result = await publishPermanenceBatch(batchInput);
                    if (result.error) setMessage(result.error);
                    else {
                      const first = drafts[0]!.date;
                      const last = drafts[drafts.length - 1]!.date;
                      reset();
                      setPublishedDate(first);
                      setPublishedEndDate(last);
                      setMessage(
                        `${result.count} serviços publicados de ${first} a ${last}. Confira o PDF e compartilhe a escala.`,
                      );
                      router.refresh();
                    }
                  })
                }
              >
                {pending ? "Publicando…" : `Publicar ${drafts.length} serviços`}
              </button>
            </section>
          )}
          {!drafts.length && students.some(Boolean) && (
            <div className="grid gap-4 md:grid-cols-2">
              {students.map((id, i) => (
                <label key={i}>
                  {i === 0 ? "Dia ao 1º Ano" : `Apoio ${i}`}
                  <select
                    className={field}
                    value={id}
                    onChange={(e) => {
                      setStudents(students.map((s, j) => (i === j ? e.target.value : s)));
                      setPreview(true);
                      setMessage("");
                    }}
                  >
                    <option value="">Selecione o cadete</option>
                    {(validTimes
                      ? candidates
                      : props.cadets.map((c) => ({ ...c, reasons: [] as string[] }))
                    ).map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        disabled={
                          ("reasons" in c && c.reasons.length > 0) ||
                          students.some((s, j) => s === c.id && i !== j)
                        }
                      >
                        {c.student_number} · {c.war_name}
                        {"reasons" in c && c.reasons.length ? ` — ${c.reasons.join("; ")}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          {editing && (
            <label className="block">
              Motivo da alteração
              <input
                className={field}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setPreview(true);
                  setMessage("");
                }}
                minLength={5}
              />
            </label>
          )}
          {editing && (
            <button className="rounded border p-3" onClick={reset}>
              Sair da alteração
            </button>
          )}
          {!drafts.length && preview && (
            <section className="space-y-3 rounded border border-primary p-4">
              <h3 className="font-bold">Confira e publique</h3>
              <p>
                {evaluationDate(startsAt)} a {evaluationDate(endsAt)} · {location} ·{" "}
                {internshipUniformLabel(uniform)}
              </p>
              {students.map((id, i) => (
                <p key={i}>
                  {i === 0 ? "Dia ao 1º Ano" : `Apoio ${i}`}:{" "}
                  {props.cadets.find((c) => c.id === id)?.war_name}
                </p>
              ))}
              {errors.length > 0 && (
                <p role="alert" className="text-destructive">
                  {[...new Set(errors)].join("; ")}
                </p>
              )}
              <p>
                {formatMinutes((Date.parse(endsAt) - Date.parse(startsAt)) / 60000)} de serviço por
                cadete. O descanso e os conflitos serão conferidos ao publicar.
              </p>
              <button
                className="rounded bg-primary p-3 text-primary-foreground disabled:opacity-50"
                disabled={
                  pending || errors.length > 0 || !permanenceInputSchema.safeParse(input).success
                }
                onClick={() =>
                  startTransition(async () => {
                    const result = await publishPermanence(input);
                    if (result.error) setMessage(result.error);
                    else {
                      reset();
                      setPublishedDate(start.slice(0, 10));
                      setPublishedEndDate(start.slice(0, 10));
                      setMessage(
                        "Serviço publicado. Confira o PDF antes de compartilhar a escala.",
                      );
                      router.refresh();
                    }
                  })
                }
              >
                {pending ? "Salvando…" : "Publicar escala"}
              </button>
            </section>
          )}
        </section>
      ) : (
        <p className="rounded border p-4">
          Somente a Coordenação e administradores autorizados do estágio podem publicar o serviço.
        </p>
      )}
      {message && (
        <p role="status" className="rounded border p-4">
          {message}
        </p>
      )}
      {publishedDate && (
        <ScalePdfLinks
          start={publishedDate}
          end={publishedEndDate ?? publishedDate}
          service="permanencia"
        />
      )}
      {validTimes && (
        <details>
          <summary className="cursor-pointer font-bold">Conferir equilíbrio dos cadetes</summary>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {[
                    "Cadete",
                    "Estágio comprometido",
                    "Serviço do Dia ao 1º Ano",
                    "Soma conhecida",
                    "Dias de serviço",
                    "Situação",
                  ].map((h) => (
                    <th className="p-2" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr className="border-t" key={c.id}>
                    <td className="p-2">
                      {c.student_number} · {c.war_name}
                    </td>
                    <td>{formatMinutes(c.committedMinutes)}</td>
                    <td>
                      {formatMinutes(c.permanenceMinutes)}
                      {c.unknownDutyDays > 0 && ` + ${c.unknownDutyDays} antigos sem horário`}
                    </td>
                    <td>{formatMinutes(c.combinedMinutes)}</td>
                    <td>{c.serviceDays}</td>
                    <td>
                      {c.reasons.join("; ") || "Disponível"}
                      <RotationSummary candidate={c} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <details className="space-y-4 rounded-lg border p-4">
        <summary className="cursor-pointer font-semibold">
          Ver serviços publicados ({groups.length})
        </summary>
        {!groups.length && <p>Nenhum serviço do Dia ao 1º Ano publicado neste programa.</p>}
        {groups.map((rows) => {
          const r = rows[0]!;
          return (
            <article className="space-y-3 rounded-lg border p-4" key={r.rosterId}>
              <h3 className="font-bold">
                {evaluationDate(r.startsAt!)} a {evaluationDate(r.endsAt!)}
              </h3>
              <p>
                {r.location} · {internshipUniformLabel(r.uniformCode!)}
              </p>
              {rows.map((row) => (
                <p key={row.id}>
                  {row.role}: {row.studentNumber} · {row.warName}
                </p>
              ))}
              {props.canManage && (
                <ScaleVersionHistory
                  url={`/api/estagio/escala?inicio=${r.date}&fim=${r.date}&servico=permanencia&escala=${r.rosterId}&assinatura=coordenador`}
                />
              )}
              <div className="flex gap-4">
                <a
                  className="text-primary underline"
                  href={`/api/estagio/permanencia?escala=${r.rosterId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir PDF da escala
                </a>
                {props.canManage && (
                  <>
                    <button
                      className="text-primary underline"
                      onClick={() => {
                        setEditing(r.rosterId);
                        setStart(civil(r.startsAt!));
                        setEnd(civil(r.endsAt!));
                        setLocation(r.location!);
                        setUniform(r.uniformCode as typeof uniform);
                        setStudents(rows.map((row) => row.studentId));
                        setSupportCount(rows.length - 1);
                        setPeriodEnd(r.date);
                        setReason("");
                        setPreview(true);
                        setMessage("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Substituir cadetes / remanejar
                    </button>
                    <button
                      className="text-destructive underline"
                      onClick={() => {
                        setCancelId(r.rosterId);
                        setCancelReason("");
                      }}
                    >
                      Cancelar escala
                    </button>
                  </>
                )}
              </div>
              {cancelId === r.rosterId && (
                <div className="space-y-3">
                  <label>
                    Motivo do cancelamento
                    <input
                      className={field}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={pending}
                    className="rounded border border-destructive p-3"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await cancelPermanence(r.rosterId, cancelReason);
                        if (result.error) setMessage(result.error);
                        else {
                          setCancelId(undefined);
                          setMessage("Escala cancelada; histórico preservado.");
                          router.refresh();
                        }
                      })
                    }
                  >
                    Confirmar cancelamento
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </details>
      <details>
        <summary className="cursor-pointer font-semibold">Serviços antigos preservados</summary>
        {props.duties
          .filter((d) => !d.editable)
          .map((d) => (
            <p key={d.id} className="border-b py-2">
              {d.date} · {d.role} · {d.warName} — horário não cadastrado
            </p>
          ))}
        <a href="/coordenacao/operacional/escala" className="text-primary underline">
          Consultar histórico operacional
        </a>
      </details>
    </div>
  );
}
