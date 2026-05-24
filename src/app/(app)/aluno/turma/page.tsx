import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listClassBasic, fetchStudent } from "@/lib/supabase/queries/students";
import { SearchInput } from "@/components/ui/SearchInput";
import { StudentListCard } from "@/components/app/StudentListCard";

export const metadata = { title: "Minha turma" };

interface PageProps {
  searchParams: { q?: string };
}

export default async function AlunoTurmaPage({ searchParams }: PageProps) {
  const session = await requireRole("aluno");

  const supabase = createSupabaseServerClient();

  let classId: string | undefined;
  if (session.studentId) {
    const me = await fetchStudent(supabase, session.studentId);
    classId = me?.class_id;
  }

  const list = await listClassBasic(supabase, classId, searchParams.q);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Minha turma</h1>
        <p className="text-sm text-muted-foreground">
          Lista básica — sem contatos. Para emergência, acione a Coordenação.
        </p>
      </header>

      <SearchInput placeholder="Buscar por número ou nome de guerra" />

      {list.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhum colega encontrado.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <StudentListCard
              key={s.id}
              href="#"
              studentNumber={s.student_number}
              warName={s.war_name}
              pelotao={s.pelotao}
            />
          ))}
        </div>
      )}
    </div>
  );
}
