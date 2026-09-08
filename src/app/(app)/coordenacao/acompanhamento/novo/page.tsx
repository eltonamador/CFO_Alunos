import Link from "next/link";
import { requireRole } from "@/components/app/RoleGuard";
import { Card, CardContent } from "@/components/ui/Card";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { QuickFollowUpForm } from "@/components/app/followup/QuickFollowUpForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listStudents } from "@/lib/supabase/queries/students";
import { listReasonSuggestions } from "@/modules/cadet-followup/infrastructure/queries";

export const metadata = { title: "Registrar FO" };
export const dynamic = "force-dynamic";

export default async function NovoAcompanhamentoPage() {
  await requireRole("coordenacao");
  const supabase = createSupabaseServerClient();

  const [students, reasonsByKind] = await Promise.all([
    listStudents(supabase),
    listReasonSuggestions(supabase),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link
          href="/coordenacao/acompanhamento"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Central de acompanhamento
        </Link>
      </div>

      <header>
        <SectionEyebrow>Registro rápido</SectionEyebrow>
        <h1 className="font-display text-2xl font-bold">Registrar fato observado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Data, hora e responsável são preenchidos automaticamente.
        </p>
      </header>

      <Card>
        <CardContent className="p-4 pt-4 md:p-5 md:pt-5">
          <QuickFollowUpForm
            students={students.map((student) => ({
              id: student.id,
              warName: student.war_name,
              studentNumber: student.student_number,
              fullName: student.full_name,
            }))}
            reasonsByKind={reasonsByKind}
          />
        </CardContent>
      </Card>
    </div>
  );
}
