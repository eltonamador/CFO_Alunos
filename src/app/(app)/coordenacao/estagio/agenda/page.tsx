import { LifeguardHoursForm } from "@/modules/internship-management/presentation/LifeguardHoursForm";
import type { ReactNode } from "react";
import { requireInternshipManager } from "@/modules/internship-management/presentation/access";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { formatMinutes } from "@/modules/internship-management/domain/workload";
import {
  internshipUniforms,
  defaultInternshipUniform,
} from "@/modules/internship-management/domain/uniforms";
import { saveInternshipUniform } from "@/modules/internship-management/presentation/uniformActions";
import { LifeguardDraftFinalizeForm } from "@/modules/internship-management/presentation/LifeguardDraftFinalizeForm";
import { replaceInternshipCadetFromAgendaAction } from "@/modules/internship-management/presentation/actions";
import { HandoverForm } from "@/modules/internship-management/presentation/HandoverForm";
import { decideInternshipChangeAction } from "@/modules/internship-management/presentation/changeApprovalActions";
import { PairSwapForm } from "@/modules/internship-management/presentation/PairSwapForm";

export const metadata = { title: "Agenda do Estágio - Coordenação" };
export const dynamic = "force-dynamic";

type Filters = {
  inicio?: string;
  fim?: string;
  situacao?: string;
  modalidade?: string;
  cadete?: string;
  resultado?: string;
  permuta?: string;
};

export default async function InternshipAgendaPage({ searchParams }: { searchParams?: Filters }) {
  const manager = await requireInternshipManager();
  const supabase = createSupabaseServerClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("code", "CFO-2026")
    .maybeSingle();
  const { data: classRow } = course
    ? await supabase
        .from("classes")
        .select("id")
        .eq("course_id", course.id)
        .eq("name", "CFO 2026.1")
        .maybeSingle()
    : { data: null };
  const { data: program } = classRow
    ? await supabase
        .from("internship_programs")
        .select("id, name, starts_on, ends_on, status")
        .eq("class_id", classRow.id)
        .eq("course_phase", "CFO I")
        .maybeSingle()
    : { data: null };

  if (!program) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agenda ainda não disponível</CardTitle>
          <CardDescription>Crie o programa de estágio antes de consultar a agenda.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [scheduleResult, cadetsResult, pendingPlansResult, pendingChangesResult, decidedChangesResult] = await Promise.all([
    supabase.rpc("internship_coordination_schedule", { p_program_id: program.id }),
    supabase
      .rpc("internship_planning_cadets", { p_program_id: program.id })
      .order("student_number"),
    supabase
      .from("internship_operation_plans")
      .select("code")
      .eq("program_id", program.id)
      .eq("status", "em_definicao")
      .like("code", "guarda_vida_%"),
    supabase.from("internship_change_requests")
      .select("*")
      .eq("status", "pendente")
      .order("requested_at"),
    supabase.from("internship_change_requests")
      .select("*")
      .neq("status", "pendente")
      .order("decided_at", { ascending: false })
      .limit(10),
  ]);
  const rows = scheduleResult.data ?? [];
  const activeIds = rows.flatMap((row) => (row.assignment_id ? [row.assignment_id] : []));
  const handovers = activeIds.length
    ? await supabase
        .from("internship_handovers")
        .select("outgoing_assignment_id,incoming_assignment_id")
        .or(
          `outgoing_assignment_id.in.(${activeIds.join(",")}),incoming_assignment_id.in.(${activeIds.join(",")})`,
        )
    : { data: [], error: null };
  if (handovers.error) throw new Error("Não foi possível consultar as passagens de serviço.");
  const handedOverIds = new Set((handovers.data ?? []).map((row) => row.outgoing_assignment_id));
  const receivedIds = new Set((handovers.data ?? []).map((row) => row.incoming_assignment_id));
  const cancelledAssignmentIds = rows
    .filter((row) => row.shift_status === "cancelado" && row.assignment_status === "cancelada")
    .map((row) => row.assignment_id)
    .filter((id): id is string => Boolean(id));
  const [replacementsResult, cancellationsResult] = cancelledAssignmentIds.length
    ? await Promise.all([
        supabase
          .from("internship_assignments")
          .select("replaces_assignment_id")
          .in("replaces_assignment_id", cancelledAssignmentIds),
        supabase
          .from("internship_assignments")
          .select("id, updated_at")
          .in("id", cancelledAssignmentIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  const uniformResult = rows.length
    ? await supabase
        .from("internship_shift_uniforms")
        .select("shift_id, uniform_code")
        .in("shift_id", [...new Set(rows.map((row) => row.shift_id))])
    : { data: [], error: null };
  if (
    scheduleResult.error ||
    cadetsResult.error ||
    uniformResult.error ||
    pendingPlansResult.error ||
    pendingChangesResult.error ||
    decidedChangesResult.error ||
    replacementsResult.error ||
    cancellationsResult.error
  )
    throw Error("Não foi possível carregar a agenda operacional.");
  const alreadyReplaced = new Set(
    (replacementsResult.data ?? []).map((row) => row.replaces_assignment_id),
  );
  const now = Date.now();
  const rawFillableRows = rows.filter(
    (row) =>
      row.assignment_id &&
      row.student_id &&
      row.shift_status === "cancelado" &&
      row.assignment_status === "cancelada" &&
      Date.parse(row.starts_at) > now &&
      !alreadyReplaced.has(row.assignment_id),
  );
  const cancellationTimes = new Map(
    (cancellationsResult.data ?? []).map((row) => [row.id, row.updated_at]),
  );
  const beachVacanciesByPost = new Map<string, (typeof rows)[number]>();
  for (const row of rawFillableRows) {
    if (row.activity_code !== "guarda_vida") continue;
    const activeOnDay = rows.some(
      (other) =>
        other.shift_date === row.shift_date &&
        other.activity_code === "guarda_vida" &&
        other.shift_status === "publicado" &&
        other.assignment_status === "prevista",
    );
    const activeAtPost = rows.some(
      (other) =>
        other.shift_date === row.shift_date &&
        other.activity_code === "guarda_vida" &&
        other.site_name === row.site_name &&
        other.shift_status === "publicado" &&
        other.assignment_status === "prevista",
    );
    if (!activeOnDay || activeAtPost) continue;
    const key = `${row.shift_date}:${row.site_name}`;
    const previous = beachVacanciesByPost.get(key);
    if (
      !previous ||
      (cancellationTimes.get(row.assignment_id) ?? "") >
        (cancellationTimes.get(previous.assignment_id) ?? "")
    ) {
      beachVacanciesByPost.set(key, row);
    }
  }
  const beachVacancies = [...beachVacanciesByPost.values()];
  const fillableRows = rawFillableRows.filter(
    (row) =>
      row.activity_code !== "guarda_vida" ||
      beachVacancies.some((vacancy) => vacancy.assignment_id === row.assignment_id),
  );
  const uniformByShift = new Map(
    (uniformResult.data ?? []).map((row) => [row.shift_id, row.uniform_code]),
  );
  const requestedStart = searchParams?.inicio;
  const requestedEnd = searchParams?.fim;
  const requestedSituation = searchParams?.situacao ?? "ativos";
  const start = validDate(requestedStart) ? requestedStart : program.starts_on;
  const end = validDate(requestedEnd) ? requestedEnd : program.ends_on;
  const situation = [
    "todos",
    "ativos",
    "rascunhos",
    "pendentes",
    "homologados",
    "movimentados",
  ].includes(requestedSituation)
    ? requestedSituation
    : "ativos";
  const modality = searchParams?.modalidade ?? "todas";
  const requestedCadet = searchParams?.cadete;
  const cadetId =
    requestedCadet && (cadetsResult.data ?? []).some((cadet) => cadet.id === requestedCadet)
      ? requestedCadet
      : "todos";
  const filtered = rows.filter((row) => {
    if (row.shift_date < start || row.shift_date > end) return false;
    if (modality !== "todas" && row.activity_code !== modality) return false;
    if (cadetId !== "todos" && row.student_id !== cadetId) return false;
    const active = row.shift_status === "publicado" && row.assignment_status === "prevista";
    if (situation === "ativos") return active;
    if (situation === "rascunhos")
      return row.shift_status === "rascunho" && row.assignment_status === "prevista";
    if (situation === "pendentes") {
      return active && Date.parse(row.ends_at) <= now && row.validation_status !== "homologado";
    }
    if (situation === "homologados") return row.validation_status === "homologado";
    if (situation === "movimentados") {
      return (
        row.shift_status === "cancelado" ||
        ["cancelada", "substituida"].includes(row.assignment_status)
      );
    }
    return true;
  });
  const activeRows = filtered.filter(
    (row) => row.shift_status === "publicado" && row.assignment_status === "prevista",
  );
  const pairOptions = start === end ? rows
    .filter((row) => row.shift_date === start && row.assignment_id && row.student_id
      && row.shift_status === "publicado" && row.assignment_status === "prevista"
      && ["ar", "usb"].includes(row.activity_code) && Date.parse(row.starts_at) > now)
    .map((row) => ({
      assignmentId: row.assignment_id!, shiftDate: row.shift_date,
      cadet: `${String(row.student_number ?? "").padStart(2, "0")} · ${row.war_name}`,
      service: row.activity_name, site: row.site_name,
      startsAt: row.starts_at, endsAt: row.ends_at, minutes: row.planned_minutes,
    })) : [];
  const planned = activeRows.reduce((sum, row) => sum + row.planned_minutes, 0);
  const approved = filtered.reduce((sum, row) => sum + (row.approved_minutes ?? 0), 0);
  const pending = activeRows.filter(
    (row) => Date.parse(row.ends_at) <= now && row.validation_status !== "homologado",
  ).length;
  const modalities = Array.from(
    new Map(rows.map((row) => [row.activity_code, row.activity_name])).entries(),
  );
  const lifeguardDrafts = new Map<string, number>();
  for (const row of rows) {
    if (
      row.shift_status === "rascunho" &&
      row.activity_code === "guarda_vida" &&
      row.assignment_status === "prevista"
    ) {
      lifeguardDrafts.set(row.shift_date, (lifeguardDrafts.get(row.shift_date) ?? 0) + 1);
    }
  }
  const publishedLifeguardPlans = (pendingPlansResult.data ?? []).flatMap((plan) => {
    const match = /^guarda_vida_(\d{4})(\d{2})(\d{2})$/.exec(plan.code);
    if (!match) return [];
    const date = `${match[1]}-${match[2]}-${match[3]}`;
    const count = rows.filter(
      (row) =>
        row.shift_date === date &&
        row.activity_code === "guarda_vida" &&
        row.shift_status === "publicado" &&
        row.assignment_status === "prevista",
    ).length;
    return [{ date, count }];
  });

  const futureBeachDays = [
    ...new Set(
      activeRows
        .filter((r) => r.activity_code === "guarda_vida" && Date.parse(r.starts_at) > now)
        .map((r) => r.shift_date),
    ),
  ];
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <a
          href="/coordenacao/estagio"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          ← Voltar ao controle de carga
        </a>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          CFO 2026.1 · agenda interna do módulo
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Agenda do Estágio</h1>
        <p className="text-sm text-muted-foreground">
          Plantões, movimentações e execução em uma visão operacional própria do estágio.
        </p>
      </header>

      {searchParams?.resultado && agendaFeedback[searchParams.resultado] && (
        <p role="status" className="rounded-md border bg-muted/50 p-3 text-sm font-medium">
          {agendaFeedback[searchParams.resultado]}
        </p>
      )}

      <Card id="trocas-pendentes">
        <CardHeader>
          <CardTitle>Trocas para homologação</CardTitle>
          <CardDescription>
            As propostas não mudam a escala até a Coordenação homologar.
            Conflitos e disponibilidade são conferidos novamente na decisão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(pendingChangesResult.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma troca aguardando homologação.</p>
          )}
          {(pendingChangesResult.data ?? []).map((change) => {
            const assignment = rows.find((row) => row.assignment_id === change.assignment_id);
            const otherAssignment = rows.find((row) => row.assignment_id === change.other_assignment_id);
            const replacement = (cadetsResult.data ?? []).find((cadet) => cadet.id === change.new_student_id);
            return (
              <div key={change.id} className="space-y-2 rounded-md border p-3 text-sm">
                <p className="font-semibold">
                  {changeTypeLabel(change.change_type)} · {assignment?.war_name ?? "Participação"}
                  {change.change_type === "permuta" ? ` ↔ ${otherAssignment?.war_name ?? "outro cadete"}` : replacement ? ` → ${replacement.war_name}` : ""}
                </p>
                <p>{assignment ? `${formatDate(assignment.starts_at)} · ${assignment.site_name} · ${formatTime(assignment.starts_at)}–${formatTime(assignment.ends_at)}` : `Participação ${change.assignment_id}`}</p>
                {otherAssignment && <p>Outro plantão: {otherAssignment.activity_name} · {otherAssignment.site_name} · {formatTime(otherAssignment.starts_at)}–{formatTime(otherAssignment.ends_at)}</p>}
                {change.starts_at && <p>Novo plantão: {formatDate(change.starts_at)} · {formatTime(change.starts_at)}–{formatTime(change.ends_at ?? change.starts_at)}</p>}
                {change.handover_at && <p>Passagem informada: {formatDate(change.handover_at)} às {formatTime(change.handover_at)}</p>}
                <p>Motivo: {change.reason_kind === "saude" ? "Impedimento de saúde (sem diagnóstico)" : change.reason_details || change.reason || "Não informado"}</p>
                {change.impediment_until && <p>Impedido até: {change.impediment_until.split("-").reverse().join("/")}</p>}
                <p className="text-xs text-muted-foreground">Solicitada em {formatDate(change.requested_at)} às {formatTime(change.requested_at)}. A escala permanece vigente até a decisão.</p>
                {change.change_type === "permuta" && (
                  <a href={`/coordenacao/estagio/permuta/${change.id}`}
                    className="inline-flex min-h-11 items-center font-semibold text-primary underline">
                    Ver os dois plantões e decidir
                  </a>
                )}
                {manager.role === "coordenacao" && (
                  <div className="grid gap-2 md:grid-cols-2">
                    {change.change_type !== "permuta" && <form action={decideInternshipChangeAction}>
                      <input type="hidden" name="requestId" value={change.id} />
                      <input type="hidden" name="decision" value="homologar" />
                      <Button type="submit" size="sm">Conferir e homologar troca</Button>
                    </form>}
                    <form action={decideInternshipChangeAction} className="space-y-2">
                      <input type="hidden" name="requestId" value={change.id} />
                      <input type="hidden" name="decision" value="recusar" />
                      <input name="note" required minLength={5} maxLength={500} placeholder="Motivo da recusa" className={inputClass} />
                      <Button type="submit" size="sm" variant="outline">Recusar troca</Button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
          {(decidedChangesResult.data ?? []).length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">Últimas decisões</summary>
              <ul className="mt-2 space-y-1">
                {(decidedChangesResult.data ?? []).map((change) => (
                  <li key={change.id}>
                    {change.status === "homologada" ? "Homologada" : "Recusada"} · {changeTypeLabel(change.change_type)} · {formatDate(change.decided_at ?? change.requested_at)}
                    {change.decision_note ? ` · ${change.decision_note}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      <Card id="permuta">
        <CardHeader>
          <CardTitle>Permutar dois plantões</CardTitle>
          <CardDescription>
            Para cadetes que concordaram em trocar entre si, inclusive entre AR de 24 horas e APH de 12 horas.
            A proposta aguarda homologação da Coordenação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {start !== end ? (
            <p className="text-sm text-muted-foreground">Em “Buscar na escala”, selecione o mesmo dia em Início e Fim para escolher os dois plantões.</p>
          ) : pairOptions.length < 2 ? (
            <p className="text-sm text-muted-foreground">Não há dois plantões GBM futuros e ativos neste dia.</p>
          ) : (
            <PairSwapForm key={`${start}-${searchParams?.permuta ?? ""}`}
              options={pairOptions} initialAssignmentId={searchParams?.permuta} />
          )}
        </CardContent>
      </Card>

      {beachVacancies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vagas abertas na escala de praia</CardTitle>
            <CardDescription>
              Escolha um cadete para ocupar cada posto cancelado. A troca mantém o histórico e
              verifica impedimentos, outros serviços e 24 horas de descanso.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {beachVacancies.map((row) => (
              <div key={row.assignment_id} className="rounded-md border p-3">
                <p className="font-semibold">
                  {formatDate(row.starts_at)} · {row.site_name} · {formatTime(row.starts_at)}–
                  {formatTime(row.ends_at)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vaga de {row.war_name} · {formatMinutes(row.planned_minutes)}
                </p>
                <ReplacementCadetForm row={row} cadets={cadetsResult.data ?? []} cancelled requiresApproval={manager.role !== "coordenacao"} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <a
        href={`/api/estagio/escala?inicio=${start}&fim=${end}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground"
      >
        Imprimir escala operacional em PDF
      </a>
      <p className="text-sm text-muted-foreground">
        O PDF inclui apenas participações vigentes no período e mostra a carga de estágio homologada
        de cada cadete.
      </p>
      {rows.some(
        (row) => row.shift_status === "rascunho" && row.activity_code === "guarda_vida",
      ) && (
        <a
          href="/coordenacao/estagio/agenda?situacao=rascunhos&modalidade=guarda_vida"
          className="text-sm font-semibold text-primary underline"
        >
          Ver propostas de guarda-vidas para publicar
        </a>
      )}
      {(lifeguardDrafts.size > 0 || publishedLifeguardPlans.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Dados pendentes do guarda-vidas</CardTitle>
            <CardDescription>
              Informe o documento e o oficial quando forem definidos. As escalas já publicadas
              seguem vigentes enquanto esses dados estão pendentes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Informar documento e oficial
              </summary>
              {publishedLifeguardPlans.map(({ date, count }) => (
                <LifeguardDraftFinalizeForm
                  key={date}
                  programId={program.id}
                  shiftDate={date}
                  count={count}
                  published
                />
              ))}
              {[...lifeguardDrafts.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, count]) => (
                  <LifeguardDraftFinalizeForm
                    key={date}
                    programId={program.id}
                    shiftDate={date}
                    count={count}
                  />
                ))}
            </details>
          </CardContent>
        </Card>
      )}
      {futureBeachDays.map((date) => {
        // O ajuste é do dia inteiro, independentemente de filtro por cadete.
        const dayRows = rows.filter(
          (r) =>
            r.shift_date === date &&
            r.activity_code === "guarda_vida" &&
            r.shift_status === "publicado" &&
            r.assignment_status === "prevista",
        );
        const first = dayRows[0]!;
        if (
          dayRows.length !== 5 ||
          dayRows.some((r) => r.starts_at !== first.starts_at || r.ends_at !== first.ends_at)
        )
          return (
            <p key={date} className="rounded border p-3 text-sm">
              Para ajustar o horário de GV de {date.split("-").reverse().join("/")}, complete os
              cinco postos com o mesmo período.
            </p>
          );
        return (
          <LifeguardHoursForm
            key={date}
            programId={program.id}
            day={{
              date,
              startsAt: first.starts_at,
              endsAt: first.ends_at,
              assignmentIds: dayRows.map((r) => r.assignment_id),
              cadets: dayRows.map((r) => r.war_name),
              uniforms: dayRows.map((r) => uniformByShift.get(r.shift_id) ?? "4D"),
            }}
          />
        );
      })}
      <section className="grid gap-4 md:grid-cols-3" aria-label="Totais do recorte">
        <Metric label="Participações ativas" value={String(activeRows.length)} />
        <Metric label="Carga prevista ativa" value={formatMinutes(planned)} />
        <Metric
          label="Carga homologada"
          value={formatMinutes(approved)}
          detail={`${pending} pendentes`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Buscar na escala</CardTitle>
          <CardDescription>
            O histórico mostra também participações canceladas ou substituídas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <FilterField label="Início">
              <input type="date" name="inicio" defaultValue={start} className={inputClass} />
            </FilterField>
            <FilterField label="Fim">
              <input type="date" name="fim" defaultValue={end} className={inputClass} />
            </FilterField>
            <FilterField label="Situação">
              <select name="situacao" defaultValue={situation} className={inputClass}>
                <option value="todos">Todas</option>
                <option value="ativos">Ativas</option>
                <option value="rascunhos">Rascunhos</option>
                <option value="pendentes">Aguardando homologação</option>
                <option value="homologados">Homologadas</option>
                <option value="movimentados">Canceladas ou substituídas</option>
              </select>
            </FilterField>
            <FilterField label="Modalidade">
              <select name="modalidade" defaultValue={modality} className={inputClass}>
                <option value="todas">Todas</option>
                {modalities.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Cadete">
              <select name="cadete" defaultValue={cadetId} className={inputClass}>
                <option value="todos">Todos</option>
                {(cadetsResult.data ?? []).map((cadet) => (
                  <option key={cadet.id} value={cadet.id}>
                    {cadet.war_name} — {String(cadet.student_number ?? "").padStart(2, "0")}
                  </option>
                ))}
              </select>
            </FilterField>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5">
              <Button type="submit">Aplicar filtros</Button>
              <a
                href="/coordenacao/estagio/agenda"
                className="inline-flex h-11 items-center rounded-md border border-input bg-card px-4 text-sm font-semibold hover:bg-accent"
              >
                Limpar
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plantões e participações</CardTitle>
          <CardDescription>{filtered.length} registros no recorte selecionado.</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    {["Quando", "Serviço e local", "Cadete", "Situação", "Horas", "Opções"].map(
                      (label) => (
                        <th key={label} className="px-3 py-3">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((row) => (
                    <tr key={row.shift_id + (row.assignment_id ?? "")}>
                      <td className="px-3 py-3">
                        <p className="font-medium">{formatDate(row.starts_at)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(row.starts_at)}–{formatTime(row.ends_at)}
                          {formatDate(row.starts_at) !== formatDate(row.ends_at) && (
                            <> · até {formatDate(row.ends_at)}</>
                          )}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{row.activity_name}</p>
                        <p className="text-xs text-muted-foreground">{row.site_name}</p>
                      </td>
                      <td className="px-3 py-3">
                        {row.student_id
                          ? String(row.student_number ?? "").padStart(2, "0") + " · " + row.war_name
                          : "Sem cadete"}
                      </td>
                      <td className="px-3 py-3">{statusLabel(row)}</td>
                      <td className="px-3 py-3 tabular-nums">
                        <p>{formatMinutes(row.planned_minutes)} previstas</p>
                        <p className="text-xs text-muted-foreground">
                          {row.approved_minutes === null
                            ? "A conferir"
                            : formatMinutes(row.approved_minutes) + " homologadas"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <details>
                          <summary className="min-h-11 cursor-pointer py-3 text-primary">
                            Abrir
                          </summary>
                          <div className="min-w-52 space-y-3 pb-3 text-xs">
                            {row.student_id && row.assignment_status === "prevista" && (
                              <a
                                href={`/coordenacao/estagio?cadete=${row.student_id}#fichas`}
                                className="block font-semibold text-primary underline"
                              >
                                Ficha e horas do cadete
                              </a>
                            )}
                            {row.assignment_id &&
                              row.assignment_status === "prevista" &&
                              row.shift_status === "publicado" && (
                                <a
                                  href={`/coordenacao/estagio/avaliacao/${row.assignment_id}`}
                                  className="block font-semibold text-primary underline"
                                >
                                  Avaliação / enviar link
                                </a>
                              )}
                            <p>
                              Supervisor: {row.supervisor_name ?? "A confirmar"}
                              {row.document_reference && <> · {row.document_reference}</>}
                            </p>
                            <p>
                              {sourceLabel(row.assignment_source)}
                              {row.movement_reason && <> · {row.movement_reason}</>}
                            </p>
                            <p>
                              Horas realizadas:{" "}
                              {row.performed_minutes === null
                                ? "A conferir"
                                : formatMinutes(row.performed_minutes)}
                            </p>
                            {row.assignment_id &&
                              row.student_id &&
                              ((row.shift_status === "publicado" &&
                                row.assignment_status === "prevista" &&
                                Date.parse(row.starts_at) > now) ||
                                fillableRows.some(
                                  (vacancy) => vacancy.assignment_id === row.assignment_id,
                                )) && (
                                <ReplacementCadetForm
                                  row={row}
                                  cadets={cadetsResult.data ?? []}
                                  cancelled={row.assignment_status === "cancelada"}
                                  requiresApproval={manager.role !== "coordenacao"}
                                />
                              )}
                            {handedOverIds.has(row.assignment_id ?? "") && (
                              <p>Período individual encerrado por passagem de serviço.</p>
                            )}
                            {receivedIds.has(row.assignment_id ?? "") &&
                              !handedOverIds.has(row.assignment_id ?? "") && (
                                <p>Período individual do substituto.</p>
                              )}
                            {row.template_code &&
                              !handedOverIds.has(row.assignment_id ?? "") &&
                              !receivedIds.has(row.assignment_id ?? "") && (
                                <p>
                                  {row.abm_departure_time
                                    ? `ABM ${shortTime(row.abm_departure_time)} → OBM ${shortTime(row.obm_arrival_time)} · OBM ${shortTime(row.obm_departure_time)} → ABM ${shortTime(row.abm_return_time)}`
                                    : "Sem contagem de deslocamento"}
                                </p>
                              )}
                            {row.assignment_id &&
                              row.student_id &&
                              row.assignment_status === "prevista" &&
                              row.shift_status === "publicado" &&
                              !row.validation_status &&
                              Date.parse(row.starts_at) < now &&
                              !handedOverIds.has(row.assignment_id) && (
                                <HandoverForm
                                  assignmentId={row.assignment_id}
                                  studentId={row.student_id}
                                  startsAt={row.starts_at}
                                  endsAt={row.ends_at}
                                  now={new Date(now).toISOString()}
                                  cadets={cadetsResult.data ?? []}
                                  requiresApproval={manager.role !== "coordenacao"}
                                />
                              )}
                            {row.assignment_id && row.assignment_status === "prevista"
                              && row.shift_status === "publicado"
                              && ["ar", "usb"].includes(row.activity_code)
                              && Date.parse(row.starts_at) > now && (
                                <a className="block font-semibold text-primary underline"
                                  href={`/coordenacao/estagio/agenda?inicio=${row.shift_date}&fim=${row.shift_date}&situacao=ativos&permuta=${row.assignment_id}#permuta`}>
                                  Permutar com outro plantão
                                </a>
                              )}
                            {row.shift_status === "publicado" &&
                              row.assignment_status === "prevista" && (
                                <form action={saveInternshipUniform} className="space-y-2">
                                  <input type="hidden" name="shiftId" value={row.shift_id} />
                                  <label className="block">
                                    Uniforme
                                    <select
                                      name="uniformCode"
                                      defaultValue={
                                        uniformByShift.get(row.shift_id) ??
                                        defaultInternshipUniform(row.activity_code)
                                      }
                                      className="mt-1 min-h-11 w-full rounded border bg-background p-2"
                                    >
                                      {internshipUniforms.map((u) => (
                                        <option key={u.code} value={u.code}>
                                          {u.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <button type="submit" className="min-h-11 text-primary underline">
                                    Salvar uniforme
                                  </button>
                                </form>
                              )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const inputClass = "h-11 w-full rounded-md border border-input bg-background px-3";

const agendaFeedback: Record<string, string> = {
  permuta_invalida: "Selecione dois plantões diferentes do mesmo dia e informe o motivo.",
  permuta_falhou: "Não foi possível propor a permuta. Confira se ambos os plantões seguem futuros e disponíveis.",
  troca_solicitada: "Solicitação enviada à Coordenação. A escala permanece sem alteração até a homologação.",
  troca_ja_pendente: "Já existe uma troca aguardando decisão para esta participação.",
  troca_homologada: "Troca homologada e escala atualizada. A decisão ficou registrada.",
  troca_recusada: "Troca recusada. A escala permaneceu sem alteração.",
  decisao_invalida: "Informe um motivo de pelo menos cinco caracteres para recusar.",
  decisao_falhou: "Não foi possível homologar. Atualize a agenda e confira se a participação ainda está disponível, sem conflito.",
  troca_publicada:
    "Substituição publicada e impedimento registrado. A participação anterior permanece no histórico.",
  troca_conflito:
    "O cadete escolhido tem impedimento, outro serviço ou descanso inferior a 24 horas. Escolha outro.",
  troca_periodo:
    "Confira a data final do impedimento: ela deve cobrir o plantão e estar dentro do programa.",
  troca_falhou:
    "Não foi possível publicar a troca. Atualize a agenda e confira a situação da vaga.",
  troca_invalida:
    "Escolha outro cadete e informe o tipo de impedimento. Para outros motivos, descreva em ao menos cinco caracteres.",
};

type AgendaRow =
  Database["public"]["Functions"]["internship_coordination_schedule"]["Returns"][number];

function ReplacementCadetForm({
  row,
  cadets,
  cancelled,
  requiresApproval,
}: {
  row: AgendaRow;
  cadets: { id: string; war_name: string; student_number: number | null }[];
  cancelled: boolean;
  requiresApproval: boolean;
}) {
  if (!row.assignment_id || !row.student_id) return null;
  return (
    <details className="mt-3 rounded-md border p-3">
      <summary className="cursor-pointer font-semibold text-primary">
        {cancelled ? "Preencher vaga" : "Trocar cadete"}
      </summary>
      <form action={replaceInternshipCadetFromAgendaAction} className="mt-3 space-y-3 text-sm">
        <input type="hidden" name="assignmentId" value={row.assignment_id} />
        <input type="hidden" name="studentId" value={row.student_id} />
        <input type="hidden" name="shiftDate" value={row.shift_date} />
        <input type="hidden" name="modality" value={row.activity_code} />
        <label className="block space-y-1">
          <span className="font-medium">Cadete substituto</span>
          <select name="newStudentId" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Selecione
            </option>
            {cadets
              .filter((cadet) => cadet.id !== row.student_id)
              .map((cadet) => (
                <option key={cadet.id} value={cadet.id}>
                  {cadet.war_name} · {String(cadet.student_number ?? "").padStart(2, "0")}
                </option>
              ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-medium">Motivo da saída</span>
          <select name="reasonKind" defaultValue="" required className={inputClass}>
            <option value="" disabled>
              Selecione o motivo
            </option>
            <option value="saude">Impedimento de saúde</option>
            <option value="outro">Outro impedimento</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-medium">Se for outro motivo, descreva brevemente</span>
          <input name="reasonDetails" maxLength={400} className={inputClass} />
        </label>
        <label className="block space-y-1">
          <span className="font-medium">Impedido até</span>
          <input
            type="date"
            name="impedimentUntil"
            required
            min={lastServiceDay(row.ends_at)}
            defaultValue={lastServiceDay(row.ends_at)}
            className={inputClass}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Para saúde, não informe diagnóstico. O impedimento bloqueia novas escalas até a data
          indicada após a homologação. O sistema confere a folga antes de publicar.
        </p>
        {requiresApproval && <p className="text-xs font-medium">A solicitação não altera a escala até a Coordenação homologar.</p>}
        <Button type="submit" size="sm">
          {requiresApproval ? "Solicitar homologação" : cancelled ? "Publicar substituto" : "Confirmar troca"}
        </Button>
      </form>
    </details>
  );
}

function changeTypeLabel(value: string) {
  return ({ permuta: "Permuta entre dois cadetes", troca: "Troca de cadete", substituicao: "Substituição", remanejamento: "Remanejamento", passagem: "Passagem de serviço" } as Record<string, string>)[value] ?? "Troca";
}

function validDate(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    dateStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function lastServiceDay(endsAt: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Belem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.parse(endsAt) - 1000));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function shortTime(value: string | null) {
  return value ? value.slice(0, 5) : "—";
}

function sourceLabel(source: string | null) {
  const labels: Record<string, string> = {
    manual: "Manual",
    importacao: "Importação",
    geracao: "Geração",
    remanejamento: "Remanejamento",
    reposicao: "Reposição",
    substituicao: "Substituição",
  };
  return source ? (labels[source] ?? source) : "Sem participação";
}

function statusLabel(row: {
  shift_status: string;
  assignment_status: string | null;
  validation_status: string | null;
}) {
  if (row.shift_status === "cancelado") return "Turno cancelado";
  if (row.assignment_status === "cancelada") return "Participação cancelada";
  if (row.assignment_status === "substituida") return "Substituída";
  if (row.validation_status === "homologado") return "Homologada";
  if (row.validation_status === "pendente") return "Ficha pendente";
  return row.shift_status === "publicado" ? "Publicada" : "Rascunho";
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </CardHeader>
    </Card>
  );
}
