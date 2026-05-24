/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AlertCircle, Users, FileText, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Início — Coordenação" };
export const dynamic = "force-dynamic";

interface ProgressBarProps {
  done: number;
  total: number;
  label: string;
}

function ProgressBar({ done, total, label }: ProgressBarProps) {
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  return (
    <div className="space-y-1.5 rounded-lg border bg-card p-4 shadow-card-sm hover:shadow-card-md transition-shadow">
      <div className="flex justify-between items-baseline text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span className="text-xs font-semibold">{label}</span>
        <span className="font-display text-sm font-bold text-foreground">
          {String(done).padStart(2, "0")} / {String(total).padStart(2, "0")}{" "}
          <span className="text-[10px] text-muted-foreground font-normal">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-muted/30">
        <div
          className={`h-full rounded transition-all duration-500 ${
            pct === 100 ? "bg-green-500" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function CoordenacaoHome() {
  const session = await requireRole("coordenacao");
  const supabase = createSupabaseServerClient();

  // 1. Busca básica de alunos e suas sub-tabelas para completitude do cadastro
  const { data: rawStudentsData, error } = await supabase
    .from("students")
    .select(`
      id,
      sex,
      cpf, rg, birth_date, marital_status, mother_name, education_level,
      student_contacts(whatsapp, email_personal),
      student_addresses(street, city, zip, state),
      health_restrictions(blood_type, validation_status),
      emergency_contacts(id, priority),
      student_logistics(student_id),
      vehicles(student_id)
    `)
    .is("deleted_at", null);

  if (error) console.error("Error fetching students:", error);

  const allStudentsData = (rawStudentsData ?? []) as any[];
  const totalStudents = allStudentsData.length;

  // Cálculo de Cadastro Completo (contagem bruta)
  let completedProfilesCount = 0;
  let pendingHealthValidationsCount = 0;

  if (allStudentsData) {
    for (const s of allStudentsData) {
      const c = Array.isArray(s.student_contacts) ? s.student_contacts[0] : s.student_contacts;
      const a = Array.isArray(s.student_addresses) ? s.student_addresses[0] : s.student_addresses;
      const h = Array.isArray(s.health_restrictions) ? s.health_restrictions[0] : s.health_restrictions;
      const eList = Array.isArray(s.emergency_contacts) ? s.emergency_contacts : (s.emergency_contacts ? [s.emergency_contacts] : []);
      const em = eList.find((x: any) => x.priority === 1);
      const l = Array.isArray(s.student_logistics) ? s.student_logistics[0] : s.student_logistics;
      const v = Array.isArray(s.vehicles) ? s.vehicles[0] : s.vehicles;

      const cadastroFields = [
        s.cpf,
        s.rg,
        s.birth_date,
        s.marital_status,
        s.mother_name,
        s.sex,
        s.education_level,
        c?.whatsapp,
        c?.email_personal,
        a?.street,
        a?.city,
        a?.zip,
        a?.state,
        h?.blood_type,
        em?.id,
        l?.student_id,
        v?.student_id,
      ];
      if (cadastroFields.every(Boolean)) {
        completedProfilesCount++;
      }

      if (h?.validation_status === "pendente") {
        pendingHealthValidationsCount++;
      }
    }
  }

  // 2. Documentos
  const REQUIRED_DOC_TYPES = ["rg_cpf", "cnh", "comprovante_residencia", "foto_3x4", "declaracao_medica"];
  const { data: rawDocs } = await supabase
    .from("documents")
    .select("student_id, doc_type, status")
    .neq("status", "recusado");
  const allDocs = (rawDocs ?? []) as any[];

  const { count: docsValidados } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "validado");

  let studentsWithAllDocs = 0;
  if (allDocs) {
    const studentDocsMap = new Map<string, Set<string>>();
    for (const d of allDocs) {
      if (!studentDocsMap.has(d.student_id)) {
        studentDocsMap.set(d.student_id, new Set());
      }
      studentDocsMap.get(d.student_id)!.add(d.doc_type);
    }
    for (const [_, types] of studentDocsMap.entries()) {
      const hasAll = REQUIRED_DOC_TYPES.every((t) => types.has(t));
      if (hasAll) {
        studentsWithAllDocs++;
      }
    }
  }

  // 3. Materiais / Enxoval
  const { data: rawReqs } = await supabase
    .from("equipment_requirements")
    .select("id, phase, mandatory, applicability")
    .eq("active", true);
  const reqs = (rawReqs ?? []) as any[];

  const { data: rawEqStatuses } = await supabase
    .from("student_equipment_status")
    .select("student_id, requirement_id, status, validation_status");
  const allEqStatuses = (rawEqStatuses ?? []) as any[];

  let quarentenaCompletedCount = 0;
  let geralCompletedCount = 0;

  if (allStudentsData && reqs) {
    const reqsQuarentena = reqs.filter((r) => r.phase === "quarentena" && r.mandatory);
    const reqsGeral = reqs.filter((r) => r.mandatory);

    const statusesByStudent = new Map<string, Map<string, { status: string; validation_status: string }>>();
    if (allEqStatuses) {
      for (const es of allEqStatuses) {
        if (!statusesByStudent.has(es.student_id)) {
          statusesByStudent.set(es.student_id, new Map());
        }
        statusesByStudent.get(es.student_id)!.set(es.requirement_id, {
          status: es.status,
          validation_status: es.validation_status,
        });
      }
    }

    const DONE_STATUSES = new Set(["ok", "nao_se_aplica"]);
    const isItemDone = (r: any, s?: { status: string; validation_status: string }) => {
      if (!s) return false;
      if (DONE_STATUSES.has(s.status)) return true;
      return s.status === "comprado" && s.validation_status === "validado";
    };

    for (const student of allStudentsData) {
      const studentSex = student.sex;
      const studentStatuses = statusesByStudent.get(student.id) || new Map();

      // Quarentena
      const studentQuarentenaReqs = reqsQuarentena.filter((r) => {
        if (r.applicability === "todos" || r.applicability === "condicional") return true;
        if (studentSex === "M" && r.applicability === "masculino") return true;
        if (studentSex === "F" && r.applicability === "feminino") return true;
        return false;
      });
      const quarentenaDone = studentQuarentenaReqs.every((r) => isItemDone(r, studentStatuses.get(r.id)));
      if (studentQuarentenaReqs.length > 0 && quarentenaDone) {
        quarentenaCompletedCount++;
      }

      // Geral
      const studentGeralReqs = reqsGeral.filter((r) => {
        if (r.applicability === "todos" || r.applicability === "condicional") return true;
        if (studentSex === "M" && r.applicability === "masculino") return true;
        if (studentSex === "F" && r.applicability === "feminino") return true;
        return false;
      });
      const geralDone = studentGeralReqs.every((r) => isItemDone(r, studentStatuses.get(r.id)));
      if (studentGeralReqs.length > 0 && geralDone) {
        geralCompletedCount++;
      }
    }
  }

  // 4. Pendências Consolidadas
  const [pendingChangesCount, pendingDocsCount, pendingEquipCount, currentCangas] = await Promise.all([
    supabase.from("pending_changes").select("*", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("documents").select("*", { count: "exact", head: true }).in("status", ["enviado", "em_analise"]),
    supabase.from("student_equipment_status").select("*", { count: "exact", head: true }).eq("status", "comprado").eq("validation_status", "nao_validado"),
    supabase.from("canga_assignments").select("student_id").eq("is_current", true),
  ]);

  const openPendencias = (pendingChangesCount.count ?? 0) + (pendingDocsCount.count ?? 0) + (pendingEquipCount.count ?? 0);

  // Alunos sem canga
  const studentsWithCangaIds = new Set((currentCangas.data ?? []).map((c: any) => c.student_id));
  const studentsWithoutCangaCount = totalStudents - studentsWithCangaIds.size;

  // Criação dos KPIs para exibição
  const kpis = [
    { label: "Total de Alunos", value: String(totalStudents).padStart(2, "0"), icon: Users, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20" },
    { label: "Cadastros Completos", value: String(completedProfilesCount).padStart(2, "0"), icon: CheckCircle2, color: "text-green-500 bg-green-50 dark:bg-green-950/20" },
    { label: "Docs Validados", value: String(docsValidados ?? 0).padStart(2, "0"), icon: FileText, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/20" },
    { label: "Pendências Abertas", value: String(openPendencias).padStart(2, "0"), icon: AlertCircle, color: "text-orange-500 bg-orange-50 dark:bg-orange-950/20" },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          CBMAP · ACADEMIA DE BOMBEIRO MILITAR
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Olá, {session.fullName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Bem-vindo ao Painel de Controle Operacional do **CFO 2026.1**.
        </p>
      </header>

      {/* Seção de KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card-sm transition-all hover:shadow-card-md">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${k.color}`}>
              <k.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</p>
              <p className="font-display text-2xl font-bold text-foreground tracking-tight mt-0.5">{k.value}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Seção de Progresso da Turma */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-foreground">Progresso Geral da Turma</h2>
            <p className="text-xs text-muted-foreground">
              Acompanhamento quantitativo do preenchimento e conformidade dos 30 alunos.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <ProgressBar label="Ficha Cadastral (100% preenchida)" done={completedProfilesCount} total={totalStudents} />
            <ProgressBar label="Documentação Obrigatória Enviada" done={studentsWithAllDocs} total={totalStudents} />
            <ProgressBar label="Enxoval de Quarentena Entregue" done={quarentenaCompletedCount} total={totalStudents} />
            <ProgressBar label="Enxoval Geral Concluído" done={geralCompletedCount} total={totalStudents} />
          </div>
        </section>

        {/* Seção de Alertas e Ações Recomendadas */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-foreground">Alertas Operacionais</h2>
            <p className="text-xs text-muted-foreground">
              Ações prioritárias e inconsistências identificadas que demandam revisão.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Alerta de Canga */}
            {studentsWithoutCangaCount > 0 ? (
              <div className="flex items-start gap-3 rounded-lg border border-orange-200/60 bg-orange-50/20 p-3.5 dark:border-orange-950/40 dark:bg-orange-950/5">
                <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-foreground">Canga não atribuído</p>
                  <p className="text-xs text-muted-foreground">
                    Existem {studentsWithoutCangaCount} alunos sem parceiro de canga definido no sistema.
                  </p>
                  <Link
                    href="/coordenacao/alunos"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1.5"
                  >
                    Atribuir cangas na lista de alunos <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-green-200/60 bg-green-50/10 p-3.5 dark:border-green-950/40 dark:bg-green-950/5">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-foreground">Cangas OK</p>
                  <p className="text-xs text-muted-foreground">
                    Todos os alunos ativos possuem canga atribuído corretamente.
                  </p>
                </div>
              </div>
            )}

            {/* Alerta de Restrições de Saúde */}
            {pendingHealthValidationsCount > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200/60 bg-red-50/20 p-3.5 dark:border-red-950/40 dark:bg-red-950/5">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-foreground">Saúde pendente de revisão</p>
                  <p className="text-xs text-muted-foreground">
                    Existem {pendingHealthValidationsCount} restrições médicas/fisiológicas aguardando homologação operacional da coordenação.
                  </p>
                  <Link
                    href="/coordenacao/alunos"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1.5"
                  >
                    Homologar restrições na lista <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* Alerta de Documentos/Validações */}
            {openPendencias > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-blue-200/60 bg-blue-50/10 p-3.5 dark:border-blue-950/40 dark:bg-blue-950/5">
                <FileText className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-foreground">Fila de Validações</p>
                  <p className="text-xs text-muted-foreground">
                    Você possui {openPendencias} itens de validação (cadastros, documentos ou materiais) aguardando conferência.
                  </p>
                  <Link
                    href="/coordenacao/pendencias"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-1.5"
                  >
                    Acessar central de pendências <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
