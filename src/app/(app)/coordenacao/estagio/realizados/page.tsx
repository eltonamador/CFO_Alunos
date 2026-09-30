import Link from "next/link";
import { requireInternshipManager } from "@/modules/internship-management/presentation/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadInternshipReportData, formatReportDateTime } from "@/lib/reports/internship-report-data";
import { readAll } from "@/modules/internship-management/infrastructure/readAll";
import { completedAssignments } from "@/modules/internship-management/domain/completedReport";
import { formatMinutes } from "@/modules/internship-management/domain/workload";

export const metadata = { title: "Plantões realizados · Estágio" };
export const dynamic = "force-dynamic";

const filters = [
  { key: "todos", label: "Todos" },
  { key: "pendentes", label: "Sem homologação" },
  { key: "recebida", label: "Avaliação recebida" },
  { key: "aguardando", label: "Aguardando oficial" },
  { key: "sem_convite", label: "Sem convite" },
  { key: "homologados", label: "Homologados" },
] as const;

export default async function CompletedInternshipPage({
  searchParams,
}: {
  searchParams?: { filtro?: string };
}) {
  await requireInternshipManager();
  const db = createSupabaseServerClient();
  const data = await loadInternshipReportData(db);
  const now = Date.now();
  const endedIds = data.schedule
    .filter((row) => row.assignment_id && Date.parse(row.ends_at) <= now)
    .map((row) => row.assignment_id!);
  const [evaluations, points] = endedIds.length
    ? await Promise.all([
        readAll<{ assignment_id: string; version: number; status: string; source: string; expires_at: string | null }>((from, to) =>
          db.from("internship_evaluations")
            .select("assignment_id, version, status, source, expires_at")
            .in("assignment_id", endedIds)
            .order("id")
            .range(from, to),
        ),
        readAll<{ assignment_id: string; point_type: string }>((from, to) =>
          db.from("internship_attendance_points")
            .select("assignment_id, point_type")
            .in("assignment_id", endedIds)
            .order("id")
            .range(from, to),
        ),
      ])
    : [[], []];
  const rows = completedAssignments(data.schedule, evaluations, points, now);
  const selected = filters.some((filter) => filter.key === searchParams?.filtro)
    ? searchParams!.filtro!
    : "todos";
  const shown = rows.filter((row) => {
    if (selected === "pendentes") return !row.homologated;
    if (selected === "homologados") return row.homologated;
    if (selected === "todos") return true;
    return row.evaluationKey === selected;
  });
  const pending = rows.filter((row) => !row.homologated);
  const homologated = rows.filter((row) => row.homologated);
  const pendingMinutes = pending.reduce((sum, row) => sum + Number(row.planned_minutes), 0);
  const approvedMinutes = homologated.reduce((sum, row) => sum + Number(row.approved_minutes ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/coordenacao/estagio" className="text-sm font-medium text-primary underline">Voltar ao estágio</Link>
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CFO 2026.1</p>
        <h1 className="font-display text-3xl font-bold">Plantões realizados</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Somente participações publicadas cujo horário previsto já terminou. O encerramento da escala
          não confirma presença ou horas. Pontos indicam registros existentes, sem validar horário ou local.
          Confira a avaliação e a ficha antes da homologação.
        </p>
      </header>
      <section aria-label="Resumo dos plantões encerrados" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Plantões encerrados" value={String(rows.length)} detail={`${formatMinutes(rows.reduce((sum, row) => sum + Number(row.planned_minutes), 0))} previstas`} />
        <Summary label="Horas homologadas" value={formatMinutes(approvedMinutes)} detail={`${homologated.length} fichas homologadas`} />
        <Summary label="A conferir" value={String(pending.length)} detail={`${formatMinutes(pendingMinutes)} previstas, ainda não homologadas`} />
        <Summary label="Resposta do oficial" value={String(rows.filter((row) => row.evaluationKey === "recebida").length)} detail="avaliações recebidas para revisão" />
      </section>
      <p className="rounded-lg border bg-muted/50 p-4 text-sm">
        O sistema registra relatos de exceção, como saída antecipada. Não há relatório formal obrigatório
        por plantão neste fluxo. “Convite gerado” indica que o link existe, sem comprovar sua entrega ao oficial.
      </p>
      <nav aria-label="Filtrar plantões realizados" className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const count = rows.filter((row) => filter.key === "todos" ||
            (filter.key === "pendentes" ? !row.homologated : filter.key === "homologados" ? row.homologated : row.evaluationKey === filter.key)).length;
          return (
            <Link key={filter.key} href={filter.key === "todos" ? "?" : `?filtro=${filter.key}`}
              aria-current={selected === filter.key ? "page" : undefined}
              className={`rounded-full border px-3 py-2 text-sm font-medium ${selected === filter.key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"}`}>
              {filter.label} ({count})
            </Link>
          );
        })}
      </nav>
      {shown.length === 0 ? <p className="rounded-lg border p-5 text-sm">Nenhum plantão neste filtro.</p> : null}
      <section className="space-y-3" aria-label="Participações encerradas por cadete">
        {shown.map((row) => (
          <article key={row.assignment_id} className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{String(row.student_number ?? "").padStart(2, "0")} · {row.war_name}</h2>
                <p className="text-sm text-muted-foreground">{row.activity_name} · {row.site_name} · término {formatReportDateTime(row.ends_at)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.homologated ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>
                {row.homologated ? "Horas homologadas" : "Aguardando homologação"}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-muted-foreground">Carga</dt><dd className="font-medium">{row.homologated ? `${formatMinutes(Number(row.approved_minutes ?? 0))} homologadas` : `${formatMinutes(Number(row.planned_minutes))} previstas`}</dd></div>
              <div><dt className="text-muted-foreground">Pontos</dt><dd className="font-medium">{row.pointLabel}</dd></div>
              <div><dt className="text-muted-foreground">Relato de exceção</dt><dd className="font-medium">{row.cadet_report_count > 0 ? `${row.cadet_report_count} registrado(s)` : "Nenhum"}</dd></div>
              <div><dt className="text-muted-foreground">Avaliação do oficial</dt><dd className="font-medium">{row.evaluationLabel}</dd></div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-4 border-t pt-3 text-sm font-medium">
              <Link className="text-primary underline" href={`/coordenacao/estagio/avaliacao/${row.assignment_id}`}>Conferir avaliação</Link>
              <Link className="text-primary underline" href={`/coordenacao/estagio?carga=todos&cadete=${row.student_id}#fichas`}>Conferir ficha e horas</Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Summary({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border bg-card p-4">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
  </div>;
}
