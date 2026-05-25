"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import type { ProgressStatus } from "@/lib/student-progress";

export type ProgressFilter = "todos" | ProgressStatus;
export type ProgressSort = "numero" | "menor" | "maior" | "incompletas";

interface Counts {
  todos: number;
  nao_iniciada: number;
  em_preenchimento: number;
  quase_completa: number;
  completa: number;
}

const FILTERS: { id: ProgressFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "nao_iniciada", label: "Não iniciada" },
  { id: "em_preenchimento", label: "Em preenchimento" },
  { id: "quase_completa", label: "Quase completa" },
  { id: "completa", label: "Completa" },
];

const SORTS: { id: ProgressSort; label: string }[] = [
  { id: "numero", label: "Por número" },
  { id: "menor", label: "Menor progresso" },
  { id: "maior", label: "Maior progresso" },
  { id: "incompletas", label: "Incompletas primeiro" },
];

export function StudentProgressFilters({
  status,
  sort,
  counts,
}: {
  status: ProgressFilter;
  sort: ProgressSort;
  counts: Counts;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(sp);
    if (value && value !== "") params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        role="tablist"
        aria-label="Filtrar fichas por progresso"
        className="-mx-1 flex flex-wrap items-center gap-1 overflow-x-auto px-1"
      >
        {FILTERS.map((f) => {
          const active = status === f.id;
          const count = counts[f.id];
          return (
            <button
              key={f.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => update("status", f.id === "todos" ? null : f.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors",
                active
                  ? "border-brand-red-200 bg-brand-red-50 text-brand-red-700 dark:border-brand-red-700/40 dark:bg-brand-red-900/30 dark:text-brand-red-100"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{f.label}</span>
              <span
                className={cn(
                  "num-mono inline-flex min-w-[18px] justify-center rounded-full px-1 text-[10px] tabular-nums",
                  active
                    ? "bg-brand-red-100 text-brand-red-700 dark:bg-brand-red-700/40 dark:text-brand-red-100"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="sr-only sm:not-sr-only">Ordenar:</span>
        <select
          value={sort}
          onChange={(e) => update("sort", e.target.value === "numero" ? null : e.target.value)}
          className="h-8 rounded-md border border-input bg-card px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          aria-label="Ordenar lista de alunos"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
