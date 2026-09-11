import Link from "next/link";
import { Download, FileText, Settings } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { Select } from "@/components/ui/Select";
import type { UserRoleValue } from "@/shared/domain";
import type { ScheduleFilters } from "@/modules/schedule-repository/application/types";
import {
  getScheduleRepository,
  ScheduleRepositoryError,
} from "@/modules/schedule-repository/infrastructure/queries";
import { cn } from "@/lib/utils";
import { ScheduleFinalizeButton } from "./ScheduleFinalizeButton";
import { ScheduleUploadForm } from "./ScheduleUploadForm";
import { ScheduleProcessingStatus } from "./ScheduleProcessingStatus";

const publicationLabel: Record<string, string> = {
  reserved: "Aguardando confirmação",
  published: "Publicado",
  upload_failed: "Falha no upload",
};

function formatDate(value: string | null) {
  if (!value) return "não informada";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
    : `${Math.max(1, Math.round(bytes / 1024))} KiB`;
}

function publicationVariant(status: string) {
  if (status === "published") return "success" as const;
  if (status === "upload_failed") return "destructive" as const;
  return "warning" as const;
}

export async function ScheduleRepositoryPage({
  role,
  searchParams,
}: {
  role: Extract<UserRoleValue, "coordenacao" | "instrutor" | "aluno">;
  searchParams: ScheduleFilters;
}) {
  await requireRole(role);
  let data;
  try {
    data = await getScheduleRepository(searchParams);
  } catch (error) {
    return (
      <Alert variant="destructive">
        {error instanceof ScheduleRepositoryError
          ? error.message
          : "Não foi possível carregar as escalas."}
      </Alert>
    );
  }
  const canManage = role === "coordenacao";
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionEyebrow>Repositório institucional</SectionEyebrow>
          <h1 className="font-display text-2xl font-bold">Escalas em PDF</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publicações oficiais preservadas por turma, tipo e período de vigência.
          </p>
        </div>
        {canManage && (
          <Link
            href="/coordenacao/escalas/tipos"
            className={cn(buttonVariants({ variant: "secondary" }), "min-h-11")}
          >
            <Settings className="h-4 w-4" />
            Tipos de escala
          </Link>
        )}
      </header>

      {canManage && (
        <details
          className="rounded-lg border border-border bg-card p-4"
          open={!data.documents.length}
        >
          <summary className="cursor-pointer font-display text-lg font-semibold">
            Publicar nova escala
          </summary>
          <div className="mt-4">
            <ScheduleUploadForm
              classes={data.classes}
              types={data.types}
              documents={data.documents}
            />
          </div>
        </details>
      )}

      <form
        method="get"
        className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-5"
      >
        <label className="space-y-1 text-sm font-medium">
          <span>Turma</span>
          <Select name="turma" defaultValue={searchParams.turma ?? ""}>
            <option value="">Todas</option>
            {data.classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Tipo</span>
          <Select name="tipo" defaultValue={searchParams.tipo ?? ""}>
            <option value="">Todos</option>
            {data.types.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </label>
        {canManage && (
          <label className="space-y-1 text-sm font-medium">
            <span>Situação</span>
            <Select name="situacao" defaultValue={searchParams.situacao ?? ""}>
              <option value="">Todas</option>
              <option value="published">Publicado</option>
              <option value="reserved">Aguardando confirmação</option>
              <option value="upload_failed">Falha no upload</option>
            </Select>
          </label>
        )}
        <label className="space-y-1 text-sm font-medium">
          <span>Vigente a partir de</span>
          <Input name="inicio" type="date" defaultValue={searchParams.inicio ?? ""} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Vigente até</span>
          <Input name="fim" type="date" defaultValue={searchParams.fim ?? ""} />
        </label>
        <button className={cn(buttonVariants({ variant: "secondary" }), "md:col-span-5 md:w-fit")}>
          Aplicar filtros
        </button>
      </form>

      <section className="space-y-3" aria-labelledby="schedule-list">
        <div className="flex items-center justify-between gap-3">
          <h2 id="schedule-list" className="font-display text-xl font-semibold">
            Publicações
          </h2>
          <p className="text-sm text-muted-foreground">{data.documents.length} documento(s)</p>
        </div>
        {!data.documents.length && (
          <Card className="p-6 text-sm text-muted-foreground">
            Nenhuma escala encontrada com os filtros informados.
          </Card>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {data.documents.map((document) => (
            <Card key={document.id} className="space-y-4 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <FileText className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={publicationVariant(document.publication_status)}>
                      {publicationLabel[document.publication_status] ?? document.publication_status}
                    </Badge>
                    {document.processing_status === "superseded" && (
                      <Badge variant="outline">Versão superada</Badge>
                    )}
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold">
                    {document.schedule_type_name}
                  </h3>
                  <p className="truncate text-sm text-muted-foreground">
                    {document.original_filename}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Turma</dt>
                  <dd className="font-medium">{document.class_name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tamanho</dt>
                  <dd className="font-medium">{formatBytes(document.size_bytes)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Vigência</dt>
                  <dd className="font-medium">
                    {formatDate(document.period_start)} a {formatDate(document.period_end)}
                  </dd>
                </div>
              </dl>
              {document.download_url && (
                <a
                  href={document.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-fit")}
                >
                  <Download className="h-4 w-4" />
                  Abrir PDF
                </a>
              )}
              {canManage && document.publication_status === "reserved" && (
                <ScheduleFinalizeButton documentId={document.id} />
              )}
              {canManage && document.publication_status === "published" && (
                <ScheduleProcessingStatus document={document} />
              )}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
