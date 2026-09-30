import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardInternshipRow = {
  assignment_id: string;
  student_id: string;
  student_number: number;
  war_name: string;
  activity_name: string;
  site_name: string;
  resource_name: string;
  starts_at: string;
  ends_at: string;
  uniform_code: string;
  validated_minutes: number;
};
function belemDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Belem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (name: string) => parts.find((value) => value.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function addDays(day: string, count: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export async function getDashboardInternshipSchedule(): Promise<{
  from: string;
  to: string;
  rows: DashboardInternshipRow[];
  unavailable: boolean;
}> {
  noStore();
  const from = belemDay(new Date());
  const to = addDays(from, 6);
  const { data, error } = await createSupabaseServerClient().rpc("internship_dashboard_schedule", {
    p_from: from,
    p_to: to,
  });
  return { from, to, rows: (data ?? []) as DashboardInternshipRow[], unavailable: Boolean(error) };
}
