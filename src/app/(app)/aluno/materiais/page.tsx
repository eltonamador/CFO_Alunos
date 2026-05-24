import { requireRole } from "@/components/app/RoleGuard";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import { fetchEquipmentChecklist } from "@/lib/supabase/queries/equipment";
import { fetchStudent } from "@/lib/supabase/queries/students";
import { MateriaisTab } from "@/app/(app)/coordenacao/alunos/[id]/tabs/MateriaisTab";

export const metadata = { title: "Meus Materiais — CFO Alunos" };

export default async function AlunoMateriaisPage() {
  const session = await requireRole("aluno");

  if (!session.studentId) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-lg font-semibold">Conta não vinculada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Procure a Coordenação para vincular sua conta a um aluno.
        </p>
      </div>
    );
  }

  const supabase = createServerClientUntyped();
  const [checklist, student] = await Promise.all([
    fetchEquipmentChecklist(supabase, session.studentId),
    fetchStudent(supabase, session.studentId),
  ]);

  const studentSex = student?.sex ?? null;

  // Quarentena: categoria cujo nome contém "quarentena" OU todos os itens têm phase=quarentena
  const quarentenaGroups = checklist.filter(
    (g) =>
      g.category.name.toLowerCase().includes("quarentena") ||
      g.requirements.every((r) => r.phase === "quarentena"),
  );
  const cursoGroups = checklist.filter((g) => !quarentenaGroups.includes(g));

  return (
    <div className="space-y-8">
      <header>
        <p className="section-eyebrow">Materiais</p>
        <h1 className="text-2xl font-bold font-display">Meus Materiais</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atualize o status de cada item conforme for adquirindo. Itens marcados como{" "}
          <strong>OK</strong> ou <strong>Comprado</strong> contam no progresso.
        </p>
      </header>

      {/* ── Quarentena ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold font-display uppercase tracking-wide text-primary">
            Quarentena
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <p className="text-xs text-muted-foreground">
          Itens obrigatórios para o período de quarentena. Providencie antes do início do curso.
        </p>
        <MateriaisTab
          studentId={session.studentId}
          studentSex={studentSex}
          checklist={quarentenaGroups}
          canValidate={false}
        />
      </section>

      {/* ── Enxoval do Curso ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold font-display uppercase tracking-wide text-primary">
            Enxoval do Curso
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <p className="text-xs text-muted-foreground">
          Demais itens do enxoval completo — aquisição conforme cronograma do curso.
        </p>
        {cursoGroups.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Catálogo do enxoval completo será disponibilizado pela Coordenação.
            </p>
          </div>
        ) : (
          <MateriaisTab
            studentId={session.studentId}
            studentSex={studentSex}
            checklist={cursoGroups}
            canValidate={false}
          />
        )}
      </section>
    </div>
  );
}
