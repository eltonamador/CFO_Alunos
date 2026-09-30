import { requireInternshipManager } from "@/modules/internship-management/presentation/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  loadInternshipReportData,
  formatReportDateTime,
} from "@/lib/reports/internship-report-data";
import { readAll } from "@/modules/internship-management/infrastructure/readAll";
import { internshipPending } from "@/modules/internship-management/domain/pending";
export const dynamic = "force-dynamic";
export default async function PendingPage({ searchParams }: { searchParams?: { tipo?: string } }) {
  await requireInternshipManager();
  const db = createSupabaseServerClient();
  const data = await loadInternshipReportData(db);
  const evaluations = await readAll((from, to) =>
    db
      .from("internship_evaluations")
      .select("assignment_id,version,status,expires_at")
      .order("id")
      .range(from, to),
  );
  const active = new Set(data.workload.map((r) => r.student_id));
  const tasks = data.schedule
    .filter((r) => r.student_id && active.has(r.student_id))
    .flatMap((row) =>
      internshipPending(row, evaluations, Date.now()).map((task) => ({ row, ...task })),
    )
    .sort((a, b) => a.row.ends_at.localeCompare(b.row.ends_at));
  const types = [...new Map(tasks.map((t) => [t.key, t.label])).entries()];
  const shown = searchParams?.tipo ? tasks.filter((t) => t.key === searchParams.tipo) : tasks;
  return (
    <div className="space-y-5">
      <a className="text-primary underline" href="/coordenacao/estagio">
        Voltar ao estágio
      </a>
      <h1 className="text-3xl font-bold">Pendências do estágio</h1>
      <p>
        Providências por plantão. Horas só entram no contador após homologação; avaliações são
        conferidas separadamente. Plantões futuros não são fichas atrasadas.
      </p>
      {data.workload
        .filter((c) => c.open_occurrences > 0)
        .map((c) => (
          <article className="rounded-lg border border-amber-500 p-4" key={c.student_id}>
            <h2 className="font-bold">
              {c.student_number} · {c.war_name} — relatos para conferir
            </h2>
            <p>
              {c.open_occurrences} plantão(ões) com ocorrência ainda não conferida na homologação.
            </p>
            <a
              className="text-primary underline"
              href={`/coordenacao/estagio?carga=todos&cadete=${c.student_id}#fichas`}
            >
              Conferir relatos e ficha
            </a>
          </article>
        ))}
      <nav className="flex flex-wrap gap-3">
        <a href="/coordenacao/estagio/pendencias" className="rounded border p-3">
          Todas ({tasks.length})
        </a>
        {types.map(([key, label]) => (
          <a key={key} className="rounded border p-3" href={`?tipo=${key}`}>
            {label} ({tasks.filter((t) => t.key === key).length})
          </a>
        ))}
      </nav>
      {shown.length === 0 && (
        <p className="rounded bg-muted p-5">Nenhuma pendência neste filtro.</p>
      )}
      {shown.map((t) => (
        <article
          key={`${t.row.assignment_id}:${t.key}`}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
        >
          <div>
            <h2 className="font-bold">
              {t.row.student_number} · {t.row.war_name}
            </h2>
            <p>
              {t.row.activity_name} · {t.row.site_name} · término{" "}
              {formatReportDateTime(t.row.ends_at)}
            </p>
            <p>{t.label}</p>
          </div>
          <a
            className="rounded bg-primary p-3 text-primary-foreground"
            href={
              t.action === "avaliacao"
                ? `/coordenacao/estagio/avaliacao/${t.row.assignment_id}`
                : `/coordenacao/estagio?carga=todos&cadete=${t.row.student_id}#fichas`
            }
          >
            {t.action === "avaliacao" ? "Abrir avaliação" : "Abrir ficha e horas"}
          </a>
        </article>
      ))}
    </div>
  );
}
