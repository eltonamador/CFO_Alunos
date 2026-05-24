import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listStudents } from "@/lib/supabase/queries/students";
import { SearchInput } from "@/components/ui/SearchInput";
import { StudentListCard } from "@/components/app/StudentListCard";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";

export const metadata = { title: "Alunos" };

interface PageProps {
  searchParams: { q?: string; pelotao?: string };
}

export default async function CoordenacaoAlunosPage({ searchParams }: PageProps) {
  await requireRole("coordenacao");

  const supabase = createSupabaseServerClient();
  const students = await listStudents(supabase, {
    query: searchParams.q,
    pelotao: searchParams.pelotao,
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
              {String(students.length).padStart(2, "0")}
            </span>{" "}
            {students.length === 1 ? "aluno" : "alunos"} na turma
          </p>
        </div>
        <div className="w-full sm:w-80">
          <SearchInput placeholder="Buscar por número, nome de guerra ou nome completo" />
        </div>
      </header>

      {students.length === 0 ? (
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
          {students.map((s) => (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
