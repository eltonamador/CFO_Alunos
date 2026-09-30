import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { it, expect, vi, beforeEach } from "vitest";
import { LifeguardHoursForm } from "./LifeguardHoursForm";
const mocks = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock("./lifeguardHoursActions", () => ({ adjustLifeguardHours: mocks.save }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
const day = {
  date: "2026-10-11",
  startsAt: "2026-10-11T13:00:00Z",
  endsAt: "2026-10-11T21:00:00Z",
  assignmentIds: ["a", "b", "c", "d", "e"],
  cadets: ["A", "B", "C", "D", "E"],
  uniforms: ["4D"],
};
beforeEach(() => vi.clearAllMocks());
async function submit() {
  render(<LifeguardHoursForm programId="program" day={day} />);
  fireEvent.click(screen.getByText(/Ajustar horário de praia/));
  fireEvent.change(screen.getByLabelText("Entrada do GV"), { target: { value: "14:00" } });
  fireEvent.change(screen.getByLabelText("Motivo do ajuste"), {
    target: { value: "Após instrução" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Validar e salvar horário do dia" }));
  });
}
it("mantém formulário e informa rejeição sem anunciar atualização", async () => {
  mocks.save.mockResolvedValue({ error: "Descanso insuficiente" });
  await submit();
  expect(await screen.findByRole("alert")).toHaveTextContent("Descanso insuficiente");
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Validar e salvar horário do dia" })).toBeEnabled();
});
it("confirma ajuste e orienta a emitir PDF e novos links de avaliação", async () => {
  mocks.save.mockResolvedValue({ count: 5 });
  await submit();
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  expect(screen.getByRole("status")).toHaveTextContent("PDF retificado");
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({
      startsAt: "2026-10-11T14:00:00-03:00",
      assignmentIds: day.assignmentIds,
    }),
  );
  expect(screen.getByRole("button", { name: "Validar e salvar horário do dia" })).toBeDisabled();
});
