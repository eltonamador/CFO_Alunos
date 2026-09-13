import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type * as ReactDOM from "react-dom";
import type { ScheduleDocumentView } from "@/modules/schedule-repository/application/types";
import { ScheduleProcessingStatus } from "./ScheduleProcessingStatus";

vi.mock("@/modules/schedule-repository/presentation/actions", () => ({
  reprocessScheduleAction: vi.fn(),
}));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactDOM>()),
  useFormState: () => [null, undefined],
}));

function document(overrides: Partial<ScheduleDocumentView> = {}): ScheduleDocumentView {
  return {
    id: "document-1",
    publication_status: "published",
    processing_status: "processed_with_issues",
    review_count: 0,
    candidates: [],
    latest_run: {
      attempt: 2,
      method: "auto",
      status: "partial",
      error_code: null,
      error_message: null,
      metrics: { candidateCount: 0, extractedText: "10/09/2026 CAP SILVA" },
    },
    ...overrides,
  } as ScheduleDocumentView;
}

describe("estado do processamento de escalas", () => {
  it("mostra o texto extraído quando nenhum aluno foi associado", () => {
    render(<ScheduleProcessingStatus document={document()} />);
    expect(screen.getByText("10/09/2026 CAP SILVA")).toBeVisible();
    expect(screen.getByText(/Nenhum aluno da turma foi identificado/)).toBeVisible();
  });

  it("explica a falha do leitor sem chamar o PDF de inválido", () => {
    render(
      <ScheduleProcessingStatus
        document={document({
          processing_status: "failed",
          latest_run: {
            attempt: 1,
            method: "auto",
            status: "failed",
            error_code: "PDF_WORKER_UNAVAILABLE",
            error_message: "Setting up fake worker failed",
            metrics: {},
          } as ScheduleDocumentView["latest_run"],
        })}
      />,
    );
    expect(screen.getByText("O leitor de PDF não está disponível no servidor.")).toBeVisible();
    expect(screen.getByText(/Setting up fake worker failed/)).toBeVisible();
  });

  it("mostra a matrícula presente na linha extraída do PDF", () => {
    render(
      <ScheduleProcessingStatus
        document={document({
          processing_status: "processed",
          candidates: [
            {
              id: "candidate-1",
              duty_date: "2026-09-14",
              raw_name: "RIVALDO",
              duty_function: "Escala de Aluno de Dia",
              match_status: "auto_confirmed",
              original_line: "14/09/2026 01 10163140 CADETE RIVALDO ALUNO DE DIA",
            } as ScheduleDocumentView["candidates"][number],
          ],
        })}
      />,
    );
    expect(screen.getByText("Matrícula no PDF")).toBeVisible();
    expect(screen.getByText("10163140")).toBeVisible();
  });
});
