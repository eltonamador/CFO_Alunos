"use client";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { normalizeEvaluatorWhatsApp } from "../domain/whatsappSender";
import { reviewEvaluation } from "./evaluationActions";
export function EvaluationReview({
  id, assignmentId, needsWhatsApp, recipientContact,
}: {
  id: string; assignmentId: string; needsWhatsApp: boolean; recipientContact?: string | null;
}) {
  const [message, setMessage] = useState("");
  const [decision, setDecision] = useState("");
  const invitedPhone = recipientContact?.includes("@")
    ? null
    : normalizeEvaluatorWhatsApp(recipientContact ?? "");
  const [otherAreaCode, setOtherAreaCode] = useState(
    Boolean(invitedPhone && !invitedPhone.startsWith("5596")),
  );
  const [phone, setPhone] = useState(
    invitedPhone ? (invitedPhone.startsWith("5596") ? invitedPhone.slice(4) : invitedPhone.slice(2)) : "",
  );
  const phoneId = useId();
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
          try {
            const result = await reviewEvaluation(data);
            setMessage(result.error ?? "Revisão registrada.");
            router.refresh();
          } catch {
            setMessage("Falha ao registrar a revisão.");
          }
        });
      }}
      className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <h4 className="text-base font-semibold">Conferir e concluir esta avaliação</h4>
      <p className="text-sm">Confira a resposta acima e o protocolo da mensagem recebida. A liberação mostra a avaliação ao cadete; as horas são homologadas na ficha do plantão.</p>
      <label className="block space-y-1">
        <span>O que deseja fazer?</span>
        <select
          name="decision"
          required
          value={decision}
          onChange={(event) => setDecision(event.target.value)}
          className="h-11 w-full rounded-md border bg-background px-3"
        >
          <option value="">Selecione uma decisão</option>
          <option value="liberada">Liberar avaliação ao cadete</option>
          <option value="devolvida">Pedir nova avaliação ao oficial</option>
        </select>
      </label>
      {decision === "liberada" && (
        <>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="identityConfirmed" required className="mt-1" />
            {needsWhatsApp
              ? "Conferi o protocolo no WhatsApp da Coordenação e reconheci o número do oficial que acompanhou o cadete."
              : "Conferi que a resposta é do oficial que acompanhou o cadete."}
          </label>
          {needsWhatsApp && (
            <div className="space-y-2">
              <div className="space-y-1">
                <label htmlFor={phoneId} className="block">Celular que enviou a confirmação</label>
                <div className="flex items-center rounded-md border border-input bg-background">
                  <span className="shrink-0 border-r px-3 text-muted-foreground">{otherAreaCode ? "+55" : "+55 (96)"}</span>
                  <input id={phoneId} name="whatsappSenderPhone" type="tel" inputMode="numeric" required
                    value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                    pattern={otherAreaCode ? "[0-9]{11}" : "9[0-9]{8}"}
                    maxLength={otherAreaCode ? 11 : 9}
                    placeholder={otherAreaCode ? "DDD + 9XXXXXXXX" : "9XXXXXXXX"}
                    title={otherAreaCode ? "Digite o DDD e os 9 dígitos do celular" : "Digite 9 e os oito números seguintes"}
                    className="h-11 w-full rounded-r-md bg-transparent px-3" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{invitedPhone ? "Contato do convite sugerido. Confirme o número remetente da mensagem e corrija se necessário." : "Digite apenas o número que enviou a mensagem. Não use o número da Coordenação."}</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={otherAreaCode} onChange={(event) => {
                  const checked = event.target.checked;
                  setPhone((current) => checked ? (/^9\d{8}$/.test(current) ? `96${current}` : current) : (/^969\d{8}$/.test(current) ? current.slice(2) : ""));
                  setOtherAreaCode(checked);
                }} />
                O oficial usa outro DDD
              </label>
            </div>
          )}
        </>
      )}
      <label className="block space-y-1">
        <span>{decision === "devolvida" ? "Motivo para pedir nova avaliação" : "Observação administrativa (opcional)"}</span>
        <textarea
          name="note"
          maxLength={1000}
          rows={2}
          required={decision === "devolvida"}
          className="w-full rounded-md border bg-background p-2"
        />
      </label>
      {decision === "devolvida" && <p className="text-xs text-muted-foreground">Depois, gere um novo convite e envie ao oficial. A resposta anterior permanece no histórico.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : decision === "liberada" ? "Confirmar e liberar avaliação" : decision === "devolvida" ? "Pedir nova avaliação" : "Registrar decisão"}
      </Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
