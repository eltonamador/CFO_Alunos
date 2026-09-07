import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countDocumentsByStatus } from "@/lib/supabase/queries/documents";
import { FileText, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { BirthdayCard } from "@/components/app/BirthdayCard";
import { getAdministrativeBirthdayAlerts } from "@/modules/student-profile/infrastructure/getAdministrativeBirthdayAlerts";

export const metadata = { title: "Início — Secretaria" };

export default async function SecretariaHome() {
  const session = await requireRole("secretaria");
  const supabase = createSupabaseServerClient();
  const [counts, birthdayAlerts] = await Promise.all([
    countDocumentsByStatus(supabase),
    getAdministrativeBirthdayAlerts(),
  ]);

  const pendingCount = counts.enviado + counts.em_analise;

  const kpis = [
    {
      label: "Documentos pendentes",
      value: String(pendingCount).padStart(2, "0"),
      icon: Clock,
      color: "text-orange-500 bg-orange-50 dark:bg-orange-950/20",
    },
    {
      label: "Validados (Histórico)",
      value: String(counts.validado).padStart(2, "0"),
      icon: CheckCircle2,
      color: "text-green-500 bg-green-50 dark:bg-green-950/20",
    },
    {
      label: "Recusados (Histórico)",
      value: String(counts.recusado).padStart(2, "0"),
      icon: XCircle,
      color: "text-red-500 bg-red-50 dark:bg-red-950/20",
    },
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
          Bem-vindo ao Painel da Secretaria Acadêmica do **CFO 2026.1**.
        </p>
      </header>

      {/* Seção de KPIs */}
      <section className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card-sm transition-all hover:shadow-card-md"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${k.color}`}>
              <k.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {k.label}
              </p>
              <p className="font-display text-2xl font-bold text-foreground tracking-tight mt-0.5">
                {k.value}
              </p>
            </div>
          </div>
        ))}
      </section>

      <BirthdayCard alerts={birthdayAlerts} />

      {/* Seção de Fila de Validação */}
      <section className="rounded-xl border bg-card p-5 space-y-4 shadow-card-sm">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-bold text-foreground">Ações Rápidas</h2>
          <p className="text-xs text-muted-foreground">
            Acesso imediato às tarefas administrativas sob responsabilidade da secretaria.
          </p>
        </div>

        <div className="pt-2">
          {pendingCount > 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-orange-200/60 bg-orange-50/20 p-4 dark:border-orange-950/40 dark:bg-orange-950/5">
              <FileText className="h-6 w-6 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <p className="text-sm font-semibold text-foreground">Documentos aguardando validação</p>
                <p className="text-xs text-muted-foreground">
                  Há {pendingCount} documento{pendingCount > 1 ? "s" : ""} na fila aguardando conferência acadêmica para homologação.
                </p>
                <Link
                  href="/secretaria/documentos"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-1"
                >
                  Ir para fila de documentos <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-green-200/60 bg-green-50/10 p-4 dark:border-green-950/40 dark:bg-green-950/5">
              <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground">Tudo em dia!</p>
                <p className="text-xs text-muted-foreground">
                  Nenhum documento pendente de validação na fila da Secretaria no momento.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
