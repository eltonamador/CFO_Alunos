"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import {
  FOLLOW_UP_TYPES,
  FOLLOW_UP_TYPE_LABELS,
  normalizeLabel,
  requiresManifestation,
  type FollowUpType,
  type ReasonSuggestion,
} from "@/modules/cadet-followup/domain/followUp";
import {
  createFollowUpAction,
  type ActionResult,
} from "@/modules/cadet-followup/presentation/actions";
import { ReasonAutocomplete } from "./ReasonAutocomplete";

export interface PickerStudent {
  id: string;
  warName: string;
  studentNumber: number | null;
  fullName: string;
}

interface QuickFollowUpFormProps {
  students: PickerStudent[];
  reasonsByKind: Record<string, ReasonSuggestion[]>;
}

function label(student: PickerStudent) {
  return student.studentNumber
    ? `${student.warName} — ${String(student.studentNumber).padStart(2, "0")}`
    : student.warName;
}

function SubmitButton({ type, disabled }: { type: FollowUpType; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending || disabled}>
      {pending ? "Salvando…" : `Registrar ${FOLLOW_UP_TYPE_LABELS[type]}`}
    </Button>
  );
}

/**
 * Registro rápido: cadete → tipo → motivo → salvar → próximo cadete.
 * Pensado para uso em pé, no celular, durante a revista.
 */
export function QuickFollowUpForm({ students, reasonsByKind }: QuickFollowUpFormProps) {
  const router = useRouter();
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    createFollowUpAction,
    null,
  );

  const [selected, setSelected] = React.useState<PickerStudent | null>(null);
  const [term, setTerm] = React.useState("");
  const [type, setType] = React.useState<FollowUpType>("fo_negativo");
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [showNotes, setShowNotes] = React.useState(false);

  const searchRef = React.useRef<HTMLInputElement>(null);
  const reasonRef = React.useRef<HTMLDivElement>(null);
  const lastHandled = React.useRef<ActionResult | null>(null);

  // Depois de salvar: limpa o formulário e volta o foco para o próximo cadete.
  React.useEffect(() => {
    if (!state || state === lastHandled.current) return;
    lastHandled.current = state;
    if (!state.ok) return;

    setSelected(null);
    setTerm("");
    setReason("");
    setNotes("");
    setShowNotes(false);
    searchRef.current?.focus();
    // Traz os motivos recém-criados para o autocomplete do próximo registro.
    router.refresh();
  }, [state, router]);

  const filtered = React.useMemo(() => {
    const needle = normalizeLabel(term);
    if (!needle) return students;
    return students.filter((student) => {
      if (String(student.studentNumber ?? "").padStart(2, "0").includes(needle)) return true;
      return (
        normalizeLabel(student.warName).includes(needle) ||
        normalizeLabel(student.fullName).includes(needle)
      );
    });
  }, [students, term]);

  const suggestions = reasonsByKind[type] ?? [];

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="studentId" value={selected?.id ?? ""} />
      <input type="hidden" name="type" value={type} />

      {state && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-md border px-3.5 py-3 text-sm",
            state.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
          )}
        >
          {state.ok && <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
          <span>{state.ok ? state.message : state.error}</span>
        </div>
      )}

      {/* 1. Cadete */}
      <section className="space-y-2">
        <Label htmlFor="student-search">1. Cadete</Label>

        {selected ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary px-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold uppercase tracking-[0.02em]">
                {label(selected)}
              </p>
              <p className="truncate text-xs text-muted-foreground">{selected.fullName}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelected(null);
                window.setTimeout(() => searchRef.current?.focus(), 0);
              }}
            >
              <X className="h-4 w-4" aria-hidden />
              Trocar
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="student-search"
                ref={searchRef}
                value={term}
                autoFocus
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Número ou nome de guerra"
                className="pl-9"
                onChange={(event) => setTerm(event.target.value)}
              />
            </div>

            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {filtered.length === 0 && (
                <li className="px-3 py-3 text-sm text-muted-foreground">
                  Nenhum cadete encontrado.
                </li>
              )}
              {filtered.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(student);
                      window.setTimeout(
                        () => reasonRef.current?.querySelector("input")?.focus(),
                        0,
                      );
                    }}
                    className="flex min-h-[48px] w-full items-center gap-3 rounded-md px-3 text-left transition-colors hover:bg-secondary"
                  >
                    <span className="num-mono w-7 shrink-0 text-sm font-semibold text-muted-foreground">
                      {student.studentNumber
                        ? String(student.studentNumber).padStart(2, "0")
                        : "—"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-sm font-bold uppercase tracking-[0.02em]">
                        {student.warName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {student.fullName}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* 2. Tipo */}
      <section className="space-y-2">
        <Label>2. Tipo</Label>
        <div className="flex flex-wrap gap-2">
          {FOLLOW_UP_TYPES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={type === item}
              onClick={() => setType(item)}
              className={cn(
                "min-h-[44px] rounded-md border px-4 font-display text-sm font-semibold uppercase tracking-[0.04em] transition-colors",
                type === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/80 hover:bg-secondary",
              )}
            >
              {FOLLOW_UP_TYPE_LABELS[item]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {requiresManifestation(type)
            ? "O cadete terá 24 horas para se manifestar."
            : "Registro direto, sem prazo de manifestação."}
        </p>
      </section>

      {/* 3. Motivo */}
      <section className="space-y-2" ref={reasonRef}>
        <Label htmlFor="reasonText">3. Motivo</Label>
        <ReasonAutocomplete
          id="reasonText"
          name="reasonText"
          value={reason}
          onChange={setReason}
          suggestions={suggestions}
          required
        />
        <p className="text-xs text-muted-foreground">
          Digite para ver motivos já usados ou escreva um novo.
        </p>
      </section>

      {/* 4. Observação (opcional) */}
      <section className="space-y-2">
        {showNotes ? (
          <>
            <Label htmlFor="notes">Observação complementar (opcional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: camisa excessivamente amarrotada durante a revista matinal."
            />
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowNotes(true)}
          >
            + Observação complementar
          </Button>
        )}
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <SubmitButton type={type} disabled={!selected} />
        {!selected && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Selecione o cadete para habilitar o registro.
          </p>
        )}
      </div>
    </form>
  );
}
