import Link from "next/link";
import { notFound } from "next/navigation";
import { Paperclip } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { DeadlineCountdown } from "@/components/app/followup/DeadlineCountdown";
import { PunishmentBadge, StatusBadge, TypeBadge } from "@/components/app/followup/FollowUpBadges";
import { ManifestationForm } from "@/components/app/followup/ManifestationForm";
import { FollowUpTimeline } from "@/components/app/followup/FollowUpTimeline";
import { formatDateTime } from "@/components/app/followup/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { expireDeadlines, fetchFollowUp } from "@/modules/cadet-followup/infrastructure/queries";
import { FOLLOW_UP_TYPE_FULL_LABELS } from "@/modules/cadet-followup/domain/followUp";

export const metadata = { title: "Registro de acompanhamento" };
export const dynamic = "force-dynamic";

export default async function AlunoAcompanhamentoDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole("aluno");
  const supabase = createSupabaseServerClient();

  await expireDeadlines(supabase);

  const record = await fetchFollowUp(supabase, params.id);
  // A RLS já isola por cadete; a checagem abaixo é o segundo cinto de segurança.
  if (!record || record.student.id !== session.studentId) notFound();

  const attachments = await Promise.all(
    record.attachments.map(async (attachment) => {
      const { data } = await supabase.storage
        .from("followup-attachments")
        .createSignedUrl(attachment.storagePath, 60 * 10);
      return { ...attachment, url: data?.signedUrl ?? null };
    }),
  );

  const canManifest = record.status === "aguardando_manifestacao";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/aluno/acompanhamento" className="text-sm text-muted-foreground hover:underline">
          ← Meus registros
        </Link>
      </div>

      <header className="space-y-2">
        <SectionEyebrow>{FOLLOW_UP_TYPE_FULL_LABELS[record.type]}</SectionEyebrow>
        <h1 className="font-display text-2xl font-bold">{record.reasonText}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge type={record.type} />
          <StatusBadge status={record.status} />
          {record.punishment && <PunishmentBadge status={record.punishment.status} />}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Fato registrado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {record.notes && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{record.notes}</p>
          )}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Data e hora
              </dt>
              <dd className="num-mono">{formatDateTime(record.occurredAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Responsável
              </dt>
              <dd>{record.createdByName ?? "—"}</dd>
            </div>
          </dl>
          {canManifest && record.deadlineAt && (
            <DeadlineCountdown deadline={record.deadlineAt} />
          )}
          {record.status === "prazo_expirado" && (
            <p className="text-sm font-semibold text-destructive">
              Prazo encerrado — manifestação não apresentada.
            </p>
          )}
        </CardContent>
      </Card>

      {canManifest && (
        <Card>
          <CardHeader>
            <CardTitle>Sua manifestação</CardTitle>
          </CardHeader>
          <CardContent>
            <ManifestationForm recordId={record.id} />
          </CardContent>
        </Card>
      )}

      {record.manifestation && (
        <Card>
          <CardHeader>
            <CardTitle>Manifestação enviada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="whitespace-pre-wrap text-sm">{record.manifestation.body}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(record.manifestation.submittedAt)}
            </p>
            {attachments.length > 0 && (
              <ul className="space-y-1 border-t border-border pt-3">
                {attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      href={attachment.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      <Paperclip className="h-4 w-4 shrink-0" aria-hidden />
                      {attachment.originalFilename}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {record.decision && (
        <Card>
          <CardHeader>
            <CardTitle>Decisão da Coordenação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-display text-base font-bold uppercase tracking-[0.06em]">
              {record.decision.outcome === "deferido" ? "Deferido" : "Indeferido"}
            </p>
            {record.decision.rationale && (
              <p className="whitespace-pre-wrap text-muted-foreground">
                {record.decision.rationale}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {formatDateTime(record.decision.decidedAt)}
            </p>
          </CardContent>
        </Card>
      )}

      {record.punishment && (
        <Card>
          <CardHeader>
            <CardTitle>Punição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-base font-semibold">{record.punishment.punishmentText}</p>
            {record.punishment.instructions && (
              <p className="whitespace-pre-wrap text-muted-foreground">
                {record.punishment.instructions}
              </p>
            )}
            <PunishmentBadge status={record.punishment.status} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <FollowUpTimeline events={record.events} />
        </CardContent>
      </Card>
    </div>
  );
}
