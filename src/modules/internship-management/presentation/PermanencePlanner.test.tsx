import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PermanencePlanner } from "./PermanencePlanner";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./permanenceActions", () => ({
  publishPermanence: vi.fn(),
  publishPermanenceBatch: vi.fn(),
  cancelPermanence: vi.fn(),
}));

const props = {
  program: {
    id: "00000000-0000-0000-0000-000000000001",
    name: "CFO",
    starts_on: "2026-09-26",
    ends_on: "2026-12-13",
  },
  defaultDate: "2026-09-26",
  canManage: true,
  duties: [],
  conflicts: [],
  cadets: [],
  assignments: [],
  constraints: [],
  blackouts: [],
};

describe("horário padrão do Dia ao 1º Ano", () => {
  it("inicia às 06h e termina às 06h do dia seguinte", () => {
    render(<PermanencePlanner {...props} />);
    expect(screen.getByText(/Jornada de 24 horas: das 06h às 06h/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Primeiro dia do serviço"), {
      target: { value: "2026-09-27" },
    });
    expect(screen.getByLabelText("Último dia do período")).toHaveValue("2026-09-27");
    expect(screen.queryByLabelText("Início (Belém)")).not.toBeInTheDocument();
  });
  it("prepara equipes distintas para dois dias consecutivos antes de publicar", () => {
    const cadets = [1, 2, 3, 4].map((number) => ({
      id: `${number}0000000-0000-4000-8000-000000000000`,
      war_name: `CADETE ${number}`,
      student_number: number,
      birthMonthDay: null,
    }));
    render(<PermanencePlanner {...props} cadets={cadets} />);
    fireEvent.change(screen.getByLabelText("Último dia do período"), {
      target: { value: "2026-09-27" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gerar sugestão de escala" }));
    expect(screen.getByRole("button", { name: "Publicar 2 serviços" })).toBeEnabled();
    const selected = screen
      .getAllByRole("combobox")
      .filter((element) =>
        (element as HTMLSelectElement).value.includes("-0000-4000-8000-"),
      ) as HTMLSelectElement[];
    expect(selected.map((element) => element.value)).toHaveLength(4);
    expect(new Set(selected.map((element) => element.value)).size).toBe(4);
  });
});

describe("revisão de conflito com estágio", () => {
  it("mostra o choque sem indicar que o estágio foi remanejado", () => {
    render(
      <PermanencePlanner
        {...props}
        conflicts={[
          {
            duty_assignment_id: "duty-1",
            roster_id: "roster-1",
            student_id: "student-1",
            student_number: 3,
            war_name: "P. AMARAL",
            duty_role: "Apoio 2",
            duty_starts_at: "2026-09-26T09:00:00Z",
            duty_ends_at: "2026-09-26T21:00:00Z",
            shift_id: "shift-1",
            stage_starts_at: "2026-09-26T10:45:00Z",
            stage_ends_at: "2026-09-27T10:45:00Z",
            conflict_kind: "mesmo_dia",
          },
        ]}
      />,
    );
    expect(screen.getByText(/Conflitos com o estágio para revisar/)).toBeInTheDocument();
    expect(screen.getByText(/P. AMARAL · Apoio 2 · Mesmo dia/)).toBeInTheDocument();
    expect(screen.getByText(/continuam publicados e não foram remanejados/)).toBeInTheDocument();
  });
});
