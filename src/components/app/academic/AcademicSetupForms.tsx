"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AcademicActionForm, AcademicField } from "./AcademicActionForm";
import type {
  AcademicClass,
  AcademicStaff,
  AcademicStudent,
  Discipline,
} from "@/modules/academic-management/application/types";

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
}: {
  disciplines: Discipline[];
  classes: AcademicClass[];
}) {
  const [disciplineId, setDisciplineId] = useState("");
  const discipline = disciplines.find((item) => item.id === disciplineId);
  return (
    <AcademicActionForm
      operation="create_offering"
      submitLabel="Criar oferta"
      disabled={!disciplines.length || !classes.length}
    >
      <p className="text-sm text-muted-foreground">
        A oferta vincula uma disciplina à turma e ao ano letivo, preservando o histórico de cada
        fase.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <AcademicField label="Turma">
          <Select name="class_id" required defaultValue="">
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
            placeholder="2026"
          />
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
            key={disciplineId}
            name="workload_hours"
            type="number"
            min="1"
            step="1"
            defaultValue={discipline?.workload_hours}
            required
          />
        </AcademicField>
        <AcademicField
          label="Quantidade de verificações correntes (VC)"
          hint="Informe a quantidade aprovada para esta oferta."
        >
          <Input name="vc_count" type="number" min="1" max="12" step="1" required />
        </AcademicField>
        <AcademicField label="Ato ou decisão que autoriza a oferta">
          <Input name="decision_ref" minLength={5} required />
        </AcademicField>
      </div>
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
