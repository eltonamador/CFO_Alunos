import Link from "next/link";
import { CalendarDays, Download, Megaphone, ShieldAlert, Users } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import {
  getActiveImpedimentViews,
  getDutyAssignmentsForDate,
  getRecentDutyLogs,
} from "@/modules/operational-duty/infrastructure/queries";
import { generateDutyRosterAction } from "@/modules/operational-duty/presentation/actions";

export const metadata = { title: "Operacional - Coordenacao" };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function SetupPending({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Modulo operacional pendente de banco</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function CoordenacaoOperacionalPage() {
  await requireRole("coordenacao");
  const supabase = createServerClientUntyped();
  const today = todayKey();

  try {
    const [assignments, impediments, logs, latestRoster, urgentAnnouncements] = await Promise.all([
      getDutyAssignmentsForDate(supabase, today),
      getActiveImpedimentViews(supabase, today),
      getRecentDutyLogs(supabase, 4),
      supabase
        .from("duty_rosters")
        .select("id, period_start, period_end")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .eq("status", "publicado")
        .in("priority", ["alta", "urgente"]),
    ]);

    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              CFO 2026.1
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Painel Operacional do Dia
            </h1>
            <p className="text-sm text-muted-foreground">
              Data atual: {today}. Escala, impedimentos, alertas e comunicados em uma visao unica.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {latestRoster.data?.id ? (
              <Link
                href={`/api/operacional/escala/${latestRoster.data.id}/pdf`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold tracking-[0.02em] text-primary-foreground shadow-card-sm hover:bg-brand-red-800"
              >
                <Download className="h-4 w-4" />
                Baixar PDF
              </Link>
            ) : null}
            <Link
              href="/coordenacao/operacional/escala"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
            >
              <CalendarDays className="h-4 w-4" />
              Escala semanal
            </Link>
          </div>
        </header>

        {assignments.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma escala publicada para hoje</CardTitle>
              <CardDescription>
                Gere uma escala semanal para preencher automaticamente as funcoes da turma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={generateDutyRosterAction} className="flex flex-wrap gap-3">
                <input type="hidden" name="startDate" value={today} />
                <input type="hidden" name="endDate" value={addDays(6)} />
                <Button type="submit">
                  <CalendarDays className="h-4 w-4" />
                  Gerar escala desta semana
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <CardTitle className="text-base">{assignment.role.name}</CardTitle>
                  <CardDescription>{assignment.status}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <p className="font-display text-lg font-bold">{assignment.studentLabel}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                Impedimentos ativos
              </CardTitle>
              <CardDescription>Somente registros ativos para a data de hoje.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {impediments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum impedimento ativo hoje.</p>
              ) : (
                impediments.map((item) => (
                  <div key={item.id} className="rounded-md border p-3 text-sm">
                    <p className="font-semibold">{item.studentLabel}</p>
                    <p className="text-muted-foreground">{item.impedimentType.replace(/_/g, " ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.operationalNote ?? item.reason}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Comunicados pendentes
              </CardTitle>
              <CardDescription>Prioridades alta e urgente publicadas.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold">{urgentAnnouncements.count ?? 0}</p>
              <Link href="/coordenacao/comunicados" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">
                Gerenciar comunicados
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historico recente</CardTitle>
              <CardDescription>Geracoes, publicacoes e trocas manuais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem eventos recentes.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="rounded-md border p-2 text-xs">
                    <p className="font-semibold">{log.action}</p>
                    <p className="text-muted-foreground">{log.reason ?? "Sem motivo registrado"}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <SetupPending
        message={
          error instanceof Error
            ? error.message
            : "Aplique a migration 0022_operational_duty_announcements.sql para habilitar o modulo."
        }
      />
    );
  }
}
