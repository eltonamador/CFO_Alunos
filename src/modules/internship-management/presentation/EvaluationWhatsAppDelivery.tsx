export type EvaluationWhatsAppDeliveryData = {
  evaluation_id: string;
  protocol: string;
  evaluator_name: string;
  submitted_at: string;
  phones: string[];
  context: {
    student_number: number;
    war_name: string;
    activity_name: string;
    site_name: string;
    starts_at: string;
  };
};

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem", dateStyle: "short",
  }).format(new Date(value));
}

export function EvaluationWhatsAppDelivery({
  delivery,
}: {
  delivery: EvaluationWhatsAppDeliveryData | null;
}) {
  if (!delivery) {
    return (
      <p className="rounded-lg border bg-muted p-4 text-sm">
        Avaliação recebida pelo sistema. Atualize a página para consultar o envio ao WhatsApp da
        Coordenação.
      </p>
    );
  }
  if (delivery.phones.length === 0) {
    return (
      <p className="rounded-lg border bg-muted p-4 text-sm">
        Avaliação recebida pelo sistema sob o protocolo <strong>{delivery.protocol}</strong>.
        A Coordenação ainda não cadastrou o WhatsApp de confirmação; informe o protocolo a ela.
      </p>
    );
  }
  const c = delivery.context;
  const message = [
    "CFO Alunos — confirmação de avaliação de estágio",
    `Protocolo: ${delivery.protocol}`,
    `Cadete: ${String(c.student_number).padStart(2, "0")} · ${c.war_name}`,
    `Serviço: ${c.activity_name} · ${c.site_name} · ${shortDate(c.starts_at)}`,
    `Oficial avaliador: ${delivery.evaluator_name}`,
    "Confirmo que preenchi e enviei pessoalmente esta avaliação no CFO Alunos.",
  ].join("\n");
  return (
    <section className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <h2 className="font-semibold">Confirme pelo seu WhatsApp à Coordenação</h2>
      <p className="text-sm">
        A avaliação já foi registrada no sistema. Para conferir a autoria, envie a mensagem
        preparada <strong>do seu próprio WhatsApp</strong>. A Coordenação comparará o número
        remetente com o oficial que acompanhou o serviço.
      </p>
      <p className="text-sm">Protocolo: <strong>{delivery.protocol}</strong></p>
      <div className="flex flex-wrap gap-2">
        {delivery.phones.map((phone, index) => (
          <a
            key={phone}
            href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-md border border-primary bg-background px-4 text-sm font-semibold text-primary"
          >
            Enviar ao WhatsApp {index + 1} da Coordenação
          </a>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        O WhatsApp abre a mensagem pronta; confira o destinatário e toque em Enviar.
        {delivery.phones.length > 1 ? " Envie a mensagem aos dois números." : ""}
        A confirmação não é automática: a Coordenação confere a mensagem recebida antes de
        liberar a avaliação.
      </p>
    </section>
  );
}
