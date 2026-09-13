# Escalas: importação, calendário, lembretes e consulta sem internet

Implementação de 13/09/2026. A confirmação de ciência pelo militar fica para uma etapa posterior.

## Uso

- A coordenação abre **Escalas PDF → Publicar nova escala**, seleciona turma, tipo e um PDF ou foto JPEG/PNG/WebP. Limite: 20 MiB e 15 páginas.
- A leitura ocorre no navegador. PDFs com texto usam extração nativa; imagens e páginas digitalizadas usam OCR. Os modelos de reconhecimento são baixados quando necessários; o arquivo não é enviado a um serviço externo de OCR.
- Antes de publicar, a coordenação confere nomes, matrículas, datas, funções e turnos. Nomes ambíguos ou não encontrados exigem seleção manual. A foto original é preservada em um PDF.
- A publicação do documento e das atribuições é atômica. Para substituir uma escala, selecionar a publicação anterior. Repetir uma requisição concluída não duplica as atribuições.
- O link **Calendário de escalas**, disponível no painel inicial, abre `/escalas/calendario`. Oferece mês, semana e filtros Todos, Minhas escalas, Cadetes e Oficiais. Cadetes consultam a equipe da própria turma; coordenação, secretaria e instrutores acessam os campos operacionais.
- A última consulta fica salva no aparelho por até 7 dias. `/escala-offline.html` mostra data de atualização e aviso de possível desatualização. Requer primeiro acesso conectado; sair da conta ou trocar de usuário remove a cópia. Não resolve bloqueios de DNS ou de Wi-Fi.

## Lembretes

O cron `/api/jobs/duty-reminders` roda diariamente às 21h UTC (18h de Macapá). No plano Hobby da Vercel, a execução pode ocorrer em qualquer minuto entre 18h e 19h. O lembrete reúne as atribuições vigentes do dia seguinte e aponta para o calendário pessoal.

Reutiliza as configurações existentes: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `RESEND_API_KEY`, `BIRTHDAY_EMAIL_FROM` e `NEXT_PUBLIC_APP_URL`. Não incluir valores dessas variáveis em logs ou documentação.

O push exige que o usuário ative notificações no dispositivo. No iPhone, isso é feito pelo aplicativo instalado na tela inicial. O e-mail utiliza o endereço da conta. Oficiais sem conta vinculada aparecem na escala compartilhada, mas não recebem lembretes pessoais.

A tabela `schedule_reminder_deliveries` registra reservas e resultados por conta, dia, canal e destinatário. Reservas concorrentes e entregas concluídas não repetem envios. Uma falha transitória permite nova tentativa; reservas interrompidas vencem após 5 minutos. Reexecutar o job somente dentro da janela de envio. O push da véspera expira à meia-noite para não entregar “amanhã” no dia errado.

## Validação

```sh
pnpm check
pnpm build
```

Aplicar as migrações 0052 a 0055 em um banco local isolado antes de executar `supabase/tests/schedule_experience.test.sql` com `psql -v ON_ERROR_STOP=1`. O teste abre uma transação e reverte todas as fixtures. Nunca executar testes com fixtures em produção.

A validação desta versão cobriu:

- 248 testes da aplicação aprovados; 1 teste de OCR externo previamente opcional ignorado.
- 26 testes SQL: permissões dos quatro perfis, isolamento entre turmas, importação atômica, duplicidades, idempotência, cancelamentos e reservas de lembretes.
- Foto real de 08 a 13/09/2026: 32 atribuições reconhecidas no navegador, mantendo turnos. Dois nomes exigiram conferência na base local.
- Calendário semanal/mensal, filtro pessoal e abertura da consulta salva com o servidor local indisponível.

Os testes de lembretes validam regras e persistência sem disparar mensagens para pessoas reais. A entrega física em um iPhone depende da inscrição e permissão do aparelho e deve ser conferida na primeira execução programada.
