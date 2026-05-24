import { requireRole } from "@/components/app/RoleGuard";

export const metadata = { title: "Secretaria" };

export default async function SecretariaHome() {
  const session = await requireRole("secretaria");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Dashboard — Secretaria
        </p>
        <h1 className="text-2xl font-bold">Olá, {session.fullName}</h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Documentos pendentes</p>
          <p className="mt-1 text-2xl font-bold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Validados (7d)</p>
          <p className="mt-1 text-2xl font-bold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Recusados (7d)</p>
          <p className="mt-1 text-2xl font-bold">—</p>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold">Fila de documentos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Será entregue na Fase 7 (Documentos).
        </p>
      </section>
    </div>
  );
}
