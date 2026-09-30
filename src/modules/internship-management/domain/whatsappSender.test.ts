import { describe, expect, it } from "vitest";
import { normalizeEvaluatorWhatsApp } from "./whatsappSender";

describe("celular remetente da avaliação", () => {
  it("completa +55 e DDD 96 quando o operador digita só os nove dígitos", () => {
    expect(normalizeEvaluatorWhatsApp("912345678")).toBe("5596912345678");
  });

  it("aceita outros DDDs e números completos sem duplicar o prefixo", () => {
    expect(normalizeEvaluatorWhatsApp("(11) 9 1234-5678")).toBe("5511912345678");
    expect(normalizeEvaluatorWhatsApp("+55 (96) 9 1234-5678")).toBe("5596912345678");
  });

  it("recusa números incompletos e telefone fixo", () => {
    expect(normalizeEvaluatorWhatsApp("91234567")).toBeNull();
    expect(normalizeEvaluatorWhatsApp("9632345678")).toBeNull();
  });
});
