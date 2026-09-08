/* eslint-disable @typescript-eslint/no-explicit-any */
import { FileUp } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatStudentLabel } from "@/modules/operational-duty/infrastructure/queries";
import { createAnnouncementAction } from "@/modules/announcements/presentation/actions";

export const metadata = { title: "Comunicados - Coordenacao" };

export default async function CoordenacaoComunicadosPage() {
  await requireRole("coordenacao");
  const supabase = createSupabaseServerClient();

  try {
    const [{ data: students }, { data: announcements }] = await Promise.all([
      supabase
        .from("students")
        .select("id, war_name, student_number")
        .eq("situation", "matriculado")
        .is("deleted_at", null)
        .order("student_number"),
      supabase
        .from("announcements")
        .select("id, title, body, audience_type, priority, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const announcementIds = (announcements ?? []).map((item: any) => item.id);
    const [{ data: reads }, { data: attachments }] = await Promise.all([
      announcementIds.length
        ? supabase.from("announcement_reads").select("announcement_id, student_id").in("announcement_id", announcementIds)
        : Promise.resolve({ data: [] }),
      announcementIds.length
        ? supabase.from("announcement_attachments").select("announcement_id, id").in("announcement_id", announcementIds)
        : Promise.resolve({ data: [] }),
    ]);
    const totalStudents = students?.length ?? 0;

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Comunicados da turma
          </p>
          <h1 className="font-display text-3xl font-bold">Comunicados</h1>
          <p className="text-sm text-muted-foreground">
            Publique avisos simples ou com materiais anexos, em estilo sala de aula digital.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Novo comunicado</CardTitle>
            <CardDescription>
              Aceita PDF, Word, Excel, imagens, videos curtos ou link externo HTTPS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createAnnouncementAction} className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="title">Titulo</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="body">Texto do comunicado</Label>
                <Textarea id="body" name="body" rows={4} placeholder="Escreva o comunicado ou uma orientacao sobre o material anexado." />
              </div>
              <div className="space-y-1.5">
                <Label>Publico</Label>
                <select name="audienceType" className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm">
                  <option value="turma">Toda a turma</option>
                  <option value="perfil">Por perfil</option>
                  <option value="individual">Alunos selecionados</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Perfil alvo, quando aplicavel</Label>
                <select name="targetRole" className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm">
                  <option value="">Nao se aplica</option>
                  <option value="aluno">Aluno</option>
                  <option value="instrutor">Instrutor</option>
                  <option value="secretaria">Secretaria</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <select name="priority" className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm">
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="externalUrl">Link externo de material</Label>
                <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://..." />
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="files">Materiais anexos</Label>
                <Input id="files" name="files" type="file" multiple />
                <p className="text-xs text-muted-foreground">
                  Limite planejado: ate 10 anexos, 20 MB para documentos/planilhas, 8 MB para imagens e 100 MB para video curto.
                </p>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>Alunos individuais, quando aplicavel</Label>
                <div className="grid max-h-52 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(students ?? []).map((student: any) => (
                    <label key={student.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="targetStudentIds" value={student.id} />
                      {formatStudentLabel(student)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2">
                <Button type="submit">
                  <FileUp className="h-4 w-4" />
                  Publicar comunicado
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comunicados publicados</CardTitle>
            <CardDescription>Leitura, pendencias e materiais vinculados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(announcements ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum comunicado publicado.</p>
            ) : (
              (announcements ?? []).map((announcement: any) => {
                const readCount = (reads ?? []).filter((read: any) => read.announcement_id === announcement.id).length;
                const attachmentCount = (attachments ?? []).filter((attachment: any) => attachment.announcement_id === announcement.id).length;
                const pending = Math.max(totalStudents - readCount, 0);

                return (
                  <div key={announcement.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-lg font-bold">{announcement.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {announcement.audience_type} - {announcement.priority} - {attachmentCount} anexos
                        </p>
                      </div>
                      <div className="rounded-md bg-secondary px-3 py-2 text-right text-xs font-semibold">
                        Lidos: {readCount} / Pendentes: {pending}
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm">{announcement.body}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
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
