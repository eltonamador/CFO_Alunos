-- =====================================================================
-- 0058 - Ajustes pontuais do QTS
--
-- O PDF publicado continua imutável. Trocas excepcionais de horário são
-- registradas aqui e aplicadas somente na consulta do calendário, com
-- justificativa e histórico para que a operação possa repetir o processo.
-- =====================================================================

create table public.qts_activity_adjustments (
  id uuid primary key default gen_random_uuid(),
  activity_date date not null,
  starts_at time not null,
  expected_activity text not null check (length(btrim(expected_activity)) between 2 and 220),
  replacement_activity text not null check (length(btrim(replacement_activity)) between 2 and 220),
  replacement_instructor text check (
    replacement_instructor is null
    or length(btrim(replacement_instructor)) between 2 and 200
  ),
  replacement_workload text check (
    replacement_workload is null
    or length(btrim(replacement_workload)) between 1 and 30
  ),
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

create index qts_activity_adjustments_lookup_idx
  on public.qts_activity_adjustments(activity_date, starts_at, active, created_at desc);

alter table public.qts_activity_adjustments enable row level security;
revoke all on public.qts_activity_adjustments from public, anon, authenticated;

create policy qts_activity_adjustments_coord_select
  on public.qts_activity_adjustments for select to authenticated
  using (public.schedule_active_role() = 'coordenacao');

create policy qts_activity_adjustments_coord_insert
  on public.qts_activity_adjustments for insert to authenticated
  with check (public.schedule_active_role() = 'coordenacao' and created_by = auth.uid());

create policy qts_activity_adjustments_coord_update
  on public.qts_activity_adjustments for update to authenticated
  using (public.schedule_active_role() = 'coordenacao')
  with check (public.schedule_active_role() = 'coordenacao');

create function public.qts_add_activity_adjustment(
  p_activity_date date,
  p_starts_at time,
  p_expected_activity text,
  p_replacement_activity text,
  p_replacement_instructor text default null,
  p_replacement_workload text default null,
  p_reason text default 'Ajuste operacional do QTS'
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação registra ajustes do QTS.' using errcode = '42501';
  end if;
  if p_activity_date is null or p_starts_at is null
    or length(btrim(coalesce(p_expected_activity, ''))) not between 2 and 220
    or length(btrim(coalesce(p_replacement_activity, ''))) not between 2 and 220
    or length(btrim(coalesce(p_reason, ''))) not between 3 and 1000 then
    raise exception 'Dados do ajuste do QTS inválidos.' using errcode = '23514';
  end if;

  insert into public.qts_activity_adjustments(
    activity_date, starts_at, expected_activity, replacement_activity,
    replacement_instructor, replacement_workload, reason, created_by
  ) values (
    p_activity_date, p_starts_at, btrim(p_expected_activity), btrim(p_replacement_activity),
    nullif(btrim(coalesce(p_replacement_instructor, '')), ''),
    nullif(btrim(coalesce(p_replacement_workload, '')), ''),
    btrim(p_reason), auth.uid()
  ) returning id into v_id;
  return v_id;
end
$$;

-- A consulta diária sobrepõe o ajuste ativo mais recente sem alterar a fonte PDF.
create or replace function public.qts_calendar(p_start date, p_end date)
returns table(
  id uuid,
  document_id uuid,
  activity_date date,
  sequence integer,
  starts_at time,
  ends_at time,
  activity text,
  instructor text,
  workload text,
  uniform text,
  location text,
  is_break boolean,
  original_filename text
)
language sql stable security definer set search_path = public
as $$
  select a.id, a.document_id, a.activity_date, a.sequence, a.starts_at, a.ends_at,
    coalesce(adj.replacement_activity, a.activity) as activity,
    coalesce(adj.replacement_instructor, a.instructor) as instructor,
    coalesce(adj.replacement_workload, a.workload) as workload,
    a.uniform, a.location, a.is_break, d.original_filename
  from public.qts_activities a
  join public.schedule_documents d on d.id = a.document_id
  join public.schedule_types t on t.id = d.schedule_type_id
  left join lateral (
    select x.replacement_activity, x.replacement_instructor, x.replacement_workload
    from public.qts_activity_adjustments x
    where x.activity_date = a.activity_date
      and x.starts_at = a.starts_at
      and x.expected_activity = a.activity
      and x.active
    order by x.created_at desc, x.id desc
    limit 1
  ) adj on true
  where t.code = 'qts'
    and d.publication_status = 'published'
    and d.processing_status <> 'superseded'
    and a.activity_date between p_start and p_end
    and public.schedule_can_read_document(d.id)
  order by a.activity_date, a.starts_at nulls last, a.sequence;
$$;

revoke all on function public.qts_add_activity_adjustment(date,time,text,text,text,text,text) from public, anon;
grant execute on function public.qts_add_activity_adjustment(date,time,text,text,text,text,text) to authenticated;
revoke all on function public.qts_calendar(date,date) from public, anon;
grant execute on function public.qts_calendar(date,date) to authenticated;

-- Troca solicitada pelos instrutores para segunda-feira, 14/09/2026:
-- Incêndio Urbano pela manhã e Salvamento Terrestre à tarde.
insert into public.qts_activity_adjustments(
  activity_date, starts_at, expected_activity, replacement_activity,
  replacement_instructor, replacement_workload, reason
) values
  ('2026-09-14', '08:15', 'STER - I', 'CIU - I', 'MAJ CHARLLYS', '06/80',
   'Troca de períodos solicitada pelos instrutores em 14/09/2026: Incêndio pela manhã e Salvamento Terrestre à tarde.'),
  ('2026-09-14', '10:30', 'STER - I', 'CIU - I', 'MAJ CHARLLYS', '08/80',
   'Troca de períodos solicitada pelos instrutores em 14/09/2026: Incêndio pela manhã e Salvamento Terrestre à tarde.'),
  ('2026-09-14', '13:45', 'CIU - I', 'STER - I', 'CAP DIEGO', '38/80',
   'Troca de períodos solicitada pelos instrutores em 14/09/2026: Incêndio pela manhã e Salvamento Terrestre à tarde.'),
  ('2026-09-14', '16:00', 'CIU - I', 'STER - I', 'CAP DIEGO', '40/80',
   'Troca de períodos solicitada pelos instrutores em 14/09/2026: Incêndio pela manhã e Salvamento Terrestre à tarde.');
