# Alertas externos de aniversário

Os alertas internos continuam sendo calculados a partir de `students.birth_date`. A entrega
externa usa o mesmo cálculo e o fuso `America/Belem`.

> O envio de push e e-mail vive em `src/modules/notifications/` desde que o
> módulo de Acompanhamento do Cadete passou a notificar também. As funções
> continuam exportadas de `externalBirthdayDelivery.ts`, então nada mudou para
> quem chama.

## Arquitetura

- **Web Push:** assinatura feita no PWA instalado ou no navegador, persistida em
  `public.push_subscriptions` e enviada com VAPID.
- **Badge:** o Service Worker usa a Badging API quando o sistema operacional/navegador oferece
  suporte. O badge é removido quando a notificação é aberta.
- **E-mail:** envio complementar aos usuários ativos de Coordenação e Secretaria por meio do
  Resend. Os endereços são obtidos de `auth.users`; não há cópia de e-mails no schema público.
- **Agendamento:** Vercel Cron chama `GET /api/jobs/birthday-notifications` diariamente às
  `03:05 UTC` (`00:05` em Belém/Macapá).
- **Idempotência:** `public.notification_deliveries` reserva cada entrega antes do envio. A
  constraint única impede uma segunda entrega do mesmo cadete, dia, tipo, canal e destinatário.

## Configuração externa

1. Aplicar a migration:

   ```bash
   pnpm exec supabase db push
   ```

2. Gerar um único par VAPID e guardar as chaves:

   ```bash
   pnpm exec web-push generate-vapid-keys
   ```

3. Configurar no ambiente de produção da Vercel:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (`mailto:` institucional ou URL HTTPS)
   - `CRON_SECRET` (valor aleatório com pelo menos 16 caracteres)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (URL HTTPS real do CFO Alunos)

4. Para e-mail, validar o domínio remetente no Resend e adicionar:
   - `RESEND_API_KEY`
   - `BIRTHDAY_EMAIL_FROM` (por exemplo, `CFO Alunos <aniversarios@dominio.gov.br>`)

5. Fazer um novo deploy. A Vercel registra automaticamente o cron definido em `vercel.json`.

## Ativação nos dispositivos

Cada usuário de Coordenação ou Secretaria deve entrar no dashboard e selecionar **Ativar
notificações**. A permissão do navegador só é solicitada após esse gesto.

No iPhone/iPad, o site precisa primeiro ser adicionado à Tela de Início. Web Push e badge exigem
iOS/iPadOS 16.4 ou posterior. Em todos os dispositivos, produção deve usar HTTPS.

## Disparo manual controlado

Para validar o job sem aguardar o cron:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://SEU-DOMINIO/api/jobs/birthday-notifications
```

A resposta informa quantos alertas foram encontrados e quantos envios foram concluídos, falharam
ou foram deduplicados em cada canal. Repetir a chamada no mesmo dia não repete entregas.
