import { requireRole } from "@/components/app/RoleGuard";

export const metadata = { title: "Portal do Aluno" };

export default async function AlunoHome() {
  const session = await requireRole("aluno");

  const progress = [
    { label: "Cadastro", value: 0 },
    { label: "Documentos", value: 0 },
    { label: "Materiais (geral)", value: 0 },
    { label: "Materiais (quarentena)", value: 0 },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Portal do Aluno
        </p>
        <h1 className="text-2xl font-bold">Olá, {session.fullName}</h1>
        {!session.studentId && (
          <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Sua conta ainda não está vinculada a um aluno. Procure a Coordenação.
          </p>
        )}
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {progress.map((p) => (
          <div key={p.label} className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">{p.label}</p>
              <p className="text-sm tabular-nums text-muted-foreground">{p.value}%</p>
            </div>
            <div className="h-2 overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${p.value}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold">Pendências</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lista de pendências será entregue nas próximas fases (cadastro, documentos, materiais).
        </p>
      </section>
    </div>
  );
}
