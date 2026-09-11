import { ScheduleTypesPage } from "@/components/app/schedules/ScheduleTypesPage";

export const metadata = { title: "Tipos de escala" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return <ScheduleTypesPage />;
}
