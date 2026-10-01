import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { newDiaryForm, PRIVACY_HINT, type DiaryShift } from "../domain/occurrenceDiary";
import { OccurrenceDiaryForm } from "./OccurrenceDiaryForm";
import { saveDiaryEntry } from "./occurrenceDiaryActions";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./occurrenceDiaryActions", () => ({ saveDiaryEntry: vi.fn() }));

const shift: DiaryShift = {
  assignment_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  activity_code: "usb",
  activity_name: "USB—APH",
  site_name: "1º GBM",
  starts_at: "2026-09-25T19:45:00-03:00",
  ends_at: "2026-09-26T07:45:00-03:00",
};
const props = {
  initial: newDiaryForm(null, Date.parse("2026-09-26T10:00:00-03:00")),
  shifts: [shift],
  classmates: [
    { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", war_name: "COLEGA", student_number: 2 },
  ],
};
const summary = () => screen.getByLabelText("O que aconteceu");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(saveDiaryEntry).mockResolvedValue({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" });
});
afterEach(() => vi.useRealTimers());

it("exige só a frase do que aconteceu e salva no diário com um toque", async () => {
  render(<OccurrenceDiaryForm {...props} />);
  expect(screen.getByText(PRIVACY_HINT)).toBeInTheDocument();
  expect(screen.getByText(/não conta horas e não é avaliação/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Salvar no meu diário" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Conte em uma frase o que aconteceu.");
  expect(saveDiaryEntry).not.toHaveBeenCalled();

  fireEvent.change(summary(), { target: { value: "Queda de moto, vítima consciente" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar no meu diário" }));
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith("/aluno/estagio/ocorrencias?resultado=pessoal"),
  );
  expect(saveDiaryEntry).toHaveBeenCalledWith(
    expect.objectContaining({
      id: null,
      intent: "pessoal",
      summary: "Queda de moto, vítima consciente",
      severity: "",
      companionIds: [],
    }),
    { autosave: false },
  );
});

it("compartilha com a turma sem outros campos obrigatórios", async () => {
  render(<OccurrenceDiaryForm {...props} />);
  fireEvent.change(summary(), { target: { value: "Salvamento na praia" } });
  fireEvent.click(screen.getByRole("button", { name: "Compartilhar com a turma" }));
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith("/aluno/estagio/ocorrencias?resultado=compartilhado"),
  );
  expect(vi.mocked(saveDiaryEntry).mock.calls[0]?.[0]).toMatchObject({ intent: "compartilhado" });
});

it("salva o rascunho sozinho e continua no mesmo registro", async () => {
  vi.useFakeTimers();
  const replace = vi.spyOn(window.history, "replaceState");
  render(<OccurrenceDiaryForm {...props} />);
  fireEvent.change(summary(), { target: { value: "Queda" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(saveDiaryEntry).toHaveBeenLastCalledWith(
    expect.objectContaining({ id: null, intent: "rascunho", summary: "Queda" }),
    { autosave: true },
  );
  expect(screen.getByText(/Rascunho salvo automaticamente às/)).toBeInTheDocument();
  expect(replace).toHaveBeenCalledWith(
    null,
    "",
    "/aluno/estagio/ocorrencias/cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  );

  fireEvent.change(summary(), { target: { value: "Queda de moto" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(saveDiaryEntry).toHaveBeenCalledTimes(2);
  expect(saveDiaryEntry).toHaveBeenLastCalledWith(
    expect.objectContaining({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      summary: "Queda de moto",
    }),
    { autosave: true },
  );
  expect(push).not.toHaveBeenCalled();
  replace.mockRestore();
});

it("mantém o texto quando o rascunho não salva", async () => {
  vi.useFakeTimers();
  vi.mocked(saveDiaryEntry).mockRejectedValue(new Error("offline"));
  render(<OccurrenceDiaryForm {...props} />);
  fireEvent.change(summary(), { target: { value: "Sem sinal no plantão" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(screen.getByText(/seu texto continua aqui/)).toBeInTheDocument();
  expect(summary()).toHaveValue("Sem sinal no plantão");
});

it("ao escolher o plantão sugere a data e a viatura", () => {
  render(<OccurrenceDiaryForm {...props} />);
  fireEvent.change(screen.getByLabelText("Plantão (opcional)"), {
    target: { value: shift.assignment_id },
  });
  expect(screen.getByLabelText("Data")).toHaveValue("2026-09-25");
  expect(screen.getByLabelText("USB")).toBeChecked();
  fireEvent.click(screen.getByLabelText("Outro"));
  expect(screen.getByLabelText("Qual tipo?")).toBeInTheDocument();
});

it("permite combinar dois tipos e duas viaturas no mesmo relato", async () => {
  render(<OccurrenceDiaryForm {...props} />);
  expect(screen.getByLabelText("USB")).toBeInTheDocument();
  expect(screen.getByLabelText("AR")).toBeInTheDocument();
  expect(screen.getByLabelText("ABT")).toBeInTheDocument();
  expect(screen.getByLabelText("AT")).toBeInTheDocument();
  expect(screen.queryByLabelText("SB")).not.toBeInTheDocument();
  fireEvent.change(summary(), { target: { value: "Fogo em residência e vegetação" } });
  fireEvent.click(screen.getByLabelText("Incêndio urbano"));
  fireEvent.click(screen.getByLabelText("Incêndio em vegetação"));
  fireEvent.click(screen.getByLabelText("USB"));
  fireEvent.click(screen.getByLabelText("ABT"));
  fireEvent.click(screen.getByRole("button", { name: "Salvar no meu diário" }));
  await waitFor(() => expect(saveDiaryEntry).toHaveBeenCalled());
  expect(vi.mocked(saveDiaryEntry).mock.calls.at(-1)?.[0]).toMatchObject({
    occurrenceTypes: ["incendio_urbano", "incendio_vegetacao"],
    vehicles: ["USB", "ABT"],
  });
});

it("registro já compartilhado não usa rascunho automático e pode sair do mural", async () => {
  vi.useFakeTimers();
  render(
    <OccurrenceDiaryForm
      {...props}
      entryId="cccccccc-cccc-4ccc-8ccc-cccccccccccc"
      status="compartilhado"
      initial={{ ...props.initial, summary: "Relato publicado" }}
    />,
  );
  fireEvent.change(summary(), { target: { value: "Relato publicado e revisado" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(saveDiaryEntry).not.toHaveBeenCalled();
  expect(screen.queryByText(/salvo automaticamente/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Tirar do mural" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(saveDiaryEntry).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      intent: "pessoal",
      summary: "Relato publicado e revisado",
    }),
    { autosave: false },
  );
});
