import Link from "next/link";
import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPendingChanges } from "@/lib/supabase/queries/pending";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PendingChangeRow } from "./PendingChangeRow";

export const metadata = { title: "Pendências de validação" };

export default async function PendenciasPage() {
  await requireRole("coordenacao");

  const supabase = createSupabaseServerClient();
  const pending = await listPendingChanges(supabase, { status: "pendente" });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pendências de validação</h1>
          <p className="text-sm text-muted-foreground">
            Alterações sensíveis aguardando aprovação ou recusa
          </p>
        </div>
        <Badge variant="warning">{pending.length} abertas</Badge>
      </header>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma pendência aberta. 🎉
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {p.student ? (
                        <Link
                          href={`/coordenacao/alunos/${p.student.id}`}
                          className="hover:underline"
                        >
                          {String(p.student.student_number ?? "—").padStart(2, "0")} ·{" "}
                          {p.student.war_name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </CardTitle>
                    <CardDescription>
                      {p.context} → {p.entity} · {new Date(p.created_at).toLocaleString("pt-BR")}
                    </CardDescription>
                  </div>
                  <Badge variant="warning">Pendente</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <PendingChangeRow pending={p} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
