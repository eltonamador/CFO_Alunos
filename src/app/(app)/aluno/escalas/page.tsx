import { ScheduleRepositoryPage } from "@/components/app/schedules/ScheduleRepositoryPage";
import type { ScheduleFilters } from "@/modules/schedule-repository/application/types";

export const metadata = { title: "Escalas em PDF" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page({ searchParams }: { searchParams: ScheduleFilters }) {
  return <ScheduleRepositoryPage role="aluno" searchParams={searchParams} />;
}
