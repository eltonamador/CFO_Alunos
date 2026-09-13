-- Fonte única das atribuições vigentes. Somente o backend pode consultar
-- identidades de contas; os leitores do calendário recebem apenas os campos operacionais.
create function public.schedule_live_roster(p_start date, p_end date)
returns table(id uuid, class_id uuid, profile_id uuid, student_id uuid,
  kind text, duty_date date, person text, duty text, account_role text)
language sql stable security definer set search_path = public
as $$
  select a.id, d.class_id, p.id, s.id, 'cadet'::text, a.duty_date,
    s.war_name || coalesce(' — ' || lpad(s.student_number::text, 2, '0'), ''),
    coalesce(nullif(btrim(a.duty_function), ''), 'Serviço de escala'), p.role::text
  from public.schedule_assignments a
  join public.schedule_documents d on d.id = a.document_id
  join public.students s on s.id = a.student_id
  left join public.profiles p on p.student_id = s.id and p.active and p.role = 'aluno'
  where a.status = 'published' and d.publication_status = 'published'
    and d.processing_status <> 'superseded'
    and s.deleted_at is null and s.course_status = 'matriculado'
    and a.duty_date between p_start and p_end
  union all
  select a.id, d.class_id, p.id, null::uuid, 'officer'::text, a.duty_date,
    a.display_name, a.duty_function || ' · ' ||
      case a.shift when 'manha' then 'Manhã' when 'tarde' then 'Tarde'
        when 'noite' then 'Noite' when 'diurno' then 'Diurno' when 'noturno' then 'Noturno'
        else a.shift end || ' ' || to_char(a.starts_at, 'HH24:MI') || '–' || to_char(a.ends_at, 'HH24:MI'),
    p.role::text
  from public.schedule_officer_assignments a
  join public.schedule_documents d on d.id = a.document_id
  left join public.profiles p on p.id = a.profile_id and p.active
  where d.publication_status = 'published' and d.processing_status <> 'superseded'
    and public.schedule_is_current_officer_run(a.document_id, a.run_id)
    and a.duty_date between p_start and p_end
$$;
revoke all on function public.schedule_live_roster(date,date) from public, anon, authenticated;
grant execute on function public.schedule_live_roster(date,date) to service_role;

create table public.schedule_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  duty_date date not null,
  slot text not null check (slot in ('evening','morning')),
  channel text not null check (channel in ('web_push','email')),
  recipient_key text not null check (recipient_key ~ '^[0-9a-f]{64}$'),
  status text not null default 'processing' check (status in ('processing','sent','failed','cancelled')),
  lease_token uuid not null default gen_random_uuid(),
  attempts integer not null default 1,
  last_error text,
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(profile_id, duty_date, slot, channel, recipient_key)
);
alter table public.schedule_reminder_deliveries enable row level security;
revoke all on public.schedule_reminder_deliveries from public, anon, authenticated;
grant select on public.schedule_reminder_deliveries to authenticated;
grant all on public.schedule_reminder_deliveries to service_role;
create policy schedule_reminders_coord_read on public.schedule_reminder_deliveries
  for select to authenticated using (public.schedule_active_role() = 'coordenacao');

-- Uma reserva concorrente ou um retry não repete uma entrega concluída.
create function public.schedule_reserve_reminder(
  p_profile_id uuid, p_duty_date date, p_slot text, p_channel text, p_recipient_key text
) returns table(id uuid, lease_token uuid)
language plpgsql security definer set search_path = public
as $$
begin
  return query
  insert into public.schedule_reminder_deliveries as delivery
    (profile_id, duty_date, slot, channel, recipient_key)
  values (p_profile_id, p_duty_date, p_slot, p_channel, p_recipient_key)
  on conflict (profile_id, duty_date, slot, channel, recipient_key) do update
    set status = 'processing', lease_token = gen_random_uuid(),
        attempts = delivery.attempts + 1, updated_at = now(), last_error = null
    where delivery.attempts < 5 and (delivery.status = 'failed'
      or (delivery.status = 'processing' and delivery.updated_at < now() - interval '5 minutes'))
  returning delivery.id, delivery.lease_token;
end
$$;
revoke all on function public.schedule_reserve_reminder(uuid,date,text,text,text) from public, anon, authenticated;
grant execute on function public.schedule_reserve_reminder(uuid,date,text,text,text) to service_role;
