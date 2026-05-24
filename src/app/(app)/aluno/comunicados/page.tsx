/* eslint-disable @typescript-eslint/no-explicit-any */
import { CheckCircle2, Download, ExternalLink } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import { confirmAnnouncementReadAction } from "@/modules/announcements/presentation/actions";

export const metadata = { title: "Comunicados - Aluno" };

export default async function AlunoComunicadosPage() {
  const session = await requireRole("aluno");
  const supabase = createServerClientUntyped();

  try {
    const { data: announcements } = await supabase
      .from("announcements")
      .select("id, title, body, priority, created_at")
      .eq("status", "publicado")
      .order("created_at", { ascending: false });

    const ids = (announcements ?? []).map((item: any) => item.id);
    const [{ data: reads }, { data: attachments }] = await Promise.all([
      ids.length
        ? supabase.from("announcement_reads").select("announcement_id").eq("student_id", session.studentId).in("announcement_id", ids)
        : Promise.resolve({ data: [] }),
      ids.length
        ? supabase
            .from("announcement_attachments")
            .select("id, announcement_id, storage_path, external_url, original_filename, attachment_type")
            .in("announcement_id", ids)
            .order("sort_order")
        : Promise.resolve({ data: [] }),
    ]);

    const readIds = new Set((reads ?? []).map((read: any) => read.announcement_id));
    const attachmentsWithUrls = await Promise.all(
      (attachments ?? []).map(async (attachment: any) => {
        if (!attachment.storage_path) return { ...attachment, url: attachment.external_url };
        const { data } = await supabase.storage
          .from("announcement-attachments")
          .createSignedUrl(attachment.storage_path, 60 * 10);
        return { ...attachment, url: data?.signedUrl ?? null };
      }),
    );

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Comunicados da turma
          </p>
          <h1 className="font-display text-3xl font-bold">Comunicados</h1>
          <p className="text-sm text-muted-foreground">
            Leia avisos oficiais, baixe materiais e confirme ciencia.
          </p>
        </header>

        {(announcements ?? []).length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum comunicado publicado</CardTitle>
              <CardDescription>Quando a Coordenacao publicar algo, aparecera aqui.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          (announcements ?? []).map((announcement: any) => {
            const isRead = readIds.has(announcement.id);
            const currentAttachments = attachmentsWithUrls.filter(
              (attachment: any) => attachment.announcement_id === announcement.id,
            );

            return (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{announcement.title}</CardTitle>
                      <CardDescription>{announcement.priority}</CardDescription>
                    </div>
                    {isRead && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Lido
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-wrap text-sm">{announcement.body}</p>
                  {currentAttachments.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {currentAttachments.map((attachment: any) => (
                        <a
                          key={attachment.id}
                          href={attachment.url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm hover:bg-secondary"
                        >
                          <span className="truncate">{attachment.original_filename}</span>
                          {attachment.external_url ? (
                            <ExternalLink className="h-4 w-4 shrink-0" />
                          ) : (
                            <Download className="h-4 w-4 shrink-0" />
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                  {!isRead && (
                    <form action={confirmAnnouncementReadAction}>
                      <input type="hidden" name="announcementId" value={announcement.id} />
                      <Button type="submit" variant="success" size="sm">
                        Confirmar leitura
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  } catch (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Modulo de comunicados pendente de banco</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : "Aplique a migration 0022 para habilitar comunicados."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
}
