import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WeeklyPlanningForm } from "./WeeklyPlanningForm";
import { previewInternshipWeek, publishInternshipWeek } from "./weeklyActions";
import type { WeeklyContext } from "../domain/weeklyPlanning";
vi.mock("./weeklyActions", () => ({
  previewInternshipWeek: vi.fn(),
  publishInternshipWeek: vi.fn(),
}));
const props = {
  program: { id: "program", starts_on: "2026-09-21", ends_on: "2026-12-13" },
  sites: [{ id: "gbm", name: "1º GBM" }],
  templates: [{ code: "SAB-USB-D12", name: "USB · manhã · 12h", start_weekdays: [6] }],
};
const slot = {
  id: "slot",
  date: "2026-09-26",
  templateCode: "SAB-USB-D12",
  siteId: "gbm",
  siteName: "1º GBM",
  startsAt: "2026-09-26T10:45:00Z",
  endsAt: "2026-09-26T22:45:00Z",
  blocked: {},
};
const context: WeeklyContext = {
  cadets: [
    { id: "a", student_number: 1, war_name: "ANA" },
    { id: "b", student_number: 2, war_name: "BRUNO" },
  ],
  assignments: [],
  commitments: [
    { studentId: "a", startsAt: "2026-09-25T09:00:00Z", endsAt: "2026-09-25T21:00:00Z" },
  ],
  timezone: "America/Belem",
  slots: [slot, { ...slot, id: "sunday", date: "2026-09-27" }],
};
function configure() {
  fireEvent.change(screen.getByLabelText("Data do serviço"), { target: { value: "2026-09-26" } });
  fireEvent.click(screen.getByLabelText("USB · manhã · 12h"));
  fireEvent.click(screen.getByRole("button", { name: "Gerar escala" }));
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(previewInternshipWeek).mockResolvedValue({ context });
  vi.mocked(publishInternshipWeek).mockResolvedValue({ count: 1 });
});
describe("fluxo simples de geração", () => {
  it("gera apenas o dia escolhido, exclui cadete sem 24h e aguarda publicação explícita", async () => {
    render(<WeeklyPlanningForm {...props} />);
    configure();
    const select = await screen.findByLabelText("Cadete 1º GBM 2026-09-26 SAB-USB-D12");
    expect(select).toHaveValue("b");
    expect(screen.getByRole("option", { name: /ANA/ })).toBeDisabled();
    expect(screen.queryByLabelText(/Cadete 1º GBM 2026-09-27/)).not.toBeInTheDocument();
    expect(publishInternshipWeek).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Publicar escala" }));
    await screen.findByText(/1 plantões publicados/);
    expect(publishInternshipWeek).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [expect.objectContaining({ date: "2026-09-26", studentId: "b", uniformCode: "3A" })],
      }),
    );
  });
  it("impede publicar quando ninguém tem o descanso necessário", async () => {
    vi.mocked(previewInternshipWeek).mockResolvedValue({
      context: { ...context, cadets: [context.cadets[0]!] },
    });
    render(<WeeklyPlanningForm {...props} />);
    configure();
    expect(await screen.findByRole("button", { name: "Publicar escala" })).toBeDisabled();
    expect(screen.getByText("Descanso anterior inferior a 24 horas")).toBeInTheDocument();
  });
  it("trocar a data descarta a prévia anterior", async () => {
    render(<WeeklyPlanningForm {...props} />);
    configure();
    await screen.findByRole("button", { name: "Publicar escala" });
    fireEvent.change(screen.getByLabelText("Data do serviço"), { target: { value: "2026-10-03" } });
    expect(screen.queryByRole("button", { name: "Publicar escala" })).not.toBeInTheDocument();
  });
  it("informa quando a data já está preenchida, sem publicar nada", async () => {
    vi.mocked(previewInternshipWeek).mockResolvedValue({ context: { ...context, slots: [] } });
    render(<WeeklyPlanningForm {...props} />);
    configure();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Nenhuma vaga nova"));
    expect(publishInternshipWeek).not.toHaveBeenCalled();
  });
});

it("publica cinco praias sem documento ou supervisor e exclui cadete sem descanso do GBM", async () => {
  const beachContext: WeeklyContext = {
    ...context,
    cadets: Array.from({ length: 6 }, (_, i) => ({
      id: `c${i}`,
      student_number: i + 1,
      war_name: `CADETE ${i}`,
    })),
    commitments: [],
    assignments: [
      {
        studentId: "c0",
        startsAt: "2026-09-25T21:00:00Z",
        endsAt: "2026-09-26T09:00:00Z",
        plannedMinutes: 720,
        approvedMinutes: null,
        active: true,
        activityCode: "usb",
        siteName: "1º GBM",
      },
    ],
    slots: Array.from({ length: 5 }, (_, i) => ({
      ...slot,
      id: `beach${i}`,
      siteId: `beach${i}`,
      siteName: `Praia ${i}`,
      templateCode: "GUARDA-VIDA",
      startsAt: "2026-09-26T17:00:00Z",
      endsAt: "2026-09-26T21:00:00Z",
    })),
  };
  vi.mocked(previewInternshipWeek).mockResolvedValue({ context: beachContext });
  vi.mocked(publishInternshipWeek).mockResolvedValue({ count: 5 });
  render(<WeeklyPlanningForm {...props} serviceType="praia" />);
  fireEvent.change(screen.getByLabelText("Data do serviço"), { target: { value: "2026-09-26" } });
  fireEvent.click(screen.getByRole("button", { name: "Gerar escala" }));
  const publish = await screen.findByRole("button", { name: "Publicar escala" });
  expect(publish).toBeEnabled();
  fireEvent.click(publish);
  await screen.findByText(/5 plantões publicados/);
  const lines = vi.mocked(publishInternshipWeek).mock.calls[0]![0].lines;
  expect(lines).toHaveLength(5);
  expect(new Set(lines.map((l) => l.studentId)).size).toBe(5);
  expect(
    lines.every(
      (l) =>
        l.studentId !== "c0" && !l.documentReference && !l.supervisorName && l.uniformCode === "4D",
    ),
  ).toBe(true);
});

it("mostra escala de GV existente e PDF em vez de erro de geração", async () => {
  vi.mocked(previewInternshipWeek).mockResolvedValue({
    context: {
      ...context,
      slots: [],
      recordedLifeguardDays: [
        { date: "2026-09-26", publishedCount: 5, draftCount: 0 },
        { date: "2026-09-27", publishedCount: 5, draftCount: 0 },
      ],
    },
  });
  render(<WeeklyPlanningForm {...props} serviceType="praia" />);
  fireEvent.change(screen.getByLabelText("Data do serviço"), { target: { value: "2026-09-26" } });
  fireEvent.click(screen.getByRole("button", { name: "Gerar escala" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Já existe uma escala");
  expect(screen.getByText("5 postos já publicados.")).toBeVisible();
  expect(screen.getByRole("link", { name: "Baixar PDF" })).toHaveAttribute(
    "href",
    "/api/estagio/escala?inicio=2026-09-26&fim=2026-09-26&servico=praia&assinatura=coordenador&download=1",
  );
  expect(screen.getByRole("link", { name: "Ver escala publicada" })).toHaveAttribute(
    "href",
    "/coordenacao/estagio/agenda?inicio=2026-09-26&fim=2026-09-26&modalidade=guarda_vida&situacao=ativos",
  );
  expect(screen.queryByText("Guarda-vidas · 27/09/2026")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Publicar escala" })).not.toBeInTheDocument();
  expect(publishInternshipWeek).not.toHaveBeenCalled();
});

it("reorganiza a prévia, preserva escolha manual ao gerar novamente e só publica após confirmação", async () => {
  const alternativeContext: WeeklyContext = {
    ...context,
    commitments: [],
    cadets: [...context.cadets, { id: "c", student_number: 3, war_name: "CARLOS" }],
    slots: [
      slot,
      {
        ...slot,
        id: "zz-second",
        siteId: "other",
        siteName: "2º GBM",
        blocked: { b: ["Impedimento"], c: ["Impedimento"] },
      },
    ],
  };
  vi.mocked(previewInternshipWeek).mockResolvedValue({ context: alternativeContext });
  vi.mocked(publishInternshipWeek).mockResolvedValue({ count: 2 });
  render(<WeeklyPlanningForm {...props} />);
  configure();
  const first = await screen.findByLabelText("Cadete 1º GBM 2026-09-26 SAB-USB-D12");
  const second = screen.getByLabelText("Cadete 2º GBM 2026-09-26 SAB-USB-D12");
  expect(first).toHaveValue("b");
  expect(second).toHaveValue("a");
  expect(screen.getByText(/Sugestões reorganizadas/)).toBeInTheDocument();
  fireEvent.change(first, { target: { value: "c" } });
  fireEvent.click(screen.getByRole("button", { name: "Gerar escala" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Cadete 1º GBM 2026-09-26 SAB-USB-D12")).toHaveValue("c"),
  );
  expect(screen.getByLabelText("Cadete 2º GBM 2026-09-26 SAB-USB-D12")).toHaveValue("a");
  expect(publishInternshipWeek).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Publicar escala" }));
  await screen.findByText(/2 plantões publicados/);
  expect(
    vi.mocked(publishInternshipWeek).mock.calls[0]![0].lines.map((line) => line.studentId),
  ).toEqual(["c", "a"]);
});

it("mantém seleção vazia manualmente e bloqueia publicação incompleta", async () => {
  render(<WeeklyPlanningForm {...props} />);
  configure();
  const select = await screen.findByLabelText("Cadete 1º GBM 2026-09-26 SAB-USB-D12");
  fireEvent.change(select, { target: { value: "" } });
  expect(screen.getByRole("button", { name: "Publicar escala" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Gerar escala" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Cadete 1º GBM 2026-09-26 SAB-USB-D12")).toHaveValue(""),
  );
  expect(screen.getByRole("button", { name: "Publicar escala" })).toBeDisabled();
  expect(publishInternshipWeek).not.toHaveBeenCalled();
});
