import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InternshipProgress } from "./InternshipProgress";

describe("painel de progresso do estágio", () => {
  it("separa avanço do período, horas homologadas e plantões encerrados", () => {
    render(
      <InternshipProgress
        startsOn="2026-09-26"
        endsOn="2026-09-30"
        validatedMinutes={720}
        requiredMinutes={1500}
        plannedMinutes={1440}
        shiftEnds={["2026-09-28T09:00:00Z", "2026-09-29T21:00:00Z"]}
        now={new Date("2026-09-29T18:00:00Z")}
      />,
    );
    expect(screen.getByRole("progressbar", { name: "Período do estágio" })).toHaveAttribute("aria-valuenow", "73");
    expect(screen.getByRole("progressbar", { name: "Horas homologadas para o mínimo" })).toHaveAttribute("aria-valuenow", "48");
    expect(screen.getByText(/1\/2/)).toBeInTheDocument();
    expect(screen.getByText(/Faltam 13 h 00 min/)).toBeInTheDocument();
  });
});
