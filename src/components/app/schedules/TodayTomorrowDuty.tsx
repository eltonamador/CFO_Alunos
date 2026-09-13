import Link from "next/link";
import { ArrowRight, CalendarDays, Siren } from "lucide-react";
import type {
  DutyOverview,
  DutyRosterEntry,
} from "@/modules/schedule-repository/infrastructure/dashboardQueries";
import { SaveOfflineRoster } from "./OfflineRosterSession";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function DayCard({
  title,
  date,
  entries,
}: {
  title: string;
  date: string;
  entries: DutyRosterEntry[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card-sm">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
        <h3 className="font-display text-base font-bold">{title}</h3>
        <span className="ml-auto text-xs text-muted-foreground">{dateLabel(date)}</span>
      </div>
      {entries.length ? (
        <div className="mt-3 space-y-4">
          {(["cadet", "officer"] as const).map((kind) => {
            const group = entries.filter((entry) => entry.kind === kind);
            if (!group.length) return null;
            return (
              <div key={kind}>
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {kind === "cadet" ? "Cadetes" : "Oficiais e coordenação"}
                </h4>
                <ul className="mt-1 divide-y divide-border">
                  {group.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2 text-sm"
                    >
                      <span className="font-semibold">{entry.person}</span>
                      {entry.mine && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          Você
                        </span>
                      )}
                      <span className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto">
                        {entry.duty}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma atribuição publicada para este dia.
        </p>
      )}
    </div>
  );
}

export function TodayTomorrowDuty({
  overview,
  schedulesHref,
}: {
  overview: DutyOverview;
  schedulesHref?: string;
}) {
  const today = overview.entries.filter((entry) => entry.date === overview.today);
  const tomorrow = overview.entries.filter((entry) => entry.date === overview.tomorrow);
  const mine = overview.entries.filter((entry) => entry.mine);

  return (
    <section className="space-y-3" aria-labelledby="today-tomorrow-duty-title">
      {overview.userId && overview.updatedAt && !overview.unavailable && (
        <SaveOfflineRoster
          snapshot={{
            version: 1,
            userId: overview.userId,
            savedAt: overview.updatedAt,
            start: overview.today,
            end: overview.tomorrow,
            entries: overview.entries,
          }}
        />
      )}
      {mine.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4 text-amber-950 shadow-card-sm dark:bg-amber-950/30 dark:text-amber-100"
        >
          <div className="flex items-start gap-3">
            <Siren className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
            <div>
              <p className="font-display text-lg font-bold">
                Você está de serviço{" "}
                {mine.some((entry) => entry.date === overview.today) ? "hoje" : "amanhã"}
              </p>
              <ul className="mt-1 space-y-1 text-sm">
                {mine.map((entry) => (
                  <li key={entry.id}>
                    {entry.date === overview.today ? "Hoje" : "Amanhã"}: {entry.duty}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="section-eyebrow">Consulta rápida</p>
          <h2 id="today-tomorrow-duty-title" className="font-display text-xl font-bold">
            Quem está de serviço
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/escalas/calendario"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Calendário <CalendarDays className="h-4 w-4" aria-hidden />
          </Link>
          {schedulesHref && (
            <Link
              href={schedulesHref}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Ver escalas <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      </div>
      {overview.unavailable ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Não foi possível carregar as escalas agora. Consulte o repositório de PDFs.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <DayCard title="Hoje" date={overview.today} entries={today} />
          <DayCard title="Amanhã" date={overview.tomorrow} entries={tomorrow} />
        </div>
      )}
    </section>
  );
}
