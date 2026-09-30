"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InstructionBlock, InstructionState } from "../domain/instructions";
import { saveInstruction, confirmInstructionStandby } from "./instructionActions";
const localTime = (value: string) =>
  new Date(Date.parse(value) - 3 * 3600000).toISOString().slice(0, 16);
const formatTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Belem",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
export function InstructionPanel({
  programId,
  initial,
  startsOn,
  endsOn,
}: {
  programId: string;
  initial: InstructionState;
  startsOn: string;
  endsOn: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<InstructionBlock>();
  const [formVisible, setFormVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const active = initial.blocks.filter((b) => b.active);
  const external = initial.conflicts.filter((c) => c.service_kind !== "permanencia");
  const field = "mt-1 min-h-11 w-full rounded border bg-background px-3";
  function edit(block?: InstructionBlock) {
    setEditing(block);
    setTitle(block?.title ?? "");
    setStart(block ? localTime(block.starts_at) : "");
    setEnd(block ? localTime(block.ends_at) : "");
    setSource(block?.source_reference ?? "");
    setFormVisible(true);
    setError("");
    setMessage("");
  }
  async function submit(cancelled?: InstructionBlock) {
    setBusy(true);
    setError("");
    setMessage("");
    const block = cancelled ?? editing;
    try {
      const result = await saveInstruction({
        programId,
        id: block?.id,
        expectedUpdatedAt: block?.updated_at,
        title: cancelled?.title ?? title,
        startsAt: cancelled?.starts_at ?? `${start}:00-03:00`,
        endsAt: cancelled?.ends_at ?? `${end}:00-03:00`,
        sourceReference: cancelled?.source_reference ?? source,
        active: !cancelled,
      });
      if (result.error) setError(result.error);
      else {
        setMessage(
          cancelled
            ? "Instrução desativada. Histórico preservado."
            : "Instrução salva. Confira abaixo os serviços que precisam de revisão.",
        );
        setFormVisible(false);
        setEditing(undefined);
        router.refresh();
      }
    } catch {
      setError(
        "Não foi possível confirmar o resultado. Atualize a página antes de tentar novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirm(c: InstructionState["conflicts"][number]) {
    if (!c.review_context) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await confirmInstructionStandby({
        instructionId: c.instruction_id,
        assignmentId: c.assignment_id,
        expectedContext: c.review_context,
        confirmed: !c.standby_confirmed,
      });
      if (result.error) setError(result.error);
      else {
        setMessage(
          c.standby_confirmed
            ? "Confirmação retirada."
            : "Sobreaviso registrado. A folga entre serviços permanece integralmente exigida.",
        );
        router.refresh();
      }
    } catch {
      setError("Não foi possível confirmar o registro. Atualize a página.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="instrucoes" className="scroll-mt-24 rounded-xl border bg-card p-4">
      {external.length > 0 && (
        <p
          role="alert"
          className="mb-3 rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950"
        >
          <strong>{external.length} participações de estágio coincidem com instruções.</strong> Abra
          abaixo e ajuste os serviços antes de distribuir os PDFs.
        </p>
      )}
      <details>
        <summary className="min-h-8 cursor-pointer font-semibold text-primary">
          Instruções e conflitos · {active.length} instrução(ões)
        </summary>
        <p className="my-3 text-sm text-muted-foreground">
          Cadastre o horário confirmado da instrução. GBM e praia ficam bloqueados nesse intervalo.
          Alterações mostram os serviços publicados que precisam de ajuste; os cadetes não são
          remanejados automaticamente.
        </p>
        <button
          type="button"
          onClick={() => edit()}
          disabled={busy}
          className="min-h-11 rounded border px-4 text-sm font-semibold"
        >
          Adicionar instrução
        </button>
        {formVisible && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="my-4 space-y-3 rounded border p-3"
          >
            <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                Instrução
                <input
                  required
                  minLength={3}
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={field}
                />
              </label>
              <label className="text-sm">
                Início da instrução
                <input
                  required
                  type="datetime-local"
                  min={`${startsOn}T00:00`}
                  max={`${endsOn}T23:59`}
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className={field}
                />
              </label>
              <label className="text-sm">
                Término da instrução
                <input
                  required
                  type="datetime-local"
                  min={`${startsOn}T00:00`}
                  max={`${endsOn}T23:59`}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className={field}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Referência (opcional)
                <input
                  maxLength={500}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className={field}
                />
              </label>
            </fieldset>
            <div className="flex gap-2">
              <button
                disabled={busy}
                className="min-h-11 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                {busy ? "Salvando…" : "Salvar e conferir conflitos"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setFormVisible(false)}
                className="min-h-11 rounded border px-3 text-sm"
              >
                Fechar
              </button>
            </div>
          </form>
        )}
        <ul className="my-3 space-y-2">
          {active.map((block) => (
            <li
              key={block.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm"
            >
              <div>
                <strong>{block.title}</strong>
                <p>
                  {formatTime(block.starts_at)} → {formatTime(block.ends_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => edit(block)}
                  className="min-h-11 rounded border px-3"
                  aria-label={`Editar ${block.title}`}
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submit(block)}
                  className="min-h-11 rounded border px-3"
                  aria-label={`Desativar ${block.title}`}
                >
                  Desativar
                </button>
              </div>
            </li>
          ))}
        </ul>
        {!initial.conflicts.length ? (
          <p className="text-sm">
            Nenhum serviço publicado em andamento ou futuro coincide com as instruções ativas.
          </p>
        ) : (
          <div className="space-y-2">
            <h3 className="font-semibold">Conferência dos serviços</h3>
            {initial.conflicts.map((c) => (
              <div
                key={`${c.instruction_id}:${c.assignment_id}`}
                className="rounded border border-amber-300 p-3 text-sm"
              >
                <strong>
                  {c.war_name} · {c.site_name}
                </strong>
                <p>
                  {formatTime(c.starts_at)} → {formatTime(c.ends_at)} · {c.instruction_title}
                </p>
                <p>
                  {c.service_kind === "permanencia"
                    ? c.standby_confirmed
                      ? "Confirmado: participa da instrução em sobreaviso do serviço do Dia ao 1º Ano."
                      : "Dia ao 1º Ano: confirme se o cadete participará da instrução em sobreaviso na ABM."
                    : "Conflito de horário: ajuste ou cancele o serviço. Trocar o cadete não resolve uma instrução da turma."}
                </p>
                {c.service_kind === "permanencia" &&
                  c.review_context &&
                  ["ABM", "ACADEMIA BOMBEIRO MILITAR"].includes(
                    c.site_name.trim().toUpperCase(),
                  ) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void confirm(c)}
                      className="mr-3 min-h-11 rounded border px-3 font-semibold"
                    >
                      {c.standby_confirmed
                        ? "Retirar confirmação"
                        : "Confirmar participação em sobreaviso"}
                    </button>
                  )}
                <a
                  className="inline-flex min-h-11 items-center text-primary underline"
                  href={
                    c.service_kind === "permanencia"
                      ? "/coordenacao/estagio?escala=permanencia#nova-escala"
                      : `/coordenacao/estagio/agenda?inicio=${localTime(c.starts_at).slice(0, 10)}&fim=${localTime(c.ends_at).slice(0, 10)}`
                  }
                >
                  Abrir escala
                </a>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Horários de Macapá. Este cadastro não importa o QTS nem altera a folga mínima de 24 horas
          entre serviços.
        </p>
      </details>
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
    </section>
  );
}
