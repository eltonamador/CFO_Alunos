import { InstructionPanel } from "@/modules/internship-management/presentation/InstructionPanel";
import { loadInstructions } from "@/modules/internship-management/infrastructure/instructions";
import { ScalePdfPanel } from "@/modules/internship-management/presentation/ScalePdfPanel";
import { CancelPermanencePanel } from "@/modules/internship-management/presentation/CancelPermanencePanel";
import {
  RestartInternshipSchedule,
  type RestartPreview,
} from "@/modules/internship-management/presentation/RestartInternshipSchedule";
import { evaluationStatus } from "@/modules/internship-management/domain/evaluation";
import { LocationConfig } from "@/modules/internship-management/presentation/LocationConfig";
import { locationLabels } from "@/modules/internship-management/domain/attendance";
import { HomologationForm } from "@/modules/internship-management/presentation/HomologationForm";
import { WeeklyPlanningForm } from "@/modules/internship-management/presentation/WeeklyPlanningForm";
import { CadetWorkloadList } from "@/modules/internship-management/presentation/CadetWorkloadList";
import { InternshipProgress } from "@/modules/internship-management/presentation/InternshipProgress";
import { PermanenceWorkspace } from "@/modules/internship-management/presentation/PermanenceWorkspace";
import { requireInternshipManager } from "@/modules/internship-management/presentation/access";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMinutes } from "@/modules/internship-management/domain/workload";
import { AssignmentMovementForms } from "@/modules/internship-management/presentation/AssignmentMovementForms";
import { saveEvaluationWhatsAppContacts } from "@/modules/internship-management/presentation/whatsappActions";
import {
  configureCfoBeachesAction,
  initializeCfoInternshipAction,
  publishCfoInternshipAction,
} from "@/modules/internship-management/presentation/actions";

export const metadata = { title: "Estágio Supervisionado - Coordenação" };
export const dynamic = "force-dynamic";

const feedback: Record<string, string> = {
  localizacao_salva: "Localização salva para conferência dos próximos pontos.",
  localizacao_invalida: "Informe coordenadas válidas e raio entre 50 e 5.000 metros.",
  falha_localizacao: "Não foi possível salvar a localização.",
  configurado: "Programa e cinco postos de guarda-vida criados em rascunho, sem escala publicada.",
  locais_salvos: "Os cinco locais de guarda-vida foram registrados.",
  publicado: "Programa publicado. A escala pode ser planejada na próxima etapa.",
  locais_invalidos: "Informe cinco nomes distintos, com pelo menos três caracteres cada.",
  falha_configuracao: "Não foi possível criar o programa. Verifique a turma e tente novamente.",
  falha_locais: "Não foi possível salvar os locais. Verifique os dados e tente novamente.",
  falha_publicacao: "Não foi possível publicar. Confira os cinco locais de praia.",
  escala_criada: "Plantão GBM publicado para o cadete selecionado.",
  escala_invalida: "Revise o cadete, recurso, data, horário e oficial responsável pelo serviço.",
  falha_escala: "Não foi possível publicar o plantão. Verifique conflitos, capacidade e período.",
  padrao_criado: "Plantão publicado a partir do padrão operacional selecionado.",
  capacidade_padrao:
    "Este GBM já atingiu a quantidade de plantões desse serviço na data escolhida. Consulte a agenda ou escolha outro GBM ou data.",
  padrao_invalido: "Revise o padrão, GBM, cadete, data e oficial responsável pelo serviço.",
  limite_descanso:
    "Este cadete ultrapassaria três descansos de 24h em 28 dias. Escolha outro cadete ou amplie o intervalo.",
  falha_padrao:
    "Não foi possível publicar o padrão. Verifique o dia permitido, conflitos e capacidade.",
  guarda_vida_criado: "Os cinco postos de guarda-vida foram publicados para o dia selecionado.",
  guarda_vida_invalido: "Informe sábado ou domingo e cinco cadetes distintos.",
  falha_guarda_vida:
    "Não foi possível publicar o dia. Verifique o período, os impedimentos e os conflitos dos cadetes.",
  carga_homologada: "Ficha registrada e carga homologada. O histórico anterior foi preservado.",
  homologacao_invalida: "Revise horários, minutos, ficha e justificativa da carga homologada.",
  homologacao_futura:
    "O plantão ainda não foi cumprido. Horas futuras permanecem apenas previstas.",
  falha_homologacao: "Não foi possível homologar. Confira a participação e a justificativa.",
  participacao_cancelada: "Participação e turno sem ocupação cancelados com histórico.",
  cadete_substituido: "Cadete substituído no mesmo turno. A participação original foi preservada.",
  troca_solicitada:
    "Troca enviada para homologação da Coordenação. A escala permanece sem alteração.",
  troca_ja_pendente:
    "Já existe uma troca aguardando decisão para esta participação. Consulte a agenda.",
  participacao_remanejada: "Participação remanejada para o novo plantão GBM.",
  reposicao_criada: "Plantão de reposição criado e vinculado à carga parcial.",
  movimentacao_invalida: "Revise os dados e informe um motivo com pelo menos cinco caracteres.",
  falha_movimentacao:
    "Não foi possível concluir. Verifique execução existente, conflitos e capacidade.",
  whatsapp_salvo: "WhatsApp da Coordenação salvo para confirmação das avaliações.",
  whatsapp_invalido: "Informe um ou dois números distintos com +55, DDD e telefone.",
  whatsapp_falha: "Não foi possível salvar o WhatsApp da Coordenação.",
};

export default async function InternshipCoordinationPage({
  searchParams,
}: {
  searchParams?: {
    resultado?: string;
    carga?: string;
    cadete?: string;
    escala?: string;
    ajustes?: string;
  };
}) {
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
  const { data: program, error: programError } = classRow
    ? await supabase
        .from("internship_programs")
        .select("id, name, status, starts_on, ends_on, required_minutes, target_minutes")
        .eq("class_id", classRow.id)
        .eq("course_phase", "CFO I")
        .maybeSingle()
    : { data: null, error: null };

  if (programError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estágio ainda não disponível</CardTitle>
          <CardDescription>Aplique a migration 0068 no banco deste ambiente.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const { data: whatsappContacts } = program
    ? await supabase
        .from("internship_evaluation_whatsapp_contacts")
        .select("primary_phone, secondary_phone")
        .eq("program_id", program.id)
        .maybeSingle()
    : { data: null };

  const [sitesResult, coordinationWorkloadResult, shiftResult, cadetsResult, templatesResult] =
    program
      ? await Promise.all([
          supabase
            .from("internship_sites")
            .select("id, name, site_type, code")
            .eq("program_id", program.id),
          supabase.rpc("internship_coordination_workload", { p_program_id: program.id }),
          supabase
            .from("internship_shifts")
            .select("id", { count: "exact", head: true })
            .eq("program_id", program.id)
            .eq("status", "publicado"),
          supabase
            .rpc("internship_planning_cadets", { p_program_id: program.id })
            .order("student_number"),
          supabase
            .from("internship_shift_templates")
            .select(
              "id, code, name, start_weekdays, journey_minutes, includes_travel, counting_start_time, abm_departure_time, obm_arrival_time, obm_departure_time, abm_return_time, end_day_offset",
            )
            .eq("program_id", program.id)
            .eq("active", true)
            .order("code"),
        ])
      : [null, null, null, null, null];
  const instructions =
    program?.status === "publicado" ? await loadInstructions(supabase, program.id) : null;
  const resetResult =
    program?.status === "publicado" &&
    manager.role === "coordenacao" &&
    searchParams?.ajustes === "1"
      ? await supabase.rpc("internship_schedule_restart_preview", { p_program_id: program.id })
      : null;
  const resetPreview =
    !resetResult?.error && resetResult?.data ? (resetResult.data as RestartPreview) : null;
  const beaches = sitesResult?.data?.filter((site) => site.site_type === "praia") ?? [];
  const gbms = sitesResult?.data?.filter((site) => site.site_type === "gbm") ?? [];
  const { data: resources } =
    program && program.status === "publicado" && gbms.length > 0
      ? await supabase
          .from("internship_resources")
          .select("id, site_id, resource_type")
          .in(
            "site_id",
            gbms.map((site) => site.id),
          )
          .eq("active", true)
      : { data: [] };
  const workloadRows = coordinationWorkloadResult?.data ?? [];
  const validatedMinutes = workloadRows.reduce(
    (sum, row) => sum + Number(row.validated_minutes),
    0,
  );
  const concludedCount = workloadRows.filter((row) => row.concluded).length;
  const awaitingHomologation = workloadRows.reduce(
    (sum, row) => sum + Number(row.awaiting_homologation),
    0,
  );
  const selectedWorkload = workloadRows.find((row) => row.student_id === searchParams?.cadete);
  const { data: selectedAssignments } =
    program?.status === "publicado" && selectedWorkload
      ? await supabase
          .from("internship_assignments")
          .select("id, shift_id, student_id")
          .eq("student_id", selectedWorkload.student_id)
          .eq("status", "prevista")
      : { data: null };
  const selectedShiftIds = (selectedAssignments ?? []).map((assignment) => assignment.shift_id);
  const { data: recentShifts } =
    program?.status === "publicado"
      ? selectedWorkload
        ? selectedShiftIds.length > 0
          ? await supabase
              .from("internship_shifts")
              .select("id, site_id, starts_at, ends_at, planned_minutes, planned_supervisor_name")
              .in("id", selectedShiftIds)
              .eq("status", "publicado")
              .order("starts_at", { ascending: false })
          : { data: [] }
        : { data: [] }
      : { data: [] };
  const recentIds = (recentShifts ?? []).map((shift) => shift.id);
  const { data: recentAssignments } = recentIds.length
    ? selectedWorkload
      ? {
          data: (selectedAssignments ?? []).filter((assignment) =>
            recentIds.includes(assignment.shift_id),
          ),
        }
      : await supabase
          .from("internship_assignments")
          .select("id, shift_id, student_id")
          .in("shift_id", recentIds)
          .eq("status", "prevista")
    : { data: [] };
  const assignmentIds = (recentAssignments ?? []).map((assignment) => assignment.id);
  const handoverResult = assignmentIds.length
    ? await supabase
        .from("internship_handovers")
        .select("outgoing_assignment_id")
        .in("outgoing_assignment_id", assignmentIds)
    : { data: [], error: null };
  if (handoverResult.error) throw new Error("Não foi possível consultar as passagens de serviço.");
  const handedOverIds = new Set(
    (handoverResult.data ?? []).map((row) => row.outgoing_assignment_id),
  );
  const { data: evaluations } = assignmentIds.length
    ? await supabase
        .from("internship_evaluations")
        .select("id, assignment_id, status, version, evaluator_name, incident")
        .in("assignment_id", assignmentIds)
        .order("version", { ascending: false })
    : { data: [] };
  const [recordsResult, reportsResult, pointsResult] = assignmentIds.length
    ? await Promise.all([
        supabase
          .from("internship_execution_records")
          .select(
            "id, assignment_id, revision_of_id, approved_minutes, validation_status, attendance_status, actual_starts_at, actual_ends_at, supervisor_name, paper_reference, occurrence_reason, decision_reason",
          )
          .in("assignment_id", assignmentIds),
        supabase
          .from("internship_cadet_reports")
          .select("id, assignment_id, report_type, reason, reported_exit_at, reported_at")
          .in("assignment_id", assignmentIds)
          .order("reported_at", { ascending: false }),
        supabase
          .from("internship_attendance_points")
          .select("*")
          .in("assignment_id", assignmentIds)
          .order("recorded_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const { data: siteLocations } =
    searchParams?.ajustes === "1" && gbms.length
      ? await supabase
          .from("internship_site_locations")
          .select("*")
          .in(
            "site_id",
            gbms.map((site) => site.id),
          )
      : { data: [] };
  const revisedIds = new Set((recordsResult.data ?? []).map((record) => record.revision_of_id));
  const currentRecords = new Map(
    (recordsResult.data ?? [])
      .filter((record) => !revisedIds.has(record.id))
      .map((record) => [record.assignment_id, record]),
  );
  type Report = NonNullable<typeof reportsResult.data>[number];
  const reportsByAssignment = new Map<string, Report[]>();
  for (const report of reportsResult.data ?? []) {
    const existing = reportsByAssignment.get(report.assignment_id) ?? [];
    existing.push(report);
    reportsByAssignment.set(report.assignment_id, existing);
  }
  const message = searchParams?.resultado ? feedback[searchParams.resultado] : null;
  const requestedWorkloadFilter = searchParams?.carga ?? "todos";
  const workloadFilter = ["todos", "deficit", "concluidos", "pendencias"].includes(
    requestedWorkloadFilter,
  )
    ? requestedWorkloadFilter
    : "todos";
  const scale = ["gbm", "praia", "permanencia"].includes(searchParams?.escala ?? "")
    ? searchParams!.escala
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            CFO 2026.1
          </p>
          <h1 className="font-display text-3xl font-bold">Estágio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escalas, cadetes e horas em um só lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="/coordenacao/estagio/agenda" className="rounded-lg border px-3 py-3 font-medium">
            Escalas publicadas
          </a>
          <a href="/coordenacao/estagio/realizados" className="rounded-lg border px-3 py-3 font-medium">
            Plantões realizados
          </a>
          <a
            href="/coordenacao/estagio/agenda#trocas-pendentes"
            className="rounded-lg border px-3 py-3 font-medium"
          >
            Trocas para homologação
          </a>
          <a
            href="/coordenacao/estagio/relatorios"
            className="rounded-lg border px-3 py-3 font-medium"
          >
            Relatórios
          </a>
          {manager.role === "coordenacao" ? (
            <a
              href="/coordenacao/estagio/ocorrencias"
              className="rounded-lg border px-3 py-3 font-medium"
            >
              Diário de ocorrências
            </a>
          ) : null}
        </div>
      </header>
      {message && (
        <p role="status" className="rounded-lg border bg-muted p-3 text-sm">
          {message}
        </p>
      )}
      {program && (
        <details
          id="whatsapp-avaliacoes"
          className="rounded-lg border bg-card p-4"
          open={!whatsappContacts || searchParams?.resultado?.startsWith("whatsapp_")}
        >
          <summary className="cursor-pointer font-semibold">
            WhatsApp da Coordenação para avaliações
            {whatsappContacts ? " · configurado" : " · configurar"}
          </summary>
          <form action={saveEvaluationWhatsAppContacts} className="mt-3 space-y-3 text-sm">
            <input type="hidden" name="programId" value={program.id} />
            <p>
              Após enviar a ficha ao sistema, o oficial abrirá uma mensagem pronta no próprio
              WhatsApp para cada número cadastrado. A Coordenação confere o remetente e o protocolo.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="block">WhatsApp 1 · obrigatório</span>
                <input
                  name="primaryPhone"
                  type="tel"
                  required
                  defaultValue={
                    whatsappContacts?.primary_phone ? `+${whatsappContacts.primary_phone}` : ""
                  }
                  placeholder="+55 96 99999-9999"
                  className="h-11 w-full rounded-md border bg-background px-3"
                />
              </label>
              <label className="space-y-1">
                <span className="block">WhatsApp 2 · opcional</span>
                <input
                  name="secondaryPhone"
                  type="tel"
                  defaultValue={
                    whatsappContacts?.secondary_phone ? `+${whatsappContacts.secondary_phone}` : ""
                  }
                  placeholder="+55 96 99999-9999"
                  className="h-11 w-full rounded-md border bg-background px-3"
                />
              </label>
            </div>
            <Button type="submit" variant="outline">
              Salvar WhatsApps
            </Button>
          </form>
        </details>
      )}
      {!classRow ? (
        <p>Cadastre a turma CFO 2026.1 para iniciar.</p>
      ) : !program ? (
        <form action={initializeCfoInternshipAction}>
          <Button type="submit">Iniciar programa de estágio</Button>
        </form>
      ) : (
        <>
          {program.status === "rascunho" ? (
            <Card>
              <CardHeader>
                <CardTitle>Confirme os locais para começar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={configureCfoBeachesAction} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 5 }, (_, index) => (
                      <label key={index} className="text-sm">
                        Praia {index + 1}
                        <input
                          className="mt-1 h-11 w-full rounded border bg-background px-3"
                          name={`beach_${index + 1}`}
                          defaultValue={
                            beaches.find((site) => site.code === `praia_${index + 1}`)?.name ?? ""
                          }
                          required
                          minLength={3}
                          maxLength={120}
                        />
                      </label>
                    ))}
                  </div>
                  <Button type="submit" variant="outline">
                    Salvar locais
                  </Button>
                </form>
                <form action={publishCfoInternshipAction}>
                  <Button type="submit" disabled={beaches.length !== 5}>
                    Começar a criar escalas
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <>
              <section aria-label="Gerar escala" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">Qual escala você quer gerar?</h2>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                    Folga mínima de 24h · conferida ao publicar
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { id: "gbm", name: "GBM", detail: "USB e AR" },
                    { id: "praia", name: "Praia", detail: "Guarda-vidas" },
                    { id: "permanencia", name: "Dia ao 1º Ano", detail: "06h–06h · 1 a 4 apoios" },
                  ].map((item) => (
                    <a
                      key={item.id}
                      href={`/coordenacao/estagio?escala=${item.id}#nova-escala`}
                      aria-current={scale === item.id ? "page" : undefined}
                      className={`rounded-xl border p-3 text-center transition-colors sm:p-5 ${scale === item.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary hover:bg-primary/5"}`}
                    >
                      <strong className="block text-sm sm:text-lg">{item.name}</strong>
                      <span className="mt-1 block text-xs opacity-80">{item.detail}</span>
                    </a>
                  ))}
                </div>
              </section>
              {scale && (
                <section
                  id="nova-escala"
                  className="scroll-mt-24 space-y-5 rounded-xl border bg-card p-4 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">
                      {scale === "gbm"
                        ? "Gerar escala de GBM"
                        : scale === "praia"
                          ? "Gerar escala de praia"
                          : "Gerar serviço do Dia ao 1º Ano"}
                    </h2>
                    <a href="/coordenacao/estagio" className="text-sm text-primary underline">
                      Fechar
                    </a>
                  </div>
                  {scale === "permanencia" ? (
                    <PermanenceWorkspace embedded />
                  ) : (
                    <WeeklyPlanningForm
                      key={scale}
                      program={program}
                      sites={gbms}
                      templates={templatesResult?.data ?? []}
                      serviceType={scale === "praia" ? "praia" : "gbm"}
                    />
                  )}
                </section>
              )}
            </>
          )}
          {program.status === "publicado" && (
            <>
              <ScalePdfPanel startsOn={program.starts_on} endsOn={program.ends_on} gbms={gbms} />
              <CancelPermanencePanel programId={program.id} />
              {instructions && (
                <InstructionPanel
                  programId={program.id}
                  initial={instructions}
                  startsOn={program.starts_on}
                  endsOn={program.ends_on}
                />
              )}
            </>
          )}
          {!scale && (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg bg-muted/50 px-4 py-3 text-sm">
                <span>
                  <strong>{workloadRows.length}</strong> cadetes
                </span>
                <span>
                  <strong>{concludedCount}</strong> com carga concluída
                </span>
                <a href="/coordenacao/estagio/pendencias" className="text-primary">
                  <strong>{awaitingHomologation}</strong> fichas para conferir
                </a>
              </div>
              <CadetWorkloadList
                rows={workloadRows}
                initialFilter={workloadFilter}
                selectedId={selectedWorkload?.student_id}
              />
              {program.status === "publicado" && selectedWorkload && (
                <section id="fichas" className="scroll-mt-24 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">Fichas de {selectedWorkload.war_name}</h2>
                    <a
                      href="/coordenacao/estagio#cadetes"
                      className="text-sm text-primary underline"
                    >
                      Fechar ficha
                    </a>
                  </div>
                  <InternshipProgress
                    startsOn={program.starts_on}
                    endsOn={program.ends_on}
                    validatedMinutes={Number(selectedWorkload.validated_minutes)}
                    requiredMinutes={Number(selectedWorkload.required_minutes)}
                    plannedMinutes={Number(selectedWorkload.planned_minutes)}
                    shiftEnds={(recentShifts ?? []).map((shift) => shift.ends_at)}
                    now={new Date()}
                    title={`Progresso de ${selectedWorkload.war_name}`}
                  />
                  {!recentAssignments?.length && (
                    <p className="rounded border p-4 text-sm">
                      Nenhum plantão publicado para este cadete.
                    </p>
                  )}
                  {recentAssignments?.map((assignment) => {
                    const shift = recentShifts?.find((s) => s.id === assignment.shift_id);
                    if (!shift) return null;
                    const current = currentRecords.get(assignment.id);
                    const evaluation = evaluations?.find(
                      (e) => e.assignment_id === assignment.id && e.status !== "revogada",
                    );
                    const points =
                      pointsResult.data?.filter((p) => p.assignment_id === assignment.id) ?? [];
                    const reports = reportsByAssignment.get(assignment.id) ?? [];
                    const earlyExitReport = reports.find(
                      (report) =>
                        report.report_type === "saida_antecipada" && report.reported_exit_at,
                    );
                    return (
                      <details key={assignment.id} className="rounded-lg border bg-card">
                        <summary className="cursor-pointer p-4 text-sm font-medium">
                          {formatBelem(shift.starts_at)} ·{" "}
                          {sitesResult?.data?.find((site) => site.id === shift.site_id)?.name} ·{" "}
                          {formatMinutes(shift.planned_minutes ?? 0)}
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {current?.validation_status === "homologado"
                              ? "Horas confirmadas"
                              : Date.parse(shift.ends_at) > Date.now()
                                ? "Serviço previsto · abrir opções"
                                : "Conferir horas e avaliação"}
                          </span>
                        </summary>
                        <div className="space-y-4 px-4 pb-4 text-sm">
                          <p>
                            Término: {formatBelem(shift.ends_at)}
                            {current && (
                              <> · Homologadas: {formatMinutes(current.approved_minutes ?? 0)}</>
                            )}
                          </p>
                          <a
                            className="inline-flex min-h-11 items-center rounded border px-3 font-semibold text-primary"
                            href={`/coordenacao/estagio/avaliacao/${assignment.id}`}
                          >
                            Avaliação do oficial ·{" "}
                            {evaluation
                              ? evaluationStatus[evaluation.status]
                              : "abrir ou enviar link"}
                          </a>
                          {evaluation?.incident && (
                            <p className="rounded border border-amber-400 p-3">
                              Ocorrência na avaliação: {evaluation.incident}
                            </p>
                          )}
                          {(points.length > 0 || reports.length > 0) && (
                            <details className="rounded border p-3">
                              <summary className="cursor-pointer font-medium">
                                Ponto e relatos do cadete ({points.length + reports.length})
                              </summary>
                              <div className="mt-3 space-y-2">
                                {points.map((point) => (
                                  <p key={point.id}>
                                    {point.point_type === "entrada" ? "Entrada" : "Saída"}:{" "}
                                    {formatBelem(point.recorded_at)} ·{" "}
                                    {locationLabels[point.location_status] ?? point.location_status}
                                    {point.supervisor_name &&
                                      ` · Oficial responsável: ${point.supervisor_name}`}
                                  </p>
                                ))}
                                {reports.map((report) => (
                                  <p key={report.id}>
                                    {formatBelem(report.reported_at)} · {report.report_type} ·{" "}
                                    {report.reason}
                                    {report.reported_exit_at &&
                                      ` · Saída: ${formatBelem(report.reported_exit_at)}`}
                                  </p>
                                ))}
                              </div>
                            </details>
                          )}
                          <HomologationForm
                            assignmentId={assignment.id}
                            studentId={assignment.student_id}
                            startsAt={shift.starts_at}
                            endsAt={shift.ends_at}
                            plannedMinutes={shift.planned_minutes ?? 0}
                            supervisor={
                              evaluation?.status === "liberada"
                                ? evaluation.evaluator_name
                                : (current?.supervisor_name ??
                                  points.find((p) => p.supervisor_name)?.supervisor_name ??
                                  shift.planned_supervisor_name)
                            }
                            current={current}
                            evaluationReference={
                              evaluation?.status === "liberada"
                                ? `Avaliação digital ${evaluation.id} · versão ${evaluation.version}`
                                : undefined
                            }
                            evaluationStatus={evaluation?.status}
                            evaluationUrl={`/coordenacao/estagio/avaliacao/${assignment.id}`}
                            earlyExitAt={earlyExitReport?.reported_exit_at}
                            earlyExitReason={earlyExitReport?.reason}
                            now={new Date().toISOString()}
                          />
                          <details className="rounded border p-3">
                            <summary className="cursor-pointer font-medium">
                              Alterar ou cancelar plantão
                            </summary>
                            <AssignmentMovementForms
                              assignmentId={assignment.id}
                              studentId={assignment.student_id}
                              canRemap={gbms.some((site) => site.id === shift.site_id)}
                              hasExecution={!!current}
                              approvedMinutes={current?.approved_minutes ?? null}
                              plannedMinutes={shift.planned_minutes ?? 0}
                              startsOn={program.starts_on}
                              endsOn={program.ends_on}
                              startsAt={shift.starts_at}
                              endsAt={shift.ends_at}
                              handedOver={handedOverIds.has(assignment.id)}
                              resources={resources ?? []}
                              gbms={gbms}
                              cadets={cadetsResult?.data ?? []}
                              requiresApproval={manager.role !== "coordenacao"}
                            />
                          </details>
                        </div>
                      </details>
                    );
                  })}
                </section>
              )}
            </>
          )}
          <details className="rounded-lg border p-4" open={searchParams?.ajustes === "1"}>
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Configurações e outras opções
            </summary>
            <div className="mt-4 space-y-5">
              <p className="text-sm text-muted-foreground">
                {program.name} · mínimo {formatMinutes(program.required_minutes)} por cadete ·{" "}
                {shiftResult?.count ?? 0} plantões publicados · {formatMinutes(validatedMinutes)}{" "}
                homologadas na turma.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <a className="text-primary underline" href="/coordenacao/estagio?ajustes=1">
                  Locais e configurações
                </a>
                <a className="text-primary underline" href="/coordenacao/estagio/teste">
                  Demonstração de teste
                </a>
              </div>
              {searchParams?.ajustes === "1" && (
                <>
                  <LocationConfig sites={gbms} locations={siteLocations ?? []} />
                  {resetPreview && (
                    <RestartInternshipSchedule programId={program.id} preview={resetPreview} />
                  )}
                </>
              )}
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function formatBelem(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
