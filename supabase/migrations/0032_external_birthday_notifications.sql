-- =====================================================================
-- 0032 - Notificacoes externas de aniversario
-- Assinaturas Web Push por dispositivo + ledger idempotente de entregas.
-- =====================================================================

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(endpoint)) > 0),
  check (length(trim(p256dh)) > 0),
  check (length(trim(auth)) > 0)
);

create index idx_push_subscriptions_user_enabled
  on public.push_subscriptions(user_id)
  where enabled = true;

create trigger trg_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: admin read own"
  on public.push_subscriptions for select
  using (public.is_admin() and user_id = auth.uid());

create policy "push_subscriptions: admin insert own"
  on public.push_subscriptions for insert
  with check (public.is_admin() and user_id = auth.uid());

create policy "push_subscriptions: admin update own"
  on public.push_subscriptions for update
  using (public.is_admin() and user_id = auth.uid())
  with check (public.is_admin() and user_id = auth.uid());

create policy "push_subscriptions: admin delete own"
  on public.push_subscriptions for delete
  using (public.is_admin() and user_id = auth.uid());

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  alert_on date not null,
  birthday_on date not null,
  alert_kind text not null check (alert_kind in ('today', 'tomorrow')),
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
  unique (student_id, alert_on, alert_kind, channel, recipient_key)
);

create index idx_notification_deliveries_alert_status
  on public.notification_deliveries(alert_on, status);

create index idx_notification_deliveries_student
  on public.notification_deliveries(student_id, alert_on desc);

create trigger trg_notification_deliveries_updated_at
  before update on public.notification_deliveries
  for each row execute function public.set_updated_at();

alter table public.notification_deliveries enable row level security;

-- Somente a Coordenacao consulta o historico; gravacoes sao feitas pela
-- rota agendada com service_role, nunca pelo navegador.
create policy "notification_deliveries: coord read"
  on public.notification_deliveries for select
  using (public.is_coord());

comment on table public.push_subscriptions is
  'Assinaturas Web Push dos dispositivos de usuarios administrativos.';

comment on table public.notification_deliveries is
  'Ledger idempotente dos alertas externos de aniversario por destinatario e canal.';

comment on column public.notification_deliveries.recipient_key is
  'Hash SHA-256 do destinatario, usado para deduplicacao sem persistir o e-mail no ledger.';
