"use client";

import * as React from "react";

/**
 * Renderiza diff antes/depois de um objeto JSON, destacando campos alterados.
 * - booleans → Sim/Não
 * - null/undefined/'' → —
 * - datas ISO → dd/mm/aaaa
 * - objetos/arrays aninhados → JSON formatado compacto
 */
function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "string") {
    // Detecta ISO date YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split("-");
      return `${d}/${m}/${y}`;
    }
    // Detecta ISO datetime
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      try {
        return new Date(v).toLocaleString("pt-BR");
      } catch {
        return v;
      }
    }
    return v;
  }
  if (typeof v === "number") return String(v);
  if (Array.isArray(v) || typeof v === "object") {
    return JSON.stringify(v);
  }
  return String(v);
}

// Labels amigáveis para chaves técnicas
const FIELD_LABELS: Record<string, string> = {
  blood_type: "Tipo sanguíneo",
  rh_factor: "Fator RH",
  altura_cm: "Altura (cm)",
  peso_kg: "Peso (kg)",
  cirurgia_ocular: "Cirurgia ocular",
  cirurgia_ocular_obs: "Obs. cirurgia ocular",
  allergies: "Alergias",
  continuous_medication: "Medicação contínua",
  chronic_disease: "Doença crônica",
  physical_restriction: "Restrição física",
  dietary_restriction: "Restrição alimentar",
  uses_glasses: "Usa óculos",
  medical_notes: "Observações médicas",
  validation_status: "Status validação",
  validated_by: "Validado por",
  validated_at: "Validado em",
  last_updated_at: "Última atualização",
  student_id: "ID aluno",
};

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ");
}

function isMeta(key: string): boolean {
  // chaves de auditoria/internas que não interessam ao diff visual
  return ["student_id", "validation_status", "validated_by", "validated_at", "last_updated_at"].includes(
    key,
  );
}

export function DiffTable({
  previous,
  next,
}: {
  previous: unknown;
  next: unknown;
}) {
  const prevObj = (previous && typeof previous === "object" ? previous : {}) as Record<string, unknown>;
  const nextObj = (next && typeof next === "object" ? next : {}) as Record<string, unknown>;

  const allKeys = Array.from(new Set([...Object.keys(prevObj), ...Object.keys(nextObj)]))
    .filter((k) => !isMeta(k))
    .sort();

  if (allKeys.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Sem dados anteriores para comparação.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border bg-background">
      <table className="w-full text-xs">
        <thead className="bg-muted/40">
          <tr className="text-left">
            <th className="px-3 py-2 font-semibold">Campo</th>
            <th className="px-3 py-2 font-semibold">Antes</th>
            <th className="px-3 py-2 font-semibold">Depois</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {allKeys.map((key) => {
            const before = prevObj[key];
            const after = nextObj[key];
            const beforeStr = formatValue(before);
            const afterStr = formatValue(after);
            const changed = beforeStr !== afterStr;
            return (
              <tr key={key} className={changed ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}>
                <td className="px-3 py-1.5 font-medium capitalize">{labelFor(key)}</td>
                <td
                  className={`px-3 py-1.5 ${
                    changed ? "text-red-700 line-through decoration-red-300/60 dark:text-red-300" : "text-muted-foreground"
                  }`}
                >
                  {beforeStr}
                </td>
                <td
                  className={`px-3 py-1.5 ${
                    changed ? "font-semibold text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"
                  }`}
                >
                  {afterStr}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
