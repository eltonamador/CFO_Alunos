import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type * as ReactDOM from "react-dom";
import { AcademicPolicyForm } from "./AcademicPolicyForm";
import { AcademicGradebook } from "./AcademicGradebook";
import { AcademicAudit } from "./AcademicAudit";
import { formatAcademicNumber } from "./AcademicResult";
import type { EnrollmentView } from "@/modules/academic-management/application/types";

vi.mock("@/modules/academic-management/presentation/actions", () => ({ academicAction: vi.fn() }));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactDOM>()),
  useFormState: () => [null, undefined],
  useFormStatus: () => ({ pending: false }),
}));

const enrollment: EnrollmentView = {
  id: "enrollment",
  offering_id: "offering",
  student_id: "student",
  student_label: "CADETE TESTE — 01",
  justified_absences: null,
  unjustified_absences: null,
  revision: 1,
  change_reason: null,
  result: {
    status: "pending_policy",
    label: "Pendente de decisão normativa",
    mvc: null,
    requiredVf: null,
    requiredVfForApproval: null,
    vfAverage: null,
    finalGrade: null,
    attendancePercent: null,
    vfRequired: false,
    reasons: [],
    unadjustedMvc: null,
    absencePenalty: null,
  },
};
const assessment = {
  id: "assessment",
  offering_id: "offering",
  kind: "VC" as const,
  sequence: 1,
  title: "Avaliação de teste",
  held_on: null,
};

describe("Gestão acadêmica: decisões e lançamento", () => {
  it("preserva a precisão da política ao exibir médias próximas aos limites", () => {
    expect(formatAcademicNumber(6.995)).toBe("6,995");
    expect(formatAcademicNumber(6.9999999)).toBe("6,9999999");
    expect(formatAcademicNumber(7)).toBe("7,00");
    expect(formatAcademicNumber(null)).toBe("—");
  });
  it("pagina o histórico sem omitir eventos posteriores aos primeiros 25", () => {
    const events = Array.from({ length: 26 }, (_, index) => ({
      id: `event-${index}`,
      offering_id: "offering",
      student_id: "student",
      entity: "academic_grades",
      entity_id: "grade",
      action: "update",
      actor_id: "actor",
      actor_name: "Coordenação teste",
      before_data: { score: 5 },
      after_data: { score: 6 },
      reason: `Correção de teste ${index}`,
      created_at: "2026-09-10T12:00:00Z",
    }));
    render(<AcademicAudit events={events} />);
    expect(screen.getByText(/1–25 de 26 eventos/)).toBeVisible();
    expect(screen.queryByText("Motivo: Correção de teste 25")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByText("Motivo: Correção de teste 25")).toBeVisible();
    expect(screen.getByText(/26–26 de 26 eventos/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
  });
  it("exige escolhas explícitas para conflitos antes de enviar parâmetros aprovados", () => {
    const { container } = render(<AcademicPolicyForm offeringId="offering" />);
    const submit = screen.getByRole("button", { name: "Registrar política aprovada" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Faltas que contam/), {
      target: { value: "unjustified" },
    });
    fireEvent.change(screen.getByLabelText(/Momento do desconto/), {
      target: { value: "after_vf" },
    });
    fireEvent.change(screen.getByLabelText(/Média mínima para acesso/), {
      target: { value: "4.5" },
    });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Precisão da média/), { target: { value: "3" } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Momento de comparar/), { target: { value: "exact" } });
    expect(submit).toBeEnabled();
    expect(screen.getByLabelText(/Referência da decisão/)).toBeRequired();
    const payload = container.querySelector<HTMLInputElement>('input[name="parameters"]');
    expect(JSON.parse(payload?.value ?? "{}")).toMatchObject({
      attendanceMode: "unjustified",
      absencePenaltyStage: "after_vf",
      vfMinAverage: 4.5,
      averageDecimals: 3,
      comparisonStage: "exact",
    });
  });

  it("mantém nota não lançada vazia e envia versão inicial zero", () => {
    const { container } = render(
      <AcademicGradebook
        offeringId="offering"
        assessments={[assessment]}
        enrollments={[enrollment]}
        grades={[]}
        canWrite
        canManage={false}
      />,
    );
    expect(screen.getByLabelText(/Nota de CADETE/)).toHaveValue(null);
    expect(container.querySelector('input[name="expected_revision"]')).toHaveValue("0");
    expect(screen.getByRole("button", { name: "Salvar nota" })).toBeVisible();
  });

  it("não apresenta comandos de escrita no boletim de leitura", () => {
    render(
      <AcademicGradebook
        offeringId="offering"
        assessments={[assessment]}
        enrollments={[enrollment]}
        grades={[]}
        canWrite={false}
        canManage={false}
      />,
    );
    expect(screen.queryByRole("button", { name: /Salvar|Retificar/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nota de CADETE/)).not.toBeInTheDocument();
    expect(screen.getByText("Pendente de decisão normativa")).toBeVisible();
  });

  it("exige justificativa e versão atual para retificar nota existente", () => {
    const { container } = render(
      <AcademicGradebook
        offeringId="offering"
        assessments={[assessment]}
        enrollments={[enrollment]}
        grades={[
          {
            id: "grade",
            offering_id: "offering",
            enrollment_id: "enrollment",
            assessment_id: "assessment",
            score: 0,
            revision: 2,
            change_reason: "Registro inicial",
            updated_at: "2026-09-10T12:00:00Z",
          },
        ]}
        canWrite
        canManage={false}
      />,
    );
    expect(screen.getByLabelText(/Nota de CADETE/)).toHaveValue(0);
    expect(screen.getByLabelText(/Motivo da retificação/)).toBeRequired();
    expect(container.querySelector('input[name="expected_revision"]')).toHaveValue("2");
  });
});
