import { requireRole } from "@/components/app/RoleGuard";
import { Alert } from "@/components/ui/Alert";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { FollowUpList } from "@/components/app/followup/FollowUpList";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import { expireDeadlines, listFollowUps } from "@/modules/cadet-followup/infrastructure/queries";

export const metadata = { title: "Acompanhamento" };
export const dynamic = "force-dynamic";

export default async function AlunoAcompanhamentoPage() {
  const session = await requireRole("aluno");
  const supabase = createServerClientUntyped();

  await expireDeadlines(supabase);

  const items = await listFollowUps(supabase, { studentId: session.studentId ?? undefined });
  const pending = items.filter((item) => item.status === "aguardando_manifestacao");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <SectionEyebrow>Acompanhamento</SectionEyebrow>
        <h1 className="font-display text-2xl font-bold">Meus registros</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fatos observados e demais registros do seu acompanhamento no curso.
        </p>
      </header>

      {pending.length > 0 && (
        <Alert variant="destructive">
          Você tem {pending.length} FO− aguardando manifestação. O prazo é de 24 horas.
        </Alert>
      )}

      <FollowUpList
        items={items}
        hrefBase="/aluno/acompanhamento"
        hideStudent
        emptyMessage="Nenhum registro no seu acompanhamento."
      />
    </div>
  );
}
