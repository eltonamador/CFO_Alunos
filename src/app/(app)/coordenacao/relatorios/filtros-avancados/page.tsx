import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import {
  STUDENT_SELECT_COLUMNS,
  type AlunoFiltravel,
} from "@/lib/reports/filtros-avancados";
import { FiltrosClient } from "./FiltrosClient";

export const metadata = {
  title: "Filtros Avançados — CFO 2026.1",
  description:
    "Combine critérios da ficha do aluno e gere contagens, listas e relatórios em PDF/XLSX.",
};

export const dynamic = "force-dynamic";

const PENDING_EQUIPMENT_STATUS = [
  "falta_comprar",
  "em_duvida",
  "inadequado",
  "pendente_validacao",
] as const;

const PENDING_DOC_STATUS = ["pendente", "em_analise", "recusado"] as const;

export default async function FiltrosAvancadosPage() {
  const session = await requireRole(["coordenacao", "secretaria"]);
  const supabase = createSupabaseServerClient();

  // 1. Alunos + sub-tabelas via select aninhado
  const studentsRes = await supabase
    .from("students")
    .select(STUDENT_SELECT_COLUMNS)
    .is("deleted_at", null)
    .order("student_number", { ascending: true });

  if (studentsRes.error) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Filtros Avançados</h1>
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          Não foi possível carregar a turma: {studentsRes.error.message}
        </p>
      </div>
    );
  }

  // 2. Pendências: equipment + documentos (consultas leves, agrupadas em memória)
  const [pendEquipRes, pendDocsRes] = await Promise.all([
    supabase
      .from("student_equipment_status")
      .select("student_id, status")
      .in("status", PENDING_EQUIPMENT_STATUS as unknown as string[]),
    supabase
      .from("documents")
      .select("student_id, status")
      .in("status", PENDING_DOC_STATUS as unknown as string[]),
  ]);

  const pendEquipRows = (pendEquipRes.data ?? []) as { student_id: string }[];
  const pendDocsRows = (pendDocsRes.data ?? []) as { student_id: string }[];
  const pendEquipSet = new Set<string>(pendEquipRows.map((r) => r.student_id).filter(Boolean));
  const pendDocsSet = new Set<string>(pendDocsRows.map((r) => r.student_id).filter(Boolean));

  const raw = (studentsRes.data ?? []) as Omit<
    AlunoFiltravel,
    "has_pending_equipment" | "has_pending_documents"
  >[];

  const alunos: AlunoFiltravel[] = raw.map((s) => ({
    ...s,
    has_pending_equipment: pendEquipSet.has(s.id),
    has_pending_documents: pendDocsSet.has(s.id),
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <SectionEyebrow>Relatórios · Filtros</SectionEyebrow>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Filtros Avançados
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Combine critérios da ficha para gerar contagens, listas e relatórios em
          PDF ou XLSX. A turma é carregada com base no seu perfil ({session.role}).
        </p>
      </header>

      <FiltrosClient alunos={alunos} role={session.role} />
    </div>
  );
}
