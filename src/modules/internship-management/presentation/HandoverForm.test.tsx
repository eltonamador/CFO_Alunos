import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { HandoverForm } from "./HandoverForm";
import { recordInternshipHandover } from "./handoverActions";
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("./handoverActions", () => ({ recordInternshipHandover: vi.fn() }));
vi.mock("./actions", () => ({ homologateInternshipAction: vi.fn() }));
const props = {
  assignmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  studentId: "first",
  startsAt: "2026-09-26T19:45:00-03:00",
  endsAt: "2026-09-27T07:45:00-03:00",
  now: "2026-09-27T02:00:00-03:00",
  cadets: [
    { id: "first", war_name: "ORIGINAL", student_number: 1 },
    { id: "second", war_name: "SUBSTITUTO", student_number: 2 },
  ],
};
beforeEach(() => vi.clearAllMocks());
function fill() {
  render(<HandoverForm {...props} />);
  fireEvent.click(screen.getByText("Substituir durante o plantão"));
  fireEvent.change(screen.getByLabelText("Data e horário da passagem"), {
    target: { value: "2026-09-27T01:45" },
  });
  fireEvent.change(screen.getByLabelText("Cadete substituto"), { target: { value: "second" } });
  fireEvent.change(screen.getByLabelText(/Motivo,/), { target: { value: "Troca autorizada" } });
}
it("divide a noite em 6h para cada cadete e envia o horário de Belém", async () => {
  vi.mocked(recordInternshipHandover).mockResolvedValue({ success: true });
  fill();
  expect(screen.getAllByText("6 h 00 min")).toHaveLength(2);
  expect(screen.queryByRole("option", { name: /ORIGINAL/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar passagem" }));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(recordInternshipHandover).toHaveBeenCalledWith({
    assignmentId: props.assignmentId,
    newStudentId: "second",
    handoverAt: "2026-09-27T01:45:00-03:00",
    reason: "Troca autorizada",
  });
  expect(screen.getByRole("button")).toBeDisabled();
});
it("mantém os dados para escolher outro cadete após recusa por descanso", async () => {
  vi.mocked(recordInternshipHandover).mockResolvedValue({ error: "Descanso mínimo de 24 horas." });
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar passagem" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("24 horas");
  expect(refresh).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Cadete substituto")).toHaveValue("second");
  expect(screen.getByRole("button")).toBeEnabled();
});
it("impede horários futuros ou fora da janela individual", () => {
  fill();
  for (const value of ["2026-09-27T03:00", "2026-09-26T19:45", "2026-09-27T07:45"]) {
    fireEvent.change(screen.getByLabelText("Data e horário da passagem"), { target: { value } });
    expect(screen.getByRole("button")).toBeDisabled();
  }
  expect(recordInternshipHandover).not.toHaveBeenCalled();
});
