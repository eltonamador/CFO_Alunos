-- =====================================================================
-- 0009 — Transversais: pending_changes + audit_logs
-- =====================================================================

create table public.pending_changes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  context text not null,
  entity text not null,
  field text not null,
  previous_value jsonb,
  new_value jsonb,
  requested_by uuid not null references auth.users(id),
  status text not null default 'pendente'
    check (status in ('pendente','validado','recusado')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  reason text,
  created_at timestamptz not null default now()
);

create index idx_pending_student on public.pending_changes(student_id);
create index idx_pending_open on public.pending_changes(created_at desc)
  where status = 'pendente';

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_role text,
  entity text not null,
  entity_id uuid,
  action text not null
    check (action in ('insert','update','delete','validate','reject','view_emergency_contact')),
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index idx_audit_entity on public.audit_logs(entity, entity_id);
create index idx_audit_actor on public.audit_logs(actor_id, created_at desc);
create index idx_audit_created on public.audit_logs(created_at desc);

comment on table public.audit_logs is 'Log imutável (append-only via RLS).';
