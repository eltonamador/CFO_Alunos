import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  const supabase = createSupabaseServerClient();
  const [checklist, student] = await Promise.all([
    fetchEquipmentChecklist(supabase, session.studentId),
    fetchStudent(supabase, session.studentId),
  ]);

  const studentSex = student?.sex ?? null;

  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">Materiais</p>
        <h1 className="font-display text-2xl font-bold">Meus Materiais</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atualize o status de cada item conforme for adquirindo. Itens marcados como{" "}
          <strong>OK</strong> ou <strong>Não se aplica</strong> contam no progresso.
        </p>
      </header>

      <MateriaisTab
        studentId={session.studentId}
        studentSex={studentSex}
        checklist={checklist}
        canValidate={false}
      />
    </div>
  );
}
