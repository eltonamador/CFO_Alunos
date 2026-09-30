import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  EvaluationWhatsAppDelivery,
  type EvaluationWhatsAppDeliveryData,
} from "./EvaluationWhatsAppDelivery";

const delivery: EvaluationWhatsAppDeliveryData = {
  evaluation_id: "127c3d38-e9c5-46e5-93cb-32de922e25cb",
  protocol: "AV-127C3D38-E9C5-46E5-93CB-32DE922E25CB",
  evaluator_name: "Cap. Oficial",
  submitted_at: "2026-09-27T21:00:00Z",
  phones: ["5596988888888", "5596999999999"],
  context: {
    student_number: 26,
    war_name: "SILVA NUNES",
    activity_name: "USB",
    site_name: "5º GBM",
    starts_at: "2026-09-27T22:45:00Z",
  },
};

describe("confirmação da avaliação por WhatsApp", () => {
  it("abre uma mensagem com o mesmo protocolo para cada destinatário, sem enviar automaticamente", () => {
    render(<EvaluationWhatsAppDelivery delivery={delivery} />);
    const links = screen.getAllByRole("link", { name: /Enviar ao WhatsApp/ });
    expect(links).toHaveLength(2);
    for (const [index, link] of links.entries()) {
      const url = new URL(link.getAttribute("href")!);
      expect(url.hostname).toBe("wa.me");
      expect(url.pathname).toBe(`/${delivery.phones[index]}`);
      expect(url.searchParams.get("text")).toContain(delivery.protocol);
      expect(url.searchParams.get("text")).toContain("Confirmo que preenchi");
    }
    expect(screen.getByText(/confira o destinatário e toque em Enviar/i)).toBeInTheDocument();
  });
});
