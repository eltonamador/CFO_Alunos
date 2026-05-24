import { Download } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { Badge } from "@/components/ui/Badge";

export const metadata = {
  title: "Relatórios — CFO 2026.1",
  description: "Exportação de relatórios em Excel para a turma CFO 2026.1.",
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
      "Todos os 30 alunos com dados pessoais, contato, endereço e logística em uma planilha consolidada.",
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
          Relatórios Excel
        </h1>
        <p className="text-sm text-muted-foreground">
          Clique em um relatório para baixar o arquivo <span className="num-mono">.xlsx</span> gerado
          em tempo real com os dados atuais do banco.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {available.map((report) => (
          <a
            key={report.slug}
            href={`/api/reports/${report.slug}`}
            download
            className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-card-sm transition-all hover:-translate-y-px hover:border-brand-red-100 hover:shadow-card-md"
          >
            <div className="flex items-start gap-3">
              <span aria-hidden className="text-3xl leading-none">
                {report.icon}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-semibold uppercase tracking-[0.02em] text-foreground group-hover:text-primary">
                    {report.title}
                  </h2>
                  {report.sensitive && <Badge variant="warning">LGPD</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              <Download className="h-4 w-4" />
              <span>Baixar .xlsx</span>
            </div>
          </a>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        * O relatório de Saúde é exclusivo da Coordenação por conter dados sensíveis (LGPD).
      </p>
    </div>
  );
}
