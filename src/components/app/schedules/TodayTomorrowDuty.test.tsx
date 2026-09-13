import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TodayTomorrowDuty } from "./TodayTomorrowDuty";

const overview = {
  today: "2026-09-13",
  tomorrow: "2026-09-14",
  unavailable: false,
  entries: [
    { id: "a", date: "2026-09-13", person: "CAP JOSIANE", duty: "ODA · Diurno 07:00–19:00", mine: false },
    { id: "b", date: "2026-09-14", person: "CAP AMADOR", duty: "ODA · Tarde 13:00–19:00", mine: true },
    { id: "c", date: "2026-09-14", person: "TEN CECÍLIA", duty: "ODA · Manhã 07:00–13:00", mine: false },
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
});
