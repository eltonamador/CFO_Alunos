import { redirect } from "next/navigation";
import { ScheduleCalendar } from "@/components/app/schedules/ScheduleCalendar";
import { PushNotificationControl } from "@/components/app/PushNotificationControl";
import { getSession } from "@/modules/identity/presentation/session";
import { getScheduleCalendar } from "@/modules/schedule-repository/infrastructure/calendarQueries";
import { calendarRange, type CalendarFilter } from "@/modules/schedule-repository/domain/calendar";
import { dutyWindow } from "@/modules/schedule-repository/domain/dutyWindow";

export const metadata = { title: "Calendário de escalas" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { filtro?: string };
}) {
  const session = await getSession();
  if (!session?.active || session.isFirstAccess) redirect("/login");
  const range = calendarRange(dutyWindow().today, "month");
  const initial = await getScheduleCalendar(range.start, range.end).catch(() => null);
  const filter = ["todos", "minhas", "cadetes", "oficiais"].includes(searchParams.filtro ?? "")
    ? (searchParams.filtro as CalendarFilter)
    : "todos";
  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">Serviço e equipe</p>
        <h1 className="font-display text-2xl font-bold">Calendário de escalas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Consulte cadetes, oficiais e suas próximas atribuições.
        </p>
      </header>
      <ScheduleCalendar userId={session.userId} initial={initial} initialFilter={filter} />
      <PushNotificationControl description="Receba lembretes de serviço na véspera, entre 18h e 19h (horário de Macapá)." />
    </div>
  );
}
