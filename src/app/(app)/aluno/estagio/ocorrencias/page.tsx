import {
  DiaryBoard,
  DiaryMural,
} from "@/modules/internship-management/presentation/DiaryClassViews";
import {
  DiaryTabs,
  diaryViewOptions,
} from "@/modules/internship-management/presentation/DiaryTabs";
import Link from "next/link";
import { requireRole } from "@/components/app/RoleGuard";
import { buttonVariants } from "@/components/ui/Button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { diaryPhotosConfigured } from "@/modules/internship-management/infrastructure/diaryPhotosDrive";
import {
  COMPETENCE_NOTICE,
  DIARY_ENTRY_COLUMNS,
  entryTypes,
  entryVehicles,
  DIARY_NOTICE,
  diaryBadges,
  diaryStats,
  occurrenceTypeLabel,
  shiftLabel,
  summarizeReactions,
  type DiaryEntry,
} from "@/modules/internship-management/domain/occurrenceDiary";
import {
  cadetLabel,
  loadCadets,
  loadDiaryShifts,
  loadReactions,
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
const basePath = "/aluno/estagio/ocorrencias";
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

export default async function OccurrenceDiaryPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await requireRole("aluno");
  if (!session.studentId) return <p>Conta sem vínculo de cadete. Procure a Coordenação.</p>;
  const { tab, order, limit } = diaryViewOptions(searchParams);
  const message = searchParams?.resultado ? feedback[searchParams.resultado] : null;

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
      <DiaryTabs basePath={basePath} active={tab} firstLabel="Meu diário" />
      {message ? (
        <p role="status" className="rounded-lg border bg-muted p-3 text-sm">
          {message}
        </p>
      ) : null}
      {tab === "quadro" ? (
        <DiaryBoard
          basePath={basePath}
          studentId={session.studentId}
          wholePeriod={searchParams?.periodo === "tudo"}
          order={order}
        />
      ) : tab === "mural" ? (
        <DiaryMural
          basePath={basePath}
          studentId={session.studentId}
          userId={session.userId}
          limit={limit}
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
  const types = [...new Set(entries.flatMap(entryTypes))];
  const vehicles = [...new Set(entries.flatMap(entryVehicles))];
  const visible = entries.filter(
    (entry) =>
      (!filters.type || entryTypes(entry).includes(filters.type)) &&
      (!filters.vehicle || entryVehicles(entry).includes(filters.vehicle)),
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <strong>{stats.saved}</strong> {stats.saved === 1 ? "registro" : "registros"} ·{" "}
          <strong>{stats.shared}</strong> no mural · <strong>{stats.types}</strong>{" "}
          {stats.types === 1 ? "tipo vivido" : "tipos diferentes"}
          {stats.drafts
            ? ` · ${stats.drafts} ${stats.drafts === 1 ? "rascunho" : "rascunhos"}`
            : ""}
        </p>
        {stats.saved ? (
          <a
            href="/api/estagio/diario"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
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
              photosEnabled={diaryPhotosConfigured()}
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
