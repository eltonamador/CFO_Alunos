/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { CalendarCheck, Megaphone } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { createServerClientUntyped } from "@/lib/supabase/untyped";

export const metadata = { title: "Operacional - Aluno" };

export default async function AlunoOperacionalPage() {
  const session = await requireRole("aluno");
  const supabase = createServerClientUntyped();

  try {
    const [{ data: assignments }, { data: unreadAnnouncements }] = await Promise.all([
      supabase
        .from("duty_assignments")
        .select("id, duty_date, role_id, status")
        .eq("student_id", session.studentId)
        .in("status", ["prevista", "confirmada"])
        .gte("duty_date", new Date().toISOString().slice(0, 10))
        .order("duty_date")
        .limit(10),
      supabase.from("announcements").select("id, title, priority, created_at").eq("status", "publicado").limit(10),
    ]);

    const roleIds = [...new Set((assignments ?? []).map((item: any) => item.role_id))];
    const { data: roles } = roleIds.length
      ? await supabase.from("duty_roles").select("id, name, sort_order").in("id", roleIds)
      : { data: [] };
    const rolesById = new Map((roles ?? []).map((role: any) => [role.id, role]));

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Minha rotina operacional
          </p>
          <h1 className="font-display text-3xl font-bold">Operacional</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe suas proximas funcoes e comunicados publicados pela Coordenacao.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Minhas proximas funcoes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(assignments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma funcao prevista no momento.</p>
              ) : (
                (assignments ?? []).map((assignment: any) => (
                  <div key={assignment.id} className="rounded-lg border p-3">
                    <p className="font-semibold">{rolesById.get(assignment.role_id)?.name ?? "-"}</p>
                    <p className="text-sm text-muted-foreground">{assignment.duty_date}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Comunicados
              </CardTitle>
              <CardDescription>Acesse os materiais e confirme leitura.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(unreadAnnouncements ?? []).slice(0, 4).map((announcement: any) => (
                <div key={announcement.id} className="rounded-lg border p-3">
                  <p className="font-semibold">{announcement.title}</p>
                  <p className="text-xs text-muted-foreground">{announcement.priority}</p>
                </div>
              ))}
              <Link href="/aluno/comunicados" className="inline-flex text-sm font-semibold text-primary hover:underline">
                Abrir comunicados
              </Link>
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
