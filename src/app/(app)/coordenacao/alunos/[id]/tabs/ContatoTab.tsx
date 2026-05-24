"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updateContactAction,
  type ActionResult,
} from "@/modules/student-profile/presentation/actions/studentActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Textarea";
import type { StudentContactRow } from "@/lib/supabase/queries/students";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar contato"}
    </Button>
  );
}

interface Props {
  studentId: string;
  contact: StudentContactRow | null;
}

export function ContatoTab({ studentId, contact }: Props) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(updateContactAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="studentId" value={studentId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input id="whatsapp" name="whatsapp" defaultValue={contact?.whatsapp ?? ""} placeholder="(96) 9XXXX-XXXX" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone_secondary">Telefone secundário</Label>
          <Input id="phone_secondary" name="phone_secondary" defaultValue={contact?.phone_secondary ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email_personal">E-mail pessoal</Label>
          <Input id="email_personal" name="email_personal" type="email" defaultValue={contact?.email_personal ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email_institutional">E-mail institucional</Label>
          <Input id="email_institutional" name="email_institutional" type="email" defaultValue={contact?.email_institutional ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" defaultValue={contact?.notes ?? ""} />
      </div>

      {state?.ok === false && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Contato salvo.</Alert>}

      <SubmitButton />
    </form>
  );
}
