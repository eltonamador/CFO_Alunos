import { requireRole } from "@/components/app/RoleGuard";

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
      <header>
        <h1 className="text-2xl font-bold">Relatórios Excel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clique em um relatório para baixar o arquivo .xlsx gerado em tempo real com os dados
          atuais do banco.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {available.map((report) => (
          <a
            key={report.slug}
            href={`/api/reports/${report.slug}`}
            download
            className="group flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{report.icon}</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold leading-tight text-foreground group-hover:text-primary">
                  {report.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
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
