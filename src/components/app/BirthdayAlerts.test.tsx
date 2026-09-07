import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BirthdayBanner } from "./BirthdayBanner";
import { BirthdayCard } from "./BirthdayCard";
import { StudentListCard } from "./StudentListCard";
import type { BirthdayAlert } from "@/modules/student-profile/domain/birthdayAlerts";

const todayAlert: BirthdayAlert = {
  studentId: "today",
  cadetName: "João Silva",
  birthDate: "2003-09-07",
  occurrenceDate: "2026-09-07",
  age: 23,
  period: "today",
};

const tomorrowAlert: BirthdayAlert = {
  studentId: "tomorrow",
  cadetName: "Maria Souza",
  birthDate: "2002-09-08",
  occurrenceDate: "2026-09-08",
  age: 24,
  period: "tomorrow",
};

describe("BirthdayCard", () => {
  it("exibe no dashboard somente os alertas recebidos de hoje e amanhã", () => {
    render(<BirthdayCard alerts={[todayAlert, tomorrowAlert]} />);

    expect(screen.getByRole("heading", { name: "Aniversários" })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(
      "Hoje: Cadete João Silva — 23 anos",
    );
    expect(items[1]).toHaveTextContent(
      "Amanhã: Cadete Maria Souza — fará 24 anos",
    );
    expect(screen.getByText("07/09/2026")).toBeInTheDocument();
    expect(screen.getByText("08/09/2026")).toBeInTheDocument();
  });

  it("mantém o card com estado vazio quando não há alertas", () => {
    render(<BirthdayCard alerts={[]} />);
    expect(screen.getByText("Nenhum aniversário hoje ou amanhã.")).toBeInTheDocument();
  });
});

describe("BirthdayBanner", () => {
  it("exibe aviso visual não bloqueante com nome, data e idade", () => {
    render(<BirthdayBanner alerts={[todayAlert, tomorrowAlert]} />);

    const banner = screen.getByRole("status", { name: "Avisos de aniversário" });
    expect(banner).toHaveTextContent("Hoje é aniversário do Cadete João Silva — 23 anos");
    expect(banner).toHaveTextContent("Amanhã é aniversário do Cadete Maria Souza — 24 anos");
    expect(banner).toHaveTextContent("07/09/2026");
    expect(banner).toHaveTextContent("08/09/2026");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("não renderiza aviso quando não há aniversário na janela", () => {
    const { container } = render(<BirthdayBanner alerts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("StudentListCard", () => {
  it("destaca discretamente o nome quando o aniversário é hoje ou amanhã", () => {
    render(
      <StudentListCard
        href="/coordenacao/alunos/today"
        studentNumber={1}
        warName="SILVA"
        fullName="João Silva"
        birthdayAlert={todayAlert}
      />,
    );

    expect(
      screen.getByLabelText("Aniversário hoje, 07/09/2026, 23 anos"),
    ).toBeInTheDocument();
  });
});
