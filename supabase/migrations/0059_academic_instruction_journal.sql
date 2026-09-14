-- =====================================================================
-- 0059 — Calendário letivo, diário de instrução e frequência por aula.
--
-- Expansão aditiva do núcleo acadêmico. A frequência consolidada de
-- academic_enrollments permanece como histórico legado; esta migration
-- registra somente eventos posteriores por encontro de instrução.
-- =====================================================================

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  year int not null check (year between 2020 and 2200),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft','open','closed')),
  source_ref text not null check (length(btrim(source_ref)) >= 5),
  revision int not null default 1 check (revision > 0),
  change_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  closed_at timestamptz,
  closed_by uuid references public.profiles(id) on delete restrict,
  check (starts_on <= ends_on),
  unique (course_id, year)
);

create table public.academic_calendar_events (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid references public.classes(id) on delete restrict,
  event_date date not null,
  event_type text not null check (event_type in ('holiday','recess','suspension','institutional','class_exception')),
  title text not null check (length(btrim(title)) between 3 and 200),
  blocks_instruction boolean not null default true,
  source_ref text not null check (length(btrim(source_ref)) >= 5),
  revision int not null default 1 check (revision > 0),
  change_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict
);
create unique index academic_calendar_events_scope_unique
  on public.academic_calendar_events(academic_year_id, event_date, coalesce(class_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index academic_calendar_events_year_date
  on public.academic_calendar_events(academic_year_id, event_date);

alter table public.academic_offerings
  add column academic_year_id uuid references public.academic_years(id) on delete restrict;
create index academic_offerings_year_id on public.academic_offerings(academic_year_id);

create table public.academic_discipline_aliases (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.academic_disciplines(id) on delete restrict,
  alias text not null check (length(btrim(alias)) between 2 and 220),
  normalized_alias text not null check (length(btrim(normalized_alias)) between 2 and 220),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  unique (discipline_id, normalized_alias)
);
create index academic_discipline_aliases_lookup
  on public.academic_discipline_aliases(normalized_alias) where active;

create table public.academic_qts_documents (
  document_id uuid primary key references public.schedule_documents(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  linked_at timestamptz not null default now(),
  linked_by uuid references public.profiles(id) on delete restrict,
  change_reason text not null check (length(btrim(change_reason)) >= 5)
);
create index academic_qts_documents_year on public.academic_qts_documents(academic_year_id);

create table public.academic_instruction_sessions (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  offering_id uuid references public.academic_offerings(id) on delete restrict,
  qts_activity_id uuid unique references public.qts_activities(id) on delete restrict,
  rescheduled_from_id uuid references public.academic_instruction_sessions(id) on delete restrict,
  scheduled_on date not null,
  planned_starts_at time,
  planned_ends_at time,
  actual_starts_at time,
  actual_ends_at time,
  title text not null check (length(btrim(title)) between 2 and 220),
  content text check (content is null or length(btrim(content)) between 2 and 4000),
  location text check (location is null or length(btrim(location)) between 2 and 150),
  planned_instructor text check (planned_instructor is null or length(btrim(planned_instructor)) between 2 and 200),
  classification text not null default 'unmapped' check (classification in ('instruction','non_instruction','unmapped')),
  status text not null default 'planned' check (status in ('planned','proposed','validated','cancelled','rescheduled','superseded')),
  proposed_outcome text not null default 'validated' check (proposed_outcome in ('validated','cancelled','rescheduled')),
  planned_hours numeric(7,2) not null default 0 check (planned_hours >= 0),
  taught_hours numeric(7,2) check (taught_hours is null or taught_hours >= 0),
  revision int not null default 1 check (revision > 0),
  change_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete restrict,
  proposed_at timestamptz,
  proposed_by uuid references public.profiles(id) on delete restrict,
  validated_at timestamptz,
  validated_by uuid references public.profiles(id) on delete restrict,
  check ((planned_starts_at is null and planned_ends_at is null) or (planned_starts_at is not null and planned_ends_at is not null and planned_starts_at < planned_ends_at)),
  check ((actual_starts_at is null and actual_ends_at is null) or (actual_starts_at is not null and actual_ends_at is not null and actual_starts_at < actual_ends_at)),
  check ((classification = 'instruction' and offering_id is not null) or classification <> 'instruction'),
  check ((status = 'validated' and classification = 'instruction' and offering_id is not null and actual_starts_at is not null and taught_hours is not null) or status <> 'validated')
);
create index academic_instruction_sessions_offering_date
  on public.academic_instruction_sessions(offering_id, scheduled_on desc);
create index academic_instruction_sessions_year_date
  on public.academic_instruction_sessions(academic_year_id, scheduled_on desc);
create index academic_instruction_sessions_pending
  on public.academic_instruction_sessions(academic_year_id, status, classification, scheduled_on);

create table public.academic_session_instructors (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.academic_instruction_sessions(id) on delete restrict,
  assignment_id uuid references public.academic_assignments(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete restrict,
  display_name text not null check (length(btrim(display_name)) between 2 and 150),
  created_at timestamptz not null default now(),
  unique (session_id, assignment_id)
);
create unique index academic_session_instructors_profile_unique
  on public.academic_session_instructors(session_id, profile_id) where profile_id is not null;

create table public.academic_session_attendances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.academic_instruction_sessions(id) on delete restrict,
  enrollment_id uuid not null references public.academic_enrollments(id) on delete restrict,
  status text not null check (status in ('present','justified_absence','unjustified_absence')),
  revision int not null default 1 check (revision > 0),
  change_reason text,
  marked_at timestamptz not null default now(),
  marked_by uuid references public.profiles(id) on delete restrict,
  unique (session_id, enrollment_id)
);
create index academic_session_attendances_enrollment
  on public.academic_session_attendances(enrollment_id);

-- Normalização determinística para aliases e títulos do QTS; não há inferência por IA.
create function public.academic_normalize_title(p_value text) returns text
language sql immutable strict
as $$
  select btrim(regexp_replace(
    translate(lower(p_value),
      'áàâãäåæçéèêëíìîïñóòôõöøúùûüýÿ',
      'aaaaaaaceeeeiiiinoooooouuuuyy'),
    '[^a-z0-9]+', ' ', 'g'
  ));
$$;

-- O curso da turma deve sempre coincidir com o ano letivo acadêmico da oferta/sessão.
create function public.academic_journal_guard() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_year public.academic_years;
  v_course uuid;
  v_session public.academic_instruction_sessions;
  v_enrollment public.academic_enrollments;
begin
  if tg_op = 'DELETE' then
    if current_setting('app.academic_journal_write', true) is distinct from 'true' then
      raise exception 'Registros de diário acadêmico não podem ser excluídos.' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_table_name = 'academic_years' then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
      new.revision := 1;
    elsif tg_op = 'UPDATE' then
      if new.revision <> old.revision + 1 then
        raise exception 'Ano letivo mudou; atualize antes de salvar.' using errcode = '40001';
      end if;
      if length(btrim(coalesce(new.change_reason, ''))) < 5 then
        raise exception 'Informe o motivo da alteração do ano letivo.' using errcode = '23514';
      end if;
    end if;

  elsif tg_table_name = 'academic_calendar_events' then
    select * into v_year from public.academic_years where id = new.academic_year_id;
    if not found or new.event_date < v_year.starts_on or new.event_date > v_year.ends_on then
      raise exception 'Evento deve pertencer ao período do ano letivo.' using errcode = '23514';
    end if;
    if new.class_id is not null and not exists (
      select 1 from public.classes c where c.id = new.class_id and c.course_id = v_year.course_id
    ) then
      raise exception 'A exceção deve pertencer ao curso do ano letivo.' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
      new.revision := 1;
    elsif tg_op = 'UPDATE' then
      if new.revision <> old.revision + 1 or length(btrim(coalesce(new.change_reason, ''))) < 5 then
        raise exception 'Correção do calendário exige revisão atual e motivo.' using errcode = '40001';
      end if;
    end if;

  elsif tg_table_name = 'academic_discipline_aliases' then
    new.alias := btrim(new.alias);
    new.normalized_alias := public.academic_normalize_title(new.alias);
    new.created_by := coalesce(new.created_by, auth.uid());

  elsif tg_table_name = 'academic_qts_documents' then
    select c.course_id into v_course from public.schedule_documents d join public.classes c on c.id = d.class_id
      where d.id = new.document_id;
    select * into v_year from public.academic_years where id = new.academic_year_id;
    if v_course is null or not found or v_course <> v_year.course_id then
      raise exception 'QTS e ano letivo devem pertencer ao mesmo curso.' using errcode = '23514';
    end if;
    if not exists (select 1 from public.schedule_documents where id = new.document_id and class_id = new.class_id) then
      raise exception 'Turma do QTS não confere.' using errcode = '23514';
    end if;
    new.linked_by := auth.uid();

  elsif tg_table_name = 'academic_instruction_sessions' then
    select * into v_year from public.academic_years where id = new.academic_year_id;
    if not found or new.scheduled_on < v_year.starts_on or new.scheduled_on > v_year.ends_on then
      raise exception 'A aula deve pertencer ao período do ano letivo.' using errcode = '23514';
    end if;
    if not exists (select 1 from public.classes where id = new.class_id and course_id = v_year.course_id) then
      raise exception 'Turma da aula não pertence ao curso do ano letivo.' using errcode = '23514';
    end if;
    if new.offering_id is not null and not exists (
      select 1 from public.academic_offerings o
      where o.id = new.offering_id and o.class_id = new.class_id and o.academic_year_id = new.academic_year_id
    ) then
      raise exception 'Oferta, turma e ano letivo da aula devem coincidir.' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
      new.revision := 1;
    elsif tg_op = 'UPDATE' then
      if new.revision <> old.revision + 1 then
        raise exception 'Aula mudou; atualize antes de salvar.' using errcode = '40001';
      end if;
      if length(btrim(coalesce(new.change_reason, ''))) < 5 then
        raise exception 'Correção de aula exige motivo.' using errcode = '23514';
      end if;
    end if;

  elsif tg_table_name = 'academic_session_instructors' then
    select * into v_session from public.academic_instruction_sessions where id = new.session_id;
    if not found or v_session.offering_id is null then
      raise exception 'Instrutor deve pertencer a uma aula vinculada à disciplina.' using errcode = '23514';
    end if;
    if new.assignment_id is not null then
      if not exists (
        select 1 from public.academic_assignments a
        where a.id = new.assignment_id and a.offering_id = v_session.offering_id and a.active
      ) then
        raise exception 'Instrutor precisa ter designação ativa na oferta.' using errcode = '23514';
      end if;
      select profile_id, display_name into new.profile_id, new.display_name
        from public.academic_assignments where id = new.assignment_id;
    end if;

  elsif tg_table_name = 'academic_session_attendances' then
    select * into v_session from public.academic_instruction_sessions where id = new.session_id;
    select * into v_enrollment from public.academic_enrollments where id = new.enrollment_id;
    if not found or v_session.offering_id is null or v_enrollment.offering_id <> v_session.offering_id then
      raise exception 'Chamada deve usar matrícula da mesma oferta.' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' then
      new.marked_by := auth.uid();
      new.revision := 1;
    elsif tg_op = 'UPDATE' then
      if new.revision <> old.revision + 1 or length(btrim(coalesce(new.change_reason, ''))) < 5 then
        raise exception 'Correção de chamada exige revisão atual e motivo.' using errcode = '40001';
      end if;
      new.marked_by := auth.uid();
      new.marked_at := now();
    end if;
  end if;
  return new;
end
$$;

create function public.academic_journal_audit_record() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_row jsonb;
  v_offering uuid;
  v_student uuid;
  v_session uuid;
  v_entity_id uuid;
begin
  if tg_op <> 'INSERT' then v_before := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_after := to_jsonb(new); end if;
  v_row := coalesce(v_after, v_before);
  v_offering := nullif(v_row ->> 'offering_id', '')::uuid;
  if tg_table_name = 'academic_instruction_sessions' then
    v_offering := nullif(v_row ->> 'offering_id', '')::uuid;
  elsif tg_table_name = 'academic_session_instructors' then
    v_session := (v_row ->> 'session_id')::uuid;
    select offering_id into v_offering from public.academic_instruction_sessions where id = v_session;
  elsif tg_table_name = 'academic_session_attendances' then
    v_session := (v_row ->> 'session_id')::uuid;
    select s.offering_id, e.student_id into v_offering, v_student
      from public.academic_instruction_sessions s
      join public.academic_enrollments e on e.id = (v_row ->> 'enrollment_id')::uuid
      where s.id = v_session;
  elsif tg_table_name = 'academic_calendar_events' then
    v_offering := null;
  elsif tg_table_name = 'academic_qts_documents' then
    v_offering := null;
  end if;
  v_entity_id := coalesce(nullif(v_row ->> 'id', '')::uuid, nullif(v_row ->> 'document_id', '')::uuid);
  insert into public.academic_audit_events(
    offering_id, student_id, entity, entity_id, action, actor_id, actor_name, before_data, after_data, reason
  ) values (
    v_offering, v_student, tg_table_name, v_entity_id, lower(tg_op), auth.uid(),
    (select full_name from public.profiles where id = auth.uid()), v_before, v_after,
    coalesce(v_row ->> 'change_reason', v_row ->> 'source_ref', v_row ->> 'title')
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create function public.academic_guard_offering_year() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_year public.academic_years;
begin
  if new.academic_year_id is not null then
    select * into v_year from public.academic_years where id = new.academic_year_id;
    if not found or v_year.year <> new.academic_year or not exists (
      select 1 from public.classes c where c.id = new.class_id and c.course_id = v_year.course_id
    ) then
      raise exception 'Ano letivo da oferta é incompatível com a turma.' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'UPDATE' and old.academic_year_id is not null and new.academic_year_id is distinct from old.academic_year_id
    and exists (select 1 from public.academic_assessments where offering_id = old.id) then
    raise exception 'Ano letivo não pode mudar após avaliações.' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger academic_offering_year_guard before insert or update on public.academic_offerings
for each row execute function public.academic_guard_offering_year();

-- Todas as novas entidades são consultadas com RLS; escrita é somente por RPC.
do $$
declare t text;
begin
  foreach t in array array['academic_years','academic_calendar_events','academic_discipline_aliases',
    'academic_qts_documents','academic_instruction_sessions','academic_session_instructors','academic_session_attendances'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create trigger academic_journal_guard before insert or update or delete on public.%I for each row execute function public.academic_journal_guard()', t);
    execute format('create trigger academic_journal_audit after insert or update or delete on public.%I for each row execute function public.academic_journal_audit_record()', t);
  end loop;
end
$$;

create policy academic_years_read on public.academic_years for select to authenticated using (
  public.academic_active_role() in ('coordenacao','secretaria') or exists (
    select 1 from public.academic_offerings o
    where o.academic_year_id = academic_years.id and public.academic_can_read_offering(o.id)
  )
);
create policy academic_calendar_events_read on public.academic_calendar_events for select to authenticated using (
  exists (select 1 from public.academic_years y where y.id = academic_calendar_events.academic_year_id)
);
create policy academic_aliases_read on public.academic_discipline_aliases for select to authenticated
using (public.academic_active_role() in ('coordenacao','secretaria','instrutor'));
create policy academic_qts_documents_coord_read on public.academic_qts_documents for select to authenticated
using (public.academic_active_role() = 'coordenacao');
create policy academic_sessions_read on public.academic_instruction_sessions for select to authenticated using (
  public.academic_active_role() in ('coordenacao','secretaria')
  or (offering_id is not null and public.academic_can_read_offering(offering_id))
);
create policy academic_session_instructors_read on public.academic_session_instructors for select to authenticated using (
  exists (select 1 from public.academic_instruction_sessions s where s.id = academic_session_instructors.session_id)
);
create policy academic_session_attendances_read on public.academic_session_attendances for select to authenticated using (
  public.academic_active_role() in ('coordenacao','secretaria')
  or (public.academic_active_role() = 'instrutor' and exists (
    select 1 from public.academic_instruction_sessions s
    where s.id = academic_session_attendances.session_id and s.offering_id is not null
      and public.academic_can_read_offering(s.offering_id)
  ))
  or exists (
    select 1 from public.academic_enrollments e
    where e.id = academic_session_attendances.enrollment_id and e.student_id = public.academic_current_student()
  )
);

create function public.academic_instruction_hours(p_start time, p_end time) returns numeric
language sql immutable strict
as $$ select round((extract(epoch from (p_end - p_start)) / 60.0 / 50.0)::numeric, 2) $$;

create function public.academic_require_open_year(p_academic_year_id uuid) returns public.academic_years
language plpgsql security definer set search_path = public
as $$
declare v_year public.academic_years;
begin
  select * into v_year from public.academic_years where id = p_academic_year_id for update;
  if not found or v_year.status <> 'open' then
    raise exception 'Ano letivo não está aberto para lançamentos.' using errcode = '23514';
  end if;
  return v_year;
end
$$;

create function public.academic_create_year(
  p_course_id uuid, p_year int, p_starts_on date, p_ends_on date, p_source_ref text,
  p_status text default 'open'
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação cria ano letivo.' using errcode = '42501';
  end if;
  if p_status not in ('draft','open') then
    raise exception 'Situação inicial do ano letivo inválida.' using errcode = '23514';
  end if;
  perform set_config('app.academic_journal_write', 'true', true);
  insert into public.academic_years(course_id, year, starts_on, ends_on, status, source_ref)
    values (p_course_id, p_year, p_starts_on, p_ends_on, p_status, btrim(p_source_ref)) returning id into v_id;
  return v_id;
end
$$;

create function public.academic_open_year(p_academic_year_id uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = public
as $$
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação abre ano letivo.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason,''))) < 5 then
    raise exception 'Informe o motivo da abertura.' using errcode = '23514';
  end if;
  perform set_config('app.academic_journal_write', 'true', true);
  update public.academic_years set status='open',revision=revision+1,change_reason=btrim(p_reason)
    where id=p_academic_year_id and status='draft';
  if not found then raise exception 'Ano letivo em rascunho não encontrado.' using errcode = '23514'; end if;
  return p_academic_year_id;
end
$$;

create function public.academic_save_calendar_event(
  p_event_id uuid, p_academic_year_id uuid, p_class_id uuid, p_event_date date,
  p_event_type text, p_title text, p_blocks_instruction boolean, p_source_ref text, p_reason text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação altera o calendário.' using errcode = '42501';
  end if;
  perform public.academic_require_open_year(p_academic_year_id);
  perform set_config('app.academic_journal_write', 'true', true);
  if p_event_id is null then
    insert into public.academic_calendar_events(
      academic_year_id,class_id,event_date,event_type,title,blocks_instruction,source_ref,change_reason
    ) values (
      p_academic_year_id,p_class_id,p_event_date,p_event_type,btrim(p_title),p_blocks_instruction,btrim(p_source_ref),'Inclusão no calendário letivo'
    ) returning id into v_id;
  else
    update public.academic_calendar_events set
      class_id=p_class_id,event_date=p_event_date,event_type=p_event_type,title=btrim(p_title),
      blocks_instruction=p_blocks_instruction,source_ref=btrim(p_source_ref),revision=revision+1,change_reason=btrim(p_reason)
    where id=p_event_id and academic_year_id=p_academic_year_id returning id into v_id;
    if v_id is null then raise exception 'Evento de calendário não encontrado.' using errcode = '23514'; end if;
  end if;
  return v_id;
end
$$;

create function public.academic_set_offering_year(
  p_offering_id uuid, p_academic_year_id uuid, p_reason text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_offering public.academic_offerings;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação vincula oferta ao calendário.' using errcode = '42501';
  end if;
  perform public.academic_require_open_year(p_academic_year_id);
  select * into v_offering from public.academic_offerings where id=p_offering_id for update;
  if not found then raise exception 'Oferta não encontrada.' using errcode = '23514'; end if;
  update public.academic_offerings set academic_year_id=p_academic_year_id where id=p_offering_id;
  insert into public.academic_audit_events(offering_id,entity,entity_id,action,actor_id,actor_name,after_data,reason)
    values (p_offering_id,'academic_offering_year',p_offering_id,'update',auth.uid(),
      (select full_name from public.profiles where id=auth.uid()),jsonb_build_object('academic_year_id',p_academic_year_id),btrim(p_reason));
  return p_offering_id;
end
$$;

create function public.academic_save_discipline_alias(p_discipline_id uuid, p_alias text) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação mantém aliases de disciplinas.' using errcode = '42501';
  end if;
  perform set_config('app.academic_journal_write', 'true', true);
  insert into public.academic_discipline_aliases(discipline_id,alias,normalized_alias)
    values (p_discipline_id,btrim(p_alias),public.academic_normalize_title(p_alias))
    on conflict (discipline_id,normalized_alias) do update set active=true
    returning id into v_id;
  return v_id;
end
$$;

-- Mantém nomes e códigos do catálogo como aliases iniciais, sem substituir aliases administrativos.
insert into public.academic_discipline_aliases(discipline_id, alias, normalized_alias, active)
select id, name, public.academic_normalize_title(name), true from public.academic_disciplines
on conflict (discipline_id, normalized_alias) do nothing;
insert into public.academic_discipline_aliases(discipline_id, alias, normalized_alias, active)
select id, code, public.academic_normalize_title(code), true from public.academic_disciplines
on conflict (discipline_id, normalized_alias) do nothing;

create function public.academic_import_qts_sessions(p_document_id uuid) returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_link public.academic_qts_documents;
  v_activity record;
  v_matches uuid[];
  v_offering uuid;
  v_count int := 0;
begin
  select * into v_link from public.academic_qts_documents where document_id=p_document_id;
  if not found then raise exception 'QTS sem vínculo com ano letivo.' using errcode = '23514'; end if;
  perform set_config('app.academic_journal_write', 'true', true);
  for v_activity in
    select a.* from public.qts_activities a where a.document_id=p_document_id and not a.is_break order by a.sequence
  loop
    select array_agg(distinct o.id order by o.id) into v_matches
    from public.academic_offerings o
    join public.academic_discipline_aliases da on da.discipline_id=o.discipline_id and da.active
    where o.class_id=v_link.class_id and o.academic_year_id=v_link.academic_year_id and o.active
      and da.normalized_alias=public.academic_normalize_title(v_activity.activity);
    v_offering := case when coalesce(array_length(v_matches,1),0)=1 then v_matches[1] else null end;
    insert into public.academic_instruction_sessions(
      academic_year_id,class_id,offering_id,qts_activity_id,scheduled_on,planned_starts_at,planned_ends_at,
      title,location,planned_instructor,classification,status,planned_hours,change_reason
    ) values (
      v_link.academic_year_id,v_link.class_id,v_offering,v_activity.id,v_activity.activity_date,v_activity.starts_at,v_activity.ends_at,
      v_activity.activity,v_activity.location,v_activity.instructor,
      case when v_offering is null then 'unmapped' else 'instruction' end,
      'planned',case when v_activity.starts_at is null then 0 else public.academic_instruction_hours(v_activity.starts_at,v_activity.ends_at) end,
      'Planejamento criado a partir do QTS publicado'
    ) on conflict (qts_activity_id) do nothing;
    v_count := v_count + 1;
  end loop;
  return v_count;
end
$$;

create function public.academic_link_qts_document(
  p_document_id uuid, p_academic_year_id uuid, p_reason text
) returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_class_id uuid;
  v_superseded_document_id uuid;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação vincula QTS ao calendário.' using errcode = '42501';
  end if;
  perform public.academic_require_open_year(p_academic_year_id);
  select d.class_id, d.supersedes_document_id into v_class_id, v_superseded_document_id from public.schedule_documents d
    join public.schedule_types t on t.id=d.schedule_type_id
    where d.id=p_document_id and t.code='qts' and d.publication_status='published';
  if v_class_id is null then raise exception 'Documento QTS publicado não encontrado.' using errcode = '23514'; end if;
  if exists(select 1 from public.academic_qts_documents where document_id=p_document_id and academic_year_id <> p_academic_year_id) then
    raise exception 'QTS já está vinculado a outro ano letivo; preserve o histórico e publique nova versão.' using errcode = '23514';
  end if;
  perform set_config('app.academic_journal_write', 'true', true);
  insert into public.academic_qts_documents(document_id,academic_year_id,class_id,change_reason)
    values (p_document_id,p_academic_year_id,v_class_id,btrim(p_reason))
    on conflict (document_id) do update set linked_at=now(),linked_by=auth.uid(),change_reason=excluded.change_reason;
  if v_superseded_document_id is not null then
    update public.academic_instruction_sessions s
      set status='superseded', revision=revision+1,
          change_reason='Planejamento substituído por nova versão do QTS: ' || p_document_id::text
    from public.qts_activities a
    where s.qts_activity_id=a.id
      and a.document_id=v_superseded_document_id
      and s.status in ('planned','proposed');
  end if;
  return public.academic_import_qts_sessions(p_document_id);
end
$$;

create function public.academic_map_qts_session(
  p_session_id uuid, p_offering_id uuid, p_classification text, p_reason text, p_expected_revision int
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_session public.academic_instruction_sessions;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação vincula a aula do QTS.' using errcode = '42501';
  end if;
  select * into v_session from public.academic_instruction_sessions where id=p_session_id for update;
  if not found or v_session.status <> 'planned' then raise exception 'Aula não está disponível para vínculo.' using errcode = '23514'; end if;
  perform public.academic_require_open_year(v_session.academic_year_id);
  if p_expected_revision <> v_session.revision then raise exception 'Aula mudou; atualize antes de vincular.' using errcode = '40001'; end if;
  if p_classification not in ('instruction','non_instruction') then raise exception 'Classificação inválida.' using errcode = '23514'; end if;
  if (p_classification='instruction' and p_offering_id is null) or (p_classification='non_instruction' and p_offering_id is not null) then
    raise exception 'Informe oferta apenas para instrução.' using errcode = '23514';
  end if;
  perform set_config('app.academic_journal_write', 'true', true);
  update public.academic_instruction_sessions set offering_id=p_offering_id,classification=p_classification,
    status='planned',revision=revision+1,change_reason=btrim(p_reason)
    where id=p_session_id returning id into v_session.id;
  return v_session.id;
end
$$;

create function public.academic_create_manual_session(
  p_offering_id uuid, p_scheduled_on date, p_starts_at time, p_ends_at time,
  p_title text, p_location text default null, p_rescheduled_from_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_offering public.academic_offerings;
declare v_id uuid;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação cria aula manual.' using errcode = '42501';
  end if;
  select * into v_offering from public.academic_offerings where id=p_offering_id and active for update;
  if not found or v_offering.academic_year_id is null then raise exception 'Vincule a oferta a um ano letivo aberto.' using errcode = '23514'; end if;
  perform public.academic_require_open_year(v_offering.academic_year_id);
  perform set_config('app.academic_journal_write', 'true', true);
  insert into public.academic_instruction_sessions(
    academic_year_id,class_id,offering_id,rescheduled_from_id,scheduled_on,planned_starts_at,planned_ends_at,
    title,location,classification,status,planned_hours,change_reason
  ) values (
    v_offering.academic_year_id,v_offering.class_id,v_offering.id,p_rescheduled_from_id,p_scheduled_on,p_starts_at,p_ends_at,
    btrim(p_title),nullif(btrim(coalesce(p_location,'')),''),'instruction','planned',public.academic_instruction_hours(p_starts_at,p_ends_at),'Aula manual criada pela coordenação'
  ) returning id into v_id;
  return v_id;
end
$$;

create function public.academic_propose_session(
  p_session_id uuid, p_actual_starts_at time, p_actual_ends_at time, p_content text,
  p_location text, p_outcome text, p_assignment_ids jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_session public.academic_instruction_sessions;
declare v_assignment record;
declare v_is_assigned boolean;
begin
  select * into v_session from public.academic_instruction_sessions where id=p_session_id for update;
  if not found or v_session.offering_id is null or v_session.classification <> 'instruction' then
    raise exception 'Aula não está vinculada à disciplina.' using errcode = '23514';
  end if;
  v_is_assigned := exists(select 1 from public.academic_assignments a where a.offering_id=v_session.offering_id and a.profile_id=auth.uid() and a.active);
  if public.academic_active_role() <> 'coordenacao' and not (public.academic_active_role()='instrutor' and v_is_assigned) then
    raise exception 'Sem permissão para propor esta aula.' using errcode = '42501';
  end if;
  perform public.academic_require_open_year(v_session.academic_year_id);
  if v_session.status not in ('planned','proposed') then raise exception 'Aula já possui desfecho e deve ser corrigida pela coordenação.' using errcode = '23514'; end if;
  if p_outcome not in ('validated','cancelled','rescheduled') then raise exception 'Desfecho proposto inválido.' using errcode = '23514'; end if;
  if p_outcome='validated' and (p_actual_starts_at is null or p_actual_ends_at is null or p_actual_starts_at >= p_actual_ends_at or length(btrim(coalesce(p_content,''))) < 2) then
    raise exception 'Informe horário real e conteúdo da instrução.' using errcode = '23514';
  end if;
  if jsonb_typeof(p_assignment_ids) is distinct from 'array' then raise exception 'Instrutores da aula inválidos.' using errcode = '23514'; end if;
  if public.academic_active_role()='instrutor' and not exists (
    select 1 from jsonb_array_elements_text(p_assignment_ids) x where x.value::uuid in (
      select id from public.academic_assignments where offering_id=v_session.offering_id and profile_id=auth.uid() and active
    )
  ) then raise exception 'Inclua sua designação na proposta.' using errcode = '42501'; end if;
  if exists (
    select 1 from jsonb_array_elements_text(p_assignment_ids) x
    where not exists(select 1 from public.academic_assignments a where a.id=x.value::uuid and a.offering_id=v_session.offering_id and a.active)
  ) then raise exception 'Instrutor sem designação ativa na oferta.' using errcode = '23514'; end if;
  perform set_config('app.academic_journal_write', 'true', true);
  update public.academic_instruction_sessions set actual_starts_at=p_actual_starts_at,actual_ends_at=p_actual_ends_at,
    content=nullif(btrim(coalesce(p_content,'')),''),location=nullif(btrim(coalesce(p_location,'')),''),status='proposed',
    proposed_outcome=p_outcome,proposed_at=now(),proposed_by=auth.uid(),revision=revision+1,
    change_reason='Proposta de execução aguardando validação da coordenação'
  where id=p_session_id;
  delete from public.academic_session_instructors where session_id=p_session_id;
  for v_assignment in
    select a.* from public.academic_assignments a
    join jsonb_array_elements_text(p_assignment_ids) x on x.value::uuid=a.id
    where a.offering_id=v_session.offering_id and a.active
  loop
    insert into public.academic_session_instructors(session_id,assignment_id,profile_id,display_name)
      values (p_session_id,v_assignment.id,v_assignment.profile_id,v_assignment.display_name);
  end loop;
  return p_session_id;
end
$$;

create function public.academic_validate_session(
  p_session_id uuid, p_expected_revision int, p_outcome text, p_attendance jsonb, p_reason text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_session public.academic_instruction_sessions;
declare v_enrollment record;
declare v_item jsonb;
declare v_status text;
declare v_seen_enrollment_ids uuid[] := '{}'::uuid[];
declare v_total int;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação valida aula e frequência.' using errcode = '42501';
  end if;
  select * into v_session from public.academic_instruction_sessions where id=p_session_id for update;
  if not found or v_session.status not in ('proposed','validated') then raise exception 'Aula deve estar proposta para validação.' using errcode = '23514'; end if;
  perform public.academic_require_open_year(v_session.academic_year_id);
  if p_expected_revision <> v_session.revision then raise exception 'Aula mudou; atualize antes de validar.' using errcode = '40001'; end if;
  if p_outcome not in ('validated','cancelled','rescheduled') then raise exception 'Desfecho inválido.' using errcode = '23514'; end if;
  if v_session.proposed_outcome <> p_outcome and length(btrim(coalesce(p_reason,''))) < 5 then
    raise exception 'Explique a alteração do desfecho proposto.' using errcode = '23514';
  end if;
  if v_session.status='validated' and length(btrim(coalesce(p_reason,''))) < 5 then
    raise exception 'Correção de aula validada exige motivo.' using errcode = '23514';
  end if;
  if p_outcome='validated' then
    if jsonb_typeof(p_attendance) is distinct from 'array' then raise exception 'Chamada inválida.' using errcode = '23514'; end if;
    select count(*) into v_total from public.academic_enrollments where offering_id=v_session.offering_id;
    if jsonb_array_length(p_attendance) <> v_total then raise exception 'Informe a chamada completa da oferta.' using errcode = '23514'; end if;
    for v_item in select value from jsonb_array_elements(p_attendance) loop
      if coalesce(v_item->>'enrollmentId','') !~ '^[0-9a-fA-F-]{36}$' or coalesce(v_item->>'status','') not in ('present','justified_absence','unjustified_absence') then
        raise exception 'Item de chamada inválido.' using errcode = '23514';
      end if;
      select * into v_enrollment from public.academic_enrollments
        where id=(v_item->>'enrollmentId')::uuid and offering_id=v_session.offering_id for update;
      if not found then raise exception 'Matrícula não pertence à oferta.' using errcode = '23514'; end if;
      if v_enrollment.id = any(v_seen_enrollment_ids) then
        raise exception 'Cada matrícula deve aparecer uma única vez na chamada.' using errcode = '23514';
      end if;
      v_seen_enrollment_ids := array_append(v_seen_enrollment_ids, v_enrollment.id);
      v_status := v_item->>'status';
      if exists(select 1 from public.academic_session_attendances where session_id=p_session_id and enrollment_id=v_enrollment.id) then
        update public.academic_session_attendances set status=v_status,revision=revision+1,change_reason=btrim(p_reason)
          where session_id=p_session_id and enrollment_id=v_enrollment.id;
      else
        insert into public.academic_session_attendances(session_id,enrollment_id,status,change_reason)
          values(p_session_id,v_enrollment.id,v_status,nullif(btrim(p_reason),''));
      end if;
    end loop;
  end if;
  perform set_config('app.academic_journal_write', 'true', true);
  update public.academic_instruction_sessions set status=p_outcome,
    taught_hours=case when p_outcome='validated' then public.academic_instruction_hours(actual_starts_at,actual_ends_at) else null end,
    validated_at=now(),validated_by=auth.uid(),revision=revision+1,
    change_reason=coalesce(nullif(btrim(p_reason),''),'Validação da coordenação')
  where id=p_session_id;
  return p_session_id;
end
$$;

create function public.academic_close_year(p_academic_year_id uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = public
as $$
begin
  if public.academic_active_role() is distinct from 'coordenacao' then raise exception 'Somente a coordenação fecha o ano letivo.' using errcode = '42501'; end if;
  if length(btrim(coalesce(p_reason,''))) < 5 then raise exception 'Informe o motivo do fechamento.' using errcode = '23514'; end if;
  if exists(select 1 from public.academic_instruction_sessions where academic_year_id=p_academic_year_id and status in ('planned','proposed')) then
    raise exception 'Resolva as aulas planejadas ou propostas antes de fechar o ano.' using errcode = '23514';
  end if;
  perform set_config('app.academic_journal_write', 'true', true);
  update public.academic_years set status='closed',closed_at=now(),closed_by=auth.uid(),revision=revision+1,change_reason=btrim(p_reason)
    where id=p_academic_year_id and status='open';
  if not found then raise exception 'Ano letivo aberto não encontrado.' using errcode = '23514'; end if;
  return p_academic_year_id;
end
$$;

create function public.academic_reopen_year(p_academic_year_id uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = public
as $$
begin
  if public.academic_active_role() is distinct from 'coordenacao' then raise exception 'Somente a coordenação reabre o ano letivo.' using errcode = '42501'; end if;
  if length(btrim(coalesce(p_reason,''))) < 5 then raise exception 'Informe o motivo da reabertura.' using errcode = '23514'; end if;
  perform set_config('app.academic_journal_write', 'true', true);
  update public.academic_years set status='open',closed_at=null,closed_by=null,revision=revision+1,change_reason=btrim(p_reason)
    where id=p_academic_year_id and status='closed';
  if not found then raise exception 'Ano letivo fechado não encontrado.' using errcode = '23514'; end if;
  return p_academic_year_id;
end
$$;

-- Ajustes de QTS posteriores à publicação invalidam somente o planejamento não validado.
create or replace function public.qts_add_activity_adjustment(
  p_activity_date date, p_starts_at time, p_expected_activity text, p_replacement_activity text,
  p_replacement_instructor text default null, p_replacement_workload text default null,
  p_reason text default 'Ajuste operacional do QTS'
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then raise exception 'Somente a coordenação registra ajustes do QTS.' using errcode = '42501'; end if;
  if p_activity_date is null or p_starts_at is null or length(btrim(coalesce(p_expected_activity,''))) not between 2 and 220
    or length(btrim(coalesce(p_replacement_activity,''))) not between 2 and 220 or length(btrim(coalesce(p_reason,''))) not between 3 and 1000 then
    raise exception 'Dados do ajuste do QTS inválidos.' using errcode = '23514';
  end if;
  insert into public.qts_activity_adjustments(activity_date,starts_at,expected_activity,replacement_activity,replacement_instructor,replacement_workload,reason,created_by)
  values(p_activity_date,p_starts_at,btrim(p_expected_activity),btrim(p_replacement_activity),nullif(btrim(coalesce(p_replacement_instructor,'')),''),nullif(btrim(coalesce(p_replacement_workload,'')),''),btrim(p_reason),auth.uid()) returning id into v_id;
  perform set_config('app.academic_journal_write', 'true', true);
  update public.academic_instruction_sessions s set title=btrim(p_replacement_activity),planned_instructor=nullif(btrim(coalesce(p_replacement_instructor,'')),''),
    offering_id=null,classification='unmapped',status='planned',revision=revision+1,change_reason='Ajuste do QTS exige novo vínculo da coordenação'
  from public.qts_activities a where s.qts_activity_id=a.id and a.activity_date=p_activity_date and a.starts_at=p_starts_at
    and a.activity=p_expected_activity and s.status in ('planned','proposed');
  return v_id;
end
$$;

-- A publicação do QTS passa a exigir o ano letivo para gerar o planejamento automático.
drop function public.qts_publish_reviewed_document(uuid,jsonb);
create function public.qts_publish_reviewed_document(p_document_id uuid, p_activities jsonb, p_academic_year_id uuid)
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
  if public.schedule_active_role() is distinct from 'coordenacao' then raise exception 'Somente a coordenação publica o QTS.' using errcode = '42501'; end if;
  if jsonb_typeof(p_activities) is distinct from 'array' or jsonb_array_length(p_activities) not between 1 and 500 then raise exception 'A tabela conferida do QTS é inválida.' using errcode = '23514'; end if;
  perform public.academic_require_open_year(p_academic_year_id);
  select d.* into v_document from public.schedule_documents d join public.schedule_types t on t.id=d.schedule_type_id
    where d.id=p_document_id and t.code='qts' for update of d;
  if not found or v_document.publication_status <> 'reserved' then raise exception 'Reserva de QTS indisponível.' using errcode = '23514'; end if;
  if exists(select 1 from public.qts_activities where document_id=p_document_id) then raise exception 'A tabela deste QTS já foi publicada.' using errcode = '23514'; end if;
  perform set_config('app.schedule_reason','Tabela do QTS conferida antes da publicação',true);
  for v_row in select value from jsonb_array_elements(p_activities) loop
    v_index:=v_index+1;
    if coalesce(v_row->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or length(btrim(coalesce(v_row->>'activity',''))) not between 2 and 220
      or length(coalesce(v_row->>'instructor','')) > 200 or length(coalesce(v_row->>'workload','')) > 30
      or length(coalesce(v_row->>'uniform','')) > 100 or length(coalesce(v_row->>'location','')) > 100 or length(coalesce(v_row->>'sourceLine','')) > 5000 then
      raise exception 'Revise a atividade % do QTS.', v_index using errcode='23514';
    end if;
    v_date:=(v_row->>'date')::date;
    if (v_document.period_start is not null and v_date<v_document.period_start) or (v_document.period_end is not null and v_date>v_document.period_end) then raise exception 'A atividade % está fora da vigência do QTS.',v_index using errcode='23514'; end if;
    if coalesce(v_row->>'startsAt','') = '' and coalesce(v_row->>'endsAt','') = '' then
      v_start:=null; v_end:=null;
    elsif coalesce(v_row->>'startsAt','') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and coalesce(v_row->>'endsAt','') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      v_start:=(v_row->>'startsAt')::time; v_end:=(v_row->>'endsAt')::time;
      if v_start>=v_end then raise exception 'O horário da atividade % é inválido.',v_index using errcode='23514'; end if;
    else raise exception 'Informe início e término na atividade %.',v_index using errcode='23514'; end if;
    insert into public.qts_activities(document_id,activity_date,sequence,starts_at,ends_at,activity,instructor,workload,uniform,location,is_break,source_line)
      values(p_document_id,v_date,v_index,v_start,v_end,btrim(v_row->>'activity'),nullif(btrim(coalesce(v_row->>'instructor','')),''),nullif(btrim(coalesce(v_row->>'workload','')),''),nullif(btrim(coalesce(v_row->>'uniform','')),''),nullif(btrim(coalesce(v_row->>'location','')),''),coalesce((v_row->>'isBreak')::boolean,false),coalesce(nullif(v_row->>'sourceLine',''),'Conferência manual'));
  end loop;
  perform public.schedule_finalize_document(p_document_id);
  update public.schedule_documents set processing_status='processed' where id=p_document_id;
  perform public.academic_link_qts_document(p_document_id,p_academic_year_id,'Vínculo obrigatório na publicação do QTS');
  return p_document_id;
end
$$;

revoke all on function public.academic_normalize_title(text), public.academic_instruction_hours(time,time), public.academic_require_open_year(uuid) from public, anon, authenticated;
revoke all on function public.academic_create_year(uuid,int,date,date,text,text), public.academic_open_year(uuid,text), public.academic_save_calendar_event(uuid,uuid,uuid,date,text,text,boolean,text,text), public.academic_set_offering_year(uuid,uuid,text), public.academic_save_discipline_alias(uuid,text), public.academic_import_qts_sessions(uuid), public.academic_link_qts_document(uuid,uuid,text), public.academic_map_qts_session(uuid,uuid,text,text,int), public.academic_create_manual_session(uuid,date,time,time,text,text,uuid), public.academic_propose_session(uuid,time,time,text,text,text,jsonb), public.academic_validate_session(uuid,int,text,jsonb,text), public.academic_close_year(uuid,text), public.academic_reopen_year(uuid,text), public.qts_publish_reviewed_document(uuid,jsonb,uuid) from public, anon;
grant execute on function public.academic_create_year(uuid,int,date,date,text,text), public.academic_open_year(uuid,text), public.academic_save_calendar_event(uuid,uuid,uuid,date,text,text,boolean,text,text), public.academic_set_offering_year(uuid,uuid,text), public.academic_save_discipline_alias(uuid,text), public.academic_link_qts_document(uuid,uuid,text), public.academic_map_qts_session(uuid,uuid,text,text,int), public.academic_create_manual_session(uuid,date,time,time,text,text,uuid), public.academic_propose_session(uuid,time,time,text,text,text,jsonb), public.academic_validate_session(uuid,int,text,jsonb,text), public.academic_close_year(uuid,text), public.academic_reopen_year(uuid,text), public.qts_publish_reviewed_document(uuid,jsonb,uuid) to authenticated;

comment on table public.academic_instruction_sessions is 'Diário de instrução: somente aula validada compõe a carga ministrada.';
comment on table public.academic_session_attendances is 'Chamada por aula; não armazena justificativa clínica ou documento sensível.';
comment on table public.academic_qts_documents is 'Vínculo auditável entre PDF QTS publicado e calendário acadêmico.';
