-- =====================================================================
-- 0056 - Quadro de Trabalho Semanal (QTS)
--
-- O PDF continua sendo a fonte documental. As linhas conferidas servem
-- exclusivamente para a consulta diária, semanal e offline do aplicativo.
-- =====================================================================

insert into public.schedule_types(code, name, description)
values ('qts', 'Quadro de Trabalho Semanal (QTS)',
  'Instruções, atividades e horários semanais do CFO.')
on conflict (code) do nothing;

create table public.qts_activities (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.schedule_documents(id) on delete restrict,
  activity_date date not null,
  sequence integer not null check (sequence > 0),
  starts_at time,
  ends_at time,
  activity text not null check (length(btrim(activity)) between 2 and 220),
  instructor text check (instructor is null or length(btrim(instructor)) between 2 and 200),
  workload text check (workload is null or length(btrim(workload)) between 1 and 30),
  uniform text check (uniform is null or length(btrim(uniform)) between 2 and 100),
  location text check (location is null or length(btrim(location)) between 2 and 100),
  is_break boolean not null default false,
  source_line text not null default 'Conferência manual' check (length(source_line) <= 5000),
  created_at timestamptz not null default now(),
  unique (document_id, sequence),
  check ((starts_at is null and ends_at is null) or (starts_at is not null and ends_at is not null)),
  check (ends_at is null or starts_at < ends_at)
);

create index qts_activities_document_date_idx
  on public.qts_activities(document_id, activity_date, starts_at nulls last, sequence);
create index qts_activities_date_idx
  on public.qts_activities(activity_date, starts_at nulls last);

create function public.qts_guard_activity() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Atividades publicadas do QTS não podem ser excluídas.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'Atividades publicadas do QTS são imutáveis; publique uma nova versão.' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.schedule_documents d
    join public.schedule_types t on t.id = d.schedule_type_id
    where d.id = new.document_id and t.code = 'qts'
  ) then
    raise exception 'Atividade deve pertencer a um documento QTS.' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger qts_activities_guard before insert or update or delete on public.qts_activities
for each row execute function public.qts_guard_activity();

alter table public.qts_activities enable row level security;
revoke all on public.qts_activities from public, anon, authenticated;

create function public.qts_calendar(p_start date, p_end date)
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
    a.activity, a.instructor, a.workload, a.uniform, a.location, a.is_break,
    d.original_filename
  from public.qts_activities a
  join public.schedule_documents d on d.id = a.document_id
  join public.schedule_types t on t.id = d.schedule_type_id
  where t.code = 'qts'
    and d.publication_status = 'published'
    and d.processing_status <> 'superseded'
    and a.activity_date between p_start and p_end
    and public.schedule_can_read_document(d.id)
  order by a.activity_date, a.starts_at nulls last, a.sequence;
$$;

create function public.qts_published_documents(p_start date, p_end date)
returns table(
  id uuid,
  period_start date,
  period_end date,
  original_filename text,
  storage_path text
)
language sql stable security definer set search_path = public
as $$
  select d.id, d.period_start, d.period_end, d.original_filename, d.storage_path
  from public.schedule_documents d
  join public.schedule_types t on t.id = d.schedule_type_id
  where t.code = 'qts'
    and d.publication_status = 'published'
    and d.processing_status <> 'superseded'
    and coalesce(d.period_end, d.period_start) >= p_start
    and coalesce(d.period_start, d.period_end) <= p_end
    and public.schedule_can_read_document(d.id)
  order by d.period_start, d.published_at desc;
$$;

create function public.qts_publish_reviewed_document(p_document_id uuid, p_activities jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_document public.schedule_documents;
  v_index integer := 0;
  v_row jsonb;
  v_date date;
  v_start time;
  v_end time;
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação publica o QTS.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_activities) is distinct from 'array'
    or jsonb_array_length(p_activities) not between 1 and 500 then
    raise exception 'A tabela conferida do QTS é inválida.' using errcode = '23514';
  end if;

  select d.* into v_document
  from public.schedule_documents d
  join public.schedule_types t on t.id = d.schedule_type_id
  where d.id = p_document_id and t.code = 'qts'
  for update of d;
  if not found or v_document.publication_status <> 'reserved' then
    raise exception 'Reserva de QTS indisponível.' using errcode = '23514';
  end if;
  if exists (select 1 from public.qts_activities where document_id = p_document_id) then
    raise exception 'A tabela deste QTS já foi publicada.' using errcode = '23514';
  end if;

  perform set_config('app.schedule_reason', 'Tabela do QTS conferida antes da publicação', true);
  for v_row in select value from jsonb_array_elements(p_activities) loop
    v_index := v_index + 1;
    if coalesce(v_row ->> 'date', '') !~ '^\d{4}-\d{2}-\d{2}$'
      or length(btrim(coalesce(v_row ->> 'activity', ''))) not between 2 and 220
      or length(coalesce(v_row ->> 'instructor', '')) > 200
      or length(coalesce(v_row ->> 'workload', '')) > 30
      or length(coalesce(v_row ->> 'uniform', '')) > 100
      or length(coalesce(v_row ->> 'location', '')) > 100
      or length(coalesce(v_row ->> 'sourceLine', '')) > 5000 then
      raise exception 'Revise a atividade % do QTS.', v_index using errcode = '23514';
    end if;
    v_date := (v_row ->> 'date')::date;
    if (v_document.period_start is not null and v_date < v_document.period_start)
      or (v_document.period_end is not null and v_date > v_document.period_end) then
      raise exception 'A atividade % está fora da vigência do QTS.', v_index using errcode = '23514';
    end if;
    if coalesce(v_row ->> 'startsAt', '') = '' and coalesce(v_row ->> 'endsAt', '') = '' then
      v_start := null;
      v_end := null;
    elsif coalesce(v_row ->> 'startsAt', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      and coalesce(v_row ->> 'endsAt', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      v_start := (v_row ->> 'startsAt')::time;
      v_end := (v_row ->> 'endsAt')::time;
      if v_start >= v_end then
        raise exception 'O horário da atividade % é inválido.', v_index using errcode = '23514';
      end if;
    else
      raise exception 'Informe início e término na atividade %.', v_index using errcode = '23514';
    end if;
    insert into public.qts_activities(
      document_id, activity_date, sequence, starts_at, ends_at, activity,
      instructor, workload, uniform, location, is_break, source_line
    ) values (
      p_document_id, v_date, v_index, v_start, v_end, btrim(v_row ->> 'activity'),
      nullif(btrim(coalesce(v_row ->> 'instructor', '')), ''),
      nullif(btrim(coalesce(v_row ->> 'workload', '')), ''),
      nullif(btrim(coalesce(v_row ->> 'uniform', '')), ''),
      nullif(btrim(coalesce(v_row ->> 'location', '')), ''),
      coalesce((v_row ->> 'isBreak')::boolean, false),
      coalesce(nullif(v_row ->> 'sourceLine', ''), 'Conferência manual')
    );
  end loop;

  perform public.schedule_finalize_document(p_document_id);
  update public.schedule_documents set processing_status = 'processed' where id = p_document_id;
  return p_document_id;
end
$$;

revoke all on function public.qts_calendar(date,date) from public, anon;
revoke all on function public.qts_published_documents(date,date) from public, anon;
revoke all on function public.qts_publish_reviewed_document(uuid,jsonb) from public, anon;
grant execute on function public.qts_calendar(date,date) to authenticated;
grant execute on function public.qts_published_documents(date,date) to authenticated;
grant execute on function public.qts_publish_reviewed_document(uuid,jsonb) to authenticated;

comment on table public.qts_activities is 'Atividades conferidas do Quadro de Trabalho Semanal, vinculadas ao PDF institucional.';
