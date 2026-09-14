"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AcademicActionForm, AcademicField } from "./AcademicActionForm";
import { projectedWorkload } from "@/modules/academic-management/domain/instructionJournal";
import type {
  Assignment,
  EnrollmentView,
  InstructionSession,
  SessionAttendance,
  SessionInstructor,
} from "@/modules/academic-management/application/types";
import type { UserRoleValue } from "@/shared/domain";

const statusLabel: Record<InstructionSession["status"], string> = {
  planned: "Planejada",
  proposed: "Aguardando coordenação",
  validated: "Ministrada e validada",
  cancelled: "Cancelada",
  rescheduled: "Remarcada",
  superseded: "Versão superada",
};
const attendanceLabel = {
  present: "Presente",
  justified_absence: "Falta justificada",
  unjustified_absence: "Falta injustificada",
} as const;

function dateLabel(value: string) {
  return value.split("-").reverse().join("/");
}
function hours(value: number | null) {
  return value === null ? "—" : `${value.toFixed(2).replace(".", ",")} h/a`;
}
function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Belem" }).format(new Date());
}

function ProposalForm({
  session,
  assignments,
  currentUserId,
}: {
  session: InstructionSession;
  assignments: Assignment[];
  currentUserId: string;
}) {
  const initial = assignments.filter((item) => item.profile_id === currentUserId).map((item) => item.id);
  const [selected, setSelected] = useState(initial);
  const [outcome, setOutcome] = useState<"validated" | "cancelled" | "rescheduled">("validated");
  const active = assignments.filter((item) => item.active);
  const toggle = (id: string) =>
    setSelected((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  return (
    <details className="mt-3 rounded-lg border border-border p-3">
      <summary className="cursor-pointer text-sm font-semibold">Propor execução da aula</summary>
      <div className="mt-3">
        <AcademicActionForm
          operation="propose_session"
          hidden={{ session_id: session.id, assignment_ids: JSON.stringify(selected) }}
          submitLabel="Enviar para validação"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <AcademicField label="Desfecho proposto">
              <Select value={outcome} name="outcome" onChange={(event) => setOutcome(event.target.value as typeof outcome)}>
                <option value="validated">Instrução ministrada</option>
                <option value="cancelled">Aula cancelada</option>
                <option value="rescheduled">Aula remarcada</option>
              </Select>
            </AcademicField>
            <AcademicField label="Local">
              <Input name="location" defaultValue={session.location ?? ""} />
            </AcademicField>
            <AcademicField label="Início real">
              <Input name="actual_starts_at" type="time" defaultValue={session.planned_starts_at ?? ""} required={outcome === "validated"} />
            </AcademicField>
            <AcademicField label="Término real">
              <Input name="actual_ends_at" type="time" defaultValue={session.planned_ends_at ?? ""} required={outcome === "validated"} />
            </AcademicField>
          </div>
          <AcademicField label="Conteúdo ministrado">
            <Input name="content" required={outcome === "validated"} minLength={outcome === "validated" ? 2 : undefined} />
          </AcademicField>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Instrutores participantes</legend>
            {!active.length && <p className="text-sm text-muted-foreground">Nenhum instrutor ativo designado.</p>}
            {active.map((assignment) => (
              <label key={assignment.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.includes(assignment.id)} onChange={() => toggle(assignment.id)} />
                {assignment.display_name}
              </label>
            ))}
          </fieldset>
        </AcademicActionForm>
      </div>
    </details>
  );
}

function ValidationForm({
  session,
  enrollments,
  records,
}: {
  session: InstructionSession;
  enrollments: EnrollmentView[];
  records: SessionAttendance[];
}) {
  const defaults = useMemo(
    () =>
      Object.fromEntries(
        enrollments.map((item) => [
          item.id,
          records.find((record) => record.enrollment_id === item.id)?.status ?? "present",
        ]),
      ) as Record<string, keyof typeof attendanceLabel>,
    [enrollments, records],
  );
  const [items, setItems] = useState(defaults);
  const [outcome, setOutcome] = useState<"validated" | "cancelled" | "rescheduled">(
    session.proposed_outcome,
  );
  const attendance = enrollments.map((item) => ({ enrollmentId: item.id, status: items[item.id] ?? "present" }));
  return (
    <details className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <summary className="cursor-pointer text-sm font-semibold">
        {session.status === "validated" ? "Corrigir aula e chamada" : "Validar aula e lançar chamada"}
      </summary>
      <div className="mt-3">
        <AcademicActionForm
          operation="validate_session"
          hidden={{
            session_id: session.id,
            expected_revision: session.revision,
            attendance: JSON.stringify(attendance),
          }}
          submitLabel={session.status === "validated" ? "Salvar correção" : "Validar e registrar frequência"}
        >
          <AcademicField label="Desfecho validado">
            <Select value={outcome} name="outcome" onChange={(event) => setOutcome(event.target.value as typeof outcome)}>
              <option value="validated">Instrução ministrada</option>
              <option value="cancelled">Aula cancelada</option>
              <option value="rescheduled">Aula remarcada</option>
            </Select>
          </AcademicField>
          {outcome === "validated" && (
            <div className="max-h-80 overflow-y-auto rounded border border-border">
              {enrollments.map((enrollment) => (
                <label key={enrollment.id} className="grid grid-cols-[1fr_minmax(180px,0.7fr)] items-center gap-3 border-b border-border p-2 text-sm last:border-0">
                  <span>{enrollment.student_label}</span>
                  <Select
                    value={items[enrollment.id] ?? "present"}
                    onChange={(event) =>
                      setItems((current) => ({
                        ...current,
                        [enrollment.id]: event.target.value as keyof typeof attendanceLabel,
                      }))
                    }
                  >
                    {Object.entries(attendanceLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
          )}
          <AcademicField label="Motivo ou conferência">
            <Input
              name="reason"
              minLength={session.status === "validated" ? 5 : undefined}
              required={session.status === "validated"}
              defaultValue={session.status === "validated" ? "Correção conferida pela coordenação" : "Validação da coordenação"}
            />
          </AcademicField>
        </AcademicActionForm>
      </div>
    </details>
  );
}

export function AcademicInstructionJournal({
  role,
  currentUserId,
  offeringId,
  workloadHours,
  academicYearLinked,
  sessions,
  assignments,
  enrollments,
  sessionInstructors,
  sessionAttendances,
}: {
  role: UserRoleValue;
  currentUserId: string;
  offeringId: string;
  workloadHours: number;
  academicYearLinked: boolean;
  sessions: InstructionSession[];
  assignments: Assignment[];
  enrollments: EnrollmentView[];
  sessionInstructors: SessionInstructor[];
  sessionAttendances: SessionAttendance[];
}) {
  const canManage = role === "coordenacao";
  const canPropose = role === "instrutor" || canManage;
  const todayValue = today();
  const taught = sessions
    .filter((item) => item.status === "validated")
    .reduce((total, item) => total + (item.taught_hours ?? 0), 0);
  const future = sessions
    .filter(
      (item) =>
        item.classification === "instruction" &&
        ["planned", "proposed"].includes(item.status) &&
        item.scheduled_on >= todayValue,
    )
    .reduce((total, item) => total + item.planned_hours, 0);
  const projection = projectedWorkload({
    adoptedHours: workloadHours,
    taughtHours: taught,
    scheduledFutureHours: future,
    hasAcademicYear: academicYearLinked,
    hasMappedFuturePlan: sessions.some(
      (item) =>
        item.classification === "instruction" &&
        ["planned", "proposed"].includes(item.status) &&
        item.scheduled_on >= todayValue,
    ),
  });
  const projectionText =
    projection.status === "on_track"
      ? "Planejamento cobre a carga adotada"
      : projection.status === "deficit_risk"
        ? `Déficit projetado de ${hours(projection.deficitHours)}`
        : "Dados insuficientes para projetar";

  return (
    <section className="space-y-4" aria-label="Diário de instrução e frequência">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Carga ministrada</p>
          <p className="font-display text-2xl font-bold">{hours(taught)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Planejada à frente</p>
          <p className="font-display text-2xl font-bold">{hours(future)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Situação da projeção</p>
          <p className="font-semibold">{projectionText}</p>
        </Card>
      </div>
      {!academicYearLinked && (
        <Alert>
          Esta oferta ainda não está vinculada a um calendário. As notas e o histórico permanecem disponíveis,
          mas o diário e a projeção dependem do vínculo da coordenação.
        </Alert>
      )}
      {canManage && academicYearLinked && (
        <details className="rounded-lg border border-border bg-card p-4">
          <summary className="cursor-pointer font-semibold">Criar aula manual</summary>
          <div className="mt-4">
            <AcademicActionForm operation="create_manual_session" hidden={{ offering_id: offeringId }} submitLabel="Criar aula planejada">
              <div className="grid gap-3 md:grid-cols-2">
                <AcademicField label="Data"><Input name="scheduled_on" type="date" required /></AcademicField>
                <AcademicField label="Início"><Input name="starts_at" type="time" required /></AcademicField>
                <AcademicField label="Término"><Input name="ends_at" type="time" required /></AcademicField>
                <AcademicField label="Local"><Input name="location" /></AcademicField>
                <AcademicField label="Atividade ou disciplina"><Input name="title" minLength={2} required /></AcademicField>
              </div>
              <input type="hidden" name="rescheduled_from_id" value="" />
            </AcademicActionForm>
          </div>
        </details>
      )}
      {!sessions.length ? (
        <Card className="p-4 text-sm text-muted-foreground">
          Ainda não há aulas planejadas para esta oferta. O próximo QTS vinculado ou uma aula manual aparecerá aqui.
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const instructors = sessionInstructors.filter((item) => item.session_id === session.id);
            const records = sessionAttendances.filter((item) => item.session_id === session.id);
            const ownRecord = records.find((record) =>
              enrollments.some((enrollment) => enrollment.id === record.enrollment_id),
            );
            return (
              <Card key={session.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{dateLabel(session.scheduled_on)} · {session.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.planned_starts_at ?? "—"}–{session.planned_ends_at ?? "—"} · planejada {hours(session.planned_hours)}
                      {session.taught_hours !== null ? ` · ministrada ${hours(session.taught_hours)}` : ""}
                    </p>
                  </div>
                  <Badge variant={session.status === "validated" ? "success" : session.status === "cancelled" ? "destructive" : session.status === "proposed" ? "warning" : "info"}>
                    {statusLabel[session.status]}
                  </Badge>
                </div>
                {session.content && <p className="text-sm"><strong>Conteúdo:</strong> {session.content}</p>}
                {session.location && <p className="text-sm"><strong>Local:</strong> {session.location}</p>}
                {instructors.length > 0 && (
                  <p className="text-sm"><strong>Instrutores:</strong> {instructors.map((item) => item.display_name).join(", ")}</p>
                )}
                {role === "aluno" && session.status === "validated" && (
                  <p className="text-sm">
                    <strong>Minha chamada:</strong> {ownRecord ? attendanceLabel[ownRecord.status] : "Aguardando conferência"}
                  </p>
                )}
                {canPropose && session.status === "planned" && <ProposalForm session={session} assignments={assignments} currentUserId={currentUserId} />}
                {canManage && ["proposed", "validated"].includes(session.status) && (
                  <ValidationForm session={session} enrollments={enrollments} records={records} />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
