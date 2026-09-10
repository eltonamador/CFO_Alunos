"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { AcademicAuditEvent } from "@/modules/academic-management/application/types";

const labels: Record<string, string> = {
  score: "Nota",
  revision: "Versão",
  change_reason: "Motivo",
  justified_absences: "Faltas justificadas",
  unjustified_absences: "Faltas não justificadas",
  title: "Título",
  kind: "Tipo",
  sequence: "Número",
  held_on: "Data da avaliação",
  name: "Nome",
  phase: "Fase",
  workload_hours: "Carga horária",
  vc_count: "Quantidade de VC",
  display_name: "Responsável",
  role: "Função",
  active: "Ativo",
  decision_ref: "Decisão",
  designation_ref: "Designação",
  parameters: "Parâmetros",
  policy_id: "Política",
  student_id: "Cadete",
  profile_id: "Conta vinculada",
  source_ref: "Referência",
  code: "Código",
  academic_year: "Ano letivo",
};
const entities: Record<string, string> = {
  academic_grades: "Nota",
  academic_enrollments: "Matrícula/frequência",
  academic_assessments: "Avaliação",
  academic_policies: "Política",
  academic_offerings: "Oferta",
  academic_assignments: "Designação",
  academic_disciplines: "Disciplina",
};
const parameterLabels: Record<string, string> = {
  directPassGrade: "Aprovação direta",
  vfMinAverage: "Média mínima para VF",
  vfPassGrade: "Média mínima após VF",
  vfReduction: "Redução após VF",
  vfMaxRecordedGrade: "Teto após VF",
  maxVfDisciplines: "Limite de disciplinas em VF",
  absenceLimitPercent: "Limite de faltas (%)",
  attendanceMode: "Faltas consideradas",
  absencePenaltyStage: "Momento do desconto",
  averageDecimals: "Casas decimais",
  roundingMode: "Arredondamento",
  comparisonStage: "Momento de comparar os limites",
  courseAttendanceMinimum: "Frequência mínima do curso (%)",
};
const valueLabels: Record<string, string> = {
  total: "Justificadas e não justificadas",
  unjustified: "Não justificadas",
  before_vf: "Antes de avaliar a VF",
  after_vf: "Na nota final, após VF e redutor quando houver",
  half_even: "Para o par mais próximo",
  rounded: "Após arredondar os valores intermediários",
  exact: "Com valores intermediários exatos",
  chefe: "Chefe de cadeira",
  instrutor: "Instrutor",
};
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function textValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object")
    return Object.entries(asRecord(value))
      .filter(([key]) => key in parameterLabels)
      .map(([key, item]) => `${parameterLabels[key]}: ${textValue(item)}`)
      .join("; ");
  return valueLabels[String(value)] ?? String(value);
}

export function AcademicAudit({
  events,
  studentLabels = {},
}: {
  events: AcademicAuditEvent[];
  studentLabels?: Record<string, string>;
}) {
  const [requestedPage, setRequestedPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(events.length / 25));
  const page = Math.min(requestedPage, pageCount - 1);
  const pageEvents = events.slice(page * 25, (page + 1) * 25);
  return (
    <div className="space-y-3">
      {!events.length && (
        <p className="text-sm text-muted-foreground">
          Nenhum evento de auditoria disponível para este perfil.
        </p>
      )}
      {events.length > 0 && (
        <nav
          aria-label="Paginação do histórico"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-muted-foreground">
            {page * 25 + 1}–{Math.min((page + 1) * 25, events.length)} de {events.length} eventos ·
            Página {page + 1} de {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page === 0}
              onClick={() => setRequestedPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={page >= pageCount - 1}
              onClick={() => setRequestedPage(page + 1)}
            >
              Próximo
            </Button>
          </div>
        </nav>
      )}
      {pageEvents.map((event) => {
        const before = asRecord(event.before_data);
        const after = asRecord(event.after_data);
        const changed = Object.keys(labels).filter(
          (key) =>
            (key in before || key in after) &&
            JSON.stringify(before[key]) !== JSON.stringify(after[key]),
        );
        return (
          <article key={event.id} className="rounded-md border border-border p-3">
            <p className="text-sm font-semibold">
              {entities[event.entity] ?? "Registro acadêmico"} ·{" "}
              {event.action === "INSERT" || event.action === "insert"
                ? "Cadastro"
                : event.action === "UPDATE" || event.action === "update"
                  ? "Alteração"
                  : event.action}
            </p>
            {event.student_id && studentLabels[event.student_id] && (
              <p className="mt-1 text-sm">{studentLabels[event.student_id]}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {event.actor_name || "Responsável registrado"} ·{" "}
              {new Date(event.created_at).toLocaleString("pt-BR", { timeZone: "America/Belem" })}
            </p>
            {event.reason && <p className="mt-2 text-sm">Motivo: {event.reason}</p>}
            {changed.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-primary">Ver alterações</summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">Valores anteriores e novos do registro</caption>
                    <thead>
                      <tr>
                        <th className="p-2">Campo</th>
                        <th className="p-2">Antes</th>
                        <th className="p-2">Depois</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changed.map((key) => (
                        <tr className="border-t border-border" key={key}>
                          <th scope="row" className="p-2 font-medium">
                            {labels[key]}
                          </th>
                          <td className="max-w-xs break-words p-2">{textValue(before[key])}</td>
                          <td className="max-w-xs break-words p-2">{textValue(after[key])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </article>
        );
      })}
    </div>
  );
}
