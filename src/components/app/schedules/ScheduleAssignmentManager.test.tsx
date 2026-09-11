import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type * as ReactDOM from "react-dom";
import type { ScheduleManagedAssignmentView } from "@/modules/schedule-repository/application/types";
import { ScheduleAssignmentManager } from "./ScheduleAssignmentManager";

vi.mock("@/modules/schedule-repository/presentation/actions", () => ({
  cancelScheduleAssignmentAction: vi.fn(),
  correctScheduleAssignmentAction: vi.fn(),
}));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactDOM>()),
  useFormState: () => [null, undefined],
  useFormStatus: () => ({ pending: false }),
}));

function assignment(
  overrides: Partial<ScheduleManagedAssignmentView> = {},
): ScheduleManagedAssignmentView {
  return {
    id: "assignment-1",
    document_id: "document-1",
    candidate_id: null,
    student_id: "student-1",
    duty_date: "2026-09-15",
    duty_function: "Comandante da guarda",
    status: "published",
    match_method: "manual",
    confidence: null,
    supersedes_assignment_id: null,
    correction_reason: null,
    published_by: null,
    published_at: "2026-09-10T12:00:00Z",
    created_at: "2026-09-10T12:00:00Z",
    class_id: "class-1",
    class_name: "CFO I",
    schedule_type_name: "Escala de serviço",
    document_name: "escala-cfo1.pdf",
    student_name: "01 · ALFA",
    notification_status: "sent",
    notification_type: "assignment_published",
    students: [
      {
        id: "student-1",
        class_id: "class-1",
        student_number: 1,
        war_name: "ALFA",
        full_name: "Cadete Alfa",
      },
    ],
    ...overrides,
  };
}

describe("Gestão de atribuições de escala", () => {
  it("filtra por busca, turma, situação e atenção de notificação", () => {
    render(
      <ScheduleAssignmentManager
        assignments={[
          assignment(),
          assignment({
            id: "assignment-2",
            student_id: "student-2",
            student_name: "02 · BRAVO",
            class_id: "class-2",
            class_name: "CFO II",
            duty_function: "Motorista",
            notification_status: "failed",
          }),
          assignment({
            id: "assignment-3",
            student_name: "03 · CHARLIE",
            status: "corrected",
            notification_status: "sent",
          }),
        ]}
      />,
    );

    expect(screen.getByText(/3 de 3 atribuições/)).toBeVisible();
    expect(screen.getByText(/1 avisos vigentes exigem atenção/)).toBeVisible();
    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "motorista" } });
    expect(screen.getByText(/1 de 3 atribuições/)).toBeVisible();
    expect(screen.getByText("02 · BRAVO")).toBeVisible();
    expect(screen.queryByText("01 · ALFA")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Turma"), { target: { value: "class-1" } });
    fireEvent.change(screen.getByLabelText("Situação"), { target: { value: "corrected" } });
    expect(screen.getByText(/1 de 3 atribuições/)).toBeVisible();
    expect(screen.getByText("03 · CHARLIE")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Turma"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("Situação"), { target: { value: "published" } });
    fireEvent.change(screen.getByLabelText("Notificação"), { target: { value: "attention" } });
    expect(screen.getByText("02 · BRAVO")).toBeVisible();
    expect(screen.getByText("Aviso: Falhou")).toBeVisible();
  });

  it("mostra os campos de correção, exige justificativa e preserva o histórico", () => {
    render(
      <ScheduleAssignmentManager
        assignments={[
          assignment(),
          assignment({
            id: "assignment-history",
            status: "cancelled",
            correction_reason: "Cadete dispensado do serviço",
          }),
        ]}
      />,
    );

    fireEvent.click(screen.getByText("Corrigir atribuição"));
    expect(screen.getByLabelText("Cadete")).toHaveValue("student-1");
    expect(screen.getByLabelText("Data")).toHaveValue("2026-09-15");
    expect(screen.getByLabelText("Função")).toHaveValue("Comandante da guarda");
    expect(screen.getByLabelText("Motivo da correção")).toBeRequired();

    fireEvent.click(screen.getByText(/Histórico preservado/));
    expect(screen.getByText("Motivo: Cadete dispensado do serviço")).toBeVisible();
  });

  it("informa quando nenhum item corresponde aos filtros", () => {
    render(<ScheduleAssignmentManager assignments={[assignment()]} />);
    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "inexistente" } });
    expect(screen.getByText("Nenhuma atribuição corresponde aos filtros informados.")).toBeVisible();
  });
});
