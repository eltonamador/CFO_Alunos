import { requireInternshipManager } from "@/modules/internship-management/presentation/access";
import { InternshipDemo } from "@/modules/internship-management/presentation/InternshipDemo";
export const dynamic = "force-dynamic";
export const metadata = { title: "Teste do estágio", robots: { index: false, follow: false } };
export default async function InternshipDemoPage() {
  const session = await requireInternshipManager();
  return <InternshipDemo userId={session.userId} />;
}
