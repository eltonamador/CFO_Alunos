import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("./actions", () => ({ homologateInternshipAction: vi.fn() }));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormStatus: () => ({ pending: false }),
}));
import { HomologationForm } from "./HomologationForm";
const props = {
  assignmentId: "assignment",
  studentId: "student",
  startsAt: "2026-09-26T10:45:00Z",
  endsAt: "2026-09-27T10:45:00Z",
  plannedMinutes: 1440,
  supervisor: null,
  now: "2026-09-28T12:00:00Z",
};
describe("homologação simplificada", () => {
  it("preenche a jornada de 24h com virada de dia, sem digitação de horários", () => {
    const { container } = render(<HomologationForm {...props} />);
    expect((container.querySelector('[name="actualStartsAt"]') as HTMLInputElement).value).toBe(
      "2026-09-26T07:45",
    );
    expect((container.querySelector('[name="actualEndsAt"]') as HTMLInputElement).value).toBe(
      "2026-09-27T07:45",
    );
    expect((container.querySelector('[name="approvedHours"]') as HTMLInputElement).value).toBe(
      "24",
    );
    expect((container.querySelector('[name="attendanceStatus"]') as HTMLInputElement).value).toBe(
      "integral",
    );
  });
  it("ao registrar falta, zera a carga e desabilita horários; ao voltar ao padrão, restaura a jornada", () => {
    const { container } = render(<HomologationForm {...props} />);
    fireEvent.click(screen.getByLabelText(/Houve diferença na jornada/));
    fireEvent.change(screen.getByLabelText("Presença na ficha"), { target: { value: "falta" } });
    expect((container.querySelector('[name="actualStartsAt"]') as HTMLInputElement).disabled).toBe(
      true,
    );
    expect((container.querySelector('[name="approvedHours"]') as HTMLInputElement).value).toBe("0");
    fireEvent.click(screen.getByLabelText(/Houve diferença na jornada/));
    expect((container.querySelector('[name="approvedHours"]') as HTMLInputElement).value).toBe(
      "24",
    );
  });
  it("explica por que ainda não se homologa um plantão futuro", () => {
    render(<HomologationForm {...props} now="2026-09-23T12:00:00Z" />);
    expect(screen.getByRole("button", { name: "Confirmar ficha e homologar" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Plantão ainda não encerrado");
  });
  it("traz a saída antecipada para análise sem reduzir automaticamente as horas previstas", () => {
    const { container } = render(<HomologationForm {...props} earlyExitAt="2026-09-27T08:00:00Z" earlyExitReason="Instrução na ABM por orientação da Coordenação" />);
    expect(screen.getByLabelText("Saída antecipada informada pelo cadete")).toBeDisabled();
    expect((container.querySelector('[name="attendanceStatus"]') as HTMLInputElement).value).toBe("parcial");
    expect((container.querySelector('[name="actualEndsAt"]') as HTMLInputElement).value).toBe("2026-09-27T05:00");
    expect((container.querySelector('[name="approvedHours"]') as HTMLInputElement).value).toBe("24");
    expect(screen.getByLabelText("Justificativa da decisão")).toBeRequired();
  });
});
