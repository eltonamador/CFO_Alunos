import { AcademicDetailPage } from "@/components/app/academic/AcademicDetailPage";

export const metadata = { title: "Disciplina e Notas" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; cadete?: string };
}) {
  return <AcademicDetailPage role="aluno" id={params.id} searchParams={searchParams} />;
}
