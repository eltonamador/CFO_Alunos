"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  changePasswordAction,
  type ActionResult,
} from "@/modules/identity/presentation/actions/authActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Salvando..." : "Definir nova senha"}
    </Button>
  );
}

export function FirstAccessForm() {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    changePasswordAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-white font-semibold">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <p className="text-xs text-slate-200 font-medium">
          Mínimo 8 caracteres, com ao menos 1 maiúscula e 1 número.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-white font-semibold">Confirmar senha</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>

      {state && !state.ok && <Alert variant="destructive">{state.error}</Alert>}

      <SubmitButton />
    </form>
  );
}
