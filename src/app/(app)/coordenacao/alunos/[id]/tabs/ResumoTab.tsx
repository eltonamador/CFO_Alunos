"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import {
  updateStudentAdminAction,
  updateCourseStatusAction,
  updateEnrollmentStatusAction,
} from "@/modules/student-profile/presentation/actions/studentActions";
import { Badge } from "@/components/ui/Badge";
import type {
  StudentDetailRow,
  StudentContactRow,
  StudentAddressRow,
  StudentCanga,
  StudentListRow,
} from "@/lib/supabase/queries/students";

const MILITARY_BRANCH_LABELS: Record<string, string> = {
  corpo_de_bombeiros_militar: "Corpo de Bombeiros Militar",
  policia_militar: "Polícia Militar",
  forcas_armadas: "Forças Armadas",
  outra: "Outra",
};

const COURSE_STATUS_LABELS: Record<StudentDetailRow["course_status"], string> = {
  matriculado: "Matriculado",
  excluido: "Excluído",
  trancado: "Trancado",
  desistente: "Desistente",
  transferido: "Transferido",
  concluido: "Concluído",
  outro: "Outro",
};

function formatDateBR(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatBirthDateWithAge(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  const now = new Date();
  let age = now.getFullYear() - year;
  const m = now.getMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getUTCDate())) age--;
  const ageStr = age >= 0 && age < 130 ? ` (${age} anos)` : "";
  return `${day}/${month}/${year}${ageStr}`;
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className={`text-sm font-medium text-foreground ${mono ? "num-mono" : ""}`}>
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

interface Props {
  student: StudentDetailRow;
  contact: StudentContactRow | null;
  address: StudentAddressRow | null;
  canga: StudentCanga | null;
  allStudents: StudentListRow[];
  sessionRole: string;
}

export function ResumoTab({
  student,
  contact,
  address,
  canga,
  allStudents,
  sessionRole,
}: Props) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [state, formAction] = useFormState(updateStudentAdminAction, null);

  const canEditAdmin = sessionRole === "coordenacao";

  React.useEffect(() => {
    if (state?.ok) {
      setIsEditing(false);
    }
  }, [state]);

  // Filtra outros alunos para a lista de cangas
  const cangaOptions = React.useMemo(() => {
    return (allStudents ?? [])
      .filter((s) => s.id !== student.id)
      .sort((a, b) => (a.student_number ?? 99) - (b.student_number ?? 99));
  }, [allStudents, student.id]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Identificação</CardTitle>
          {canEditAdmin && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs text-primary hover:text-primary/80"
            >
              Editar admin
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="studentId" value={student.id} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome completo</Label>
                  <p className="py-2 text-sm font-medium text-muted-foreground bg-muted/20 px-2 rounded">
                    {student.full_name}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Nome de guerra</Label>
                  <p className="py-2 text-sm font-medium text-muted-foreground bg-muted/20 px-2 rounded">
                    {student.war_name}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="studentNumber">Número</Label>
                  <Input
                    id="studentNumber"
                    name="studentNumber"
                    type="number"
                    defaultValue={student.student_number ?? ""}
                    min={1}
                    max={100}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pelotao">Fase do CFO</Label>
                  <Select id="pelotao" name="pelotao" defaultValue={student.pelotao ?? "CFO I"}>
                    <option value="CFO I">CFO I</option>
                    <option value="CFO II">CFO II</option>
                    <option value="CFO III">CFO III</option>
                  </Select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="cangaStudentId">Canga</Label>
                  <Select id="cangaStudentId" name="cangaStudentId" defaultValue={canga?.canga_id ?? ""}>
                    <option value="">Nenhum canga atribuído</option>
                    {cangaOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.student_number ? String(s.student_number).padStart(2, "0") : "—"} — {s.war_name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="coordinationNotes">Observações sobre o cadete</Label>
                  <Textarea
                    id="coordinationNotes"
                    name="coordinationNotes"
                    defaultValue={student.coordination_notes ?? ""}
                    rows={3}
                    maxLength={2000}
                    placeholder="Anotações da coordenação sobre o cadete (texto livre)."
                  />
                </div>
              </div>

              {state?.ok === false && (
                <Alert variant="destructive" className="mt-2 text-xs py-2 px-3">
                  {state.error}
                </Alert>
              )}

              <div className="flex gap-2 pt-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancelar
                </Button>
                <SubmitButton />
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Nome completo" value={student.full_name} />
              </div>
              <Field label="Nome de guerra" value={student.war_name} />
              <Field
                label="Número"
                mono
                value={student.student_number ? String(student.student_number).padStart(2, "0") : null}
              />
              <Field
                label="Sexo"
                value={student.sex === "M" ? "Masculino" : student.sex === "F" ? "Feminino" : null}
              />
              <Field label="Data de nasc." value={formatBirthDateWithAge(student.birth_date)} mono />
              <Field label="Fase do CFO" value={student.pelotao} />
              <Field
                label="Canga"
                value={
                  canga
                    ? `(${canga.canga_number ? String(canga.canga_number).padStart(2, "0") : "—"}) ${canga.canga_war_name}`
                    : "Não atribuído"
                }
              />
              <div className="space-y-0.5">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Matrícula
                </dt>
                <dd className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  <span className="num-mono">
                    {student.enrollment_id ?? <span className="text-muted-foreground">—</span>}
                  </span>
                  {formatDateBR(student.enrollment_date) && (
                    <Badge variant="success" dot>
                      Incluído em {formatDateBR(student.enrollment_date)}
                    </Badge>
                  )}
                </dd>
              </div>
              <Field label="Situação no curso" value={COURSE_STATUS_LABELS[student.course_status]} />
              {canEditAdmin && student.coordination_notes && (
                <div className="col-span-2">
                  <Field label="Observações (coordenação)" value={student.coordination_notes} />
                </div>
              )}
            </dl>
          )}
          {canEditAdmin && (
            <CourseStatusControl
              studentId={student.id}
              currentStatus={student.course_status}
            />
          )}
          {canEditAdmin && (
            <EnrollmentStatusControl
              studentId={student.id}
              currentStatus={student.enrollment_status}
              currentEnrollmentId={student.enrollment_id}
              currentEnrollmentDate={student.enrollment_date}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contato (principal)</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            <Field label="WhatsApp" value={contact?.whatsapp} />
            <Field label="Telefone sec." value={contact?.phone_secondary} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            <Field label="Rua" value={address?.street} />
            <Field label="Bairro" value={address?.district} />
            <Field label="Cidade" value={address?.city} />
            <Field label="UF" value={address?.state} />
            <Field label="CEP" value={address?.zip} />
            <Field label="Vem de outro estado?" value={address?.from_other_state ? "Sim" : "Não"} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Documentos pessoais</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            <Field label="CPF" value={student.cpf} mono />
            <Field label="RG" value={student.rg} mono />
            <Field label="PIS" value={student.pis} mono />
            <Field label="Título eleitoral" value={student.voter_id} mono />
            <Field label="Zona eleitoral" value={student.voter_zone} mono />
            <Field label="Seção eleitoral" value={student.voter_section} mono />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Experiência militar anterior</CardTitle></CardHeader>
        <CardContent>
          {student.had_prior_military_service == null ? (
            <p className="text-sm text-muted-foreground">Não informado.</p>
          ) : student.had_prior_military_service === false ? (
            <p className="text-sm font-medium text-foreground">
              Nunca foi militar antes do CFO.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-3">
              <Field
                label="Instituição/Força"
                value={MILITARY_BRANCH_LABELS[student.prior_military_branch ?? ""] ?? null}
              />
              <Field label="Corporação" value={student.prior_military_institution} />
              <Field label="Posto/Graduação" value={student.prior_military_rank} />
              <Field label="Tempo de serviço" value={student.prior_military_duration} />
              {student.prior_military_notes && (
                <div className="col-span-2">
                  <Field label="Observações" value={student.prior_military_notes} />
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Especialização operacional / estágio</CardTitle></CardHeader>
        <CardContent>
          {student.has_specialization == null ? (
            <p className="text-sm text-muted-foreground">Não informado.</p>
          ) : student.has_specialization === false ? (
            <p className="text-sm font-medium text-foreground">
              Não possui curso de especialização operacional ou estágio.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Curso/Estágio" value={student.specialization_name} />
              </div>
              <Field label="Instituição" value={student.specialization_institution} />
              <Field label="Ano/Período" value={student.specialization_period} />
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            <Field label="Nacionalidade" value={student.nationality} />
            <Field label="Estado civil" value={student.marital_status} />
            <Field label="Cônjuge/companheiro(a)" value={student.spouse_name} />
            <Field label="Naturalidade" value={
              student.naturality_city && student.naturality_state
                ? `${student.naturality_city} / ${student.naturality_state}`
                : (student.naturality_city ?? student.naturality_state)
            } />
            <Field label="Nome do pai" value={student.father_name} />
            <Field label="Nome da mãe" value={student.mother_name} />
            <Field label="Escolaridade" value={student.education_level} />
            <Field label="Graduação" value={student.graduation_name} />
            <div className="col-span-2">
              <Field label="Experiência profissional" value={student.professional_experience} />
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function CourseStatusControl({
  studentId,
  currentStatus,
}: {
  studentId: string;
  currentStatus: StudentDetailRow["course_status"];
}) {
  const [state, formAction] = useFormState(updateCourseStatusAction, null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Alterar situação no curso
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <input type="hidden" name="studentId" value={studentId} />
      <div className="space-y-1">
        <Label htmlFor="course_status">Situação no curso</Label>
        <Select id="course_status" name="course_status" defaultValue={currentStatus}>
          {Object.entries(COURSE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {state?.ok === false && (
        <Alert variant="destructive" className="text-xs py-2 px-3">
          {state.error}
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// Controle inline de status da matrícula (somente Coordenação).
// ---------------------------------------------------------------------
function EnrollmentStatusControl({
  studentId,
  currentStatus,
  currentEnrollmentId,
  currentEnrollmentDate,
}: {
  studentId: string;
  currentStatus: "pendente" | "confirmada";
  currentEnrollmentId: string | null;
  currentEnrollmentDate: string | null;
}) {
  const [state, formAction] = useFormState(updateEnrollmentStatusAction, null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
        >
          {currentStatus === "confirmada"
            ? "Alterar matrícula"
            : "Confirmar matrícula"}
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <input type="hidden" name="studentId" value={studentId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="enrollment_status">Status</Label>
          <Select
            id="enrollment_status"
            name="enrollment_status"
            defaultValue={currentStatus}
          >
            <option value="pendente">Matrícula pendente</option>
            <option value="confirmada">Matrícula confirmada</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="enrollment_id">Número da matrícula (opcional)</Label>
          <Input
            id="enrollment_id"
            name="enrollment_id"
            defaultValue={currentEnrollmentId ?? ""}
            placeholder="Quando disponível"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="enrollment_date">Data de inclusão/matrícula</Label>
          <Input
            id="enrollment_date"
            name="enrollment_date"
            type="date"
            defaultValue={currentEnrollmentDate ? currentEnrollmentDate.slice(0, 10) : ""}
          />
        </div>
      </div>

      {state?.ok === false && (
        <Alert variant="destructive" className="text-xs py-2 px-3">
          {state.error}
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}
