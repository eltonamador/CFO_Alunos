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
  site_radius_m: null,
  location_status: "sem_configuracao",
  supervisor_name: null,
});
const endsAt = () => new Date(Date.now() + 12 * 60 * 60_000).toISOString();
beforeEach(() => {
  vi.resetAllMocks();
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
    record.mockResolvedValue({
      success: true,
      point: {
        ...entry(new Date().toISOString()),
        location_status: "dentro",
        distance_m: 20,
        site_radius_m: 200,
      },
    });
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
    expect(locate).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });
  it.each([
    [1, "A permissão de localização está bloqueada"],
    [2, "O aparelho não conseguiu determinar sua posição"],
    [3, "O GPS não respondeu a tempo"],
  ])("explica a falha de GPS %s sem registrar ponto", async (code, guidance) => {
    locate.mockImplementation((_success, fail) => fail({ code }));
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
    expect(await screen.findByRole("status")).toHaveTextContent(guidance);
    expect(record).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Registrar entrada com GPS" })).toBeEnabled();
  });
  it.each(["entrada", "saída", "saída antecipada"])(
    "registra %s fora do raio e mostra o alerta imediatamente, sem depender da recarga",
    async (scenario) => {
      const kind = scenario === "entrada" ? "entrada" : "saida";
      const previousEntry = entry(new Date(Date.now() - 31 * 60_000).toISOString());
      previousEntry.location_status = "dentro";
      const saved = {
        ...entry(new Date().toISOString()),
        id: "new-point",
        point_type: kind,
        location_status: "fora",
        distance_m: 1500,
        site_radius_m: 200,
      };
      locate.mockImplementation((success) =>
        success({ coords: { latitude: 0.03, longitude: -51.07, accuracy: 15 } }),
      );
      record.mockResolvedValue({ success: true, point: saved });
      render(
        <AttendancePoint
          assignmentId="assignment"
          points={kind === "entrada" ? [] : [previousEntry]}
          available
          supervisor={null}
          endsAt={
            scenario === "saída" ? new Date(Date.now() + 30 * 60_000).toISOString() : endsAt()
          }
        />,
      );
      if (scenario === "saída antecipada") {
        fireEvent.change(screen.getByLabelText("Motivo da saída antecipada"), {
          target: { value: "instrucao" },
        });
      }
      const button = screen.getByRole("button", { name: `Registrar ${scenario} com GPS` });
      await waitFor(() => expect(button).toBeEnabled());
      fireEvent.click(button);
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        `${kind === "entrada" ? "Entrada" : "Saída"} registrada fora do raio`,
      );
      expect(alert).toHaveTextContent("registre a entrada e a saída dentro do raio");
      expect(alert).toHaveTextContent("Não há desconto automático das horas previstas");
      expect(screen.getByText(/distância aproximada do local 1500 m/)).toHaveTextContent(
        "raio 200 m",
      );
      expect(record).toHaveBeenCalledOnce();
      expect(refresh).toHaveBeenCalledOnce();
      expect(
        screen.queryByRole("button", { name: `Registrar ${scenario} com GPS` }),
      ).not.toBeInTheDocument();
    },
  );
  it("mantém o alerta após reabrir a página e explica a incerteza perto do limite do raio", () => {
    render(
      <AttendancePoint
        assignmentId="assignment"
        points={[
          {
            ...entry(new Date().toISOString()),
            location_status: "fora",
            distance_m: 205,
            accuracy_m: 10,
            site_radius_m: 200,
          },
        ]}
        available
        supervisor={null}
        endsAt={endsAt()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A margem de precisão do GPS alcança o raio",
    );
    expect(locate).not.toHaveBeenCalled();
  });
  it.each([
    ["impreciso", "Isso não comprova que você estava fora do local"],
    ["sem_configuracao", "Isso não indica que você estava fora do raio"],
  ])("distingue %s de uma marcação fora do raio", (status, guidance) => {
    render(
      <AttendancePoint
        assignmentId="assignment"
        points={[{ ...entry(new Date().toISOString()), location_status: status }]}
        available
        supervisor={null}
        endsAt={endsAt()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(guidance);
    expect(screen.getByRole("alert")).not.toHaveTextContent("registrada fora do raio");
  });
  it("preserva a exceção de praia sem alerta de raio fixo", () => {
    render(
      <AttendancePoint
        assignmentId="assignment"
        points={[{ ...entry(new Date().toISOString()), location_status: "praia_livre" }]}
        available
        supervisor={null}
        endsAt={endsAt()}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(/Praia — posição registrada sem raio fixo/)).toBeInTheDocument();
  });
  it("confirma a gravação mesmo sem conseguir consultar o resultado geográfico", async () => {
    locate.mockImplementation((success) =>
      success({ coords: { latitude: 0.03, longitude: -51.07, accuracy: 15 } }),
    );
    record.mockResolvedValue({ success: true, point: null });
    render(
      <AttendancePoint
        assignmentId="assignment"
        points={[]}
        available
        supervisor={null}
        endsAt={endsAt()}
      />,
    );
    const button = screen.getByRole("button", { name: "Registrar entrada com GPS" });
    fireEvent.click(button);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Seu ponto foi salvo, mas não foi possível consultar a conferência do GPS",
    );
    expect(button).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("mostra falha do servidor sem confirmar um ponto e permite tentar novamente", async () => {
    locate.mockImplementation((success) =>
      success({ coords: { latitude: 0.03, longitude: -51.07, accuracy: 15 } }),
    );
    record.mockResolvedValue({ error: "Não foi possível registrar seu ponto." });
    render(
      <AttendancePoint
        assignmentId="assignment"
        points={[]}
        available
        supervisor={null}
        endsAt={endsAt()}
      />,
    );
    const button = screen.getByRole("button", { name: "Registrar entrada com GPS" });
    fireEvent.click(button);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Não foi possível registrar seu ponto.",
    );
    expect(button).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
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
    expect(
      screen.getByRole("button", { name: "Registrar saída antecipada com GPS" }),
    ).toBeDisabled();
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
    await waitFor(() =>
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({
          assignmentId: "assignment",
          pointType: "saida",
          earlyExitReason: "Saída antecipada para instrução na ABM, por orientação da Coordenação.",
        }),
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("A Coordenação conferirá");
  });
});
