import {
  documentTypeLabel,
  DOCUMENT_STATUS_LABEL,
  type DocumentRow,
} from "@/lib/supabase/queries/documents";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ReuploadButton } from "./ReuploadButton";

const STATUS_VARIANT: Record<
  DocumentRow["status"],
  "default" | "warning" | "success" | "destructive"
> = {
  pendente: "warning",
  enviado: "warning",
  em_analise: "warning",
  validado: "success",
  recusado: "destructive",
};

interface Props {
  doc: DocumentRow;
  /** URL assinada para abrir o arquivo. */
  fileUrl: string | null;
  /** Se true, mostra botão de reenvio quando recusado. */
  canReupload?: boolean;
}

export function DocumentListItem({ doc, fileUrl, canReupload = false }: Props) {
  return (
    <Card className="space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{documentTypeLabel(doc.doc_type)}</p>
          <p className="text-xs text-muted-foreground">
            Enviado em {new Date(doc.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[doc.status]}>{DOCUMENT_STATUS_LABEL[doc.status]}</Badge>
      </div>

      {doc.status === "recusado" && doc.rejection_reason && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <strong>Motivo da recusa:</strong> {doc.rejection_reason}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-accent"
          >
            Abrir arquivo
          </a>
        )}
        {canReupload && doc.status === "recusado" && <ReuploadButton documentId={doc.id} />}
      </div>
    </Card>
  );
}
