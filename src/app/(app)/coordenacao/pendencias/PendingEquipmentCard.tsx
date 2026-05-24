"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import {
  validateEquipmentItemAction,
  type ActionResult,
} from "@/modules/equipment-checklist/presentation/actions/equipmentActions";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Check, X } from "lucide-react";

interface PendingEquipment {
  id: string;
  student_id: string;
  requirement_id: string;
  status: string;
  validation_status: string;
  student_notes: string | null;
  student: {
    id: string;
    war_name: string;
    student_number: number | null;
  } | null;
  requirement: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    phase: string;
  } | null;
}

interface Props {
  item: PendingEquipment;
}

export function PendingEquipmentCard({ item }: Props) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    validateEquipmentItemAction,
    null,
  );

  const numLabel = item.student?.student_number
    ? String(item.student.student_number).padStart(2, "0")
    : "—";

  return (
    <Card className="hover:border-primary/20 transition-all">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">
              {item.student ? (
                <Link
                  href={`/coordenacao/alunos/${item.student.id}`}
                  className="hover:underline hover:text-primary transition-colors uppercase font-display"
                >
                  {item.student.war_name} — {numLabel}
                </Link>
              ) : (
                "—"
              )}
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Fase: {item.requirement?.phase === "quarentena" ? "Quarentena" : "Enxoval do Curso"}
            </CardDescription>
          </div>
          <Badge variant="warning">Aguardando Recebimento</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/20 p-3.5 space-y-2">
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">
              {item.requirement?.name ?? "Item de material"}
            </span>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
              Qtd: {item.requirement?.quantity ?? 1} {item.requirement?.unit ?? "un"}
            </span>
          </div>

          {item.student_notes && (
            <div className="border-t border-border/40 pt-2 text-xs text-muted-foreground italic">
              <span className="font-semibold text-purple-600 dark:text-purple-400 not-italic">Observação: </span>
              &ldquo;{item.student_notes}&rdquo;
            </div>
          )}
        </div>

        {state?.ok === false && (
          <Alert variant="destructive" className="py-2 px-3 text-xs">
            {state.error}
          </Alert>
        )}
        {state?.ok && (
          <Alert variant="success" className="py-2 px-3 text-xs">
            Item validado com sucesso!
          </Alert>
        )}

        {!state?.ok && (
          <form action={formAction} className="flex gap-2">
            <input type="hidden" name="statusId" value={item.id} />
            <input type="hidden" name="studentId" value={item.student_id} />

            <Button
              type="submit"
              name="action"
              value="validar"
              size="sm"
              className="flex-1 gap-1.5 h-8 text-xs font-semibold"
            >
              <Check className="h-3.5 w-3.5" />
              Validar Recebimento
            </Button>
            <Button
              type="submit"
              name="action"
              value="reprovar"
              size="sm"
              variant="destructive"
              className="gap-1.5 h-8 text-xs font-semibold"
            >
              <X className="h-3.5 w-3.5" />
              Reprovar
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
