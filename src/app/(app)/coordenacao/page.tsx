import { requireRole } from "@/components/app/RoleGuard";

export const metadata = { title: "Coordenação" };

export default async function CoordenacaoHome() {
  const session = await requireRole("coordenacao");

  const kpis = [
    { label: "Alunos", value: "—" },
    { label: "Cadastro completo", value: "—" },
    { label: "Docs validados", value: "—" },
    { label: "Pendências abertas", value: "—" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Dashboard — Coordenação
        </p>
        <h1 className="text-2xl font-bold">Olá, {session.fullName}</h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold">Próximos passos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lista de alunos, validação de documentos e definição de canga serão entregues nas Fases 6–8.
        </p>
      </section>
    </div>
  );
}
