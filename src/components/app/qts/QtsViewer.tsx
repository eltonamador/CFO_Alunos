"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  MapPin,
  RefreshCw,
  Shirt,
  UserRound,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  isQtsActivityNow,
  macapaDate,
  qtsDateLabel,
  qtsDocumentForDate,
  qtsShortDateLabel,
  qtsTime,
  qtsWeekRange,
  shiftQtsDate,
  type QtsActivity,
  type QtsSnapshot,
} from "@/modules/qts/domain/qts";
import { readOfflineQts, saveOfflineQts } from "@/modules/qts/infrastructure/offlineStorage";
import { cn } from "@/lib/utils";

type View = "day" | "week";

function OriginalPdfLinks({ snapshot, date }: { snapshot: QtsSnapshot; date: string }) {
  const documents = snapshot.documents.filter(
    (document) =>
      (!document.periodStart || document.periodStart <= date) &&
      (!document.periodEnd || document.periodEnd >= date),
  );
  if (!documents.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {documents.map((document) =>
        document.downloadUrl ? (
          <a
            key={document.id}
            href={document.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-semibold hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            PDF original
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : null,
      )}
    </div>
  );
}

function ActivityCard({ activity, now }: { activity: QtsActivity; now: Date }) {
  const current = !activity.isBreak && isQtsActivityNow(activity, now);
  return (
    <article
      className={cn(
        "relative rounded-xl border bg-card p-4 shadow-card-sm",
        activity.isBreak && "border-border bg-muted/35",
        current && "border-primary bg-primary/5 ring-1 ring-primary/30",
      )}
    >
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex min-w-28 items-center gap-1 font-display text-base font-bold tabular-nums">
          <Clock3 className="h-4 w-4 text-primary" aria-hidden />
          {qtsTime(activity.startsAt)}–{qtsTime(activity.endsAt)}
        </div>
        {current && <Badge variant="success" dot>Agora</Badge>}
        {activity.isBreak && <Badge variant="outline">Pausa</Badge>}
        {activity.workload && <Badge variant="info">CH {activity.workload}</Badge>}
      </div>
      <h3 className={cn("mt-2 font-display text-lg font-bold", activity.isBreak && "text-muted-foreground")}>
        {activity.activity}
      </h3>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        {activity.uniform && (
          <div className="rounded-md bg-brand-gold-100 px-2.5 py-2 font-semibold text-brand-gold-700 dark:bg-brand-gold-700/20 dark:text-brand-gold-300">
            <span className="flex items-center gap-1 text-xs uppercase tracking-wide opacity-75">
              <Shirt className="h-3.5 w-3.5" aria-hidden /> Uniforme
            </span>
            <span className="mt-0.5 block">{activity.uniform}</span>
          </div>
        )}
        {activity.location && (
          <div className="rounded-md bg-muted px-2.5 py-2">
            <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> Local
            </span>
            <span className="mt-0.5 block font-medium">{activity.location}</span>
          </div>
        )}
        {activity.instructor && (
          <div className="rounded-md bg-muted px-2.5 py-2">
            <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" aria-hidden /> Responsável
            </span>
            <span className="mt-0.5 block font-medium">{activity.instructor}</span>
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyDay({ snapshot, date }: { snapshot: QtsSnapshot; date: string }) {
  const document = qtsDocumentForDate(snapshot.documents, date);
  return (
    <Card className="p-6 text-center text-sm text-muted-foreground">
      {document
        ? "Dia de descanso ou sem atividades programadas neste QTS."
        : "Não há QTS publicado para este dia."}
    </Card>
  );
}

export function QtsViewer({ initial, initialDate }: { initial: QtsSnapshot; initialDate?: string }) {
  const today = macapaDate();
  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState(initialDate ?? today);
  const [snapshot, setSnapshot] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const firstFetch = useRef(true);

  const range = useMemo(
    () => (view === "week" ? qtsWeekRange(anchor) : { start: anchor, end: anchor }),
    [anchor, view],
  );
  const dates = useMemo(() => {
    const values: string[] = [];
    for (let date = range.start; date <= range.end; date = shiftQtsDate(date, 1)) values.push(date);
    return values;
  }, [range]);

  const load = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/qts?start=${range.start}&end=${range.end}`, { cache: "no-store" });
      const body = (await response.json()) as QtsSnapshot & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível consultar o QTS.");
      setSnapshot(body);
      saveOfflineQts(body);
    } catch (error) {
      const saved = readOfflineQts(snapshot.userId);
      if (saved) {
        setSnapshot(saved);
        setMessage("Sem conexão. Exibindo a última consulta salva neste aparelho.");
      } else {
        setMessage(error instanceof Error ? error.message : "Não foi possível consultar o QTS.");
      }
    } finally {
      setBusy(false);
    }
  }, [range.end, range.start, snapshot.userId]);

  useEffect(() => {
    saveOfflineQts(initial);
  }, [initial]);
  useEffect(() => {
    const refreshClock = () => setNow(new Date());
    const id = window.setInterval(refreshClock, 30_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (firstFetch.current) {
      firstFetch.current = false;
      if (initial.start <= range.start && initial.end >= range.end) return;
    }
    void load();
  }, [initial.end, initial.start, load, range.end, range.start]);

  const entriesByDay = (date: string) =>
    snapshot.entries
      .filter((entry) => entry.date === date)
      .sort((a, b) => (a.startsAt ?? "99:99").localeCompare(b.startsAt ?? "99:99") || a.sequence - b.sequence);
  const choose = (date: string) => setAnchor(date);
  const daily = entriesByDay(anchor);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-eyebrow">Programação acadêmica</p>
          <h1 className="font-display text-2xl font-bold">Quadro de Trabalho Semanal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Horário oficial de Macapá · atividades conferidas a partir do PDF publicado.</p>
        </div>
        <Link href="/" className="text-sm font-semibold text-primary hover:underline">Voltar ao painel</Link>
      </header>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="icon" aria-label="Dia anterior" onClick={() => choose(shiftQtsDate(anchor, -1))}>
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Button>
          <Button variant="secondary" size="icon" aria-label="Próximo dia" onClick={() => choose(shiftQtsDate(anchor, 1))}>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Button>
          <div className="flex flex-wrap gap-1">
            {[
              ["Ontem", shiftQtsDate(today, -1)],
              ["Hoje", today],
              ["Amanhã", shiftQtsDate(today, 1)],
            ].map(([label, date]) => (
              <Button key={String(label)} variant={anchor === date ? "default" : "ghost"} size="sm" onClick={() => choose(String(date))}>
                {label}
              </Button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="sr-only">Escolher data</span>
            <input
              aria-label="Escolher data do QTS"
              type="date"
              value={anchor}
              onChange={(event) => choose(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-sm font-semibold">Visualização</span>
          <Button size="sm" variant={view === "day" ? "default" : "secondary"} onClick={() => setView("day")}>Dia</Button>
          <Button size="sm" variant={view === "week" ? "default" : "secondary"} onClick={() => setView("week")}>Semana</Button>
          <Button className="ml-auto" size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>
            <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} aria-hidden /> Atualizar
          </Button>
        </div>
      </Card>

      {offline && <Alert>Você está sem conexão. O QTS consultado fica disponível neste aparelho por até 7 dias. <a href="/qts-offline.html" className="font-semibold underline">Abrir agenda salva</a>.</Alert>}
      {message && <Alert>{message}</Alert>}
      <p className="text-xs text-muted-foreground">
        Atualizado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Belem" }).format(new Date(snapshot.savedAt))}.
      </p>

      {view === "day" ? (
        <section className="space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="section-eyebrow">Agenda do dia</p>
              <h2 className="font-display text-xl font-bold capitalize">{qtsDateLabel(anchor, true)}</h2>
            </div>
            <OriginalPdfLinks snapshot={snapshot} date={anchor} />
          </div>
          {busy ? <Card className="p-6 text-center text-sm text-muted-foreground">Carregando QTS…</Card> : daily.length ? daily.map((activity) => <ActivityCard key={activity.id} activity={activity} now={now} />) : <EmptyDay snapshot={snapshot} date={anchor} />}
        </section>
      ) : (
        <section className="space-y-3" aria-label="Grade semanal do QTS">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="section-eyebrow">Grade semanal</p>
              <h2 className="font-display text-xl font-bold">{qtsShortDateLabel(range.start)} a {qtsShortDateLabel(range.end)}</h2>
            </div>
            <OriginalPdfLinks snapshot={snapshot} date={anchor} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {dates.map((date) => {
              const activities = entriesByDay(date);
              return (
                <Card key={date} className={cn("overflow-hidden", date === today && "border-primary")}>
                  <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
                    <h3 className="font-display font-bold capitalize">{qtsDateLabel(date)}</h3>
                    {date === today && <Badge variant="primary">Hoje</Badge>}
                  </div>
                  {activities.length ? (
                    <ul className="divide-y divide-border">
                      {activities.map((activity) => (
                        <li key={activity.id} className={cn("px-4 py-3", activity.isBreak && "bg-muted/30 text-muted-foreground")}>
                          <div className="flex gap-3">
                            <span className="w-24 shrink-0 font-semibold tabular-nums">{qtsTime(activity.startsAt)}–{qtsTime(activity.endsAt)}</span>
                            <div className="min-w-0">
                              <p className="font-medium">{activity.activity}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{[activity.uniform, activity.location, activity.instructor, activity.workload ? `CH ${activity.workload}` : null].filter(Boolean).join(" · ")}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="p-4 text-sm text-muted-foreground">{qtsDocumentForDate(snapshot.documents, date) ? "Descanso ou sem atividades." : "Sem QTS publicado."}</p>}
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
