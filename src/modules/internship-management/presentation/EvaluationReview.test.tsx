import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("./evaluationActions", () => ({ reviewEvaluation: vi.fn() }));
import { EvaluationReview } from "./EvaluationReview";
import { reviewEvaluation } from "./evaluationActions";

const mockedReviewEvaluation = vi.mocked(reviewEvaluation);

beforeEach(() => {
  refresh.mockReset();
  mockedReviewEvaluation.mockReset();
});

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

  it("exibe o erro da ação sem atualizar a página", async () => {
    mockedReviewEvaluation.mockResolvedValue({ error: "Informe o motivo da devolução." });
    render(<EvaluationReview id="avaliacao" assignmentId="plantao" needsWhatsApp={false} />);
    fireEvent.change(screen.getByLabelText("O que deseja fazer?"), {
      target: { value: "devolvida" },
    });
    fireEvent.change(screen.getByLabelText("Motivo para pedir nova avaliação"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Pedir nova avaliação" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Informe o motivo da devolução.");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("atualiza a página somente depois de registrar a decisão", async () => {
    mockedReviewEvaluation.mockResolvedValue({ success: true });
    render(<EvaluationReview id="avaliacao" assignmentId="plantao" needsWhatsApp={false} />);
    fireEvent.change(screen.getByLabelText("O que deseja fazer?"), {
      target: { value: "devolvida" },
    });
    fireEvent.change(screen.getByLabelText("Motivo para pedir nova avaliação"), {
      target: { value: "Solicitar correção da ficha" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Pedir nova avaliação" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });
});
