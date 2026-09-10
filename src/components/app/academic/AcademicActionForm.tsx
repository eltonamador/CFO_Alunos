"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  academicAction,
  type ActionResult,
} from "@/modules/academic-management/presentation/actions";

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Salvando…" : label}
    </Button>
  );
}

export function AcademicActionForm({
  operation,
  hidden = {},
  children,
  submitLabel = "Salvar",
  disabled = false,
}: {
  operation: string;
  hidden?: Record<string, string | number>;
  children?: ReactNode;
  submitLabel?: string;
  disabled?: boolean;
}) {
  const [state, action] = useFormState<ActionResult | null, FormData>(academicAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="operation" value={operation} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      {state && <Alert variant={state.ok ? "success" : "destructive"}>{state.message}</Alert>}
      <SubmitButton label={submitLabel} disabled={disabled} />
    </form>
  );
}

export function AcademicField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function AcademicRetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Carregando…" : "Tentar novamente"}
    </Button>
  );
}
