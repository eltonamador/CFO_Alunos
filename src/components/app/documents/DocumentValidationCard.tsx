"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import Link from "next/link";
import {
  decideDocumentAction,
  type ActionResult,
} from "@/modules/documents/presentation/actions/documentActions";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import {
  documentTypeLabel,
  DOCUMENT_STATUS_LABEL,
  type DocumentWithStudent,
} from "@/lib/supabase/queries/documents";

function SubmitVariant({ decision, label }: { decision: "validar" | "recusar"; label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      variant={decision === "validar" ? "default" : "destructive"}
      size="sm"
      disabled={pending}
    >
      {pending ? "..." : label}
    </Button>
  );
}

interface Props {
  doc: DocumentWithStudent;
  fileUrl: string | null;
}

export function DocumentValidationCard({ doc, fileUrl }: Props) {
  const [showReason, setShowReason] = useState(false);
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    decideDocumentAction,
    null,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {doc.student ? (
                <Link
                  href={`/coordenacao/alunos/${doc.student.id}`}
                  className="hover:underline"
                >
                  {String(doc.student.student_number ?? "—").padStart(2, "0")} ·{" "}
                  {doc.student.war_name}
                </Link>
              ) : (
                "—"
              )}{" "}
              · {documentTypeLabel(doc.doc_type)}
            </CardTitle>
            <CardDescription>
              Enviado em {new Date(doc.created_at).toLocaleString("pt-BR")}
            </CardDescription>
          </div>
          <Badge variant="warning">{DOCUMENT_STATUS_LABEL[doc.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="documentId" value={doc.id} />

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

          {showReason && (
            <Input
              name="reason"
              placeholder="Motivo da recusa (obrigatório)"
              aria-label="Motivo da recusa"
              required
            />
          )}

          {state?.ok === false && <Alert variant="destructive">{state.error}</Alert>}
          {state?.ok && <Alert variant="success">Decisão registrada.</Alert>}

          <div className="flex flex-wrap gap-2">
            <SubmitVariant decision="validar" label="Validar" />
            {showReason ? (
              <SubmitVariant decision="recusar" label="Confirmar recusa" />
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowReason(true)}>
                Recusar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
