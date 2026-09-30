import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./evaluationActions", () => ({ reviewEvaluation: vi.fn() }));
import { EvaluationReview } from "./EvaluationReview";

describe("conferência da avaliação", () => {
  it("pede só os nove dígitos do celular do DDD 96 e permite outro DDD", () => {
    render(<EvaluationReview id="avaliacao" assignmentId="plantao" needsWhatsApp />);
    fireEvent.change(screen.getByLabelText("O que deseja fazer?"), { target: { value: "liberada" } });
    const local = screen.getByLabelText("Celular que enviou a confirmação") as HTMLInputElement;
    expect(local.pattern).toBe("9[0-9]{8}");
    expect(local.maxLength).toBe(9);
    expect(screen.getByText("+55 (96)")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("O oficial usa outro DDD"));
    const other = screen.getByLabelText("Celular que enviou a confirmação") as HTMLInputElement;
    expect(other.pattern).toBe("[0-9]{11}");
    expect(other.maxLength).toBe(11);
  });

  it("exige motivo para solicitar nova avaliação sem pedir telefone", () => {
    render(<EvaluationReview id="avaliacao" assignmentId="plantao" needsWhatsApp />);
    fireEvent.change(screen.getByLabelText("O que deseja fazer?"), { target: { value: "devolvida" } });
    expect(screen.getByLabelText("Motivo para pedir nova avaliação")).toBeRequired();
    expect(screen.queryByLabelText("Celular que enviou a confirmação")).not.toBeInTheDocument();
  });

  it("sugere o telefone do convite e permite corrigir o remetente", () => {
    render(<EvaluationReview id="avaliacao" assignmentId="plantao" needsWhatsApp recipientContact="+55 (96) 99999-9999" />);
    fireEvent.change(screen.getByLabelText("O que deseja fazer?"), { target: { value: "liberada" } });
    const input = screen.getByLabelText("Celular que enviou a confirmação") as HTMLInputElement;
    expect(input.value).toBe("999999999");
    fireEvent.change(input, { target: { value: "999999998" } });
    expect(input.value).toBe("999999998");
    expect(screen.getByText(/Contato do convite sugerido/)).toBeInTheDocument();
  });

  it("sugere outro DDD quando o convite traz número de outro estado", () => {
    render(<EvaluationReview id="avaliacao" assignmentId="plantao" needsWhatsApp recipientContact="+55 (11) 91234-5678" />);
    fireEvent.change(screen.getByLabelText("O que deseja fazer?"), { target: { value: "liberada" } });
    const input = screen.getByLabelText("Celular que enviou a confirmação") as HTMLInputElement;
    expect(input.value).toBe("11912345678");
    expect(input.pattern).toBe("[0-9]{11}");
    expect(screen.getByLabelText("O oficial usa outro DDD")).toBeChecked();
  });

  it("não interpreta os dígitos de um e-mail como celular", () => {
    render(<EvaluationReview id="avaliacao" assignmentId="plantao" needsWhatsApp recipientContact="oficial991997784@exemplo.com" />);
    fireEvent.change(screen.getByLabelText("O que deseja fazer?"), { target: { value: "liberada" } });
    expect((screen.getByLabelText("Celular que enviou a confirmação") as HTMLInputElement).value).toBe("");
  });
});
