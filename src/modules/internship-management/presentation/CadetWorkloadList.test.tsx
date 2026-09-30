import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CadetWorkloadList } from "./CadetWorkloadList";
const common = {
  assigned_shifts: 1,
  awaiting_homologation: 0,
  concluded: false,
  excess_minutes: 0,
  missing_required_minutes: 960,
  missing_target_minutes: 960,
  open_occurrences: 0,
  performed_minutes: 0,
  planned_minutes: 720,
  required_minutes: 1680,
  target_minutes: 1680,
  validated_minutes: 720,
};
const rows = [
  { ...common, student_id: "a", student_number: 1, war_name: "JOÃO" },
  { ...common, student_id: "b", student_number: 2, war_name: "IAN LIMA", awaiting_homologation: 1 },
];
describe("busca simples dos cadetes", () => {
  it("busca nome sem acento e número com zero à esquerda", () => {
    render(<CadetWorkloadList rows={rows} />);
    expect(screen.getByRole("progressbar", { name: "Horas homologadas de JOÃO" })).toHaveAttribute("aria-valuenow", "43");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "joao" } });
    expect(screen.getByRole("link", { name: "Abrir ficha de JOÃO" })).toHaveAttribute(
      "href",
      "/coordenacao/estagio?cadete=a#fichas",
    );
    expect(screen.queryByText("02 · IAN LIMA")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "02" } });
    expect(screen.getByText("02 · IAN LIMA")).toBeInTheDocument();
  });
  it("filtra pendências sem enviar formulário", () => {
    render(<CadetWorkloadList rows={rows} />);
    fireEvent.change(screen.getByLabelText("Situação da carga"), {
      target: { value: "pendencias" },
    });
    expect(screen.getByText("02 · IAN LIMA")).toBeInTheDocument();
    expect(screen.queryByText("01 · JOÃO")).not.toBeInTheDocument();
  });
});
