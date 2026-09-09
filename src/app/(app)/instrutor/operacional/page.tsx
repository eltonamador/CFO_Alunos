import { Megaphone, ShieldAlert } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getActiveImpedimentViews,
  getDutyAssignmentsForDate,
} from "@/modules/operational-duty/infrastructure/queries";

export const metadata = { title: "Operacional - Instrutor" };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default async function InstrutorOperacionalPage() {
  await requireRole("instrutor");
  const supabase = createSupabaseServerClient();
  const today = todayKey();

  try {
    const [assignments, impediments, announcements] = await Promise.all([
      getDutyAssignmentsForDate(supabase, today),
      getActiveImpedimentViews(supabase, today),
      supabase
        .from("announcements")
        .select("id, title, priority, created_at")
        .eq("status", "publicado")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Painel operacional
          </p>
          <h1 className="font-display text-3xl font-bold">Operacional do Dia</h1>
          <p className="text-sm text-muted-foreground">
            Escala, impedimentos operacionais e comunicados da Coordenacao para {today}.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {assignments.length === 0 ? (
            <Card className="md:col-span-2 xl:col-span-4">
              <CardHeader>
                <CardTitle>Nenhuma escala publicada para hoje</CardTitle>
                <CardDescription>A Coordenacao ainda nao publicou funcoes para esta data.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            assignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <CardTitle className="text-base">{assignment.role.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-lg font-bold">{assignment.studentLabel}</p>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                Impedimentos relevantes
              </CardTitle>
              <CardDescription>Somente notas operacionais autorizadas pela Coordenacao.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {impediments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum impedimento operacional informado.</p>
              ) : (
                impediments.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <p className="font-semibold">{item.studentLabel}</p>
                    <p className="text-sm text-muted-foreground">{item.operationalNote ?? "Restricao operacional informada."}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Comunicados operacionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.data?.length ? (
                announcements.data.map((item: { id: string; title: string; priority: string }) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.priority}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum comunicado publicado.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Modulo operacional pendente de banco</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : "Aplique a migration 0022 para habilitar o modulo."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
}
