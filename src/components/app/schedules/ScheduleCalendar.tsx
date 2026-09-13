"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import type { CalendarSnapshot } from "@/modules/schedule-repository/application/calendar";
import {
  calendarDays,
  calendarRange,
  filterCalendar,
  moveCalendar,
  type CalendarFilter,
  type CalendarView,
} from "@/modules/schedule-repository/domain/calendar";
import { dutyWindow } from "@/modules/schedule-repository/domain/dutyWindow";
import {
  clearOfflineRoster,
  readOfflineRoster,
  saveOfflineRoster,
  setOfflineOwner,
} from "@/modules/schedule-repository/infrastructure/offlineStorage";

function dateLabel(date: string, full = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: full ? "long" : "2-digit",
    weekday: full ? "long" : "short",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function ScheduleCalendar({
  userId,
  initial,
  initialFilter = "todos",
}: {
  userId: string;
  initial: CalendarSnapshot | null;
  initialFilter?: CalendarFilter;
}) {
  const today = dutyWindow().today;
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [filter, setFilter] = useState<CalendarFilter>(initialFilter);
  const [snapshot, setSnapshot] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState<string | null>(
    initial ? null : "Não foi possível atualizar o calendário.",
  );
  const [refresh, setRefresh] = useState(0);
  const usedInitial = useRef(false);
  const range = useMemo(() => calendarRange(anchor, view), [anchor, view]);
  const days = useMemo(() => calendarDays(range.start, range.end), [range.start, range.end]);
  const entries = filterCalendar(snapshot?.entries ?? [], filter);

  useEffect(() => {
    setOfflineOwner(userId);
    if (initial) saveOfflineRoster(initial);
  }, [userId, initial]);
  useEffect(() => {
    const controller = new AbortController();
    const canUseInitial =
      !usedInitial.current &&
      refresh === 0 &&
      initial &&
      range.start === initial.start &&
      range.end === initial.end;
    usedInitial.current = true;
    if (canUseInitial) {
      setSnapshot(initial);
      setMessage(null);
      setOffline(false);
      setBusy(false);
      return;
    }
    async function load() {
      setBusy(true);
      setMessage(null);
      try {
        const response = await fetch(
          `/api/schedules/calendar?start=${range.start}&end=${range.end}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (response.status === 401) {
          clearOfflineRoster();
          setSnapshot(null);
          setOffline(false);
          setMessage("Sua sessão terminou. Entre novamente para consultar as escalas.");
          return;
        }
        if (!response.ok) throw new Error("Calendário indisponível.");
        const value = (await response.json()) as CalendarSnapshot;
        if (value.userId !== userId) {
          clearOfflineRoster();
          setSnapshot(null);
          setMessage("A conta foi alterada. Recarregue a página.");
          return;
        }
        setSnapshot(value);
        setOffline(false);
        if (!saveOfflineRoster(value))
          setMessage(
            "Calendário atualizado. Este navegador não permitiu salvar a consulta sem internet.",
          );
      } catch {
        if (controller.signal.aborted) return;
        const saved = readOfflineRoster(userId);
        if (saved && saved.start <= range.start && saved.end >= range.end) {
          setSnapshot(saved);
          setOffline(true);
        } else {
          setSnapshot(null);
          setMessage(
            "Não foi possível carregar este período e não há uma cópia salva dele. Tente novamente com conexão.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [initial, userId, range.start, range.end, refresh]);

  useEffect(() => {
    function connectionLost() {
      setOffline(true);
    }
    function connectionRestored() {
      setRefresh((value) => value + 1);
    }
    window.addEventListener("offline", connectionLost);
    window.addEventListener("online", connectionRestored);
    return () => {
      window.removeEventListener("offline", connectionLost);
      window.removeEventListener("online", connectionRestored);
    };
  }, []);

  function navigate(direction: number) {
    const next = moveCalendar(anchor, view, direction);
    setAnchor(next);
    setSelected(next);
  }
  const visibleDays = view === "week" ? days : [selected];
  return (
    <section className="space-y-4" aria-label="Calendário de escalas">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)} aria-label="Período anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p aria-live="polite" className="min-w-0 flex-1 text-center font-display text-lg font-bold">
          {view === "month"
            ? new Intl.DateTimeFormat("pt-BR", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${anchor}T12:00:00Z`))
            : `${dateLabel(range.start)} a ${dateLabel(range.end)}`}
        </p>
        <Button variant="secondary" onClick={() => navigate(1)} aria-label="Próximo período">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            setAnchor(today);
            setSelected(today);
          }}
        >
          Hoje
        </Button>
        <Select
          aria-label="Visualização"
          value={view}
          onChange={(event) => setView(event.target.value as CalendarView)}
          className="w-auto"
        >
          <option value="month">Mês</option>
          <option value="week">Semana</option>
        </Select>
        <Select
          aria-label="Filtrar escalas"
          value={filter}
          onChange={(event) => setFilter(event.target.value as CalendarFilter)}
          className="w-auto"
        >
          <option value="todos">Todos</option>
          <option value="minhas">Minhas escalas</option>
          <option value="cadetes">Cadetes</option>
          <option value="oficiais">Oficiais</option>
        </Select>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => setRefresh((value) => value + 1)}
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>
      {offline && (
        <Alert>Consulta salva no aparelho. Pode haver alterações ainda não recebidas.</Alert>
      )}
      {message && <Alert>{message}</Alert>}
      {snapshot && (
        <p className="text-xs text-muted-foreground">
          Atualizado em{" "}
          {new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "America/Belem",
          }).format(new Date(snapshot.savedAt))}{" "}
          · Horário de Macapá
        </p>
      )}
      {busy ? (
        <p role="status" className="p-6 text-center text-muted-foreground">
          Carregando escalas…
        </p>
      ) : (
        snapshot && (
          <>
            {view === "month" && (
              <div className="grid grid-cols-7 gap-1" aria-label="Dias do mês">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((name) => (
                  <span key={name} className="py-2 text-center text-xs text-muted-foreground">
                    {name}
                  </span>
                ))}
                {Array.from(
                  { length: (new Date(`${range.start}T12:00:00Z`).getUTCDay() + 6) % 7 },
                  (_, i) => (
                    <div key={`empty-${i}`} />
                  ),
                )}
                {days.map((date) => {
                  const daily = entries.filter((entry) => entry.date === date);
                  const mine = daily.some((entry) => entry.mine);
                  return (
                    <button
                      key={date}
                      onClick={() => {
                        setSelected(date);
                        setAnchor(date);
                      }}
                      aria-pressed={date === selected}
                      aria-label={`${dateLabel(date, true)}: ${daily.length} atribuições${mine ? ", você está escalado" : ""}`}
                      className={`min-h-16 rounded-lg border p-1 text-center ${date === selected ? "border-primary bg-primary/10" : "border-border bg-card"} ${date === today ? "font-bold" : ""}`}
                    >
                      <span className="block text-sm">{Number(date.slice(8))}</span>
                      {daily.length > 0 && (
                        <span
                          className={`mt-1 block text-xs ${mine ? "font-bold text-primary" : "text-muted-foreground"}`}
                        >
                          {mine ? "Você" : daily.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {visibleDays.map((date) => {
                const daily = entries.filter((entry) => entry.date === date);
                return (
                  <article key={date} className="rounded-xl border border-border bg-card p-4">
                    <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                      <CalendarDays className="h-5 w-5" />
                      {dateLabel(date, true)}
                    </h2>
                    {!daily.length && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhuma atribuição publicada com este filtro.
                      </p>
                    )}
                    <ul className="divide-y divide-border">
                      {daily.map((entry) => (
                        <li key={entry.id} className="py-3 text-sm">
                          <p className="font-semibold">
                            {entry.person}{" "}
                            {entry.mine && (
                              <span className="ml-1 rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                                Você
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-muted-foreground">{entry.duty}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entry.kind === "cadet" ? "Cadete" : "Oficial / coordenação"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </>
        )
      )}
      <a
        href="/escala-offline.html"
        className="inline-block text-sm font-semibold text-primary underline"
      >
        Abrir consulta salva no aparelho
      </a>
    </section>
  );
}
