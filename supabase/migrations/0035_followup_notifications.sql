-- =====================================================================
-- 0035 - Notificacoes do FO-
--
-- O prazo de manifestacao e de 24 horas. Ate aqui o aviso era passivo
-- (badge no menu e alerta no painel): se o cadete nao abrisse o app, ele
-- descobria o prazo depois de perdido. Esta migration abre o caminho
-- para o aviso ativo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Assinaturas Web Push: passam a valer para qualquer perfil.
--
-- A tabela nasceu no 0032 restrita a Coordenacao/Secretaria porque so
-- havia alerta de aniversario. Cada usuario continua enxergando e
-- gerenciando apenas as proprias assinaturas — o que muda e que o
-- cadete tambem pode ter as suas.
-- ---------------------------------------------------------------------
drop policy "push_subscriptions: admin read own" on public.push_subscriptions;
drop policy "push_subscriptions: admin insert own" on public.push_subscriptions;
drop policy "push_subscriptions: admin update own" on public.push_subscriptions;
drop policy "push_subscriptions: admin delete own" on public.push_subscriptions;

create policy "push_subscriptions: self read"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "push_subscriptions: self insert"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "push_subscriptions: self update"
  on public.push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_subscriptions: self delete"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Ledger de entregas do modulo de acompanhamento.
--
-- Separado de notification_deliveries (aniversarios) de proposito: as
-- chaves de idempotencia sao outras e nao vale distorcer aquela tabela.
-- A unicidade garante que o mesmo cadete nunca receba o mesmo aviso do
-- mesmo FO duas vezes, mesmo com reenvio ou retentativa do cron.
-- ---------------------------------------------------------------------
create table public.follow_up_notifications (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.follow_up_records(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  kind text not null check (kind in ('registrado', 'prazo_proximo')),
  channel text not null check (channel in ('web_push', 'email')),
  recipient_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (record_id, kind, channel, recipient_key)
);

create index idx_follow_up_notifications_pending
  on public.follow_up_notifications(status, created_at)
  where status <> 'sent';

create index idx_follow_up_notifications_record
  on public.follow_up_notifications(record_id);

create trigger trg_follow_up_notifications_updated_at
  before update on public.follow_up_notifications
  for each row execute function public.set_updated_at();

alter table public.follow_up_notifications enable row level security;

-- Somente a Coordenacao consulta o historico. A gravacao e feita pela
-- rota agendada e pela server action com service_role, nunca pelo
-- navegador — por isso nao ha policy de insert/update.
create policy "follow_up_notifications: coord read"
  on public.follow_up_notifications for select
  using (public.is_coord());

comment on table public.follow_up_notifications is
  'Ledger idempotente dos avisos de FO- enviados ao cadete (push e e-mail).';
comment on column public.follow_up_notifications.recipient_key is
  'Hash do destino (endpoint do push ou e-mail) - nao guarda o dado em claro.';
