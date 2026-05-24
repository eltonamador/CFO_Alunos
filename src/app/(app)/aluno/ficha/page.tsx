import { redirect } from "next/navigation";
import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchStudent,
  fetchStudentContact,
  fetchStudentAddress,
  fetchEmergencyContacts,
  fetchHealthRestriction,
  fetchStudentCanga,
  fetchStudentLogistics,
  fetchStudentVehicle,
} from "@/lib/supabase/queries/students";
import { Tabs } from "@/components/ui/Tabs";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { ContatoTab } from "@/app/(app)/coordenacao/alunos/[id]/tabs/ContatoTab";
import { EnderecoTab } from "@/app/(app)/coordenacao/alunos/[id]/tabs/EnderecoTab";
import { EmergenciaTab } from "@/app/(app)/coordenacao/alunos/[id]/tabs/EmergenciaTab";
import { SaudeTab } from "@/app/(app)/coordenacao/alunos/[id]/tabs/SaudeTab";
import { ResumoTab } from "@/app/(app)/coordenacao/alunos/[id]/tabs/ResumoTab";
import { LogisticaTab } from "@/app/(app)/coordenacao/alunos/[id]/tabs/LogisticaTab";
import { VeiculoTab } from "@/app/(app)/coordenacao/alunos/[id]/tabs/VeiculoTab";
import { MateriaisTab } from "@/app/(app)/coordenacao/alunos/[id]/tabs/MateriaisTab";
import { fetchEquipmentChecklist } from "@/lib/supabase/queries/equipment";

export const metadata = { title: "Minha ficha" };

const TABS = [
  { value: "resumo", label: "Resumo" },
  { value: "contato", label: "Contato" },
  { value: "endereco", label: "Endereço/Origem" },
  { value: "emergencia", label: "Emergência" },
  { value: "saude", label: "Saúde" },
  { value: "logistica", label: "Logística" },
  { value: "veiculo", label: "Veículo/CNH" },
  { value: "materiais", label: "Materiais" },
];

interface PageProps {
  searchParams: { tab?: string };
}

export default async function AlunoFichaPage({ searchParams }: PageProps) {
  const session = await requireRole("aluno");
  if (!session.studentId) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-lg font-semibold">Conta não vinculada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua conta ainda não está vinculada a um aluno. Procure a Coordenação.
        </p>
      </div>
    );
  }

  const supabase = createSupabaseServerClient();
  const student = await fetchStudent(supabase, session.studentId);
  if (!student) redirect("/aluno");

  const tab = searchParams.tab ?? "resumo";

  const [contact, address, emergency, health, canga, logistics, vehicle, checklist] = await Promise.all([
    fetchStudentContact(supabase, session.studentId),
    fetchStudentAddress(supabase, session.studentId),
    fetchEmergencyContacts(supabase, session.studentId),
    fetchHealthRestriction(supabase, session.studentId),
    fetchStudentCanga(supabase, session.studentId),
    fetchStudentLogistics(supabase, session.studentId),
    fetchStudentVehicle(supabase, session.studentId),
    fetchEquipmentChecklist(supabase, session.studentId),
  ]);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <SectionEyebrow>Aluno · CFO 2026.1</SectionEyebrow>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          {student.war_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Mantenha seus dados atualizados. Alterações em dados sensíveis (saúde) aguardam validação
          da Coordenação.
        </p>
      </header>

      <Tabs items={TABS} defaultValue="resumo" />

      <div className="pt-2">
        {tab === "resumo" && (
          <ResumoTab
            student={student}
            contact={contact}
            address={address}
            canga={canga}
            allStudents={[]}
            sessionRole={session.role}
          />
        )}
        {tab === "contato" && <ContatoTab studentId={session.studentId} contact={contact} />}
        {tab === "endereco" && (
          <EnderecoTab
            studentId={session.studentId}
            address={address}
            naturalityCity={student.naturality_city}
            naturalityState={student.naturality_state}
          />
        )}
        {tab === "emergencia" && (
          <EmergenciaTab studentId={session.studentId} contacts={emergency} />
        )}
        {tab === "saude" && <SaudeTab studentId={session.studentId} health={health} />}
        {tab === "logistica" && (
          <LogisticaTab studentId={session.studentId} logistics={logistics} />
        )}
        {tab === "veiculo" && <VeiculoTab studentId={session.studentId} vehicle={vehicle} />}
        {tab === "materiais" && (
          <MateriaisTab
            studentId={session.studentId}
            studentSex={student.sex ?? null}
            checklist={checklist}
          />
        )}
      </div>
    </div>
  );
}
