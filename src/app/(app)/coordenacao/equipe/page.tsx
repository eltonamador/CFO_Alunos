import { requireRole } from "@/components/app/RoleGuard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { CoordinationMemberProfileLinkForm } from "@/components/app/coordination/CoordinationMemberProfileLinkForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Equipe da Coordenação" };
export const dynamic = "force-dynamic";

export default async function CoordenacaoEquipePage() {
  await requireRole("coordenacao");
  const supabase = createSupabaseServerClient();
  const [membersResult, profilesResult] = await Promise.all([
    supabase
      .from("cfo_coordination_members")
      .select(
        "id, registration, full_name, military_rank, function_name, effective_from, designation_ref, profile_id, active",
      )
      .order("active", { ascending: false })
      .order("display_order"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "coordenacao")
      .eq("active", true)
      .order("full_name"),
  ]);
  const members = membersResult.data ?? [];
  const memberIds = members.map((member) => member.id);
  const { data: auditEvents } = memberIds.length
    ? await supabase
        .from("audit_logs")
        .select("entity_id, action, created_at")
        .eq("entity", "cfo_coordination_members")
        .in("entity_id", memberIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const eventsByMember = new Map((auditEvents ?? []).map((event) => [event.entity_id, event]));
  const linkedProfileIds = new Set(
    members
      .map((member) => member.profile_id)
      .filter((profileId): profileId is string => Boolean(profileId)),
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <SectionEyebrow>CFO BM 2026 · 1º Ano</SectionEyebrow>
        <h1 className="font-display text-3xl font-bold tracking-tight">Equipe da Coordenação</h1>
        <p className="text-sm text-muted-foreground">
          Designações da Portaria nº 549, de 28 de julho de 2026, com efeitos desde 1º de junho de
          2026.
        </p>
      </header>

      {membersResult.error || profilesResult.error ? (
        <Card className="p-5 text-sm text-destructive">
          Não foi possível carregar a equipe. Verifique se a migration 0048 foi aplicada.
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {members.map((member) => {
            const availableProfiles = (profilesResult.data ?? []).filter(
              (profile) => profile.id === member.profile_id || !linkedProfileIds.has(profile.id),
            );
            const lastEvent = eventsByMember.get(member.id);
            return (
              <Card key={member.registration} className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{member.full_name}</h2>
                    <p className="text-sm text-muted-foreground">{member.military_rank}</p>
                  </div>
                  <Badge variant={member.profile_id && member.active ? "success" : "warning"}>
                    {member.profile_id && member.active
                      ? "Conta individual vinculada"
                      : "Conta pendente"}
                  </Badge>
                </div>
                <p className="font-medium">{member.function_name}</p>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Matrícula</dt>
                    <dd className="num-mono font-medium">{member.registration}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Vigência</dt>
                    <dd className="font-medium">
                      {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
                        new Date(`${member.effective_from}T00:00:00Z`),
                      )}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground">{member.designation_ref}</p>
                <CoordinationMemberProfileLinkForm
                  memberId={member.id}
                  currentProfileId={member.profile_id}
                  profiles={availableProfiles}
                />
                {lastEvent && (
                  <p className="text-xs text-muted-foreground">
                    Última alteração: {lastEvent.action} em{" "}
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "America/Belem",
                    }).format(new Date(lastEvent.created_at))}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
