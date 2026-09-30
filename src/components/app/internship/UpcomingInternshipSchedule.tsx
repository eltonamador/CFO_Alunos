import { UpcomingPermanence } from "./UpcomingPermanence";
import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";
import { formatMinutes } from "@/modules/internship-management/domain/workload";
import { internshipUniformLabel } from "@/modules/internship-management/domain/uniforms";
import {
  getDashboardInternshipSchedule,
  type DashboardInternshipRow,
} from "@/modules/internship-management/infrastructure/dashboardSchedule";

function when(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
function Service({ row, mine }: { row: DashboardInternshipRow; mine: boolean }) {
  return (
    <li
      className={`grid gap-1 border-t py-3 text-sm sm:grid-cols-[minmax(10rem,1fr)_minmax(11rem,1fr)_minmax(12rem,1.2fr)] sm:gap-4 ${mine ? "rounded-md bg-primary/5 px-2" : ""}`}
    >
      <div>
        <span className="font-semibold">
          {String(row.student_number).padStart(2, "0")} · {row.war_name}
        </span>
        {mine && (
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            Você
          </span>
        )}
        <p className="text-xs text-muted-foreground">
          Estágio homologado: {formatMinutes(Number(row.validated_minutes))}
        </p>
      </div>
      <div>
        <p className="font-medium">
          {row.activity_name} · {row.site_name}
        </p>
        <p className="text-xs text-muted-foreground">{row.resource_name}</p>
      </div>
      <div className="text-xs">
        <p className="font-medium">
          {when(row.starts_at)} → {when(row.ends_at)}
        </p>
        <p className="text-muted-foreground">
          Uniforme: {internshipUniformLabel(row.uniform_code)}
        </p>
      </div>
    </li>
  );
}
export async function UpcomingInternshipSchedule({
  studentId,
  detailsHref,
}: {
  studentId?: string | null;
  detailsHref?: string;
}) {
  const schedule = await getDashboardInternshipSchedule();
  const mine = studentId ? schedule.rows.filter((row) => row.student_id === studentId) : [];
  const first = schedule.rows.slice(0, 8),
    rest = schedule.rows.slice(8);
  return (
    <>
      {" "}
      <UpcomingPermanence studentId={studentId} />{" "}
      <section
        aria-labelledby="upcoming-internship-title"
        className="rounded-xl border bg-card p-4 shadow-card-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="section-eyebrow">Próximos 7 dias</p>
            <h2
              id="upcoming-internship-title"
              className="flex items-center gap-2 font-display text-xl font-bold"
            >
              <CalendarDays className="h-5 w-5 text-primary" aria-hidden /> Escala de estágio
              supervisionado
            </h2>
          </div>
          {detailsHref && (
            <Link
              href={detailsHref}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Ver estágio <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
        {schedule.unavailable ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Não foi possível carregar a escala de estágio agora.
          </p>
        ) : schedule.rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum plantão de estágio publicado para os próximos 7 dias.
          </p>
        ) : (
          <>
            {mine.length > 0 && (
              <p className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-2 text-sm font-medium">
                Você tem {mine.length} plantão{mine.length > 1 ? "ões" : ""} de estágio nos próximos
                7 dias. {when(mine[0]!.starts_at)}: {mine[0]!.activity_name} em {mine[0]!.site_name}
                .
              </p>
            )}
            <ul className="mt-3">
              <li className="hidden border-b pb-2 text-xs font-semibold uppercase text-muted-foreground sm:grid sm:grid-cols-[minmax(10rem,1fr)_minmax(11rem,1fr)_minmax(12rem,1.2fr)] sm:gap-4">
                <span>Cadete / carga homologada</span>
                <span>Serviço / local</span>
                <span>Horário / uniforme</span>
              </li>
              {first.map((row) => (
                <Service key={row.assignment_id} row={row} mine={row.student_id === studentId} />
              ))}
            </ul>
            {rest.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-primary">
                  Ver mais {rest.length} plantões
                </summary>
                <ul>
                  {rest.map((row) => (
                    <Service
                      key={row.assignment_id}
                      row={row}
                      mine={row.student_id === studentId}
                    />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>
    </>
  );
}
