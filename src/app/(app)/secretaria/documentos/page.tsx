import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  listDocumentsPendingValidation,
  signedDocumentUrl,
  countDocumentsByStatus,
} from "@/lib/supabase/queries/documents";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DocumentValidationCard } from "@/components/app/documents/DocumentValidationCard";

export const metadata = { title: "Documentos a validar" };

export default async function SecretariaDocumentosPage() {
  await requireRole("secretaria");

  const supabase = createSupabaseServerClient();
  const [pending, counts] = await Promise.all([
    listDocumentsPendingValidation(supabase),
    countDocumentsByStatus(supabase),
  ]);

  const pendingWithUrls = await Promise.all(
    pending.map(async (d) => ({
      doc: d,
      url: await signedDocumentUrl(supabase, d.storage_path),
    })),
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Documentos a validar</h1>
        <p className="text-sm text-muted-foreground">
          Fila de documentos enviados pelos alunos aguardando validação
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Aguardando</p>
            <p className="text-2xl font-bold">
              {counts.enviado + counts.em_analise}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Validados</p>
            <p className="text-2xl font-bold">{counts.validado}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Recusados</p>
            <p className="text-2xl font-bold">{counts.recusado}</p>
          </CardContent>
        </Card>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Fila</h2>
        <Badge variant="warning">{pending.length} pendentes</Badge>
      </div>

      {pendingWithUrls.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum documento aguardando validação. 🎉
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingWithUrls.map(({ doc, url }) => (
            <DocumentValidationCard key={doc.id} doc={doc} fileUrl={url} />
          ))}
        </div>
      )}
    </div>
  );
}
