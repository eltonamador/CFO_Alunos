import type * as ReactDOM from "react-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningForm } from "./PlanningForm";
import { suggestInternshipRotation } from "./rotationActions";
import type { RotationCandidate } from "../domain/rotation";

vi.mock("./rotationActions", () => ({ suggestInternshipRotation: vi.fn() }));
vi.mock("./actions", () => ({
  scheduleGbmTemplateAction: vi.fn(),
  scheduleLifeguardDayAction: vi.fn(),
}));
vi.mock("react-dom", async (original) => ({
  ...(await original<typeof ReactDOM>()),
  useFormStatus: () => ({ pending: false }),
}));
const program = { id: "program", starts_on: "2026-09-26", ends_on: "2026-12-13" };
const candidates: RotationCandidate[] = Array.from({ length: 6 }, (_, i) => ({
  id: `cadet-${i}`,
  war_name: `Cadete ${i}`,
  student_number: i + 1,
  permanenceMinutes: 0, unknownDutyDays: 0, serviceDays: 0, combinedMinutes: 0,
  sameActivityShifts: 0, sameSiteShifts: 0,
  approvedMinutes: 0,
  reservedMinutes: i * 480,
  committedMinutes: i * 480,
  projectedMinutes: (i + 1) * 480,
  restBeforeMinutes: null,
  restAfterMinutes: null,
  lastServiceEndsAt: null,
  weekendCount: 0, weekendMinutes: 0, weekdayMinutes: 0, projectedWeekendCount: 1,
  projectedWeekendStreak: 1, isWeekendService: true, minimumRestOccurrences: 0,
  projectedMinimumRestMaximum: 0, minimumRestLimitExceeded: false,
  reasons: i === 5 ? ["Impedimento operacional ativo"] : [],
}));
const sites = Array.from({ length: 5 }, (_, i) => ({
  id: `site-${i}`,
  code: `praia_${i + 1}`,
  name: `Praia ${i + 1}`,
}));
const setup = () => {
  render(<PlanningForm program={program} cadets={candidates} sites={sites} lifeguard />);
  fireEvent.change(screen.getByLabelText("Data (sábado ou domingo)"), {
    target: { value: "2026-10-10" },
  });
};
beforeEach(() => {
  vi.clearAllMocks();
});
describe("planejamento com rodízio", () => {
  it("preenche cinco postos distintos e permite trocar manualmente", async () => {
    vi.mocked(suggestInternshipRotation).mockResolvedValue({ candidates });
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Consultar sugestões de rodízio" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Preencher cinco postos com sugestões" }),
    );
    for (let i = 0; i < 5; i++)
      expect(screen.getByLabelText(`Praia ${i + 1}`, { selector: "select" })).toHaveValue(
        `cadet-${i}`,
      );
    fireEvent.change(screen.getByLabelText("Praia 1", { selector: "select" }), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Praia 2", { selector: "select" }), {
      target: { value: "cadet-0" },
    });
    expect(screen.getByLabelText("Praia 2", { selector: "select" })).toHaveValue("cadet-0");
    expect(
      screen
        .getAllByRole("option", { name: /Cadete 5/ })
        .every((option) => (option as HTMLOptionElement).disabled),
    ).toBe(true);
  });
  it("não preenche um dia com menos de cinco disponíveis", async () => {
    vi.mocked(suggestInternshipRotation).mockResolvedValue({ candidates: candidates.slice(0, 3) });
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Consultar sugestões de rodízio" }));
    expect(
      await screen.findByRole("button", { name: "Preencher cinco postos com sugestões" }),
    ).toBeDisabled();
    expect(screen.getByText(/Não há cadetes disponíveis suficientes/)).toBeInTheDocument();
  });
  it("descarta consulta antiga se a data muda durante o carregamento", async () => {
    let resolve!: (result: { candidates: RotationCandidate[] }) => void;
    vi.mocked(suggestInternshipRotation).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Consultar sugestões de rodízio" }));
    fireEvent.change(screen.getByLabelText("Data (sábado ou domingo)"), {
      target: { value: "2026-10-11" },
    });
    await act(async () => {
      resolve({ candidates });
    });
    expect(
      screen.queryByRole("button", { name: "Preencher cinco postos com sugestões" }),
    ).not.toBeInTheDocument();
  });
  it("explica erro de consulta sem inventar sugestões", async () => {
    vi.mocked(suggestInternshipRotation).mockRejectedValue(new Error("network"));
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Consultar sugestões de rodízio" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível consultar"),
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
