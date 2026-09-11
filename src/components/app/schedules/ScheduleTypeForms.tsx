"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  createScheduleTypeAction,
  type ScheduleActionResult,
} from "@/modules/schedule-repository/presentation/actions";

function Submit() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Salvando…" : "Cadastrar tipo"}</Button>;
}

export function CreateScheduleTypeForm() {
  const [state, action] = useFormState<ScheduleActionResult | null, FormData>(
    createScheduleTypeAction,
    null,
  );
  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-2 text-sm font-medium">
        <span>Nome do tipo</span>
        <Input name="name" required minLength={3} maxLength={150} />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>Descrição</span>
        <Textarea name="description" maxLength={1000} rows={3} />
      </label>
      {state && <Alert variant={state.ok ? "success" : "destructive"}>{state.message}</Alert>}
      <Submit />
    </form>
  );
}
