"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  loginAction,
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
      {pending ? "Entrando..." : "Entrar"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-white/70">
          Usuário
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="seu.usuario@abm.br"
          className="input-on-dark"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-white/70">
          Senha
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="input-on-dark"
        />
      </div>

      {state && !state.ok && <Alert variant="destructive">{state.error}</Alert>}

      <SubmitButton />

      <p className="text-center text-xs text-white/30">
        Use o login informado pela Coordenação. Não é necessária uma caixa de e-mail.
      </p>
    </form>
  );
}
