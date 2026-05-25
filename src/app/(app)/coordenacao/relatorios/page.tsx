import { ShieldAlert } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { ReportDownloadCard } from "./ReportDownloadCard";

export const metadata = {
  title: "Relatórios — CFO 2026.1",
  description: "Exportação de relatórios em Excel e PDF para a turma CFO 2026.1.",
};

interface Report {
  slug: string;
  title: string;
  description: string;
  icon: string;
  roles: string[];
  sensitive?: boolean;
  statLabel: string;
}

const REPORTS: Report[] = [
  {
    slug: "ficha-completa",
    title: "Ficha Completa da Turma",
    description:
      "Todos os alunos com dados pessoais, contato, endereço e logística em um relatório consolidado.",
    icon: "👥",
    roles: ["coordenacao", "secretaria"],
    statLabel: "alunos no relatório",
  },
  {
    slug: "ficha-personalizada",
    title: "Ficha Personalizada da Turma",
    description:
      "Monte seu relatório escolhendo campos das 11 abas da ficha. Inclui presets e indicador de aproveitamento da folha A4.",
    icon: "🧩",
    roles: ["coordenacao", "secretaria"],
    statLabel: "alunos disponíveis",
  },
  {
    slug: "pendencias-enxoval",
    title: "Pendências de Enxoval",
    description:
      "Itens obrigatórios ainda pendentes por aluno, filtrados por sexo e status de validação.",
    icon: "📦",
    roles: ["coordenacao", "secretaria"],
    statLabel: "itens de enxoval cadastrados",
  },
  {
    slug: "saude",
    title: "Restrições de Saúde",
    description:
      "Somente alunos com restrições médicas ou uso de medicação registrados. Dados LGPD-restritos.",
    icon: "🏥",
    roles: ["coordenacao"],
    sensitive: true,
    statLabel: "registros de saúde",
  },
  {
    slug: "emergencia",
    title: "Contatos de Emergência",
    description: "Contatos prioritários (1º e 2º) de todos os alunos com telefone e parentesco.",
    icon: "🆘",
    roles: ["coordenacao", "secretaria"],
    statLabel: "contatos de emergência",
  },
];

export default async function RelatoriosPage() {
  const session = await requireRole(["coordenacao", "secretaria"]);
  const supabase = createSupabaseServerClient();

  const available = REPORTS.filter((r) => r.roles.includes(session.role));
  const [students, requirements, health, emergency] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("equipment_requirements").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("health_restrictions").select("*", { count: "exact", head: true }),
    supabase.from("emergency_contacts").select("*", { count: "exact", head: true }),
  ]);

  const stats: Record<string, string> = {
    "ficha-completa": String(students.count ?? 0).padStart(2, "0"),
    "ficha-personalizada": String(students.count ?? 0).padStart(2, "0"),
    "pendencias-enxoval": String(requirements.count ?? 0).padStart(2, "0"),
    saude: String(health.count ?? 0).padStart(2, "0"),
    emergencia: String(emergency.count ?? 0).padStart(2, "0"),
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <SectionEyebrow>Central de relatórios</SectionEyebrow>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Relatórios da Turma
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Baixe relatórios atualizados em tempo real do banco. Use{" "}
          <span className="font-semibold">XLSX</span> para análise em planilha e{" "}
          <span className="font-semibold">PDF</span> para impressão, despacho e reuniões.
        </p>
      </header>

      <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            O relatório de Saúde contém dados sensíveis e é exclusivo da Coordenação.
            Mantenha o arquivo sob controle interno conforme a LGPD.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {available.map((report) => (
          <ReportDownloadCard
            key={report.slug}
            slug={report.slug}
            title={report.title}
            description={report.description}
            icon={report.icon}
            sensitive={report.sensitive}
            statValue={stats[report.slug] ?? "00"}
            statLabel={report.statLabel}
            xlsxAvailable={report.slug !== "ficha-personalizada"}
          />
        ))}
      </div>

      {available.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          Nenhum relatório disponível para o seu perfil no momento.
        </div>
      )}
    </div>
  );
}
