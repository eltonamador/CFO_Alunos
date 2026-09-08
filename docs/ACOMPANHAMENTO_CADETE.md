# Acompanhamento do Cadete — MVP (FO− / FO+)

Módulo enxuto, colocado em uso real para observar padrões antes de crescer.
A filosofia é **implementar → utilizar → observar → medir → melhorar**: nada
aqui presume quais motivos, atalhos ou relatórios serão necessários.

Migration: `supabase/migrations/0033_cadet_followup.sql`
Código: `src/modules/cadet-followup/` e `src/components/app/followup/`

---

## 1. Tipos de registro

| Código | Rótulo | Abre prazo de manifestação |
|---|---|---|
| `fo_negativo` | FO− | **Sim** (24 h) |
| `fo_positivo` | FO+ | Não |
| `saude` | Saúde/Afastamento | Não |
| `missao` | Missão/Atividade | Não |
| `administrativo` | Administrativo/Outro | Não |

Somente o FO− tem ciclo com prazo, manifestação, decisão e punição. Os demais
são registro direto — entram na linha do tempo e nas estatísticas.

## 2. Fluxo do FO−

```
FO− registrado (Coordenação)
   ↓  aguardando_manifestacao — 24 h
Cadete apresenta justificativa
   ↓  aguardando_analise
Coordenação decide
   ├─ DEFERIDO   → deferido (encerrado, sem punição)
   └─ INDEFERIDO → indeferido (sem punição)
                 → aguardando_cumprimento (com punição)
                       ↓
                    concluido
```

Se as 24 h vencerem sem manifestação, o registro vai para `prazo_expirado` e o
sistema cria **um** FO− derivado ("Não apresentou manifestação no prazo") que
entra direto em `aguardando_analise`.

**Proteção contra ciclo infinito:** o registro derivado nasce com
`requires_manifestation = false` — logo nunca entra na varredura de prazos — e
o índice único `uniq_follow_up_records_origin` impede uma segunda geração a
partir do mesmo FO.

A varredura roda em três momentos, sempre idempotente:
1. ao abrir a central da Coordenação;
2. ao o cadete abrir a área de acompanhamento;
3. pelo cron diário `GET /api/jobs/followup-deadlines` (`vercel.json`).

> O cron está em 03:20 UTC (00:20 em Belém/Macapá) por compatibilidade com o
> plano Hobby da Vercel, que aceita apenas execuções diárias. Em planos pagos,
> `*/30 * * * *` deixa o fechamento mais próximo do tempo real — o
> comportamento visível não muda, porque as telas já fecham o prazo ao abrir.

## 3. Motivo com autocomplete

Não existe lista fixa de motivos. O campo é texto livre com sugestões vindas de
`fo_reasons`, alimentada pelo próprio uso:

- ao salvar, o texto é normalizado (`public.normalize_label`: minúsculas, sem
  acento, sem pontuação, espaços colapsados);
- se já existir um motivo equivalente **do mesmo tipo**, ele é reaproveitado;
- se não existir, um novo motivo é criado e passa a sugerir nas próximas vezes.

A normalização evita duplicar "Coturno sujo" / "coturno  sujo." / "Coturno
Sujo", mas nunca bloqueia um motivo legítimo novo. A mesma mecânica vale para as
punições (`punishment_options`).

## 4. Dados coletados para orientar a evolução

`public.v_fo_reason_stats` consolida, por motivo:

- `usage_count` e `last_used_at` (contadores mantidos por trigger);
- `uses_last_7d` e `uses_last_30d` (frequência recente);
- `distinct_students` (quantos cadetes envolvidos);
- `first_used_at`;
- `kind` (FO− / FO+ / demais).

Nada disso é exibido como atalho ainda — é matéria-prima para decidir, depois
de algumas semanas de uso real, quais motivos merecem virar botão.

## 5. Modelo de dados

| Tabela | Papel |
|---|---|
| `fo_reasons` | catálogo de motivos aprendido pelo uso |
| `punishment_options` | catálogo de punições aprendido pelo uso |
| `follow_up_records` | o registro (FO) — guarda `reason_text` como snapshot |
| `follow_up_manifestations` | manifestação do cadete (uma por registro) |
| `follow_up_decisions` | deferido/indeferido + fundamentação |
| `follow_up_punishments` | punição, instruções e situação do cumprimento |
| `follow_up_attachments` | anexos da manifestação (bucket `followup-attachments`) |
| `follow_up_events` | linha do tempo do registro |

Auditoria institucional adicional em `audit_logs` via `public.audit_trigger()`
para `follow_up_records`, `follow_up_decisions` e `follow_up_punishments`.

## 6. Permissões (RLS)

- **Coordenação**: registra, analisa, define punição e acompanha cumprimento.
- **Cadete**: vê **apenas os próprios** registros e só pode inserir manifestação
  em FO− que estejam em `aguardando_manifestacao`.
- **Instrutor e Secretaria**: sem acesso ao módulo nesta fase.

## 7. Telas

| Rota | Perfil | Função |
|---|---|---|
| `/coordenacao/acompanhamento` | Coordenação | central por fila (análise, prazo expirado, manifestação, cumprimento, concluídos) |
| `/coordenacao/acompanhamento/novo` | Coordenação | registro rápido: cadete → tipo → motivo → salvar → próximo |
| `/coordenacao/acompanhamento/[id]` | Coordenação | fato, manifestação, decisão, punição e histórico |
| `/coordenacao/acompanhamento/estatisticas` | Coordenação | medição do uso: motivos, campos e tempos por etapa |
| `/coordenacao/alunos/[id]?tab=acompanhamento` | Coordenação | linha do tempo do cadete |
| `/aluno/acompanhamento` | Cadete | próprios registros, com destaque para o que exige resposta |
| `/aluno/acompanhamento/[id]` | Cadete | detalhe + envio da manifestação |

## 8. Aviso ao cadete

O prazo é de 24 horas. O aviso passivo — badge no menu e alerta no painel —
só funciona se o cadete abrir o app, então há dois momentos em que ele é
interrompido ativamente:

| Momento | Quando dispara | Origem |
|---|---|---|
| `registrado` | logo após a Coordenação salvar o FO− | a própria server action |
| `prazo_proximo` | quando restam 12 h ou menos e ele ainda não se manifestou | cron `GET /api/jobs/followup-deadlines` |

Dois canais: **Web Push** (assinatura por aparelho, ativada pelo próprio cadete
no painel dele) e **e-mail**. O e-mail vai para `student_contacts.email_personal`,
informado na ficha — o login `<nome de guerra>@abm.br` é interno e não
corresponde a uma caixa real. Sem e-mail pessoal na ficha, só o push é usado.

`public.follow_up_notifications` é o ledger idempotente: a unicidade
`(record_id, kind, channel, recipient_key)` garante que o mesmo cadete nunca
receba o mesmo aviso duas vezes, mesmo com reexecução do cron. A chave do
destino é gravada como hash, nunca em claro.

**A janela de 12 h conversa com a cadência do cron.** Com execução diária, uma
janela curta demais deixaria a maioria dos FO− sem lembrete nenhum; com 12 h,
todo FO− aberto passa por uma execução dentro da sua janela. Se o cron subir
para de hora em hora, a janela pode encolher.

O envio no registro tem teto de 4 segundos e nunca derruba o registro: o FO−
já está salvo quando a notificação é tentada. Medido em uso real, a confirmação
do registro continua saindo em cerca de 1 segundo.

**Limitação conhecida:** uma entrega que falha não é retentada — fica marcada
como `failed` no ledger. Na prática o cadete ainda tem o alerta no app e, no
caso do FO− registrado, o lembrete de prazo como segunda chance.

Variáveis necessárias (as mesmas dos alertas de aniversário): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `RESEND_API_KEY`, `BIRTHDAY_EMAIL_FROM`,
`CRON_SECRET` e `SUPABASE_SERVICE_ROLE_KEY`. Sem elas o módulo funciona
normalmente, apenas sem aviso externo.

## 9. Testes

Domínio (Vitest): prazo de 24 h, normalização de motivo e ranking de sugestões
em `src/modules/cadet-followup/domain/followUp.test.ts`.

Banco (pgTAP): `supabase/tests/followup.test.sql` cobre o que o typecheck não
alcança — isolamento por RLS entre cadetes, a impossibilidade de o cadete
alterar o próprio FO e a idempotência da expiração de prazo.

```bash
pnpm db:reset && pnpm db:test
```

O mesmo par roda no CI, no job `database`.

## 10. Deliberadamente fora desta fase

- botões de motivos frequentes (depende de dados reais de uso);
- ranking de ocorrências, indicadores por cadete/turma, relatórios por período;
- tabela formal de transgressões, enquadramentos e tabela de punições;
- reincidência e agravantes;
- registro em lote e registro por instrutor;
- retentativa automática de notificação que falhou;
- prorrogação/recurso da manifestação e múltiplas manifestações por FO.

A estrutura já separa registro, motivo, manifestação, decisão, punição,
cumprimento, anexos e histórico justamente para que esses itens entrem depois
sem reconstruir o módulo.
