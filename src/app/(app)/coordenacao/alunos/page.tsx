import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listStudents } from "@/lib/supabase/queries/students";
import { SearchInput } from "@/components/ui/SearchInput";
import { StudentListCard } from "@/components/app/StudentListCard";

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
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alunos do CFO</h1>
          <p className="text-sm text-muted-foreground">
            {students.length} {students.length === 1 ? "aluno" : "alunos"}
          </p>
        </div>
        <div className="w-full sm:w-72">
          <SearchInput placeholder="Buscar por número ou nome de guerra" />
        </div>
      </header>

      {students.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhum aluno encontrado.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <StudentListCard
              key={s.id}
              href={`/coordenacao/alunos/${s.id}`}
              studentNumber={s.student_number}
              warName={s.war_name}
              fullName={s.full_name}
              pelotao={s.pelotao}
              badges={s.situation !== "matriculado" ? [{ label: s.situation }] : []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
