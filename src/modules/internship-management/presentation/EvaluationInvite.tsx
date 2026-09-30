"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createCadetEvaluationInvite, createEvaluationInvite, revokeEvaluationInvite } from "./evaluationActions";
import { evaluationDate } from "../domain/evaluation";
export function EvaluationInvite({
  assignmentId,
  openId,
  recipientName,
  recipientContact,
  mode = "manager",
}: {
  assignmentId: string;
  openId?: string;
  recipientName?: string;
  recipientContact?: string;
  mode?: "manager" | "cadet";
}) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState("");
  const [expiry, setExpiry] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copiado. Envie diretamente ao oficial indicado.");
    } catch {
      setMessage("Selecione e copie o endereço no campo abaixo.");
    }
  }
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="font-display text-xl font-semibold">Enviar ao oficial</h2>
      <p className="text-sm text-muted-foreground">
        Informe o oficial e o contato conferido para encaminhar o link. Ele poderá responder após
        metade da duração prevista do plantão, sem criar uma conta.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          start(async () => {
            try {
              const result = await (mode === "cadet"
                ? createCadetEvaluationInvite(form)
                : createEvaluationInvite(form));
              if (result.error) setMessage(result.error);
              else if (result.invite) {
                const link = `${window.location.origin}/avaliar-estagio/${result.invite.token}`;
                setUrl(link);
                setExpiry(result.invite.expires_at);
                await copy(link);
                router.refresh();
              }
            } catch {
              setMessage("Não foi possível criar o convite. Tente novamente.");
            }
          });
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <label className="space-y-1 text-sm">
          <span>Oficial responsável pelo serviço — posto e nome</span>
          <input
            required
            name="recipientName"
            minLength={3}
            maxLength={120}
            defaultValue={recipientName ?? ""}
            className="h-11 w-full rounded-md border bg-background px-3"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Contato de destino (WhatsApp ou telefone)</span>
          <input
            required
            name="recipientContact"
            minLength={3}
            maxLength={200}
            defaultValue={recipientContact ?? ""}
            placeholder="Telefone ou e-mail conferido"
            className="h-11 w-full rounded-md border bg-background px-3"
          />
        </label>
        <div className="space-y-2 sm:col-span-2">
          {openId && (
            <p className="text-sm text-muted-foreground">
              Gerar um novo link cancela o convite anterior. Se já gerou nesta tela, use “Copiar
              link”.
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Gerando…" : openId ? "Gerar novo link e copiar" : "Gerar link e copiar"}
          </Button>
        </div>
      </form>
      {url && (
        <div className="space-y-2">
          <label className="block text-sm">
            Link para o oficial
            <input
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="mt-1 w-full rounded-md border bg-background p-2"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => copy(url)}>
              Copiar link
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`CFO Alunos — avaliação de estágio. Preencha a ficha do cadete que você acompanhou: ${url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-semibold"
            >
              Enviar pelo WhatsApp
            </a>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const text = `CFO Alunos — avaliação de estágio. Preencha a ficha do cadete que você acompanhou: ${url}`;
                if (navigator.share) {
                  try {
                    await navigator.share({ title: "Avaliação do estágio", text });
                  } catch {
                    /* Compartilhamento cancelado pelo usuário. */
                  }
                } else await copy(text);
              }}
            >
              Compartilhar convite
            </Button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-3 text-sm font-semibold underline"
            >
              Abrir ficha
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Válido até {evaluationDate(expiry)}. Quem receber este link poderá responder à ficha;
            encaminhe somente ao avaliador.
          </p>
        </div>
      )}
      {openId && mode === "manager" && (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                const result = await revokeEvaluationInvite(openId, assignmentId);
                setMessage(result.error ?? "Convite cancelado.");
                if (!result.error) setUrl("");
                router.refresh();
              } catch {
                setMessage("Falha ao cancelar o convite.");
              }
            })
          }
        >
          Cancelar convite pendente
        </Button>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
