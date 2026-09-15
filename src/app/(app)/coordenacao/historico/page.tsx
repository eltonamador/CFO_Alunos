import { requireRole } from "@/components/app/RoleGuard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAcademicClient } from "@/modules/academic-management/infrastructure/database";

export const metadata = { title: "Histórico de Alterações — Coordenação" };
export const dynamic = "force-dynamic";

type Source = "all" | "academic" | "schedules" | "administration";

type HistoryItem = {
  id: string;
  source: Exclude<Source, "all">;
  entity: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  reason: string | null;
  createdAt: string;
};

const ENTITY_LABEL: Record<string, string> = {
  academic_instruction_sessions: "Diário de instrução",
  academic_session_attendances: "Chamada",
  academic_years: "Calendário letivo",
  academic_calendar_events: "Evento do calendário",
  academic_qts_documents: "Vínculo de QTS",
  qts_documents: "QTS",
  qts_activities: "Atividade do QTS",
  schedule_documents: "Documento de escala",
  schedule_assignments: "Escala de serviço",
  schedule_officer_assignments: "Escala de oficiais",
  cfo_coordination_members: "Conta da equipe",
  students: "Cadastro do aluno",
  documents: "Documento de aluno",
};

const ACTION_LABEL: Record<string, string> = {
  insert: "Criado",
  update: "Atualizado",
  delete: "Removido",
  validate: "Validado",
  reject: "Recusado",
};

function sourceLabel(source: HistoryItem["source"]) {
  return source === "academic" ? "Acadêmico" : source === "schedules" ? "Escalas" : "Administração";
}

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: { fonte?: string };
}) {
  await requireRole("coordenacao");
  const source: Source = ["academic", "schedules", "administration"].includes(
    searchParams.fonte ?? "",
  )
    ? (searchParams.fonte as Source)
    : "all";
  const supabase = createSupabaseServerClient();
  const academic = createAcademicClient();

  const [administration, schedules, academicEvents] = await Promise.all([
    source === "all" || source === "administration"
      ? supabase
          .from("audit_logs")
          .select("id, entity, action, actor_id, actor_role, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(80)
      : Promise.resolve({ data: [], error: null }),
    source === "all" || source === "schedules"
      ? supabase
          .from("schedule_audit_events")
          .select("id, entity, action, actor_id, actor_role, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(80)
      : Promise.resolve({ data: [], error: null }),
    source === "all" || source === "academic"
      ? academic
          .from("academic_audit_events")
          .select("id, entity, action, actor_id, actor_name, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(80)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const items: HistoryItem[] = [
    ...(administration.data ?? []).map((event) => ({
      id: `admin-${event.id}`,
      source: "administration" as const,
      entity: event.entity,
      action: event.action,
      actorId: event.actor_id,
      actorName: null,
      actorRole: event.actor_role,
      reason: event.reason,
      createdAt: event.created_at,
    })),
    ...(schedules.data ?? []).map((event) => ({
      id: `schedule-${event.id}`,
      source: "schedules" as const,
      entity: event.entity,
      action: event.action,
      actorId: event.actor_id,
      actorName: null,
      actorRole: event.actor_role,
      reason: event.reason,
      createdAt: event.created_at,
    })),
    ...(academicEvents.data ?? []).map((event) => ({
      id: `academic-${event.id}`,
      source: "academic" as const,
      entity: event.entity,
      action: event.action,
      actorId: event.actor_id,
      actorName: event.actor_name,
      actorRole: null,
      reason: event.reason,
      createdAt: event.created_at,
    })),
  ]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 100);

  const actorIds = [
    ...new Set(items.map((item) => item.actorId).filter((id): id is string => Boolean(id))),
  ];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] };
  const namesById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

  const errors = [administration.error, schedules.error, academicEvents.error].filter(Boolean);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <SectionEyebrow>Rastreabilidade interna</SectionEyebrow>
        <h1 className="font-display text-3xl font-bold tracking-tight">Histórico de alterações</h1>
        <p className="text-sm text-muted-foreground">
          Ações recentes de QTS, diário, chamadas, escalas e administração. Informações sensíveis
          não são exibidas nesta lista.
        </p>
      </header>

      <form className="flex flex-wrap gap-2" method="GET">
        {(["all", "academic", "schedules", "administration"] as Source[]).map((option) => (
          <button
            key={option}
            name="fonte"
            value={option === "all" ? "" : option}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
              source === option
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted"
            }`}
          >
            {option === "all" ? "Tudo" : sourceLabel(option)}
          </button>
        ))}
      </form>

      {errors.length > 0 ? (
        <Card className="p-5 text-sm text-destructive">
          Não foi possível carregar uma das fontes de auditoria.
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma alteração registrada neste filtro.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">{sourceLabel(item.source)}</Badge>
                  <span className="font-semibold">{ENTITY_LABEL[item.entity] ?? item.entity}</span>
                  <span className="text-sm text-muted-foreground">
                    {ACTION_LABEL[item.action] ?? item.action}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.actorName ??
                    (item.actorId
                      ? (namesById.get(item.actorId) ?? "Conta não identificada")
                      : "Sistema")}
                  {item.actorRole ? ` · ${item.actorRole}` : ""}
                </p>
                {item.reason && <p className="text-sm">Motivo: {item.reason}</p>}
              </div>
              <time className="shrink-0 text-xs text-muted-foreground" dateTime={item.createdAt}>
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "America/Belem",
                }).format(new Date(item.createdAt))}
              </time>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
