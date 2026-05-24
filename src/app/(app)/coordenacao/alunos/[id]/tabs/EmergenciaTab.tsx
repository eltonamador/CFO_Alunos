"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  upsertEmergencyContactAction,
  type ActionResult,
} from "@/modules/student-profile/presentation/actions/studentActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FieldHint, RequiredMark } from "@/components/ui/FieldHint";
import type { EmergencyContactRow } from "@/lib/supabase/queries/students";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

function EmergencyForm({
  studentId,
  priority,
  contact,
}: {
  studentId: string;
  priority: 1 | 2;
  contact?: EmergencyContactRow;
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    upsertEmergencyContactAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="priority" value={priority} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`em${priority}-name`}>
            Nome completo<RequiredMark />
          </Label>
          <Input
            id={`em${priority}-name`}
            name="full_name"
            defaultValue={contact?.full_name ?? ""}
            required
            minLength={2}
            placeholder="Nome e sobrenome"
          />
          <FieldHint>Informe nome e pelo menos um sobrenome.</FieldHint>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`em${priority}-rel`}>Parentesco / vínculo</Label>
          <Input
            id={`em${priority}-rel`}
            name="relationship"
            defaultValue={contact?.relationship ?? ""}
            placeholder="Pai, Mãe, Esposa, ..."
            maxLength={40}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`em${priority}-phone`}>
            Telefone / WhatsApp<RequiredMark />
          </Label>
          <MaskedInput
            id={`em${priority}-phone`}
            name="phone"
            mask="phone"
            defaultValue={contact?.phone}
            required
            placeholder="(96) 9XXXX-XXXX"
          />
          <FieldHint>DDD + número (10 a 11 dígitos).</FieldHint>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`em${priority}-address`}>Endereço</Label>
          <Input
            id={`em${priority}-address`}
            name="address"
            defaultValue={contact?.address ?? ""}
            placeholder="Rua, número, bairro"
          />
        </div>
      </div>

      {state?.ok === false && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Contato {priority} salvo.</Alert>}

      <SubmitButton label={`Salvar contato ${priority}`} />
    </form>
  );
}

export function EmergenciaTab({
  studentId,
  contacts,
}: {
  studentId: string;
  contacts: EmergencyContactRow[];
}) {
  const p1 = contacts.find((c) => c.priority === 1);
  const p2 = contacts.find((c) => c.priority === 2);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Contato 1 (prioritário)</CardTitle>
        </CardHeader>
        <CardContent>
          <EmergencyForm studentId={studentId} priority={1} contact={p1} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato 2</CardTitle>
        </CardHeader>
        <CardContent>
          <EmergencyForm studentId={studentId} priority={2} contact={p2} />
        </CardContent>
      </Card>
    </div>
  );
}
