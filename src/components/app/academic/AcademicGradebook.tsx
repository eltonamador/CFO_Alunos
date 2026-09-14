"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { AcademicActionForm, AcademicField } from "./AcademicActionForm";
import { AcademicResultSummary, formatAcademicNumber } from "./AcademicResult";
import type {
  Assessment,
  EnrollmentView,
  Grade,
} from "@/modules/academic-management/application/types";

export function AcademicGradebook({
  offeringId,
  assessments,
  enrollments,
  grades,
  canWrite,
  canManage,
  initialStudentId,
}: {
  offeringId: string;
  assessments: Assessment[];
  enrollments: EnrollmentView[];
  grades: Grade[];
  canWrite: boolean;
  canManage: boolean;
  initialStudentId?: string;
}) {
  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id ?? "");
  const [studentId, setStudentId] = useState(initialStudentId ?? "");
  const selectedAssessment = assessments.find((item) => item.id === assessmentId);
  const visibleEnrollments = enrollments.filter(
    (item) => !studentId || item.student_id === studentId,
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {canWrite && (
          <AcademicField label="Avaliação para lançamento">
            <Select value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)}>
              <option value="">Selecione uma avaliação</option>
              {assessments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.kind} {item.sequence} · {item.title}
                </option>
              ))}
            </Select>
          </AcademicField>
        )}
        {enrollments.length > 1 && (
          <AcademicField label="Filtrar cadete">
            <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">Todos os matriculados</option>
              {enrollments.map((item) => (
                <option key={item.id} value={item.student_id}>
                  {item.student_label}
                </option>
              ))}
            </Select>
          </AcademicField>
        )}
      </div>
      {!enrollments.length && (
        <p className="text-sm text-muted-foreground">
          Ainda não há matrículas disponíveis nesta oferta.
        </p>
      )}
      {!assessments.length && (
        <p className="text-sm text-muted-foreground">As avaliações ainda não foram cadastradas.</p>
      )}
      {visibleEnrollments.map((enrollment) => {
        const grade = grades.find(
          (item) => item.enrollment_id === enrollment.id && item.assessment_id === assessmentId,
        );
        const correction = Boolean(grade);
        return (
          <Card key={enrollment.id} className="space-y-4 p-4">
            <h3 className="font-display text-xl font-semibold">{enrollment.student_label}</h3>
            <AcademicResultSummary result={enrollment.result} />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Avaliações de {enrollment.student_label}</caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th scope="col" className="py-2 pr-3">
                      Avaliação
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Data
                    </th>
                    <th scope="col" className="py-2">
                      Nota
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((assessment) => {
                    const entry = grades.find(
                      (item) =>
                        item.enrollment_id === enrollment.id &&
                        item.assessment_id === assessment.id,
                    );
                    return (
                      <tr key={assessment.id} className="border-b border-border/60">
                        <th scope="row" className="py-2 pr-3 font-normal">
                          {assessment.kind} {assessment.sequence} · {assessment.title}
                        </th>
                        <td className="whitespace-nowrap py-2 pr-3">
                          {assessment.held_on
                            ? assessment.held_on.split("-").reverse().join("/")
                            : "—"}
                        </td>
                        <td className="py-2 font-mono">{formatAcademicNumber(entry?.score)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {canWrite && selectedAssessment && (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="mb-3 text-sm font-semibold">
                  {selectedAssessment.kind} {selectedAssessment.sequence}:{" "}
                  {selectedAssessment.title}
                </p>
                <AcademicActionForm
                  key={`${enrollment.id}-${assessmentId}-${grade?.revision ?? 0}`}
                  operation="save_grade"
                  hidden={{
                    offering_id: offeringId,
                    assessment_id: assessmentId,
                    enrollment_id: enrollment.id,
                    expected_revision: grade?.revision ?? 0,
                  }}
                  submitLabel={correction ? "Retificar nota" : "Salvar nota"}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <AcademicField
                      label={`Nota de ${enrollment.student_label}`}
                      hint="Escala de 0 a 10. Campo vazio significa nota ainda não lançada."
                    >
                      <Input
                        name="score"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="10"
                        step="0.01"
                        defaultValue={grade?.score ?? ""}
                      />
                    </AcademicField>
                    <AcademicField
                      label={correction ? "Motivo da retificação" : "Observação (opcional)"}
                    >
                      <Input
                        name="reason"
                        minLength={correction ? 5 : undefined}
                        required={correction}
                      />
                    </AcademicField>
                  </div>
                </AcademicActionForm>
              </div>
            )}
            <details className="rounded-md border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                Frequência consolidada · justificadas: {formatAcademicNumber(enrollment.result.attendancePercent === null ? null : (enrollment.legacy_justified_absences ?? 0) + (enrollment.journal_justified_absences ?? 0))} ·
                não justificadas: {formatAcademicNumber(enrollment.result.attendancePercent === null ? null : (enrollment.legacy_unjustified_absences ?? 0) + (enrollment.journal_unjustified_absences ?? 0))}
              </summary>
              <p className="mt-3 text-xs text-muted-foreground">
                Legado: {formatAcademicNumber(enrollment.legacy_justified_absences)} h/a justificadas e {formatAcademicNumber(enrollment.legacy_unjustified_absences)} h/a não justificadas. Diário por aula: {formatAcademicNumber(enrollment.journal_justified_absences)} h/a justificadas e {formatAcademicNumber(enrollment.journal_unjustified_absences)} h/a não justificadas.
              </p>
              {canManage ? (
                <div className="mt-4">
                  <AcademicActionForm
                    key={`attendance-${enrollment.id}-${enrollment.revision}`}
                    operation="save_attendance"
                    hidden={{
                      offering_id: offeringId,
                      enrollment_id: enrollment.id,
                      expected_revision: enrollment.revision,
                    }}
                    submitLabel="Salvar frequência"
                  >
                    <p className="text-sm text-muted-foreground">
                      Este formulário preserva o histórico consolidado anterior ao diário. As faltas registradas por aula são calculadas separadamente e não podem ser alteradas aqui.
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <AcademicField label="Faltas justificadas (h/a)">
                        <Input
                          name="justified_absences"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          defaultValue={enrollment.justified_absences ?? ""}
                        />
                      </AcademicField>
                      <AcademicField label="Faltas não justificadas (h/a)">
                        <Input
                          name="unjustified_absences"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          defaultValue={enrollment.unjustified_absences ?? ""}
                        />
                      </AcademicField>
                    </div>
                    <AcademicField label="Motivo ou referência do registro">
                      <Input name="reason" minLength={5} required />
                    </AcademicField>
                  </AcademicActionForm>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Frequência registrada pela coordenação. Valores ausentes aguardam conferência.
                </p>
              )}
            </details>
          </Card>
        );
      })}
    </div>
  );
}
