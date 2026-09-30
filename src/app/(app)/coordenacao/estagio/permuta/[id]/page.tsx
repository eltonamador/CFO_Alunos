import { notFound } from "next/navigation";
import { requireInternshipManager } from "@/modules/internship-management/presentation/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decideInternshipChangeAction } from "@/modules/internship-management/presentation/changeApprovalActions";
import { ScalePdfLinks } from "@/modules/internship-management/presentation/ScalePdfPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Permuta de plantões — CFO Alunos" };

function date(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Belem" });
}
function time(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    timeZone: "America/Belem", hour: "2-digit", minute: "2-digit",
  });
}
function week(dateValue: string) {
  const day = new Date(`${dateValue}T12:00:00Z`);
  const monday = new Date(day);
  monday.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}

export default async function PairSwapPage({ params, searchParams }: {
  params: { id: string };
  searchParams?: { resultado?: string };
}) {
  const manager = await requireInternshipManager();
  const db = createSupabaseServerClient();
  const { data: request, error } = await db.from("internship_change_requests")
    .select("*").eq("id", params.id).maybeSingle();
  if (error || !request || request.change_type !== "permuta" || !request.other_assignment_id)
    notFound();
  const { data: assignments, error: assignmentsError } = await db.from("internship_assignments")
    .select("id,shift_id,student_id,status")
    .in("id", [request.assignment_id, request.other_assignment_id]);
  if (assignmentsError || assignments?.length !== 2)
    throw new Error("Não foi possível consultar as participações da permuta.");
  const first = assignments.find((item) => item.id === request.assignment_id)!;
  const second = assignments.find((item) => item.id === request.other_assignment_id)!;
  const shiftsResult = await db.from("internship_shifts")
    .select("id,site_id,activity_type_id,starts_at,ends_at,planned_minutes,program_id")
    .in("id", [first.shift_id, second.shift_id]);
  if (shiftsResult.error || shiftsResult.data?.length !== 2)
    throw new Error("Não foi possível consultar os plantões da permuta.");
  const firstShift = shiftsResult.data.find((item) => item.id === first.shift_id)!;
  const secondShift = shiftsResult.data.find((item) => item.id === second.shift_id)!;
  const cadetsResult = await db.rpc("internship_planning_cadets", { p_program_id: firstShift.program_id });
  if (cadetsResult.error || !cadetsResult.data)
    throw new Error("Não foi possível consultar os cadetes da permuta.");
  const firstCadet = cadetsResult.data.find((item) => item.id === first.student_id);
  const secondCadet = cadetsResult.data.find((item) => item.id === second.student_id);
  if (!firstCadet || !secondCadet) throw new Error("Cadetes da permuta indisponíveis.");
  const siteIds = [...new Set([firstShift.site_id, secondShift.site_id])];
  const [sitesResult, activitiesResult] = await Promise.all([
    db.from("internship_sites").select("id,name").in("id", siteIds),
    db.from("internship_activity_types").select("id,name")
      .in("id", [firstShift.activity_type_id, secondShift.activity_type_id]),
  ]);
  if (sitesResult.error || !sitesResult.data || activitiesResult.error || !activitiesResult.data)
    throw new Error("Não foi possível consultar os serviços da permuta.");
  const sites = sitesResult.data;
  const activities = activitiesResult.data;
  const shiftDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Belem" })
    .format(new Date(firstShift.starts_at));
  const issued = request.status === "homologada"
    ? await db.from("internship_scale_numbers")
      .select("id,gbm_site_id,period_start,period_end")
      .eq("program_id", firstShift.program_id)
      .eq("service", "gbm")
      .is("voided_at", null)
      .in("gbm_site_id", siteIds)
      .lte("period_start", shiftDate)
      .gte("period_end", shiftDate)
    : { data: [], error: null };
  if (issued.error) throw new Error("Não foi possível consultar as escalas emitidas.");
  const revisions = (issued.data ?? []).length
    ? await db.from("internship_scale_revisions")
      .select("scale_number_id,snapshot,revision")
      .in("scale_number_id", (issued.data ?? []).map((number) => number.id))
      .order("revision", { ascending: false })
    : { data: [], error: null };
  if (revisions.error) throw new Error("Não foi possível consultar as assinaturas dos PDFs.");
  const signatoryByNumber = new Map<string, "coordenador" | "supervisor">();
  for (const revision of revisions.data ?? []) {
    if (signatoryByNumber.has(revision.scale_number_id)) continue;
    const signatory = (revision.snapshot as { signatory?: string } | null)?.signatory;
    signatoryByNumber.set(revision.scale_number_id,
      signatory === "supervisor" ? "supervisor" : "coordenador");
  }
  const fallbackWeek = week(shiftDate);
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <a href={`/coordenacao/estagio/agenda?inicio=${shiftDate}&fim=${shiftDate}&situacao=ativos`}
        className="text-sm font-semibold text-primary underline">← Voltar à agenda de {date(firstShift.starts_at)}</a>
      <div>
        <h1 className="font-display text-3xl font-bold">Permuta de plantões</h1>
        <p className="text-sm text-muted-foreground">
          {request.status === "pendente" ? "A escala ainda não foi alterada."
            : request.status === "homologada" ? "Permuta homologada e escala atualizada."
              : "Permuta recusada; a escala não foi alterada."}
        </p>
      </div>
      {searchParams?.resultado === "decisao_falhou" && (
        <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          Não foi possível homologar. Um dos plantões pode ter mudado ou há conflito de serviço, impedimento ou descanso. Confira a agenda.
        </p>
      )}
      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Antes e depois</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {[
            { cadet: firstCadet, current: firstShift, next: secondShift },
            { cadet: secondCadet, current: secondShift, next: firstShift },
          ].map(({ cadet, current, next }) => {
            const delta = ((next.planned_minutes ?? 0) - (current.planned_minutes ?? 0)) / 60;
            return (
            <div key={cadet.id} className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-semibold">{String(cadet.student_number ?? "").padStart(2, "0")} · {cadet.war_name}</p>
              <p>{request.status === "homologada" ? "Antes" : "Atual"}: {activities.find((activity) => activity.id === current.activity_type_id)?.name} · {sites.find((site) => site.id === current.site_id)?.name} · {(current.planned_minutes ?? 0) / 60}h · {time(current.starts_at)}–{time(current.ends_at)}</p>
              <p className="font-medium text-primary">{request.status === "homologada" ? "Agora" : "Após homologar"}: {activities.find((activity) => activity.id === next.activity_type_id)?.name} · {sites.find((site) => site.id === next.site_id)?.name} · {(next.planned_minutes ?? 0) / 60}h · {time(next.starts_at)}–{time(next.ends_at)}</p>
              {delta !== 0 && (
                <p className="text-muted-foreground">Carga prevista: {delta > 0 ? "+" : ""}{delta}h</p>
              )}
            </div>
          ); })}
        </div>
        <p className="mt-3 text-sm">Motivo: {request.reason}</p>
      </section>
      {request.status === "pendente" && manager.role === "coordenacao" && (
        <section className="space-y-3 rounded-lg border p-4 text-sm">
          <h2 className="font-semibold">Decisão da Coordenação</h2>
          <p>Ao homologar, os dois cadetes trocam de plantão juntos. O sistema verifica disponibilidade e descanso; se houver conflito, nada muda.</p>
          <div className="flex flex-wrap items-end gap-3">
            <form action={decideInternshipChangeAction}>
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="decision" value="homologar" />
              <button type="submit" className="min-h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground">
                Homologar os dois plantões
              </button>
            </form>
            <form action={decideInternshipChangeAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="decision" value="recusar" />
              <label>Motivo da recusa
                <input name="note" required minLength={5} maxLength={500}
                  className="block h-11 rounded-md border bg-background px-3" />
              </label>
              <button type="submit" className="min-h-11 rounded-md border px-4 font-semibold">Recusar</button>
            </form>
          </div>
        </section>
      )}
      {request.status === "homologada" && (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Publicar as escalas atualizadas</h2>
          <p className="text-sm text-muted-foreground">
            Baixe os PDFs dos dois GBMs e encaminhe as versões atualizadas. Se já havia emissão
            arquivada para o mesmo período, o PDF atualizado mantém o número e registra a retificação.
            Se não havia, será a primeira emissão. Confira a assinatura antes de compartilhar.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {sites.map((site) => {
              const periods = (issued.data ?? [])
                .filter((number) => number.gbm_site_id === site.id)
                .map((number) => ({ start: number.period_start, end: number.period_end, id: number.id }));
              if (!periods.length) periods.push({ ...fallbackWeek, id: `new-${site.id}` });
              return <div key={site.id} className="space-y-3 rounded-md border p-3">
                <h3 className="font-semibold">{site.name}</h3>
                {periods.map((period) => (
                  <div key={period.id} className="space-y-2 text-sm">
                    <p>{period.start.split("-").reverse().join("/")} a {period.end.split("-").reverse().join("/")}
                      {period.id.startsWith("new-") ? " · primeira emissão" : " · escala já emitida"}</p>
                    <p className="text-xs text-muted-foreground">Assinatura: {signatoryByNumber.get(period.id) === "supervisor" ? "Supervisor do CFO" : "Coordenador do CFO"}</p>
                    <ScalePdfLinks start={period.start} end={period.end}
                      service="gbm" gbm={site} signatory={signatoryByNumber.get(period.id) ?? "coordenador"} />
                  </div>
                ))}
              </div>;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
