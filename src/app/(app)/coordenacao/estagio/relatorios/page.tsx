import { requireInternshipManager } from "@/modules/internship-management/presentation/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadInternshipReportData } from "@/lib/reports/internship-report-data";
import { formatMinutes } from "@/modules/internship-management/domain/workload";
export const dynamic = "force-dynamic";
export default async function ReportsPage() {
  await requireInternshipManager();
  const data = await loadInternshipReportData(createSupabaseServerClient());
  return (
    <div className="space-y-5">
      <a href="/coordenacao/estagio" className="text-primary underline">
        Voltar ao estágio
      </a>
      <h1 className="text-3xl font-bold">Relatórios do estágio</h1>
      <a href="/coordenacao/estagio/realizados" className="inline-flex rounded border px-4 py-3 text-sm font-semibold text-primary">
        Conferir plantões realizados
      </a>
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">Turma completa</h2>
        <div className="flex flex-wrap gap-3">
          <a
            className="rounded border px-4 py-3 text-sm font-semibold text-primary"
            href="/api/reports/estagio?format=xlsx"
          >
            Baixar Excel
          </a>
          <a
            className="rounded border px-4 py-3 text-sm font-semibold text-primary"
            href="/api/reports/estagio?format=pdf"
          >
            Baixar PDF
          </a>
          <a
            className="rounded border px-4 py-3 text-sm font-semibold text-primary"
            href="/api/estagio/escala"
            target="_blank"
            rel="noreferrer"
          >
            Imprimir escala
          </a>
        </div>
      </section>
      <h2 className="text-xl font-semibold">Por cadete</h2>
      <p>
        Carga, plantões, avaliações e orientações. O termo comprova o mínimo homologado de{" "}
        {formatMinutes(data.program.required_minutes)}. Horas do serviço do Dia ao 1º Ano são contabilizadas
        separadamente.
      </p>
      {data.workload
        .sort((a, b) => (a.student_number ?? 0) - (b.student_number ?? 0))
        .map((c) => (
          <section
            key={c.student_id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
          >
            <div>
              <h2 className="font-bold">
                {c.student_number} · {c.war_name}
              </h2>
              <p>
                {formatMinutes(c.validated_minutes)} homologadas · faltam{" "}
                {formatMinutes(c.missing_required_minutes)}
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <a
                className="text-primary underline"
                href={`/api/estagio/individual?cadete=${c.student_id}&format=pdf`}
              >
                Relatório PDF
              </a>
              <a
                className="text-primary underline"
                href={`/api/estagio/individual?cadete=${c.student_id}&format=xlsx`}
              >
                Excel
              </a>
              {c.validated_minutes >= data.program.required_minutes ? (
                <a
                  className="text-primary underline"
                  href={`/api/estagio/individual?cadete=${c.student_id}&format=termo`}
                >
                  Termo de carga cumprida
                </a>
              ) : (
                <span className="text-muted-foreground">
                  Termo disponível após atingir o mínimo
                </span>
              )}
            </div>
          </section>
        ))}
    </div>
  );
}
