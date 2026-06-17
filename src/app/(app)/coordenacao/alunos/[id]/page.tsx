import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchStudent,
  fetchStudentContact,
  fetchStudentAddress,
  fetchEmergencyContacts,
  fetchHealthRestriction,
  signedPhotoUrl,
  fetchStudentCanga,
  fetchStudentLogistics,
  fetchStudentVehicle,
  listStudents,
  fetchStudentAuditLogs,
  fetchStudentWeightHistory,
} from "@/lib/supabase/queries/students";
import { fetchEquipmentChecklist } from "@/lib/supabase/queries/equipment";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { StudentPhotoUpload } from "@/components/app/StudentPhotoUpload";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { getStudentSigla } from "@/lib/utils";
import { ResumoTab } from "./tabs/ResumoTab";
import { IdentificacaoTab } from "./tabs/IdentificacaoTab";
import { ContatoTab } from "./tabs/ContatoTab";
import { EnderecoTab } from "./tabs/EnderecoTab";
import { EmergenciaTab } from "./tabs/EmergenciaTab";
import { SaudeTab } from "./tabs/SaudeTab";
import { LogisticaTab } from "./tabs/LogisticaTab";
import { VeiculoTab } from "./tabs/VeiculoTab";
import { MateriaisTab } from "./tabs/MateriaisTab";
import { HistoricoTab } from "./tabs/HistoricoTab";
import { DocumentsTab } from "@/components/app/documents/DocumentsTab";

const COURSE_STATUS_LABELS: Record<string, string> = {
  matriculado: "Matriculado",
  excluido: "Excluído",
  trancado: "Trancado",
  desistente: "Desistente",
  transferido: "Transferido",
  concluido: "Concluído",
  outro: "Outro",
};

const TABS = [
  { value: "resumo", label: "Resumo" },
  { value: "identificacao", label: "Identificação" },
  { value: "contato", label: "Contato" },
  { value: "endereco", label: "Endereço/Origem" },
  { value: "emergencia", label: "Emergência" },
  { value: "saude", label: "Saúde" },
  { value: "logistica", label: "Logística" },
  { value: "veiculo", label: "Veículo/CNH" },
  { value: "documentos", label: "Documentos" },
  { value: "materiais", label: "Materiais" },
  { value: "historico", label: "Histórico" },
];

interface PageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function StudentDetailPage({ params, searchParams }: PageProps) {
  const session = await requireRole("coordenacao");

  const supabase = createSupabaseServerClient();
  const student = await fetchStudent(supabase, params.id);
  if (!student) notFound();

  const tab = searchParams.tab ?? "resumo";

  const [contact, address, emergency, health, weightHistory, photoUrl, canga, allStudents, logistics, vehicle, checklist, logs] =
    await Promise.all([
      fetchStudentContact(supabase, params.id),
      fetchStudentAddress(supabase, params.id),
      fetchEmergencyContacts(supabase, params.id),
      fetchHealthRestriction(supabase, params.id),
      fetchStudentWeightHistory(supabase, params.id),
      signedPhotoUrl(supabase, student.photo_path),
      fetchStudentCanga(supabase, params.id),
      listStudents(supabase),
      fetchStudentLogistics(supabase, params.id),
      fetchStudentVehicle(supabase, params.id),
      fetchEquipmentChecklist(supabase, params.id),
      fetchStudentAuditLogs(supabase, params.id),
    ]);

  const studentMap = (allStudents ?? []).reduce((acc: Record<string, string>, curr) => {
    acc[curr.id] = curr.war_name;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <Link href="/coordenacao/alunos" className="text-sm text-muted-foreground hover:underline">
          ← Alunos
        </Link>
      </div>

      {/* Header sticky */}
      <header className="sticky top-14 z-10 -mx-4 flex items-center gap-4 border-b border-border bg-card px-4 py-4 shadow-card-sm md:top-14 md:mx-0 md:rounded-lg md:border md:px-5 md:py-4">
        <StudentPhotoUpload
          studentId={student.id}
          photoUrl={photoUrl ?? null}
          alt={student.war_name}
          initials={getStudentSigla(student.student_number, student.war_name)}
          canEdit
        />
        <div className="min-w-0 flex-1">
          <SectionEyebrow className="mb-0.5">
            Ficha do aluno
          </SectionEyebrow>
          <h1 className="truncate font-display text-2xl font-bold uppercase tracking-[0.02em] text-foreground">
            {student.war_name} — {student.student_number ? String(student.student_number).padStart(2, "0") : "—"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{student.full_name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {student.pelotao && <Badge variant="gold" dot>{student.pelotao}</Badge>}
            <Badge variant={student.course_status === "matriculado" ? "success" : "warning"} dot>
              {COURSE_STATUS_LABELS[student.course_status]}
            </Badge>
            {health?.validation_status === "validado" && health?.operational_summary && (
              <Badge variant="warning">Restrição</Badge>
            )}
          </div>
        </div>
      </header>

      <Tabs items={TABS} defaultValue="resumo" />

      <div className="pt-2">
        {tab === "resumo" && (
          <ResumoTab
            student={student}
            contact={contact}
            address={address}
            canga={canga}
            allStudents={allStudents}
            sessionRole={session.role}
          />
        )}
        {tab === "identificacao" && (
          <IdentificacaoTab studentId={student.id} student={student} contact={contact} />
        )}
        {tab === "contato" && <ContatoTab studentId={student.id} contact={contact} />}
        {tab === "endereco" && (
          <EnderecoTab
            studentId={student.id}
            address={address}
            naturalityCity={student.naturality_city}
            naturalityState={student.naturality_state}
          />
        )}
        {tab === "emergencia" && <EmergenciaTab studentId={student.id} contacts={emergency} />}
        {tab === "saude" && (
          <SaudeTab
            studentId={student.id}
            health={health}
            weightHistory={weightHistory}
            currentUserName={session.fullName}
            canCurate
          />
        )}
        {tab === "logistica" && (
          <LogisticaTab studentId={student.id} logistics={logistics} canEditUniform />
        )}
        {tab === "veiculo" && <VeiculoTab studentId={student.id} vehicle={vehicle} />}
        {tab === "documentos" && <DocumentsTab studentId={student.id} />}
        {tab === "materiais" && (
          <MateriaisTab
            studentId={student.id}
            studentSex={student.sex ?? null}
            checklist={checklist}
            canValidate
          />
        )}
        {tab === "historico" && (
          <HistoricoTab
            _studentId={student.id}
            logs={logs}
            studentMap={studentMap}
          />
        )}
      </div>
    </div>
  );
}
