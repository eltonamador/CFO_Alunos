import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ScalePdfLinks, ScalePdfPanel } from "./ScalePdfPanel";
afterEach(() => vi.unstubAllGlobals());
it("expõe PDF por período e serviço sem depender da impressão", () => {
  render(<ScalePdfPanel startsOn="2026-09-26" endsOn="2026-12-13" gbms={[]} />);
  fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-09-26" } });
  fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-09-27" } });
  fireEvent.change(screen.getByLabelText("Escala"), { target: { value: "permanencia" } });
  expect(screen.getByRole("link", { name: "Baixar PDF" })).toHaveAttribute(
    "href",
    "/api/estagio/escala?inicio=2026-09-26&fim=2026-09-27&servico=permanencia&assinatura=coordenador&download=1",
  );
});
it("permite escolher somente um signatário para o PDF", () => {
  render(<ScalePdfPanel startsOn="2026-09-26" endsOn="2026-12-13" gbms={[]} />);
  fireEvent.change(screen.getByLabelText("Escala"), { target: { value: "praia" } });
  fireEvent.change(screen.getByLabelText("Assinatura no PDF"), { target: { value: "supervisor" } });
  expect(screen.getByRole("link", { name: "Baixar PDF" })).toHaveAttribute(
    "href",
    expect.stringContaining("servico=praia&assinatura=supervisor&download=1"),
  );
});
it("oferece um PDF independente por GBM", () => {
  render(
    <ScalePdfPanel
      startsOn="2026-09-26"
      endsOn="2026-12-13"
      gbms={[
        { id: "site-1", name: "1º GBM" },
        { id: "site-2", name: "2º GBM" },
        { id: "site-5", name: "5º GBM" },
      ]}
    />,
  );
  const links = screen.getAllByRole("link", { name: "Baixar PDF" });
  expect(links).toHaveLength(3);
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    expect.stringContaining("servico=gbm&gbm=site-1&assinatura=coordenador&download=1"),
    expect.stringContaining("servico=gbm&gbm=site-2&assinatura=coordenador&download=1"),
    expect.stringContaining("servico=gbm&gbm=site-5&assinatura=coordenador&download=1"),
  ]);
});
it("compartilha o arquivo PDF, sem enviar um link que exige login", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { share, canShare: () => true });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        headers: new Headers({
          "content-type": "application/pdf",
          "content-disposition": 'attachment; filename="escala-ger-260926-260927-a1b2c3.pdf"',
        }),
        blob: async () => new Blob(["%PDF-1.7"]),
      }),
  );
  render(<ScalePdfLinks start="2026-09-26" end="2026-09-27" service="todos" />);
  fireEvent.click(screen.getByRole("button", { name: "Compartilhar PDF" }));
  await screen.findByText("PDF encaminhado ao compartilhamento do aparelho.");
  expect(share).toHaveBeenCalledWith({ files: [expect.any(File)], title: "Escala CFO Alunos" });
  expect(share.mock.calls[0]![0].files[0].type).toBe("application/pdf");
  expect(share.mock.calls[0]![0].files[0].name).toBe("escala-ger-260926-260927-a1b2c3.pdf");
});
it("oferece download quando o navegador não compartilha arquivos", async () => {
  vi.stubGlobal("navigator", {});
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/pdf" }),
        blob: async () => new Blob(["%PDF-1.7"]),
      }),
  );
  render(<ScalePdfLinks start="2026-09-26" end="2026-09-27" service="todos" />);
  fireEvent.click(screen.getByRole("button", { name: "Compartilhar PDF" }));
  await screen.findByText("Use Baixar PDF e anexe o arquivo na conversa do WhatsApp.");
});
function historyFetch(correction: Record<string, unknown>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("/api/estagio/escala/versoes?"))
      return {
        ok: true,
        json: async () => ({
          referenceCode: "01-26092026",
          changed: false,
          versions: [
            {
              id: "v1",
              revision: 0,
              rectification: null,
              issued_at: "2026-09-25T23:00:00Z",
              change_summary: "Emissão da escala",
            },
          ],
        }),
      };
    if (url === "/api/estagio/escala/corrigir" && init?.method === "POST")
      return { ok: true, json: async () => correction };
    throw new Error(`Requisição inesperada: ${url}`);
  });
}
function openHistory() {
  const details = screen.getByText("Histórico e correção").closest("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
}
it("corrige escala emitida sem retificação e oferece o PDF corrigido", async () => {
  const fetchMock = historyFetch({ id: "v2", referenceCode: "01-26092026", rectification: null });
  vi.stubGlobal("fetch", fetchMock);
  render(
    <ScalePdfLinks
      start="2026-09-26"
      end="2026-09-27"
      service="gbm"
      gbm={{ id: "site-1", name: "1º GBM" }}
    />,
  );
  openHistory();
  expect(await screen.findByRole("link", { name: "Escala 01-26092026" })).toHaveAttribute(
    "href",
    "/api/estagio/escala/versoes?id=v1",
  );
  expect(screen.queryByText(/Emissão inicial|Primeira emissão|Emissão da escala/)).toBeNull();
  const submit = screen.getByRole("button", { name: "Emitir escala corrigida" });
  expect(submit).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/Ainda não divulgada/));
  fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Troca antes do envio" } });
  fireEvent.click(submit);
  expect(await screen.findByRole("link", { name: "Baixar escala corrigida" })).toHaveAttribute(
    "href",
    "/api/estagio/escala/versoes?id=v2",
  );
  expect(screen.getByText(/Escala 01-26092026 corrigida sem retificação/)).toBeInTheDocument();
  const [, init] = fetchMock.mock.calls.find(
    ([url]) => String(url) === "/api/estagio/escala/corrigir",
  )!;
  expect(JSON.parse(String(init!.body))).toEqual({
    inicio: "2026-09-26",
    fim: "2026-09-27",
    servico: "gbm",
    gbm: "site-1",
    assinatura: "coordenador",
    modo: "correcao",
    motivo: "Troca antes do envio",
  });
});
it("descarta escala emitida por engano", async () => {
  const fetchMock = historyFetch({ referenceCode: "01-26092026" });
  vi.stubGlobal("fetch", fetchMock);
  render(<ScalePdfLinks start="2026-09-27" end="2026-09-27" service="praia" />);
  openHistory();
  await screen.findByRole("link", { name: "Escala 01-26092026" });
  expect(screen.getByRole("link", { name: "na agenda" })).toHaveAttribute(
    "href",
    "/coordenacao/estagio/agenda?inicio=2026-09-27&fim=2026-09-27&modalidade=guarda_vida",
  );
  fireEvent.click(screen.getByLabelText(/Emitida por engano/));
  fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Período errado" } });
  fireEvent.click(screen.getByRole("button", { name: "Descartar escala" }));
  expect(
    await screen.findByText(/Escala 01-26092026 descartada\. O número fica disponível/),
  ).toBeInTheDocument();
  const [, init] = fetchMock.mock.calls.find(
    ([url]) => String(url) === "/api/estagio/escala/corrigir",
  )!;
  expect(JSON.parse(String(init!.body))).toMatchObject({ servico: "praia", modo: "descartar" });
});
