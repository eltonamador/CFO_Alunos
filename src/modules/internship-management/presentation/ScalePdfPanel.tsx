"use client";
import { useState, type FormEvent } from "react";
import { addDays, calendarDay } from "../domain/rotation";

type Service = "todos" | "gbm" | "praia" | "permanencia";
type Signatory = "coordenador" | "supervisor";
type GbmSite = { id: string; name: string };
type ScaleVersion = {
  id: string;
  revision: number;
  rectification: number | null;
  issued_at: string;
  change_summary: string;
};
type VersionHistory = {
  referenceCode?: string;
  changed: boolean;
  versions: ScaleVersion[];
};
type CorrectionMode = "correcao" | "retificacao" | "descartar";
type CorrectionNotice = { message: string; downloadId?: string };
const pad = (value: number) => String(value).padStart(2, "0");
// Emissão sem marca; só a retificação de escala divulgada é numerada.
function versionLabel(version: ScaleVersion) {
  if (version.rectification) return `Retificação ${pad(version.rectification)}`;
  return version.revision ? "Corrigida antes da divulgação" : "";
}
const correctionModes: { value: CorrectionMode; label: string; detail: string }[] = [
  {
    value: "correcao",
    label: "Ainda não divulgada",
    detail: "Substitui a versão emitida, mantém o número e sai sem marca de retificação.",
  },
  {
    value: "retificacao",
    label: "Já divulgada",
    detail: "Mantém o número e registra RETIFICAÇÃO no PDF.",
  },
  {
    value: "descartar",
    label: "Emitida por engano",
    detail: "Descarta esta escala. O número volta a ficar disponível para a próxima emissão.",
  },
];
function ScaleCorrectionForm({
  url,
  referenceCode,
  onCorrected,
}: {
  url: string;
  referenceCode: string;
  onCorrected: (notice: CorrectionNotice) => Promise<void>;
}) {
  const [mode, setMode] = useState<CorrectionMode | "">("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const params = new URLSearchParams(url.split("?")[1] ?? "");
  const service = params.get("servico");
  const adjustHref =
    service === "permanencia"
      ? "/coordenacao/estagio/permanencia"
      : `/coordenacao/estagio/agenda?inicio=${params.get("inicio")}&fim=${params.get("fim")}${service === "praia" ? "&modalidade=guarda_vida" : ""}`;
  const valid = mode !== "" && reason.trim().length >= 5;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      const body = Object.fromEntries(
        ["inicio", "fim", "servico", "gbm", "escala", "assinatura"].flatMap((key) =>
          params.get(key) ? [[key, params.get(key)]] : [],
        ),
      );
      const response = await fetch("/api/estagio/escala/corrigir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ ...body, modo: mode, motivo: reason.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Não foi possível corrigir a escala.");
      setMode("");
      setReason("");
      await onCorrected(
        mode === "descartar"
          ? {
              message: `Escala ${result.referenceCode} descartada. O número fica disponível para a próxima emissão.`,
            }
          : {
              message: `Escala ${result.referenceCode} corrigida${result.rectification ? ` com retificação ${pad(result.rectification)}` : " sem retificação"}.`,
              downloadId: result.id,
            },
      );
    } catch (reasonError) {
      setError(
        reasonError instanceof Error ? reasonError.message : "Não foi possível corrigir a escala.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-md border p-3">
      <p className="font-semibold">Corrigir escala {referenceCode}</p>
      <p className="text-muted-foreground">
        Ajuste cadetes, horários ou uniforme{" "}
        <a className="text-primary underline" href={adjustHref}>
          {service === "permanencia" ? "no serviço do Dia ao 1º Ano" : "na agenda"}
        </a>{" "}
        antes de emitir. A versão corrigida usa os dados atuais e a assinatura do{" "}
        {params.get("assinatura") === "supervisor" ? "Supervisor" : "Coordenador"} do CFO.
      </p>
      <fieldset className="space-y-1" disabled={busy}>
        <legend className="font-medium">Situação da escala emitida</legend>
        {correctionModes.map((option) => (
          <label key={option.value} className="flex min-h-8 items-start gap-2">
            <input
              type="radio"
              name={`correcao-${referenceCode}`}
              value={option.value}
              checked={mode === option.value}
              onChange={() => setMode(option.value)}
              className="mt-0.5"
            />
            <span>
              <strong>{option.label}</strong> · {option.detail}
            </span>
          </label>
        ))}
      </fieldset>
      <label className="block">
        Motivo
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={300}
          disabled={busy}
          className="mt-1 min-h-11 w-full rounded-md border bg-background px-3"
        />
      </label>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!valid || busy}
        className="min-h-11 rounded-md border px-4 font-semibold disabled:opacity-50"
      >
        {busy
          ? "Processando…"
          : mode === "descartar"
            ? "Descartar escala"
            : "Emitir escala corrigida"}
      </button>
    </form>
  );
}
export function ScaleVersionHistory({ url }: { url: string }) {
  const [history, setHistory] = useState<VersionHistory | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<CorrectionNotice | null>(null);
  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await fetch(url.replace("/escala?", "/escala/versoes?"), {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setHistory(await response.json());
    } catch {
      setError("Não foi possível consultar as versões. Feche e abra para tentar novamente.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <details
      onToggle={(e) => {
        if (e.currentTarget.open) void load();
      }}
      className="text-xs"
    >
      <summary className="min-h-8 cursor-pointer text-muted-foreground">
        Histórico e correção
      </summary>
      {notice && (
        <p role="status" className="my-2 font-semibold text-emerald-700">
          {notice.message}{" "}
          {notice.downloadId && (
            <a className="underline" href={`/api/estagio/escala/versoes?id=${notice.downloadId}`}>
              Baixar escala corrigida
            </a>
          )}
        </p>
      )}
      {loading ? (
        <p>Consultando versões…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        history && (
          <>
            {history.changed && (
              <p className="my-2 font-semibold text-amber-700">
                A escala ou a assinatura mudou desde a última emissão. Se ainda não divulgou esta
                escala, corrija abaixo sem retificação; se já divulgou, emita a retificação.
              </p>
            )}
            {!history.versions.length && (
              <p>Nenhuma emissão arquivada. O histórico começa no próximo PDF gerado.</p>
            )}
            <ul className="space-y-2">
              {history.versions.map((v, i) => (
                <li key={v.id}>
                  <a
                    className="font-semibold underline"
                    href={`/api/estagio/escala/versoes?id=${v.id}`}
                  >
                    Escala {history.referenceCode}
                    {versionLabel(v) && ` · ${versionLabel(v)}`}
                  </a>
                  <p>
                    {i === 0 && !history.changed
                      ? "Corresponde aos dados atuais"
                      : "Versão histórica"}{" "}
                    · {new Date(v.issued_at).toLocaleString("pt-BR", { timeZone: "America/Belem" })}
                  </p>
                  {v.revision > 0 && <p className="text-muted-foreground">{v.change_summary}</p>}
                </li>
              ))}
            </ul>
            {history.referenceCode && history.versions.length > 0 && (
              <ScaleCorrectionForm
                url={url}
                referenceCode={history.referenceCode}
                onCorrected={async (next) => {
                  setNotice(next);
                  await load(true);
                }}
              />
            )}
          </>
        )
      )}
    </details>
  );
}
export function ScalePdfLinks({
  start,
  end,
  service,
  gbm,
  signatory = "coordenador",
}: {
  start: string;
  end: string;
  service: Service;
  gbm?: GbmSite;
  signatory?: Signatory;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const url = `/api/estagio/escala?inicio=${start}&fim=${end}&servico=${service}${gbm ? `&gbm=${encodeURIComponent(gbm.id)}` : ""}&assinatura=${signatory}`;
  const downloadUrl = `${url}&download=1`;
  async function share() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf"))
        throw new Error("Não foi possível preparar o PDF. Atualize a página e tente novamente.");
      const filename =
        response.headers.get("content-disposition")?.match(/filename="([a-zA-Z0-9._-]+)"/)?.[1] ??
        `escala-${service}-${start}-${end}.pdf`;
      const file = new File([await response.blob()], filename, {
        type: "application/pdf",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Escala CFO Alunos" });
        setMessage("PDF encaminhado ao compartilhamento do aparelho.");
      } else {
        setMessage("Use Baixar PDF e anexe o arquivo na conversa do WhatsApp.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage(
        "Não foi possível compartilhar por este navegador. Use Baixar PDF e anexe no WhatsApp.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <a
          href={downloadUrl}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Baixar PDF
        </a>
        <button
          type="button"
          disabled={busy}
          onClick={share}
          className="min-h-11 rounded-md border px-4 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Preparando PDF…" : "Compartilhar PDF"}
        </button>
      </div>
      <ScaleVersionHistory url={url} />
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
export function ScalePdfPanel({
  startsOn,
  endsOn,
  gbms,
}: {
  startsOn: string;
  endsOn: string;
  gbms: GbmSite[];
}) {
  const today = calendarDay(Date.now(), "America/Belem");
  const initial = today < startsOn ? startsOn : today > endsOn ? endsOn : today;
  const [start, setStart] = useState(initial);
  const [end, setEnd] = useState(addDays(initial, 6) > endsOn ? endsOn : addDays(initial, 6));
  const [service, setService] = useState<Service>("gbm");
  const [signatory, setSignatory] = useState<Signatory>("coordenador");
  const valid = !!start && !!end && start <= end;
  const field = "mt-1 min-h-11 w-full rounded-md border bg-background px-3";
  return (
    <details open className="rounded-xl border bg-card p-4">
      <summary className="min-h-8 cursor-pointer font-semibold text-primary">
        PDF das escalas / WhatsApp
      </summary>
      <p className="mt-3 text-sm text-muted-foreground">
        Baixe a escala publicada ou compartilhe o arquivo pelo WhatsApp do aparelho. Reimpressões
        mantêm a versão. Para corrigir uma escala já emitida, abra Histórico e correção.
      </p>
      <div className="my-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          De
          <input
            type="date"
            className={field}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Até
          <input
            type="date"
            className={field}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Escala
          <select
            className={field}
            value={service}
            onChange={(e) => setService(e.target.value as Service)}
          >
            <option value="todos">As três escalas</option>
            <option value="gbm">GBM · USB e AR</option>
            <option value="praia">Praia · Guarda-vidas</option>
            <option value="permanencia">Dia ao 1º Ano</option>
          </select>
        </label>
        <label className="text-sm">
          Assinatura no PDF
          <select
            className={field}
            value={signatory}
            onChange={(e) => setSignatory(e.target.value as Signatory)}
          >
            <option value="coordenador">Coordenador do CFO</option>
            <option value="supervisor">Supervisor do CFO</option>
          </select>
        </label>
      </div>
      {valid && service === "gbm" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {gbms.map((gbm) => (
            <div key={gbm.id} className="rounded-lg border p-3">
              <p className="mb-2 font-semibold">{gbm.name}</p>
              <ScalePdfLinks
                key={`${start}-${end}-${gbm.id}-${signatory}`}
                start={start}
                end={end}
                service="gbm"
                gbm={gbm}
                signatory={signatory}
              />
            </div>
          ))}
          {!gbms.length && <p className="text-sm text-muted-foreground">Nenhum GBM cadastrado.</p>}
        </div>
      ) : valid ? (
        <ScalePdfLinks
          key={`${start}-${end}-${service}-${signatory}`}
          start={start}
          end={end}
          service={service}
          signatory={signatory}
        />
      ) : (
        <p role="alert" className="text-sm text-destructive">
          Informe o início e o fim do período em ordem.
        </p>
      )}
    </details>
  );
}
