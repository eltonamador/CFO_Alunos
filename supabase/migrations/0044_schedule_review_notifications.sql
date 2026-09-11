-- =====================================================================
-- 0044 - Revisão e entregas idempotentes das notificações de escalas
-- =====================================================================

alter table public.schedule_notification_events
  drop constraint schedule_notification_events_status_check,
  add constraint schedule_notification_events_status_check
    check (status in ('pending','processing','sent','failed','cancelled'));

create table public.schedule_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.schedule_notification_events(id) on delete restrict,
  document_id uuid not null references public.schedule_documents(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  channel text not null check (channel in ('web_push','email')),
  recipient_key text not null check (recipient_key ~ '^[0-9a-f]{64}$'),
  status text not null default 'processing' check (status in ('processing','sent','failed','cancelled')),
  attempts integer not null default 1 check (attempts > 0),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, channel, recipient_key)
);

create index idx_schedule_notification_deliveries_event
  on public.schedule_notification_deliveries(event_id, status);

create function public.schedule_guard_notification_delivery() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_document_id uuid;
  v_student_id uuid;
begin
  if tg_op = 'DELETE' then
    raise exception 'Entregas de notificação não podem ser excluídas.' using errcode = '42501';
  end if;
  select a.document_id, e.student_id into v_document_id, v_student_id
  from public.schedule_notification_events e
  join public.schedule_assignments a on a.id = e.assignment_id
  where e.id = new.event_id;
  if v_document_id is distinct from new.document_id or v_student_id is distinct from new.student_id then
    raise exception 'Entrega deve pertencer ao evento, documento e destinatário informados.' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (
    new.id <> old.id or new.event_id <> old.event_id or new.document_id <> old.document_id
    or new.student_id <> old.student_id or new.channel <> old.channel
    or new.recipient_key <> old.recipient_key or new.created_at <> old.created_at
  ) then
    raise exception 'Identidade da entrega de notificação é imutável.' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger schedule_guard before insert or update or delete
  on public.schedule_notification_deliveries for each row
  execute function public.schedule_guard_notification_delivery();
create trigger schedule_audit after insert or update or delete
  on public.schedule_notification_deliveries for each row
  execute function public.schedule_audit_record();

alter table public.schedule_notification_deliveries enable row level security;
revoke all on public.schedule_notification_deliveries from public, anon, authenticated;
grant select on public.schedule_notification_deliveries to authenticated;
create policy schedule_notification_deliveries_coord_read
  on public.schedule_notification_deliveries for select to authenticated
  using (public.schedule_active_role() = 'coordenacao');

create function public.schedule_claim_notification_event()
returns table(
  event_id uuid,
  event_type text,
  idempotency_key text,
  student_id uuid,
  duty_date date,
  duty_function text,
  schedule_type_name text,
  original_filename text
)
language plpgsql security definer set search_path = public
as $$
declare v_event_id uuid;
begin
  perform set_config('app.schedule_reason', 'Recuperação de entrega interrompida', true);
  update public.schedule_notification_events
    set status = 'failed', last_error = 'Entrega interrompida antes da conclusão.'
    where status = 'processing' and updated_at < now() - interval '15 minutes';

  select e.id into v_event_id
  from public.schedule_notification_events e
  where e.status in ('pending','failed') and e.attempts < 10
  order by e.created_at, e.id
  for update skip locked limit 1;
  if v_event_id is null then return; end if;

  perform set_config('app.schedule_reason', 'Evento assumido pelo worker de notificações', true);
  update public.schedule_notification_events e
    set status = 'processing', attempts = attempts + 1, last_error = null
    where e.id = v_event_id;

  return query
  select e.id, e.event_type, e.idempotency_key, e.student_id,
    a.duty_date, a.duty_function, t.name, d.original_filename
  from public.schedule_notification_events e
  join public.schedule_assignments a on a.id = e.assignment_id
  join public.schedule_documents d on d.id = a.document_id
  join public.schedule_types t on t.id = d.schedule_type_id
  where e.id = v_event_id;
end
$$;

create or replace function public.schedule_confirm_candidate(
  p_candidate_id uuid, p_student_id uuid, p_reason text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_candidate public.schedule_candidates;
  v_assignment_id uuid := gen_random_uuid();
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente coordenação ativa confirma vínculos.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Confirmação manual exige justificativa.' using errcode = '23514';
  end if;
  select c.* into v_candidate
  from public.schedule_candidates c
  join public.schedule_documents d on d.id = c.document_id
  where c.id = p_candidate_id and d.processing_status <> 'superseded'
  for update of c;
  if not found or v_candidate.match_status not in ('needs_review','not_found') then
    raise exception 'Candidato não está pendente de revisão em documento vigente.' using errcode = '23514';
  end if;
  perform set_config('app.schedule_reason', btrim(p_reason), true);
  update public.schedule_candidates set match_status = 'manually_confirmed', matched_student_id = p_student_id,
    resolved_by = auth.uid(), resolved_at = now(), resolution_reason = btrim(p_reason)
    where id = p_candidate_id;
  insert into public.schedule_assignments(
    id, document_id, candidate_id, student_id, duty_date, duty_function,
    match_method, confidence, correction_reason, published_by
  ) values (
    v_assignment_id, v_candidate.document_id, v_candidate.id, p_student_id,
    v_candidate.duty_date, v_candidate.duty_function, 'manual', v_candidate.confidence,
    btrim(p_reason), auth.uid()
  );
  insert into public.schedule_notification_events(
    assignment_id, student_id, event_type, idempotency_key, payload
  ) values (
    v_assignment_id, p_student_id, 'assignment_published',
    'schedule:' || v_assignment_id::text || ':published',
    jsonb_build_object('documentId', v_candidate.document_id, 'assignmentId', v_assignment_id)
  );
  return v_assignment_id;
end
$$;

create function public.schedule_reserve_notification_delivery(
  p_event_id uuid, p_channel text, p_recipient_key text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_event public.schedule_notification_events;
  v_delivery public.schedule_notification_deliveries;
begin
  if p_channel not in ('web_push','email') or p_recipient_key !~ '^[0-9a-f]{64}$' then
    raise exception 'Destino de notificação inválido.' using errcode = '23514';
  end if;
  select * into v_event from public.schedule_notification_events
    where id = p_event_id for update;
  if not found or v_event.status <> 'processing' then
    raise exception 'Evento não está em processamento.' using errcode = '23514';
  end if;

  insert into public.schedule_notification_deliveries(
    event_id, document_id, student_id, channel, recipient_key
  )
  select v_event.id, a.document_id, v_event.student_id, p_channel, p_recipient_key
  from public.schedule_assignments a where a.id = v_event.assignment_id
  on conflict (event_id, channel, recipient_key) do nothing
  returning * into v_delivery;
  if found then return v_delivery.id; end if;

  select * into v_delivery from public.schedule_notification_deliveries
    where event_id = p_event_id and channel = p_channel and recipient_key = p_recipient_key
    for update;
  if v_delivery.status in ('sent','cancelled') or
    (v_delivery.status = 'processing' and v_delivery.updated_at >= now() - interval '15 minutes') then
    return null;
  end if;
  update public.schedule_notification_deliveries
    set status = 'processing', attempts = attempts + 1, last_error = null, updated_at = now()
    where id = v_delivery.id;
  return v_delivery.id;
end
$$;

create function public.schedule_complete_notification_delivery(
  p_delivery_id uuid, p_sent boolean, p_permanent boolean default false,
  p_provider_message_id text default null, p_error_message text default null
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform set_config('app.schedule_reason', 'Resultado da entrega externa registrado', true);
  update public.schedule_notification_deliveries
    set status = case when p_sent then 'sent' when p_permanent then 'cancelled' else 'failed' end,
        provider_message_id = nullif(btrim(p_provider_message_id), ''),
        last_error = case when p_sent then null else left(coalesce(p_error_message, 'Falha externa'), 1000) end,
        sent_at = case when p_sent then now() else null end,
        updated_at = now()
    where id = p_delivery_id and status = 'processing';
  if not found then
    raise exception 'Entrega não está em processamento.' using errcode = '23514';
  end if;
end
$$;

create function public.schedule_finalize_notification_event(p_event_id uuid) returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_status text;
  v_error text;
begin
  perform 1 from public.schedule_notification_events where id = p_event_id and status = 'processing' for update;
  if not found then raise exception 'Evento não está em processamento.' using errcode = '23514'; end if;
  if exists (select 1 from public.schedule_notification_deliveries
    where event_id = p_event_id and status = 'processing') then
    raise exception 'Ainda existem entregas em processamento.' using errcode = '23514';
  end if;
  select case
      when count(*) = 0 then 'failed'
      when bool_or(status = 'failed') then 'failed'
      when bool_or(status = 'sent') then 'sent'
      else 'cancelled'
    end,
    string_agg(last_error, '; ' order by channel) filter (where status in ('failed','cancelled'))
    into v_status, v_error
  from public.schedule_notification_deliveries where event_id = p_event_id;
  v_status := coalesce(v_status, 'failed');
  v_error := coalesce(v_error, 'Nenhum destino de notificação disponível.');
  perform set_config('app.schedule_reason', 'Evento externo finalizado', true);
  update public.schedule_notification_events
    set status = v_status,
        last_error = case when v_status = 'sent' then null else left(v_error, 1000) end,
        sent_at = case when v_status = 'sent' then now() else null end,
        provider_message_id = (
          select provider_message_id from public.schedule_notification_deliveries
          where event_id = p_event_id and status = 'sent' and provider_message_id is not null
          order by sent_at limit 1
        )
    where id = p_event_id;
  return v_status;
end
$$;

revoke all on function public.schedule_claim_notification_event() from public, anon, authenticated;
revoke all on function public.schedule_reserve_notification_delivery(uuid,text,text) from public, anon, authenticated;
revoke all on function public.schedule_complete_notification_delivery(uuid,boolean,boolean,text,text) from public, anon, authenticated;
revoke all on function public.schedule_finalize_notification_event(uuid) from public, anon, authenticated;
grant execute on function public.schedule_claim_notification_event() to service_role;
grant execute on function public.schedule_reserve_notification_delivery(uuid,text,text) to service_role;
grant execute on function public.schedule_complete_notification_delivery(uuid,boolean,boolean,text,text) to service_role;
grant execute on function public.schedule_finalize_notification_event(uuid) to service_role;

comment on table public.schedule_notification_deliveries is
  'Ledger idempotente por evento, canal e destino externo das escalas.';
