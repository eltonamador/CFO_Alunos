import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/components/app/RoleGuard";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { Tabs } from "@/components/ui/Tabs";
import { getAcademicDetail } from "@/modules/academic-management/infrastructure/queries";
import { AcademicDataError } from "@/modules/academic-management/infrastructure/database";
import type { UserRoleValue } from "@/shared/domain";
import { AcademicLoadError, phaseLabel } from "./AcademicDashboardPage";
import { AcademicActionForm } from "./AcademicActionForm";
import { AcademicPolicyForm } from "./AcademicPolicyForm";
import { AssessmentForm, AssignmentForm, EnrollmentForm } from "./AcademicSetupForms";
import { AcademicGradebook } from "./AcademicGradebook";
import { AcademicAudit } from "./AcademicAudit";
import { designationReferenceFor } from "@/modules/academic-management/domain/designations";

export async function AcademicDetailPage({
  role,
  id,
  searchParams,
}: {
  role: UserRoleValue;
  id: string;
  searchParams: { tab?: string; cadete?: string };
}) {
  const session = await requireRole(role);
  if (!session.active)
    return <Alert variant="destructive">Conta inativa. Procure a coordenação.</Alert>;
  let data;
  try {
    data = await getAcademicDetail(id);
  } catch (error) {
    return (
      <AcademicLoadError message={error instanceof AcademicDataError ? error.message : undefined} />
    );
  }
  if (!data) notFound();
  const canManage = role === "coordenacao" && data.offering.active;
  const canWrite =
    canManage ||
    (data.offering.active &&
      role === "instrutor" &&
      data.assignments.some((item) => item.active && item.profile_id === session.userId));
  const tab = ["notas", "responsaveis", "regras", "historico"].includes(searchParams.tab ?? "")
    ? searchParams.tab
    : "notas";
  const availableStudents = data.availableStudents.filter(
    (student) => !data.enrollments.some((enrollment) => enrollment.student_id === student.id),
  );
  const { offering, discipline, policy } = data;
  const designationReference = designationReferenceFor(discipline.code, offering.academic_year);
  return (
    <div className="space-y-5">
      <Link
        href={`/${role}/academico?fase=${discipline.phase}`}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
      >
        ← Disciplinas de {phaseLabel(discipline.phase)}
      </Link>
      <header className="space-y-2">
        <SectionEyebrow>
          {phaseLabel(discipline.phase)} · {offering.class_name}
        </SectionEyebrow>
        <h1 className="font-display text-2xl font-bold">{discipline.name}</h1>
        <p className="text-sm text-muted-foreground">
          {offering.academic_year} · {offering.workload_hours} h/a · {offering.vc_count}{" "}
          verificação(ões) corrente(s)
        </p>
        <Badge variant={policy ? "success" : "warning"}>
          {policy ? `Política: ${policy.name}` : "Cálculo aguardando política aprovada"}
        </Badge>
      </header>
      {!policy && (
        <Alert>
          As notas podem ser registradas. A situação acadêmica aguarda a política aprovada pela
          coordenação na aba Regras e fontes.
        </Alert>
      )}
      {!offering.active && (
        <Alert>Oferta encerrada. O histórico permanece disponível para consulta.</Alert>
      )}
      {discipline.kind !== "disciplina" && (
        <Alert>
          Estágio, atividades, comportamento e TCC exigem critérios específicos. A matrícula e a
          frequência podem ser acompanhadas; o cálculo de notas permanece pendente de regulamentação
          própria.
        </Alert>
      )}
      <Tabs
        defaultValue="notas"
        items={[
          { value: "notas", label: "Notas e situação" },
          { value: "responsaveis", label: "Responsáveis" },
          { value: "regras", label: "Regras e fontes" },
          { value: "historico", label: "Histórico" },
        ]}
      />
      {tab === "notas" && (
        <section className="space-y-4" aria-label="Notas e situação acadêmica">
          <AcademicGradebook
            key={`${id}:${searchParams.cadete ?? "all"}`}
            offeringId={id}
            assessments={data.assessments}
            enrollments={data.enrollments}
            grades={data.grades}
            canWrite={canWrite && discipline.kind === "disciplina"}
            canManage={canManage}
            initialStudentId={searchParams.cadete}
          />
          {canWrite && discipline.kind === "disciplina" && (
            <details className="rounded-lg border border-border bg-card p-4">
              <summary className="cursor-pointer font-semibold">Cadastrar avaliação</summary>
              <div className="mt-4">
                <AssessmentForm offeringId={id} vcCount={offering.vc_count} />
              </div>
            </details>
          )}
          {canManage && (
            <details className="rounded-lg border border-border bg-card p-4">
              <summary className="cursor-pointer font-semibold">
                Matricular cadete na disciplina
              </summary>
              <div className="mt-4">
                <EnrollmentForm offeringId={id} students={availableStudents} />
              </div>
            </details>
          )}
        </section>
      )}
      {tab === "responsaveis" && (
        <section className="space-y-4" aria-label="Responsáveis pela disciplina">
          {!data.assignments.length && (
            <Card className="p-4 text-sm text-muted-foreground">
              Nenhum responsável designado. Os documentos normativos não substituem a designação
              nominal.
            </Card>
          )}
          {data.assignments.map((assignment) => (
            <Card key={assignment.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{assignment.display_name}</h2>
                <Badge variant={assignment.active ? "info" : "default"}>
                  {assignment.active ? "Ativo" : "Encerrado"}
                </Badge>
              </div>
              <p className="text-sm">
                {assignment.role === "chefe" ? "Chefe de cadeira" : "Instrutor"}
              </p>
              <p className="text-xs text-muted-foreground">
                Designação: {assignment.designation_ref}
              </p>
              {!assignment.profile_id && (
                <p className="text-xs text-muted-foreground">Sem conta de acesso vinculada.</p>
              )}
              {canManage && assignment.active && (
                <details>
                  <summary className="cursor-pointer text-sm text-primary">
                    Encerrar designação
                  </summary>
                  <div className="mt-3">
                    <AcademicActionForm
                      operation="deactivate_assignment"
                      hidden={{ assignment_id: assignment.id, offering_id: id }}
                      submitLabel="Encerrar designação"
                    >
                      <p className="text-sm text-muted-foreground">
                        A designação permanecerá no histórico. O acesso concedido por ela será
                        encerrado.
                      </p>
                    </AcademicActionForm>
                  </div>
                </details>
              )}
            </Card>
          ))}
          {canManage && (
            <details className="rounded-lg border border-border bg-card p-4">
              <summary className="cursor-pointer font-semibold">Associar responsável</summary>
              <div className="mt-4">
                <AssignmentForm offeringId={id} staff={data.staff} />
              </div>
            </details>
          )}
          {designationReference && (
            <Card className="space-y-2 p-4">
              <h2 className="font-semibold">Designações de referência</h2>
              <p className="text-xs text-muted-foreground">{designationReference.sourceRef}</p>
              <p className="whitespace-pre-wrap break-words text-sm">
                {designationReference.designationsText}
              </p>
              <p className="text-xs text-muted-foreground">
                O texto do ato é exibido como referência. Confirme cada vínculo no formulário acima;
                o sistema não presume chefe de cadeira nem conta de acesso.
              </p>
            </Card>
          )}
          <Card className="p-4 text-sm text-muted-foreground">
            Materiais didáticos: a oferta será a referência para publicação futura de conteúdos e
            arquivos da disciplina.
          </Card>
        </section>
      )}
      {tab === "regras" && (
        <section className="space-y-4" aria-label="Política e fontes normativas">
          <Card className="space-y-3 p-4">
            <h2 className="font-display text-xl font-semibold">Base da oferta</h2>
            <p className="text-sm">{discipline.source_ref}</p>
            <p className="text-sm">Decisão da oferta: {offering.decision_ref}</p>
            <p className="text-sm text-muted-foreground">
              Carga do catálogo: {discipline.workload_hours} h/a · Carga adotada na oferta:{" "}
              {offering.workload_hours} h/a
            </p>
            {discipline.conflicts.length > 0 && (
              <Alert>
                <p className="font-semibold">Pontos que exigem conferência da coordenação</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {discipline.conflicts.map((conflict, index) => (
                    <li key={index}>{conflict}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </Card>
          {policy && (
            <Card className="space-y-3 p-4">
              <h2 className="font-display text-xl font-semibold">
                Política em vigor: {policy.name}
              </h2>
              <p className="text-sm">Decisão: {policy.decision_ref}</p>
              <p className="text-xs text-muted-foreground">
                Registrada em{" "}
                {new Date(policy.approved_at).toLocaleString("pt-BR", {
                  timeZone: "America/Belem",
                })}
              </p>
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                {[
                  ["Aprovação direta", policy.parameters.directPassGrade],
                  ["Média mínima para VF", policy.parameters.vfMinAverage],
                  ["Média mínima após VF", policy.parameters.vfPassGrade],
                  ["Teto após VF", policy.parameters.vfMaxRecordedGrade],
                  ["Limite de disciplinas em VF", policy.parameters.maxVfDisciplines],
                  ["Limite de faltas na disciplina", `${policy.parameters.absenceLimitPercent}%`],
                  [
                    "Faltas consideradas",
                    policy.parameters.attendanceMode === "total"
                      ? "Justificadas e não justificadas"
                      : "Não justificadas",
                  ],
                  [
                    "Momento do desconto",
                    policy.parameters.absencePenaltyStage === "none"
                      ? "Sem desconto de faltas na nota"
                      : policy.parameters.absencePenaltyStage === "before_vf"
                        ? "Antes de avaliar a VF"
                        : "Na nota final, após VF e redutor quando houver",
                  ],
                  [
                    "Precisão",
                    `${policy.parameters.averageDecimals} casas; arredondamento para o par`,
                  ],
                  [
                    "Momento de comparar os limites",
                    policy.parameters.comparisonStage === "rounded"
                      ? "MVC, média após VF e redutor arredondados antes da comparação"
                      : "Valores intermediários exatos; a exibição arredondada não altera os limites",
                  ],
                  ["Redução após VF", policy.parameters.vfReduction ? "Aplicada" : "Não aplicada"],
                  [
                    "Frequência mínima do curso (validação futura)",
                    `${policy.parameters.courseAttendanceMinimum}%`,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
          {canManage && !policy && (
            <details className="rounded-lg border border-border bg-card p-4">
              <summary className="cursor-pointer font-semibold">
                Configurar política aprovada
              </summary>
              <div className="mt-4">
                <AcademicPolicyForm offeringId={id} />
              </div>
            </details>
          )}
          {policy && (
            <p className="text-sm text-muted-foreground">
              Esta política foi fixada na oferta para preservar a rastreabilidade dos resultados. A
              revisão de uma política aprovada dependerá de fluxo específico da coordenação.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Os resultados desta tela apoiam o acompanhamento da disciplina. Classificação do curso,
            atas e decisões administrativas dependem de validação própria.
          </p>
        </section>
      )}
      {tab === "historico" && (
        <section className="space-y-3" aria-label="Histórico acadêmico">
          <h2 className="font-display text-xl font-semibold">Histórico de alterações</h2>
          <p className="text-sm text-muted-foreground">
            Registros disponíveis para este perfil, com autoria e valores anteriores.
          </p>
          <AcademicAudit
            events={data.audit}
            studentLabels={Object.fromEntries(
              data.enrollments.map((enrollment) => [
                enrollment.student_id,
                enrollment.student_label,
              ]),
            )}
          />
        </section>
      )}
    </div>
  );
}
