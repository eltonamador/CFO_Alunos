import {
  AcademicDashboardPage,
  type AcademicSearchParams,
} from "@/components/app/academic/AcademicDashboardPage";

export const metadata = { title: "Gestão Acadêmica" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page({ searchParams }: { searchParams: AcademicSearchParams }) {
  return <AcademicDashboardPage role="aluno" searchParams={searchParams} />;
}
