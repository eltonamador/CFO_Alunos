"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updateContactAction,
  type ActionResult,
} from "@/modules/student-profile/presentation/actions/studentActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Textarea";
import { FieldHint } from "@/components/ui/FieldHint";
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
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="studentId" value={studentId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <MaskedInput
            id="whatsapp"
            name="whatsapp"
            mask="phone"
            defaultValue={contact?.whatsapp}
            placeholder="(96) 9XXXX-XXXX"
          />
          <FieldHint>DDD + 9 dígitos do celular.</FieldHint>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone_secondary">Telefone secundário</Label>
          <MaskedInput
            id="phone_secondary"
            name="phone_secondary"
            mask="phone"
            defaultValue={contact?.phone_secondary}
            placeholder="(96) XXXX-XXXX"
          />
          <FieldHint>Opcional — fixo ou celular alternativo.</FieldHint>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="email_personal">E-mail pessoal</Label>
          <Input
            id="email_personal"
            name="email_personal"
            type="email"
            defaultValue={contact?.email_personal ?? ""}
            placeholder="seu.email@exemplo.com"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={contact?.notes ?? ""}
          placeholder="Horário de preferência para contato, restrições, etc."
          maxLength={500}
        />
      </div>

      {state?.ok === false && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Contato salvo com sucesso.</Alert>}

      <SubmitButton />
    </form>
  );
}
