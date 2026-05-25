import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listStudentsWithAggregates } from "@/lib/supabase/queries/students";
import { SearchInput } from "@/components/ui/SearchInput";
import { StudentListCard } from "@/components/app/StudentListCard";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import {
  StudentProgressFilters,
  type ProgressFilter,
  type ProgressSort,
} from "@/components/app/StudentProgressFilters";
import {
  calculateStudentProfileProgress,
  PROGRESS_STATUS_ORDER,
  type ProgressStatus,
  type ProgressResult,
} from "@/lib/student-progress";

export const metadata = { title: "Alunos" };

interface PageProps {
  searchParams: {
    q?: string;
    pelotao?: string;
    status?: string;
    sort?: string;
  };
}

const VALID_FILTERS: ProgressFilter[] = ["todos", ...PROGRESS_STATUS_ORDER];
const VALID_SORTS: ProgressSort[] = ["numero", "menor", "maior", "incompletas"];

function parseFilter(raw: string | undefined): ProgressFilter {
  return (VALID_FILTERS as string[]).includes(raw ?? "")
    ? (raw as ProgressFilter)
    : "todos";
}

function parseSort(raw: string | undefined): ProgressSort {
  return (VALID_SORTS as string[]).includes(raw ?? "")
    ? (raw as ProgressSort)
    : "numero";
}

export default async function CoordenacaoAlunosPage({ searchParams }: PageProps) {
  await requireRole("coordenacao");

  const statusFilter = parseFilter(searchParams.status);
  const sortBy = parseSort(searchParams.sort);

  const supabase = createSupabaseServerClient();
  const bundles = await listStudentsWithAggregates(supabase, {
    query: searchParams.q,
    pelotao: searchParams.pelotao,
  });

  const enriched = bundles.map((b) => ({
    bundle: b,
    progress: calculateStudentProfileProgress(b),
  }));

  const counts: Record<ProgressFilter, number> = {
    todos: enriched.length,
    nao_iniciada: 0,
    em_preenchimento: 0,
    quase_completa: 0,
    completa: 0,
  };
  for (const e of enriched) {
    counts[e.progress.status] += 1;
  }

  const filtered =
    statusFilter === "todos"
      ? enriched
      : enriched.filter((e) => e.progress.status === statusFilter);

  const incompleteOrder: Record<ProgressStatus, number> = {
    em_preenchimento: 0,
    nao_iniciada: 1,
    quase_completa: 2,
    completa: 3,
  };

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "menor") {
      if (a.progress.percent !== b.progress.percent) {
        return a.progress.percent - b.progress.percent;
      }
    } else if (sortBy === "maior") {
      if (a.progress.percent !== b.progress.percent) {
        return b.progress.percent - a.progress.percent;
      }
    } else if (sortBy === "incompletas") {
      const ord = incompleteOrder[a.progress.status] - incompleteOrder[b.progress.status];
      if (ord !== 0) return ord;
      if (a.progress.percent !== b.progress.percent) {
        return a.progress.percent - b.progress.percent;
      }
    }
    // Desempate / padrão: por número (asc, nulls last)
    const na = a.bundle.student.student_number;
    const nb = b.bundle.student.student_number;
    if (na == null && nb == null) return 0;
    if (na == null) return 1;
    if (nb == null) return -1;
    return na - nb;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <SectionEyebrow>CFO 2026.1 · CBMAP</SectionEyebrow>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Alunos do CFO
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="num-mono font-semibold text-foreground">
              {String(sorted.length).padStart(2, "0")}
            </span>{" "}
            {sorted.length === 1 ? "aluno" : "alunos"}
            {statusFilter === "todos" ? " na turma" : " no filtro"}
          </p>
        </div>
        <div className="w-full sm:w-80">
          <SearchInput placeholder="Buscar por número, nome de guerra ou nome completo" />
        </div>
      </header>

      <StudentProgressFilters status={statusFilter} sort={sortBy} counts={counts} />

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="font-display text-base font-semibold text-foreground">
            Nenhum aluno encontrado
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajuste os filtros ou verifique o termo da busca.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((e) => {
            const s = e.bundle.student;
            const progress: ProgressResult = e.progress;
            return (
              <StudentListCard
                key={s.id}
                href={`/coordenacao/alunos/${s.id}`}
                studentNumber={s.student_number}
                warName={s.war_name}
                fullName={s.full_name}
                pelotao={s.pelotao}
                badges={
                  s.situation !== "matriculado"
                    ? [{ label: s.situation, variant: "warning" }]
                    : []
                }
                progress={progress}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
