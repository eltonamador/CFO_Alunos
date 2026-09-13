import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import type { CalendarSnapshot } from "../application/calendar";
import type { ScheduleDatabase } from "./extendedDatabase";

export async function getScheduleCalendar(start: string, end: string): Promise<CalendarSnapshot> {
  const session = await getSession();
  if (!session?.active || session.isFirstAccess) throw new Error("Sessão ativa necessária.");
  const client = createSupabaseServerClient() as SupabaseClient<ScheduleDatabase>;
  const result = await client.rpc("schedule_calendar", { p_start: start, p_end: end });
  if (result.error) throw new Error("Não foi possível carregar o calendário de escalas.");
  return {
    version: 1,
    userId: session.userId,
    start,
    end,
    entries: result.data ?? [],
    savedAt: new Date().toISOString(),
  };
}
