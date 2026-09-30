"use client";
import { useState } from "react";
import type { Database } from "@/lib/supabase/types";
import { formatMinutes } from "../domain/workload";
import { ProgressTrack } from "./InternshipProgress";
type Row = Database["public"]["Functions"]["internship_coordination_workload"]["Returns"][number];
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function CadetWorkloadList({
  rows,
  initialFilter = "todos",
  selectedId,
}: {
  rows: Row[];
  initialFilter?: string;
  selectedId?: string;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const visible = rows.filter((row) => {
    const query = normalize(search.trim());
    if (
      query &&
      !normalize(
        `${row.student_number} ${String(row.student_number).padStart(2, "0")} ${row.war_name}`,
      ).includes(query)
    )
      return false;
    if (filter === "pendencias") return row.awaiting_homologation > 0 || row.open_occurrences > 0;
    if (filter === "concluidos") return row.concluded;
    if (filter === "deficit") return !row.concluded;
    return true;
  });
  return (
    <section id="cadetes" className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-xl font-semibold">Cadetes e horas</h2>
        <p className="text-sm text-muted-foreground">
          Encontre o cadete para conferir o serviço e lançar as horas.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Buscar cadete por nome ou número</span>
          <input
            type="search"
            className="h-12 w-full rounded-lg border bg-background px-4"
            placeholder="Buscar cadete por nome ou número"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Situação da carga</span>
          <select
            className="h-12 w-full rounded-lg border bg-background px-3 sm:w-auto"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="pendencias">Com pendências</option>
            <option value="deficit">Falta cumprir horas</option>
            <option value="concluidos">Carga concluída</option>
          </select>
        </label>
      </div>
      <p role="status" className="text-xs text-muted-foreground">
        {visible.length} {visible.length === 1 ? "cadete encontrado" : "cadetes encontrados"} · apenas horas homologadas contam para a conclusão.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="py-3">Cadete</th>
              <th className="px-2 py-3 text-right">Cumpridas</th>
              <th className="px-2 py-3 text-right">Faltam</th>
              <th className="py-3">
                <span className="sr-only">Ficha</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.map((row) => (
              <tr
                key={row.student_id}
                className={selectedId === row.student_id ? "bg-primary/5" : ""}
              >
                <td className="py-3 pr-2">
                  <a
                    className="font-semibold hover:text-primary"
                    href={`/coordenacao/estagio?cadete=${row.student_id}#fichas`}
                  >
                    {String(row.student_number).padStart(2, "0")} · {row.war_name}
                  </a>
                  {(row.awaiting_homologation > 0 || row.open_occurrences > 0) && (
                    <span className="block text-xs text-amber-700">Conferência pendente</span>
                  )}
                </td>
                <td className="px-2 py-3 text-right tabular-nums">
                  {formatMinutes(Number(row.validated_minutes))}
                  <div className="ml-auto mt-1 w-28">
                    <ProgressTrack
                      label={`Horas homologadas de ${row.war_name}`}
                      percent={Math.min(100, Number(row.validated_minutes) / Number(row.required_minutes) * 100)}
                    />
                  </div>
                  <span className="block text-xs text-muted-foreground">
                    {Math.round(Number(row.validated_minutes) / Number(row.required_minutes) * 100)}% do mínimo · {formatMinutes(Number(row.planned_minutes))} previstas
                  </span>
                </td>
                <td className="px-2 py-3 text-right tabular-nums">
                  {row.concluded
                    ? "Concluído"
                    : formatMinutes(Number(row.missing_required_minutes))}
                </td>
                <td className="py-3 text-right">
                  <a
                    aria-label={`Abrir ficha de ${row.war_name}`}
                    className="inline-flex min-h-11 items-center px-2 font-medium text-primary"
                    href={`/coordenacao/estagio?cadete=${row.student_id}#fichas`}
                  >
                    Abrir
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nenhum cadete encontrado. Ajuste o nome, o número ou o filtro.
        </p>
      )}
    </section>
  );
}
