import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { Badge } from "@/components/ui/Badge";

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
}

const REPORTS: Report[] = [
  {
    slug: "ficha-completa",
    title: "Ficha Completa da Turma",
    description:
      "Todos os alunos com dados pessoais, contato, endereço e logística em um relatório consolidado.",
    icon: "👥",
    roles: ["coordenacao", "secretaria"],
  },
  {
    slug: "pendencias-enxoval",
    title: "Pendências de Enxoval",
    description:
      "Itens obrigatórios ainda pendentes por aluno, filtrados por sexo e status de validação.",
    icon: "📦",
    roles: ["coordenacao", "secretaria"],
  },
  {
    slug: "saude",
    title: "Restrições de Saúde",
    description:
      "Somente alunos com restrições médicas ou uso de medicação registrados. Dados LGPD-restritos.",
    icon: "🏥",
    roles: ["coordenacao"],
    sensitive: true,
  },
  {
    slug: "emergencia",
    title: "Contatos de Emergência",
    description: "Contatos prioritários (1º e 2º) de todos os alunos com telefone e parentesco.",
    icon: "🆘",
    roles: ["coordenacao", "secretaria"],
  },
];

export default async function RelatoriosPage() {
  const session = await requireRole(["coordenacao", "secretaria"]);

  const available = REPORTS.filter((r) => r.roles.includes(session.role));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <SectionEyebrow>Central de relatórios</SectionEyebrow>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Relatórios da Turma
        </h1>
        <p className="text-sm text-muted-foreground">
          Baixe relatórios atualizados em tempo real do banco. Use{" "}
          <span className="font-semibold">XLSX</span> para análise em planilha e{" "}
          <span className="font-semibold">PDF</span> para impressão, despacho e reuniões.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {available.map((report) => (
          <article
            key={report.slug}
            className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-card-sm transition-all hover:border-brand-red-100 hover:shadow-card-md"
          >
            <div className="flex items-start gap-3">
              <span aria-hidden className="text-3xl leading-none">
                {report.icon}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-semibold uppercase tracking-[0.02em] text-foreground">
                    {report.title}
                  </h2>
                  {report.sensitive && <Badge variant="warning">LGPD</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <a
                href={`/api/reports/${report.slug}?format=xlsx`}
                download
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Baixar XLSX
              </a>
              <a
                href={`/api/reports/${report.slug}?format=pdf`}
                download
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <FileText className="h-4 w-4" />
                Baixar PDF
              </a>
            </div>
          </article>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Download className="h-3.5 w-3.5" />
        Os relatórios são gerados em tempo real com os dados atuais do Supabase. O relatório de Saúde é
        exclusivo da Coordenação (LGPD — Lei 13.709/2018).
      </p>
    </div>
  );
}
