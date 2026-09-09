import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { expireDeadlines, listFollowUps } from "@/modules/cadet-followup/infrastructure/queries";
import { DeadlineCountdown } from "./DeadlineCountdown";

/**
 * Aviso no painel do cadete quando há FO− dentro do prazo de manifestação.
 * O prazo é curto (24 h), então precisa aparecer já na primeira tela.
 */
export async function PendingFollowUpAlert({ studentId }: { studentId: string | null }) {
  if (!studentId) return null;

  const supabase = createSupabaseServerClient();
  await expireDeadlines(supabase);

  const items = await listFollowUps(supabase, {
    studentId,
    statuses: ["aguardando_manifestacao"],
  });
  if (items.length === 0) return null;

  const nearest = items.reduce((closest, item) =>
    !closest.deadlineAt || (item.deadlineAt && item.deadlineAt < closest.deadlineAt)
      ? item
      : closest,
  );

  return (
    <Link
      href="/aluno/acompanhamento"
      className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:hover:bg-red-950/60"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold text-red-800 dark:text-red-200">
          {items.length === 1
            ? "Você tem 1 FO− aguardando manifestação"
            : `Você tem ${items.length} FO− aguardando manifestação`}
        </p>
        <p className="truncate text-sm text-red-800/90 dark:text-red-200/90">
          {nearest.reasonText}
        </p>
        {nearest.deadlineAt && (
          <DeadlineCountdown deadline={nearest.deadlineAt} className="text-xs" />
        )}
      </div>
    </Link>
  );
}
