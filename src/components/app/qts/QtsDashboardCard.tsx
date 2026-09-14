"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  isQtsActivityNow,
  qtsDateLabel,
  qtsDocumentForDate,
  qtsTime,
  shiftQtsDate,
  type QtsSnapshot,
} from "@/modules/qts/domain/qts";
import { saveOfflineQts } from "@/modules/qts/infrastructure/offlineStorage";

export function QtsDashboardCard({ overview }: { overview: QtsSnapshot }) {
  const today = overview.start;
  const tomorrow = shiftQtsDate(today, 1);
  const [selected, setSelected] = useState(today);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    saveOfflineQts(overview);
  }, [overview]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const activities = useMemo(
    () => overview.entries.filter((entry) => entry.date === selected).sort((a, b) => (a.startsAt ?? "99:99").localeCompare(b.startsAt ?? "99:99")),
    [overview.entries, selected],
  );
  const covered = Boolean(qtsDocumentForDate(overview.documents, selected));
  return (
    <section aria-labelledby="qts-quick-title">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/35 p-4">
          <div className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
            <div>
              <p className="section-eyebrow">Programação acadêmica</p>
              <h2 id="qts-quick-title" className="font-display text-xl font-bold">QTS</h2>
            </div>
          </div>
          <Link href="/qts" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Agenda completa <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={selected === today ? "default" : "secondary"} onClick={() => setSelected(today)}>Hoje</Button>
            <Button size="sm" variant={selected === tomorrow ? "default" : "secondary"} onClick={() => setSelected(tomorrow)}>Amanhã</Button>
            <span className="text-sm capitalize text-muted-foreground">{qtsDateLabel(selected)}</span>
          </div>
          {activities.length ? (
            <ul className="mt-3 divide-y divide-border">
              {activities.slice(0, 4).map((activity) => {
                const current = !activity.isBreak && isQtsActivityNow(activity, now);
                return (
                  <li key={activity.id} className="flex items-start gap-3 py-2.5 text-sm">
                    <span className="flex w-24 shrink-0 items-center gap-1 font-semibold tabular-nums"><Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden />{qtsTime(activity.startsAt)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5"><span className="font-semibold">{activity.activity}</span>{current && <Badge variant="success" dot>Agora</Badge>}</div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{[activity.uniform, activity.location].filter(Boolean).join(" · ")}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{covered ? "Dia de descanso ou sem atividades programadas." : "Nenhum QTS publicado para este dia."}</p>
          )}
          {activities.length > 4 && <Link href={`/qts?data=${selected}`} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Ver todas as atividades</Link>}
        </div>
      </Card>
    </section>
  );
}
