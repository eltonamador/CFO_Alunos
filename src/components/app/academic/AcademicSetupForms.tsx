"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AcademicActionForm, AcademicField } from "./AcademicActionForm";
import type {
  AcademicClass,
  AcademicStaff,
  AcademicYear,
  AcademicStudent,
  Discipline,
} from "@/modules/academic-management/application/types";
import { designationReferenceFor } from "@/modules/academic-management/domain/designations";

export function NewDisciplineForm() {
  return (
    <AcademicActionForm operation="create_discipline" submitLabel="Cadastrar disciplina">
      <div className="grid gap-4 md:grid-cols-2">
        <AcademicField label="Código">
          <Input name="code" required minLength={3} maxLength={60} pattern="[A-Za-z0-9_-]+" />
        </AcademicField>
        <AcademicField label="Nome">
          <Input name="name" required minLength={3} maxLength={200} />
        </AcademicField>
        <AcademicField label="Fase do CFO">
          <Select name="phase" defaultValue="1">
            <option value="1">CFO I</option>
            <option value="2">CFO II</option>
            <option value="3">CFO III</option>
          </Select>
        </AcademicField>
        <AcademicField label="Componente">
          <Select name="kind" defaultValue="disciplina">
            <option value="disciplina">Disciplina</option>
            <option value="estagio">Estágio</option>
            <option value="atividade">Atividade</option>
            <option value="comportamento">Comportamento</option>
            <option value="tcc">Trabalho de Conclusão de Curso</option>
          </Select>
        </AcademicField>
        <AcademicField label="Carga horária (h/a)">
          <Input name="workload_hours" type="number" min="1" max="5000" step="1" required />
        </AcademicField>
        <AcademicField label="Referência no PPC ou ato da coordenação">
          <Input name="source_ref" required minLength={5} />
        </AcademicField>
      </div>
    </AcademicActionForm>
  );
}

export function NewOfferingForm({
  disciplines,
  classes,
  academicYears = [],
}: {
  disciplines: Discipline[];
  classes: AcademicClass[];
  academicYears?: AcademicYear[];
}) {
  const [disciplineId, setDisciplineId] = useState("");
  const [classId, setClassId] = useState("");
  const [academicYear, setAcademicYear] = useState("2026");
  const [academicYearId, setAcademicYearId] = useState("");
  const selectedClass = classes.find((item) => item.id === classId);
  const availableYears = academicYears.filter(
    (item) => item.course_id === selectedClass?.course_id && item.status === "open",
  );
  const discipline = disciplines.find((item) => item.id === disciplineId);
  const designation = discipline
    ? designationReferenceFor(discipline.code, Number(academicYear))
    : undefined;
  const adoptedWorkload = designation?.workloadHours ?? discipline?.workload_hours;
  const provisionalVcCount = adoptedWorkload
    ? adoptedWorkload <= 20
      ? 1
      : adoptedWorkload <= 40
        ? 2
        : adoptedWorkload <= 60
          ? 3
          : 4
    : undefined;
  return (
    <AcademicActionForm
      operation="create_offering"
      submitLabel="Criar oferta"
      disabled={!disciplines.length || !classes.length}
    >
      <p className="text-sm text-muted-foreground">
        A oferta vincula uma disciplina à turma e ao ano letivo e já recebe a política provisória do
        RI ABM 2026 revisado. Os parâmetros ficam registrados e podem ser corrigidos por nova
        versão.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <AcademicField label="Turma">
          <Select
            name="class_id"
            required
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value);
              setAcademicYearId("");
            }}
          >
            <option value="" disabled>
              Selecione
            </option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </AcademicField>
        <AcademicField label="Disciplina">
          <Select
            name="discipline_id"
            required
            value={disciplineId}
            onChange={(event) => setDisciplineId(event.target.value)}
          >
            <option value="" disabled>
              Selecione
            </option>
            {disciplines.map((item) => (
              <option key={item.id} value={item.id}>
                {["", "CFO I", "CFO II", "CFO III"][item.phase]} · {item.name}
              </option>
            ))}
          </Select>
        </AcademicField>
        <AcademicField label="Ano letivo">
          <Input
            name="academic_year"
            type="number"
            min="2020"
            max="2200"
            required
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
          />
        </AcademicField>
        <AcademicField
          label="Calendário acadêmico"
          hint="Opcional para ofertas históricas; necessário para diário, projeções e QTS."
        >
          <Select
            name="academic_year_id"
            value={academicYearId}
            disabled={!selectedClass}
            onChange={(event) => {
              const nextId = event.target.value;
              setAcademicYearId(nextId);
              const selected = availableYears.find((item) => item.id === nextId);
              if (selected) setAcademicYear(String(selected.year));
            }}
          >
            <option value="">Sem calendário vinculado</option>
            {availableYears.map((item) => (
              <option key={item.id} value={item.id}>
                {item.year} · {item.starts_on.split("-").reverse().join("/")} a {item.ends_on.split("-").reverse().join("/")}
              </option>
            ))}
          </Select>
        </AcademicField>
        <AcademicField
          label="Carga horária adotada (h/a)"
          hint={
            discipline?.conflicts.length
              ? "Há divergência na fonte. Registre a carga aprovada no ato abaixo."
              : undefined
          }
        >
          <Input
            key={`${disciplineId}-${academicYear}`}
            name="workload_hours"
            type="number"
            min="1"
            step="1"
            defaultValue={adoptedWorkload}
            required
          />
        </AcademicField>
        <AcademicField
          label="Quantidade de verificações correntes (VC)"
          hint="RI revisado, art. 15: até 20 h/a = 1; de 21 a 40 h/a = 2; de 41 a 60 h/a = 3; acima de 60 h/a = 4."
        >
          <Input
            key={`vc-${disciplineId}-${academicYear}`}
            name="vc_count"
            type="number"
            min="1"
            max="12"
            step="1"
            defaultValue={provisionalVcCount}
            required
          />
        </AcademicField>
        <AcademicField label="Ato ou decisão que autoriza a oferta">
          <Input
            name="decision_ref"
            minLength={5}
            required
            defaultValue="RI ABM 2026 revisado — aplicação provisória"
          />
        </AcademicField>
      </div>
      {designation && (
        <p className="text-xs text-muted-foreground">
          Para CFO I de 2026, a carga sugerida segue a {designation.sourceRef}. A associação dos
          instrutores continua sendo confirmada na página da oferta.
        </p>
      )}
    </AcademicActionForm>
  );
}

export function AssignmentForm({
  offeringId,
  staff,
}: {
  offeringId: string;
  staff: AcademicStaff[];
}) {
  const [displayName, setDisplayName] = useState("");
  return (
    <AcademicActionForm
      operation="assign"
      hidden={{ offering_id: offeringId }}
      submitLabel="Associar responsável"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AcademicField
          label="Conta do responsável"
          hint="Sem conta vinculada, a designação é apenas cadastral e não concede acesso."
        >
          <Select
            name="profile_id"
            defaultValue=""
            onChange={(event) =>
              setDisplayName(staff.find((item) => item.id === event.target.value)?.full_name ?? "")
            }
          >
            <option value="">Sem conta vinculada</option>
            {staff.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name}
              </option>
            ))}
          </Select>
        </AcademicField>
        <AcademicField label="Nome do responsável">
          <Input
            name="display_name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </AcademicField>
        <AcademicField label="Função">
          <Select name="role" defaultValue="instrutor">
            <option value="instrutor">Instrutor</option>
            <option value="chefe">Chefe de cadeira</option>
          </Select>
        </AcademicField>
        <AcademicField label="Referência da designação">
          <Input name="designation_ref" minLength={5} required />
        </AcademicField>
      </div>
    </AcademicActionForm>
  );
}

export function EnrollmentForm({
  offeringId,
  students,
}: {
  offeringId: string;
  students: AcademicStudent[];
}) {
  return (
    <AcademicActionForm
      operation="enroll"
      hidden={{ offering_id: offeringId }}
      submitLabel="Matricular cadete"
      disabled={!students.length}
    >
      <AcademicField label="Cadete">
        <Select name="student_id" required defaultValue="">
          <option value="" disabled>
            {students.length ? "Selecione" : "Nenhum cadete disponível"}
          </option>
          {students.map((item) => (
            <option key={item.id} value={item.id}>
              {item.war_name} — {String(item.student_number).padStart(2, "0")}
            </option>
          ))}
        </Select>
      </AcademicField>
    </AcademicActionForm>
  );
}

export function AssessmentForm({ offeringId, vcCount }: { offeringId: string; vcCount: number }) {
  const [kind, setKind] = useState("VC");
  return (
    <AcademicActionForm
      operation="create_assessment"
      hidden={{ offering_id: offeringId }}
      submitLabel="Cadastrar avaliação"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AcademicField label="Tipo">
          <Select name="kind" value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="VC">Verificação corrente (VC)</option>
            <option value="VF">Verificação final (VF)</option>
          </Select>
        </AcademicField>
        <AcademicField label="Número da avaliação">
          <Input
            key={kind}
            name="sequence"
            type="number"
            min="1"
            max={kind === "VF" ? 1 : vcCount}
            step="1"
            defaultValue={kind === "VF" ? 1 : undefined}
            required
          />
        </AcademicField>
        <AcademicField label="Título">
          <Input name="title" required minLength={3} />
        </AcademicField>
        <AcademicField label="Data de aplicação (opcional)">
          <Input name="held_on" type="date" />
        </AcademicField>
      </div>
    </AcademicActionForm>
  );
}
