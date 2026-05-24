import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  listDocumentsByStudent,
  signedDocumentUrl,
  DOCUMENT_TYPES,
} from "@/lib/supabase/queries/documents";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DocumentUploadForm } from "./DocumentUploadForm";
import { DocumentListItem } from "./DocumentListItem";

interface Props {
  studentId: string;
  /** Se true, exibe botão de reenvio para documentos recusados (aluno). */
  canReupload?: boolean;
}

export async function DocumentsTab({ studentId, canReupload = false }: Props) {
  const supabase = createSupabaseServerClient();
  const docs = await listDocumentsByStudent(supabase, studentId);

  const docsWithUrls = await Promise.all(
    docs.map(async (d) => ({
      doc: d,
      url: await signedDocumentUrl(supabase, d.storage_path),
    })),
  );

  // Status agregado por tipo obrigatório
  const requiredTypes = DOCUMENT_TYPES.filter((t) => t.required);
  const validatedTypes = new Set(
    docs.filter((d) => d.status === "validado").map((d) => d.doc_type),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Tipos obrigatórios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {requiredTypes.map((t) => (
              <Badge
                key={t.value}
                variant={validatedTypes.has(t.value) ? "success" : "outline"}
              >
                {t.label}
                {validatedTypes.has(t.value) ? " ✓" : ""}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enviar novo documento</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentUploadForm studentId={studentId} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Documentos enviados</h3>
        {docsWithUrls.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
        ) : (
          docsWithUrls.map(({ doc, url }) => (
            <DocumentListItem
              key={doc.id}
              doc={doc}
              fileUrl={url}
              canReupload={canReupload}
            />
          ))
        )}
      </div>
    </div>
  );
}
