import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { diaryPhotosConfigured } from "../infrastructure/diaryPhotosDrive";
import {
  BOARD_ORDERS,
  DIARY_ENTRY_COLUMNS,
  diaryBoard,
  monthHighlights,
  monthStart,
  summarizeReactions,
  type BoardOrder,
  type DiaryEntry,
} from "../domain/occurrenceDiary";
import {
  cadetLabel,
  loadCadets,
  loadReactions,
  loadSharedEntries,
  type SharedEntry,
} from "../infrastructure/occurrenceDiary";
import { DiaryEntryCard } from "./DiaryEntryCard";
import { DiaryModeration, DiaryReactions } from "./DiaryControls";

const medals = {
  1: ["🥇", "Medalha de ouro"],
  2: ["🥈", "Medalha de prata"],
  3: ["🥉", "Medalha de bronze"],
};
const selectClass = "h-11 rounded-md border border-input bg-card px-3 text-sm";
const unavailable = (
  <p className="rounded-lg border p-4 text-sm">
    Não foi possível carregar o diário. Tente novamente mais tarde.
  </p>
);

export async function DiaryMural({
  studentId,
  basePath,
  userId,
  limit,
  canModerate = false,
}: {
  studentId: string | null;
  basePath: string;
  userId: string;
  limit: number;
  canModerate?: boolean;
}) {
  const db = createSupabaseServerClient();
  const { data, error } = await db
    .from("internship_diary_entries")
    .select(DIARY_ENTRY_COLUMNS)
    .eq("status", "compartilhado")
    .is("hidden_at", null)
    .order("shared_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) return unavailable;
  const entries = (data ?? []) as unknown as DiaryEntry[];
  const [reactionRows, cadets] = await Promise.all([
    loadReactions(
      db,
      entries.map((entry) => entry.id),
    ),
    loadCadets(
      db,
      entries.flatMap((entry) => [entry.student_id, ...entry.companion_ids]),
    ),
  ]);
  const reactions = summarizeReactions(reactionRows, userId);
  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Relatos compartilhados pela turma. Incentivo entre colegas, sem valor avaliativo.
      </p>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Ninguém compartilhou um relato ainda.
        </p>
      ) : (
        entries.map((entry) => {
          const summary = reactions.get(entry.id);
          return (
            <DiaryEntryCard
              key={entry.id}
              entry={entry}
              author={cadetLabel(cadets.get(entry.student_id))}
              companions={entry.companion_ids.map((id) => cadetLabel(cadets.get(id)))}
              photosEnabled={diaryPhotosConfigured()}
            >
              <DiaryReactions
                key={`${entry.id}:${summary?.total ?? 0}:${summary?.mine.join(",") ?? ""}`}
                entryId={entry.id}
                summary={summary}
                canReact={entry.student_id !== studentId}
              />
              {canModerate ? (
                <DiaryModeration
                  key={`${entry.id}:${entry.featured_at}:${entry.hidden_at}`}
                  id={entry.id}
                  featured={Boolean(entry.featured_at)}
                  hidden={false}
                />
              ) : null}
            </DiaryEntryCard>
          );
        })
      )}
      {entries.length === limit && limit < 300 ? (
        <Link
          href={`${basePath}?aba=mural&limite=${limit + 60}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Ver relatos anteriores
        </Link>
      ) : null}
    </section>
  );
}

export async function DiaryBoard({
  studentId,
  basePath,
  wholePeriod,
  order,
}: {
  studentId: string | null;
  basePath: string;
  wholePeriod: boolean;
  order: BoardOrder;
}) {
  const db = createSupabaseServerClient();
  let entries: SharedEntry[];
  try {
    entries = await loadSharedEntries(db);
  } catch {
    return unavailable;
  }
  const now = Date.now();
  const since = monthStart(now);
  const [reactionRows, cadets] = await Promise.all([
    loadReactions(
      db,
      entries.map((entry) => entry.id),
    ),
    loadCadets(
      db,
      entries.map((entry) => entry.student_id),
    ),
  ]);
  const totals = new Map(
    [...summarizeReactions(reactionRows, "")].map(([id, summary]) => [id, summary.total]),
  );
  const name = (id: string) => cadetLabel(cadets.get(id));
  const inPeriod = wholePeriod
    ? entries
    : entries.filter(
        (entry) => entry.shared_at && Date.parse(entry.shared_at) >= Date.parse(since),
      );
  const rows = diaryBoard(inPeriod, totals, order, name);
  const highlights = monthHighlights(entries, totals, since);
  const month = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "America/Belem",
  }).format(now);
  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Incentivo entre colegas, sem valor avaliativo. Conta só o que foi compartilhado no mural;
        quem ainda não compartilhou não aparece.
      </p>
      <form action={basePath} className="flex flex-wrap items-end gap-2 text-sm">
        <input type="hidden" name="aba" value="quadro" />
        <label className="space-y-1">
          <span className="block">Período</span>
          <select
            name="periodo"
            defaultValue={wholePeriod ? "tudo" : "mes"}
            className={selectClass}
          >
            <option value="mes">Este mês</option>
            <option value="tudo">Todo o estágio</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="block">Ordenar por</span>
          <select name="ordem" defaultValue={order} className={selectClass}>
            {BOARD_ORDERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Ver
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {wholePeriod
            ? "Ninguém compartilhou um relato ainda."
            : "Nenhum relato compartilhado neste mês ainda."}
        </p>
      ) : (
        <ol className="divide-y rounded-lg border bg-card">
          {rows.map((row) => (
            <li
              key={row.studentId}
              className={`flex flex-wrap items-center justify-between gap-2 p-3 text-sm ${
                row.studentId === studentId ? "bg-primary/5" : ""
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                <span className="w-6 text-center">
                  {row.medal ? (
                    <span role="img" aria-label={medals[row.medal][1]}>
                      {medals[row.medal][0]}
                    </span>
                  ) : null}
                </span>
                {name(row.studentId)}
                {row.studentId === studentId ? " (você)" : ""}
              </span>
              <span className="text-muted-foreground">
                {row.shared} {row.shared === 1 ? "relato" : "relatos"} · {row.types}{" "}
                {row.types === 1 ? "tipo" : "tipos"} · {row.reactions}{" "}
                {row.reactions === 1 ? "reação" : "reações"}
              </span>
            </li>
          ))}
        </ol>
      )}
      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">Destaques de {month}</h2>
        {highlights.featured.length + highlights.appreciated.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Os relatos destacados pela Coordenação e os mais apreciados do mês aparecem aqui.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {highlights.featured.length ? (
              <Highlights
                basePath={basePath}
                title="Escolhidos pela Coordenação"
                entries={highlights.featured}
                name={name}
              />
            ) : null}
            {highlights.appreciated.length ? (
              <Highlights
                basePath={basePath}
                title="Mais apreciados pela turma"
                entries={highlights.appreciated}
                name={name}
                totals={totals}
              />
            ) : null}
          </div>
        )}
      </section>
    </section>
  );
}

function Highlights({
  basePath,
  title,
  entries,
  name,
  totals,
}: {
  basePath: string;
  title: string;
  entries: SharedEntry[];
  name: (id: string) => string;
  totals?: Map<string, number>;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-4 text-sm">
      <h3 className="font-semibold">{title}</h3>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              href={`${basePath}?aba=mural#relato-${entry.id}`}
              className="text-primary underline"
            >
              {entry.summary}
            </Link>
            <span className="text-muted-foreground">
              {" "}
              · {name(entry.student_id)}
              {totals ? ` · ${totals.get(entry.id) ?? 0} reações` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
