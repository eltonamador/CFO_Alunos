import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { DiaryEntryActions, DiaryModeration, DiaryReactions } from "./DiaryControls";
import {
  deleteDiaryEntry,
  moderateDiaryEntry,
  setDiaryEntryVisibility,
  toggleDiaryReaction,
} from "./occurrenceDiaryActions";

vi.mock("./occurrenceDiaryActions", () => ({
  deleteDiaryEntry: vi.fn(),
  moderateDiaryEntry: vi.fn(),
  setDiaryEntryVisibility: vi.fn(),
  toggleDiaryReaction: vi.fn(),
}));

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
beforeEach(() => vi.clearAllMocks());

it("reage ao relato do colega e desfaz se não registrar", async () => {
  vi.mocked(toggleDiaryReaction).mockResolvedValueOnce({}).mockResolvedValueOnce({ error: "falha" });
  render(
    <DiaryReactions
      entryId={id}
      canReact
      summary={{ counts: { aplauso: 2, aprendi: 0 }, mine: [], total: 2 }}
    />,
  );
  const applause = screen.getByRole("button", { name: /Aplaudir/ });
  fireEvent.click(applause);
  await waitFor(() => expect(applause).toHaveAttribute("aria-pressed", "true"));
  expect(applause).toHaveTextContent("3");
  expect(toggleDiaryReaction).toHaveBeenCalledWith(id, "aplauso", true);

  const learned = screen.getByRole("button", { name: /Aprendi com isso/ });
  fireEvent.click(learned);
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível registrar a reação.");
  expect(learned).toHaveAttribute("aria-pressed", "false");
  expect(learned).not.toHaveTextContent("1");
});

it("no próprio relato mostra só as reações recebidas", () => {
  render(
    <DiaryReactions
      entryId={id}
      canReact={false}
      summary={{ counts: { aplauso: 1, aprendi: 0 }, mine: [], total: 1 }}
    />,
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByText(/Aplaudir: 1/)).toBeInTheDocument();
});

it("cadete compartilha, tira do mural e só exclui após confirmar", async () => {
  vi.mocked(setDiaryEntryVisibility).mockResolvedValue({});
  vi.mocked(deleteDiaryEntry).mockResolvedValue({});
  const confirm = vi.spyOn(window, "confirm")
    .mockReturnValueOnce(true)
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true);
  const { rerender } = render(<DiaryEntryActions id={id} status="pessoal" />);
  expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute(
    "href",
    `/aluno/estagio/ocorrencias/${id}`,
  );
  fireEvent.click(screen.getByRole("button", { name: "Compartilhar com a turma" }));
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining("as fotos do relato"));
  await waitFor(() => expect(setDiaryEntryVisibility).toHaveBeenCalledWith(id, "compartilhado"));

  rerender(<DiaryEntryActions id={id} status="rascunho" />);
  expect(screen.getByRole("link", { name: "Continuar" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
  expect(deleteDiaryEntry).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
  await waitFor(() => expect(deleteDiaryEntry).toHaveBeenCalledWith(id));
  confirm.mockRestore();
});

it("Coordenação destaca ou oculta com motivo opcional", async () => {
  vi.mocked(moderateDiaryEntry).mockResolvedValue({});
  render(<DiaryModeration id={id} featured={false} hidden={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Destacar" }));
  await waitFor(() =>
    expect(moderateDiaryEntry).toHaveBeenCalledWith({ id, action: "destacar", reason: undefined }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Ocultar…" }));
  fireEvent.change(screen.getByLabelText("Motivo da ocultação"), {
    target: { value: "Dados da vítima" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Ocultar do mural" }));
  await waitFor(() =>
    expect(moderateDiaryEntry).toHaveBeenLastCalledWith({
      id,
      action: "ocultar",
      reason: "Dados da vítima",
    }),
  );
});
