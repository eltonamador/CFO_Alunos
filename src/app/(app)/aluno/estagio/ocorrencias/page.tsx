import Link from "next/link";
import { requireRole } from "@/components/app/RoleGuard";
import { buttonVariants } from "@/components/ui/Button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  BOARD_ORDERS,
  COMPETENCE_NOTICE,
  DIARY_ENTRY_COLUMNS,
  DIARY_NOTICE,
  diaryBadges,
  diaryBoard,
  diaryStats,
  monthHighlights,
  monthStart,
  occurrenceTypeLabel,
  shiftLabel,
  summarizeReactions,
  type BoardOrder,
  type DiaryEntry,
} from "@/modules/internship-management/domain/occurrenceDiary";
import {
  cadetLabel,
  loadCadets,
  loadDiaryShifts,
  loadReactions,
  loadSharedEntries,
  type SharedEntry,
} from "@/modules/internship-management/infrastructure/occurrenceDiary";
import {
  DiaryBadges,
  DiaryEntryCard,
} from "@/modules/internship-management/presentation/DiaryEntryCard";
import {
  DiaryEntryActions,
  DiaryReactions,
} from "@/modules/internship-management/presentation/DiaryControls";

export const metadata = { title: "Diário de ocorrências" };
export const dynamic = "force-dynamic";

const feedback: Record<string, string> = {
  rascunho: "Rascunho salvo. Continue quando quiser.",
  pessoal: "Registro salvo no seu diário.",
  compartilhado: "Registro salvo e compartilhado com a turma.",
};
const tabs = [
  { value: "diario", label: "Meu diário", href: "/aluno/estagio/ocorrencias" },
  { value: "mural", label: "Mural da turma", href: "/aluno/estagio/ocorrencias?aba=mural" },
  { value: "quadro", label: "Quadro da turma", href: "/aluno/estagio/ocorrencias?aba=quadro" },
] as const;
const medals = { 1: ["🥇", "Medalha de ouro"], 2: ["🥈", "Medalha de prata"], 3: ["🥉", "Medalha de bronze"] };
const selectClass = "h-11 rounded-md border border-input bg-card px-3 text-sm";
const unavailable = (
  <p className="rounded-lg border p-4 text-sm">
    O diário ainda não está disponível. Tente novamente mais tarde.
  </p>
);

type SearchParams = {
  aba?: string;
  tipo?: string;
  viatura?: string;
  resultado?: string;
  limite?: string;
  periodo?: string;
  ordem?: string;
};

export default async function OccurrenceDiaryPage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await requireRole("aluno");
  if (!session.studentId) return <p>Conta sem vínculo de cadete. Procure a Coordenação.</p>;
  const tab = tabs.find((item) => item.value === searchParams?.aba)?.value ?? "diario";
  const message = searchParams?.resultado ? feedback[searchParams.resultado] : null;
  const order = BOARD_ORDERS.some((item) => item.value === searchParams?.ordem)
    ? (searchParams!.ordem as BoardOrder)
    : "registros";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-3">
        <div className="space-y-2">
          <Link href="/aluno/estagio" className="text-sm text-primary underline">
            Meu Estágio
          </Link>
          <h1 className="font-display text-3xl font-bold">Diário de ocorrências</h1>
          <p className="text-sm">{DIARY_NOTICE}</p>
          <p className="text-sm text-muted-foreground">{COMPETENCE_NOTICE}</p>
        </div>
        <Link href="/aluno/estagio/ocorrencias/nova" className={buttonVariants()}>
          Registrar ocorrência
        </Link>
      </header>
      <nav
        role="tablist"
        aria-label="Diário, mural e quadro"
        className="flex gap-1 overflow-x-auto border-b"
      >
        {tabs.map((item) => (
          <Link
            key={item.value}
            href={item.href}
            role="tab"
            aria-selected={item.value === tab}
            className={`-mb-px whitespace-nowrap border-b-[3px] px-3 py-3 font-display text-sm font-semibold uppercase tracking-[0.06em] ${
              item.value === tab
                ? "border-primary text-primary"
                : "border-transparent text-foreground/75"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {message ? (
        <p role="status" className="rounded-lg border bg-muted p-3 text-sm">
          {message}
        </p>
      ) : null}
      {tab === "quadro" ? (
        <BoardTab
          studentId={session.studentId}
          wholePeriod={searchParams?.periodo === "tudo"}
          order={order}
        />
      ) : tab === "mural" ? (
        <MuralTab
          studentId={session.studentId}
          userId={session.userId}
          limit={Math.min(Math.max(Number(searchParams?.limite) || 60, 60), 300)}
        />
      ) : (
        <DiaryTab
          studentId={session.studentId}
          userId={session.userId}
          filters={{ type: searchParams?.tipo ?? "", vehicle: searchParams?.viatura ?? "" }}
        />
      )}
    </div>
  );
}

async function DiaryTab({
  studentId,
  userId,
  filters,
}: {
  studentId: string;
  userId: string;
  filters: { type: string; vehicle: string };
}) {
  const db = createSupabaseServerClient();
  const [{ data, error }, shifts] = await Promise.all([
    db
      .from("internship_diary_entries")
      .select(DIARY_ENTRY_COLUMNS)
      .eq("student_id", studentId)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    loadDiaryShifts(db),
  ]);
  if (error) return unavailable;
  const entries = (data ?? []) as unknown as DiaryEntry[];
  const [reactionRows, cadets] = await Promise.all([
    loadReactions(
      db,
      entries.map((entry) => entry.id),
    ),
    loadCadets(
      db,
      entries.flatMap((entry) => entry.companion_ids),
    ),
  ]);
  const reactions = summarizeReactions(reactionRows, userId);
  const shiftLabels = new Map(shifts.map((shift) => [shift.assignment_id, shiftLabel(shift)]));
  const stats = diaryStats(entries);
  const badges = diaryBadges(
    entries,
    new Map([...reactions].map(([id, summary]) => [id, summary.total])),
  );
  const types = [...new Set(entries.map((entry) => entry.occurrence_type).filter(Boolean))];
  const vehicles = [...new Set(entries.map((entry) => entry.vehicle).filter(Boolean))];
  const visible = entries.filter(
    (entry) =>
      (!filters.type || entry.occurrence_type === filters.type) &&
      (!filters.vehicle || entry.vehicle === filters.vehicle),
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <strong>{stats.saved}</strong> {stats.saved === 1 ? "registro" : "registros"} ·{" "}
          <strong>{stats.shared}</strong> no mural · <strong>{stats.types}</strong>{" "}
          {stats.types === 1 ? "tipo vivido" : "tipos diferentes"}
          {stats.drafts ? ` · ${stats.drafts} ${stats.drafts === 1 ? "rascunho" : "rascunhos"}` : ""}
        </p>
        {stats.saved ? (
          <a href="/api/estagio/diario" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Baixar meu diário em PDF
          </a>
        ) : null}
      </div>
      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">Insígnias</h2>
        <p className="text-sm text-muted-foreground">Marcos simbólicos, sem pontuação.</p>
        <DiaryBadges badges={badges} />
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Linha do tempo</h2>
        {types.length + vehicles.length > 1 ? (
          <form className="flex flex-wrap items-end gap-2 text-sm">
            <label className="space-y-1">
              <span className="block">Tipo</span>
              <select name="tipo" defaultValue={filters.type} className={selectClass}>
                <option value="">Todos</option>
                {types.map((type) => (
                  <option key={type} value={type!}>
                    {occurrenceTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="block">Viatura</span>
              <select name="viatura" defaultValue={filters.vehicle} className={selectClass}>
                <option value="">Todas</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle} value={vehicle!}>
                    {vehicle}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={buttonVariants({ variant: "outline" })}>
              Filtrar
            </button>
            {filters.type || filters.vehicle ? (
              <Link href="/aluno/estagio/ocorrencias" className="py-3 text-primary underline">
                Limpar
              </Link>
            ) : null}
          </form>
        ) : null}
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nada registrado ainda. Conte a primeira ocorrência que você viveu no estágio.
          </p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro com esses filtros.</p>
        ) : (
          visible.map((entry) => (
            <DiaryEntryCard
              key={entry.id}
              entry={entry}
              shift={entry.assignment_id ? shiftLabels.get(entry.assignment_id) : undefined}
              companions={entry.companion_ids.map((id) => cadetLabel(cadets.get(id)))}
              showStatus
            >
              <DiaryReactions
                key={`${entry.id}:${reactions.get(entry.id)?.total ?? 0}`}
                entryId={entry.id}
                summary={reactions.get(entry.id)}
                canReact={false}
              />
              <DiaryEntryActions id={entry.id} status={entry.status} />
            </DiaryEntryCard>
          ))
        )}
      </section>
    </>
  );
}

async function MuralTab({
  studentId,
  userId,
  limit,
}: {
  studentId: string;
  userId: string;
  limit: number;
}) {
  const db = createSupabaseServerClient();
  const { data, error } = await db
    .from("internship_diary_entries")
    .select(DIARY_ENTRY_COLUMNS)
    .eq("status", "compartilhado")
    .is("hidden_at", null)
    .order("shared_at", { ascending: false })
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
          Ninguém compartilhou um relato ainda. Que tal ser o primeiro?
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
            >
              <DiaryReactions
                key={`${entry.id}:${summary?.total ?? 0}:${summary?.mine.join(",") ?? ""}`}
                entryId={entry.id}
                summary={summary}
                canReact={entry.student_id !== studentId}
              />
            </DiaryEntryCard>
          );
        })
      )}
      {entries.length === limit && limit < 300 ? (
        <Link
          href={`/aluno/estagio/ocorrencias?aba=mural&limite=${limit + 60}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Ver relatos anteriores
        </Link>
      ) : null}
    </section>
  );
}

async function BoardTab({
  studentId,
  wholePeriod,
  order,
}: {
  studentId: string;
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
    : entries.filter((entry) => entry.shared_at && Date.parse(entry.shared_at) >= Date.parse(since));
  const rows = diaryBoard(inPeriod, totals, order, name);
  const highlights = monthHighlights(entries, totals, since);
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "America/Belem" }).format(
    now,
  );
  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Incentivo entre colegas, sem valor avaliativo. Conta só o que foi compartilhado no mural;
        quem ainda não compartilhou não aparece.
      </p>
      <form className="flex flex-wrap items-end gap-2 text-sm">
        <input type="hidden" name="aba" value="quadro" />
        <label className="space-y-1">
          <span className="block">Período</span>
          <select name="periodo" defaultValue={wholePeriod ? "tudo" : "mes"} className={selectClass}>
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
                title="Escolhidos pela Coordenação"
                entries={highlights.featured}
                name={name}
              />
            ) : null}
            {highlights.appreciated.length ? (
              <Highlights
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
  title,
  entries,
  name,
  totals,
}: {
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
              href={`/aluno/estagio/ocorrencias?aba=mural#relato-${entry.id}`}
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
