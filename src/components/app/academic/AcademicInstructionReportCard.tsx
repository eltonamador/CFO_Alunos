"use client";

import { useState } from "react";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type Option = { id: string; label: string };
export type AcademicInstructionReportOptions = {
  courses: Option[];
  academicYears: Option[];
  classes: Option[];
  disciplines: Option[];
  instructors: Option[];
};

type FilterState = {
  courseId: string;
  academicYearId: string;
  classId: string;
  phase: string;
  disciplineId: string;
  instructorId: string;
  startsOn: string;
  endsOn: string;
};

const emptyFilters: FilterState = {
  courseId: "",
  academicYearId: "",
  classId: "",
  phase: "",
  disciplineId: "",
  instructorId: "",
  startsOn: "",
  endsOn: "",
};

export function AcademicInstructionReportCard({
  options = { courses: [], academicYears: [], classes: [], disciplines: [], instructors: [] },
}: {
  options?: AcademicInstructionReportOptions;
}) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [loading, setLoading] = useState<"xlsx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  function update(name: keyof FilterState, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }
  async function download(format: "xlsx" | "pdf") {
    if (filters.startsOn && filters.endsOn && filters.startsOn > filters.endsOn) {
      setError("A data inicial não pode ser posterior à data final.");
      return;
    }
    setLoading(format);
    setError(null);
    try {
      const query = new URLSearchParams({ format });
      for (const [name, value] of Object.entries(filters)) if (value) query.set(name, value);
      const response = await fetch(`/api/reports/academic-instruction?${query}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Não foi possível gerar o relatório.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Carga_Instrucional.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar o relatório.");
    } finally {
      setLoading(null);
    }
  }
  const select = (name: keyof FilterState, label: string, values: Option[]) => (
    <label className="space-y-1 text-sm font-medium">
      {label}
      <Select value={filters[name]} onChange={(event) => update(name, event.target.value)}>
        <option value="">Todos</option>
        {values.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </Select>
    </label>
  );
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-card-sm">
      <div className="flex gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-2xl">📚</span>
        <div>
          <h2 className="font-display text-base font-semibold uppercase tracking-[0.02em]">Carga instrucional e frequência</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Carga adotada, ministrada e planejada por disciplina; horas confirmadas por instrutor e frequência detalhada por aula.
          </p>
        </div>
      </div>
      {error && <Alert variant="destructive" className="mt-4">{error}</Alert>}
      <details className="mt-4 rounded border border-border p-3">
        <summary className="cursor-pointer text-sm font-semibold">Filtrar relatório</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {select("courseId", "Curso", options.courses)}
          {select("academicYearId", "Ano letivo", options.academicYears)}
          {select("classId", "Turma", options.classes)}
          <label className="space-y-1 text-sm font-medium">
            Fase
            <Select value={filters.phase} onChange={(event) => update("phase", event.target.value)}>
              <option value="">Todas</option>
              <option value="1">CFO I</option>
              <option value="2">CFO II</option>
              <option value="3">CFO III</option>
            </Select>
          </label>
          {select("disciplineId", "Disciplina", options.disciplines)}
          {select("instructorId", "Instrutor", options.instructors)}
          <label className="space-y-1 text-sm font-medium">De<Input type="date" value={filters.startsOn} onChange={(event) => update("startsOn", event.target.value)} /></label>
          <label className="space-y-1 text-sm font-medium">Até<Input type="date" value={filters.endsOn} onChange={(event) => update("endsOn", event.target.value)} /></label>
        </div>
        <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setFilters(emptyFilters)}>Limpar filtros</Button>
      </details>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" disabled={loading !== null} onClick={() => void download("xlsx")}>
          {loading === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} XLSX
        </Button>
        <Button disabled={loading !== null} onClick={() => void download("pdf")}>
          {loading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF
        </Button>
      </div>
    </article>
  );
}
