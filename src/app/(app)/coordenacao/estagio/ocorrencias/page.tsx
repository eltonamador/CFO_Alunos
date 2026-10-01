import {
  DiaryBoard,
  DiaryMural,
} from "@/modules/internship-management/presentation/DiaryClassViews";
import {
  DiaryTabs,
  diaryViewOptions,
  type DiaryViewSearchParams,
} from "@/modules/internship-management/presentation/DiaryTabs";
import Link from "next/link";
import { z } from "zod";
import { requireRole } from "@/components/app/RoleGuard";
import { buttonVariants } from "@/components/ui/Button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { diaryPhotosConfigured } from "@/modules/internship-management/infrastructure/diaryPhotosDrive";
import {
  DIARY_ENTRY_COLUMNS,
  summarizeReactions,
  type DiaryEntry,
} from "@/modules/internship-management/domain/occurrenceDiary";
import {
  cadetLabel,
  loadCadets,
  loadReactions,
} from "@/modules/internship-management/infrastructure/occurrenceDiary";
import { DiaryEntryCard } from "@/modules/internship-management/presentation/DiaryEntryCard";
import {
  DiaryModeration,
  DiaryReactions,
} from "@/modules/internship-management/presentation/DiaryControls";

export const metadata = { title: "Diário de ocorrências - Coordenação" };
export const dynamic = "force-dynamic";

const views = {
  compartilhado: "Compartilhados no mural",
  pessoal: "Só no diário do cadete",
  todos: "Todos os registros salvos",
} as const;
const selectClass = "h-11 rounded-md border border-input bg-card px-3 text-sm";

const basePath = "/coordenacao/estagio/ocorrencias";
type SearchParams = DiaryViewSearchParams & { ver?: string; cadete?: string };

export default async function CoordinationDiaryPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await requireRole("coordenacao");
  const { tab, order, limit } = diaryViewOptions(searchParams);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <Link href="/coordenacao/estagio" className="text-sm text-primary underline">
          Estágio
        </Link>
        <h1 className="font-display text-3xl font-bold">Diário de ocorrências</h1>
        <p className="text-sm text-muted-foreground">
          Registro extraoficial e narrativo dos cadetes, fora do PPC e sem valor avaliativo. Não há
          aprovação: destaque relatos inspiradores ou oculte do mural algum inadequado. Rascunhos
          não aparecem aqui.
        </p>
      </header>
      <DiaryTabs basePath={basePath} active={tab} firstLabel="Registros salvos" />
      {tab === "quadro" ? (
        <DiaryBoard
          basePath={basePath}
          studentId={null}
          wholePeriod={searchParams?.periodo === "tudo"}
          order={order}
        />
      ) : tab === "mural" ? (
        <DiaryMural
          basePath={basePath}
          studentId={null}
          userId={session.userId}
          limit={limit}
          canModerate
        />
      ) : (
        <SavedEntriesTab searchParams={searchParams} userId={session.userId} />
      )}
    </div>
  );
}

async function SavedEntriesTab({
  searchParams,
  userId,
}: {
  searchParams?: SearchParams;
  userId: string;
}) {
  const db = createSupabaseServerClient();
  const view =
    (searchParams?.ver ?? "") in views
      ? (searchParams!.ver as keyof typeof views)
      : "compartilhado";
  const cadet = z.string().uuid().safeParse(searchParams?.cadete).success
    ? searchParams!.cadete!
    : "";
  let query = db
    .from("internship_diary_entries")
    .select(DIARY_ENTRY_COLUMNS)
    .neq("status", "rascunho")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);
  if (view !== "todos") query = query.eq("status", view);
  if (cadet) query = query.eq("student_id", cadet);
  const [{ data, error }, { data: roster }] = await Promise.all([
    query,
    db.from("v_student_class_basic").select("id,war_name,student_number").order("student_number"),
  ]);
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
  const authors = new Set(entries.map((entry) => entry.student_id)).size;

  return (
    <>
      <form action={basePath} className="flex flex-wrap items-end gap-2 text-sm">
        <label className="space-y-1">
          <span className="block">Mostrar</span>
          <select name="ver" defaultValue={view} className={selectClass}>
            {Object.entries(views).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block">Cadete</span>
          <select name="cadete" defaultValue={cadet} className={selectClass}>
            <option value="">Todos</option>
            {(roster ?? []).map((row) => (
              <option key={row.id as string} value={row.id as string}>
                {cadetLabel({
                  id: row.id as string,
                  war_name: (row.war_name as string) ?? "Cadete",
                  student_number: row.student_number ?? null,
                })}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Filtrar
        </button>
      </form>
      {error ? (
        <p className="rounded-lg border p-4 text-sm">
          Não foi possível carregar o diário. Tente novamente mais tarde.
        </p>
      ) : (
        <>
          <p className="text-sm">
            <strong>{entries.length}</strong> {entries.length === 1 ? "registro" : "registros"} de{" "}
            <strong>{authors}</strong> {authors === 1 ? "cadete" : "cadetes"}.
          </p>
          {entries.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum registro por aqui ainda.
            </p>
          ) : (
            entries.map((entry) => (
              <DiaryEntryCard
                key={entry.id}
                entry={entry}
                author={cadetLabel(cadets.get(entry.student_id))}
                companions={entry.companion_ids.map((id) => cadetLabel(cadets.get(id)))}
                showStatus
                photosEnabled={diaryPhotosConfigured()}
              >
                <DiaryReactions
                  key={`${entry.id}:${reactions.get(entry.id)?.total ?? 0}:${reactions.get(entry.id)?.mine.join(",") ?? ""}`}
                  entryId={entry.id}
                  summary={reactions.get(entry.id)}
                  canReact={entry.status === "compartilhado" && !entry.hidden_at}
                />
                {entry.status === "compartilhado" ? (
                  <DiaryModeration
                    key={`${entry.id}:${entry.featured_at}:${entry.hidden_at}`}
                    id={entry.id}
                    featured={Boolean(entry.featured_at)}
                    hidden={Boolean(entry.hidden_at)}
                  />
                ) : null}
              </DiaryEntryCard>
            ))
          )}
        </>
      )}
    </>
  );
}
