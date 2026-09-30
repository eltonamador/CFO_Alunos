import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { record, refresh, locate } = vi.hoisted(() => ({
  record: vi.fn(),
  refresh: vi.fn(),
  locate: vi.fn(),
}));
vi.mock("./pointActions", () => ({ recordInternshipPoint: record }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
import { AttendancePoint } from "./AttendancePoint";
import type { AttendancePointData } from "../domain/attendance";
const entry = (recordedAt: string): AttendancePointData => ({
  id: "entry",
  point_type: "entrada",
  recorded_at: recordedAt,
  latitude: 0,
  longitude: -51,
  accuracy_m: 10,
  distance_m: null,
  location_status: "sem_configuracao",
  supervisor_name: null,
});
const endsAt = () => new Date(Date.now() + 12 * 60 * 60_000).toISOString();
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: locate },
  });
});
describe("ponto com GPS", () => {
  it("coleta apenas ao apertar o botão e envia coordenadas, precisão e supervisor, sem horário do aparelho", async () => {
    locate.mockImplementation((success) =>
      success({ coords: { latitude: 0.03, longitude: -51.07, accuracy: 15 } }),
    );
    record.mockResolvedValue({ success: true });
    render(
      <AttendancePoint
        assignmentId="assignment"
        points={[]}
        available
        supervisor={null}
        endsAt={endsAt()}
      />,
    );
    expect(locate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Oficial responsável pelo serviço/), {
      target: { value: "Tenente Silva" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Registrar entrada com GPS" }));
    await waitFor(() =>
      expect(record).toHaveBeenCalledWith({
        assignmentId: "assignment",
        pointType: "entrada",
        latitude: 0.03,
        longitude: -51.07,
        accuracy: 15,
        supervisorName: "Tenente Silva",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Entrada registrada");
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("falha de GPS orienta o cadete e não registra um ponto fictício", async () => {
    locate.mockImplementation((_success, fail) => fail());
    render(
      <AttendancePoint
        assignmentId="assignment"
        points={[]}
        available
        supervisor={null}
        endsAt={endsAt()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar entrada com GPS" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Não foi possível obter o GPS");
    expect(record).not.toHaveBeenCalled();
  });
  it("bloqueia a saída após uma entrada recente e mostra o plantão em andamento", () => {
    render(
      <AttendancePoint
        assignmentId="assignment"
        points={[entry(new Date().toISOString())]}
        available
        supervisor={null}
        endsAt={endsAt()}
      />,
    );
    expect(screen.getByRole("button", { name: "Registrar saída antecipada com GPS" })).toBeDisabled();
    expect(screen.getByText(/plantão em andamento/i)).toBeInTheDocument();
    expect(locate).not.toHaveBeenCalled();
  });
  it("libera a saída perto do término, depois de 30 minutos de entrada", async () => {
    render(
      <AttendancePoint
        assignmentId="assignment"
        points={[entry(new Date(Date.now() - 31 * 60_000).toISOString())]}
        available
        supervisor={null}
        endsAt={new Date(Date.now() + 30 * 60_000).toISOString()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Registrar saída com GPS" })).toBeEnabled(),
    );
  });
  it("permite registrar a saída antecipada para instrução ABM após 30 minutos, sem homologar carga", async () => {
    locate.mockImplementation((success) =>
      success({ coords: { latitude: 0.03, longitude: -51.07, accuracy: 15 } }),
    );
    record.mockResolvedValue({ success: true });
    render(
      <AttendancePoint
        assignmentId="assignment"
        points={[entry(new Date(Date.now() - 31 * 60_000).toISOString())]}
        available
        supervisor={null}
        endsAt={endsAt()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Motivo da saída antecipada"), {
      target: { value: "instrucao" },
    });
    const button = screen.getByRole("button", { name: "Registrar saída antecipada com GPS" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(record).toHaveBeenCalledWith(expect.objectContaining({
      assignmentId: "assignment",
      pointType: "saida",
      earlyExitReason: "Saída antecipada para instrução na ABM, por orientação da Coordenação.",
    })));
    expect(await screen.findByRole("status")).toHaveTextContent("A Coordenação conferirá");
  });
});
