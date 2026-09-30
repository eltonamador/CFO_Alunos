import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { CancelPermanencePanel } from "./CancelPermanencePanel";
const mocks = vi.hoisted(() => ({ preview: vi.fn(), cancel: vi.fn(), refresh: vi.fn() }));
vi.mock("./permanenceActions", () => ({
  previewPermanenceCancellation: mocks.preview,
  cancelPermanencePeriod: mocks.cancel,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
const row = {
  id: "a",
  rosterId: "r",
  studentId: "s",
  startsAt: "2026-09-26T06:00:00-03:00",
  endsAt: "2026-09-26T18:00:00-03:00",
  studentNumber: 17,
  warName: "Sales",
  role: "Aluno de Dia",
  location: "ABM",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.preview.mockResolvedValue({
    preview: { rows: [row], rosterIds: ["r"], assignmentIds: ["a"], cadetCount: 1 },
  });
  mocks.cancel.mockResolvedValue({ count: 1 });
});
async function review() {
  render(<CancelPermanencePanel programId="p" />);
  fireEvent.click(screen.getByText("Cancelar serviço do Dia ao 1º Ano"));
  fireEvent.click(screen.getByRole("button", { name: "Conferir cancelamento" }));
  await screen.findByRole("button", { name: "Cancelar 1 serviços do Dia ao 1º Ano" });
}
it("só cancela após mostrar nomes e confirmação explícita", async () => {
  await review();
  expect(screen.getByText(/Sales/)).toBeVisible();
  expect(mocks.cancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar 1 serviços do Dia ao 1º Ano" }));
  await screen.findByRole("status");
  expect(mocks.cancel).toHaveBeenCalledWith(
    expect.objectContaining({ programId: "p", rosterIds: ["r"], assignmentIds: ["a"] }),
  );
  expect(mocks.refresh).toHaveBeenCalledOnce();
});
it("troca de período exige nova conferência", async () => {
  await review();
  fireEvent.change(screen.getByLabelText("De (serviço do Dia ao 1º Ano)"), {
    target: { value: "2026-10-01" },
  });
  expect(screen.queryByRole("button", { name: /Cancelar 1/ })).not.toBeInTheDocument();
  expect(mocks.cancel).not.toHaveBeenCalled();
});
it("conflito invalida prévia e mostra erro sem sucesso", async () => {
  mocks.cancel.mockResolvedValue({ error: "A escala mudou. Confira novamente." });
  await review();
  fireEvent.click(screen.getByRole("button", { name: /Cancelar 1/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent("A escala mudou");
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /Cancelar 1/ })).not.toBeInTheDocument();
});
