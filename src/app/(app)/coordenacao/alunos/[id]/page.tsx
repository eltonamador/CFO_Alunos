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
} from "@/lib/supabase/queries/students";
import { fetchEquipmentChecklist } from "@/lib/supabase/queries/equipment";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { ResumoTab } from "./tabs/ResumoTab";
import { ContatoTab } from "./tabs/ContatoTab";
import { EnderecoTab } from "./tabs/EnderecoTab";
import { EmergenciaTab } from "./tabs/EmergenciaTab";
import { SaudeTab } from "./tabs/SaudeTab";
import { LogisticaTab } from "./tabs/LogisticaTab";
import { VeiculoTab } from "./tabs/VeiculoTab";
import { MateriaisTab } from "./tabs/MateriaisTab";
import { HistoricoTab } from "./tabs/HistoricoTab";
import { DocumentsTab } from "@/components/app/documents/DocumentsTab";

const TABS = [
  { value: "resumo", label: "Resumo" },
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

  const [contact, address, emergency, health, photoUrl, canga, allStudents, logistics, vehicle, checklist, logs] =
    await Promise.all([
      fetchStudentContact(supabase, params.id),
      fetchStudentAddress(supabase, params.id),
      fetchEmergencyContacts(supabase, params.id),
      fetchHealthRestriction(supabase, params.id),
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
      <header className="sticky top-14 z-10 -mx-4 flex items-center gap-3 border-b bg-background px-4 py-3 md:mx-0 md:rounded-lg md:border md:px-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={student.war_name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-muted-foreground">
              {student.student_number ? String(student.student_number).padStart(2, "0") : "?"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="tabular-nums text-sm text-muted-foreground">
              {student.student_number ? String(student.student_number).padStart(2, "0") : "—"}
            </span>
            <h1 className="truncate text-lg font-bold">{student.war_name}</h1>
          </div>
          <p className="truncate text-sm text-muted-foreground">{student.full_name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {student.pelotao && <Badge variant="outline">{student.pelotao}</Badge>}
            <Badge variant={student.situation === "matriculado" ? "default" : "warning"}>
              {student.situation}
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
        {tab === "contato" && <ContatoTab studentId={student.id} contact={contact} />}
        {tab === "endereco" && <EnderecoTab studentId={student.id} address={address} />}
        {tab === "emergencia" && <EmergenciaTab studentId={student.id} contacts={emergency} />}
        {tab === "saude" && <SaudeTab studentId={student.id} health={health} canCurate />}
        {tab === "logistica" && <LogisticaTab studentId={student.id} logistics={logistics} />}
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
