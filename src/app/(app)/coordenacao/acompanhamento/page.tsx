import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { buttonVariants } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { Tabs } from "@/components/ui/Tabs";
import { FollowUpList } from "@/components/app/followup/FollowUpList";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  countByStatus,
  expireDeadlines,
  listFollowUps,
} from "@/modules/cadet-followup/infrastructure/queries";
import type { FollowUpStatus } from "@/modules/cadet-followup/domain/followUp";

export const metadata = { title: "Acompanhamento" };
export const dynamic = "force-dynamic";

interface Queue {
  value: string;
  label: string;
  statuses: FollowUpStatus[];
  empty: string;
}

const DEFAULT_QUEUE: Queue = {
  value: "analise",
  label: "Análise",
  statuses: ["aguardando_analise"],
  empty: "Nenhum FO aguardando análise da Coordenação.",
};

const QUEUES: Queue[] = [
  DEFAULT_QUEUE,
  {
    value: "expirados",
    label: "Prazo expirado",
    statuses: ["prazo_expirado"],
    empty: "Nenhum prazo de manifestação vencido.",
  },
  {
    value: "manifestacao",
    label: "Manifestação",
    statuses: ["aguardando_manifestacao"],
    empty: "Nenhum FO aguardando manifestação do cadete.",
  },
  {
    value: "cumprimento",
    label: "Cumprimento",
    statuses: ["aguardando_cumprimento"],
    empty: "Nenhuma punição aguardando cumprimento.",
  },
  {
    value: "concluidos",
    label: "Concluídos",
    statuses: ["deferido", "indeferido", "concluido", "registrado", "cancelado"],
    empty: "Nenhum registro concluído ainda.",
  },
];

export default async function AcompanhamentoPage({
  searchParams,
}: {
  searchParams: { fila?: string };
}) {
  await requireRole("coordenacao");
  const supabase = createSupabaseServerClient();

  // Fecha prazos vencidos antes de montar a central (o cron faz o mesmo diariamente).
  await expireDeadlines(supabase);

  const counts = await countByStatus(supabase);
  const queue = QUEUES.find((item) => item.value === searchParams.fila) ?? DEFAULT_QUEUE;
  const items = await listFollowUps(supabase, { statuses: queue.statuses });

  const countFor = (statuses: FollowUpStatus[]) =>
    statuses.reduce((total, status) => total + (counts[status] ?? 0), 0);

  const needsAction = countFor(["aguardando_analise", "prazo_expirado"]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionEyebrow>Acompanhamento do cadete</SectionEyebrow>
          <h1 className="font-display text-2xl font-bold">Central de acompanhamento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {needsAction > 0
              ? `${needsAction} registro(s) dependem de decisão da Coordenação.`
              : "Nenhum registro dependendo da Coordenação no momento."}
          </p>
        </div>
        <Link
          href="/coordenacao/acompanhamento/novo"
          className={buttonVariants({ size: "lg", className: "shrink-0" })}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Registrar FO
        </Link>
      </header>

      <Tabs
        param="fila"
        defaultValue="analise"
        items={QUEUES.map((item) => ({
          value: item.value,
          label: `${item.label} (${countFor(item.statuses)})`,
        }))}
      />

      <FollowUpList
        items={items}
        hrefBase="/coordenacao/acompanhamento"
        emptyMessage={queue.empty}
      />
    </div>
  );
}
