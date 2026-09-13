import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TodayTomorrowDuty } from "./TodayTomorrowDuty";
import type { DutyOverview } from "@/modules/schedule-repository/infrastructure/dashboardQueries";

const overview: DutyOverview = {
  today: "2026-09-13",
  tomorrow: "2026-09-14",
  unavailable: false,
  entries: [
    { id: "a", kind: "officer", date: "2026-09-13", person: "CAP JOSIANE", duty: "ODA · Diurno 07:00–19:00", mine: false },
    { id: "b", kind: "officer", date: "2026-09-14", person: "CAP AMADOR", duty: "ODA · Tarde 13:00–19:00", mine: true },
    { id: "c", kind: "officer", date: "2026-09-14", person: "TEN CECÍLIA", duty: "ODA · Manhã 07:00–13:00", mine: false },
  ],
};

describe("serviço de hoje e amanhã no painel", () => {
  it("destaca o serviço do usuário e mostra os outros militares", () => {
    render(<TodayTomorrowDuty overview={overview} schedulesHref="/coordenacao/escalas" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Você está de serviço amanhã");
    expect(screen.getByText("CAP JOSIANE")).toBeVisible();
    expect(screen.getByText("TEN CECÍLIA")).toBeVisible();
    expect(screen.getByRole("link", { name: /Ver escalas/ })).toHaveAttribute("href", "/coordenacao/escalas");
  });

  it("não cria alerta pessoal quando o usuário não está na escala", () => {
    render(<TodayTomorrowDuty overview={{ ...overview, entries: overview.entries.map((entry) => ({ ...entry, mine: false })) }} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("CAP AMADOR")).toBeVisible();
  });

  it("exibe cadetes e oficiais juntos e preserva dois turnos do mesmo cadete", () => {
    render(<TodayTomorrowDuty overview={{ ...overview, entries: [
      ...overview.entries.map((entry) => ({ ...entry, mine: false })),
      { id: "d", kind: "cadet", date: overview.today, person: "GIOVANNA — 13", duty: "Dia ao 1º Ano · 1º turno", mine: true },
      { id: "e", kind: "cadet", date: overview.today, person: "GIOVANNA — 13", duty: "Dia ao 1º Ano · 2º turno", mine: true },
      { id: "f", kind: "cadet", date: overview.today, person: "JULIANA — 30", duty: "Apoio 1 · 1º turno", mine: false },
    ] }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Você está de serviço hoje");
    expect(screen.getByRole("alert")).toHaveTextContent("1º turno");
    expect(screen.getByRole("alert")).toHaveTextContent("2º turno");
    expect(screen.getByRole("heading", { name: "Cadetes" })).toBeVisible();
    expect(screen.getAllByRole("heading", { name: "Oficiais e coordenação" })).toHaveLength(2);
    expect(screen.getAllByText("GIOVANNA — 13")).toHaveLength(2);
    expect(screen.getByText("JULIANA — 30")).toBeVisible();
    expect(screen.getByText("CAP JOSIANE")).toBeVisible();
  });
});
