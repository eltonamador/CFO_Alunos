"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/Button";
import {
  REACTIONS,
  type DiaryStatus,
  type ReactionKind,
  type ReactionSummary,
} from "../domain/occurrenceDiary";
import {
  deleteDiaryEntry,
  moderateDiaryEntry,
  setDiaryEntryVisibility,
  toggleDiaryReaction,
} from "./occurrenceDiaryActions";
import { DIARY_PHOTO_RULE } from "../domain/diaryPhoto";

/** Reações dos colegas: incentivo simbólico, sem pontuação. */
export function DiaryReactions({
  entryId,
  summary,
  canReact,
}: {
  entryId: string;
  summary?: ReactionSummary;
  canReact: boolean;
}) {
  const [counts, setCounts] = useState(summary?.counts ?? { aplauso: 0, aprendi: 0 });
  const [mine, setMine] = useState<ReactionKind[]>(summary?.mine ?? []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function apply(kind: ReactionKind, active: boolean) {
    setMine((current) => (active ? [...current, kind] : current.filter((item) => item !== kind)));
    setCounts((current) => ({ ...current, [kind]: Math.max(0, current[kind] + (active ? 1 : -1)) }));
  }

  async function toggle(kind: ReactionKind) {
    const active = !mine.includes(kind);
    setPending(true);
    setError("");
    apply(kind, active);
    try {
      const result = await toggleDiaryReaction(entryId, kind, active);
      if (result.error) throw new Error(result.error);
    } catch {
      apply(kind, !active);
      setError("Não foi possível registrar a reação.");
    } finally {
      setPending(false);
    }
  }

  if (!canReact && counts.aplauso + counts.aprendi === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
      {REACTIONS.map((reaction) => {
        const count = counts[reaction.kind];
        if (!canReact) {
          return count ? (
            <span key={reaction.kind} className="text-xs text-muted-foreground">
              <span aria-hidden>{reaction.emoji}</span> {reaction.label}: {count}
            </span>
          ) : null;
        }
        const active = mine.includes(reaction.kind);
        return (
          <button
            key={reaction.kind}
            type="button"
            aria-pressed={active}
            disabled={pending}
            onClick={() => void toggle(reaction.kind)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-60 ${
              active ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary"
            }`}
          >
            <span aria-hidden>{reaction.emoji}</span>
            {reaction.label}
            {count ? <span className="tabular-nums">{count}</span> : null}
          </button>
        );
      })}
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function DiaryEntryActions({ id, status }: { id: string; status: DiaryStatus }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<{ error?: string }>) {
    setBusy(true);
    setError("");
    try {
      const result = await action();
      if (result.error) setError(result.error);
    } catch {
      setError("Sem conexão no momento. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
      <Link
        href={`/aluno/estagio/ocorrencias/${id}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {status === "rascunho" ? "Continuar" : "Editar"}
      </Link>
      {status === "pessoal" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Ao compartilhar, as fotos do relato também aparecem para a turma. ${DIARY_PHOTO_RULE} Deseja continuar?`))
              void run(() => setDiaryEntryVisibility(id, "compartilhado"));
          }}
        >
          Compartilhar com a turma
        </Button>
      ) : null}
      {status === "compartilhado" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => void run(() => setDiaryEntryVisibility(id, "pessoal"))}
        >
          Tirar do mural
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => {
          if (window.confirm("Excluir este registro do seu diário? Não dá para desfazer."))
            void run(() => deleteDiaryEntry(id));
        }}
      >
        Excluir
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function DiaryModeration({
  id,
  featured,
  hidden,
}: {
  id: string;
  featured: boolean;
  hidden: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: "destacar" | "remover_destaque" | "ocultar" | "reexibir") {
    setBusy(true);
    setError("");
    try {
      const result = await moderateDiaryEntry({
        id,
        action,
        reason: action === "ocultar" ? reason : undefined,
      });
      if (result.error) setError(result.error);
      else setAsking(false);
    } catch {
      setError("Sem conexão no momento. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
      {hidden ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("reexibir")}>
          Voltar a exibir no mural
        </Button>
      ) : asking ? (
        <>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            placeholder="Motivo, visível ao cadete (opcional)"
            aria-label="Motivo da ocultação"
            className="h-9 min-w-56 flex-1 rounded-md border border-input bg-card px-3 text-sm"
          />
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => void run("ocultar")}>
            Ocultar do mural
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setAsking(false)}>
            Cancelar
          </Button>
        </>
      ) : (
        <>
          <Button
            size="sm"
            variant={featured ? "ghost" : "gold"}
            disabled={busy}
            onClick={() => void run(featured ? "remover_destaque" : "destacar")}
          >
            {featured ? "Remover destaque" : "Destacar"}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setAsking(true)}>
            Ocultar…
          </Button>
        </>
      )}
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
