-- Núcleo do estágio supervisionado. Nenhuma escala ou carga é criada nesta migration.
-- A carga oficial é a soma das versões homologadas vigentes, em minutos.

create table public.internship_programs (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  course_phase text not null check (course_phase in ('CFO I','CFO II','CFO III')),
  name text not null check (length(btrim(name)) >= 3),
  starts_on date not null,
  ends_on date not null,
  required_minutes integer not null check (required_minutes > 0),
  target_minutes integer not null check (target_minutes >= required_minutes),
  abm_buffer_days integer not null default 1 check (abm_buffer_days between 0 and 7),
  timezone text not null default 'America/Belem',
  status text not null default 'rascunho' check (status in ('rascunho','publicado','encerrado')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  closed_by uuid references auth.users(id),
  closed_at timestamptz,
  unique (class_id, course_phase),
  check (ends_on >= starts_on),
  check (length(btrim(timezone)) > 0),
  check (status <> 'publicado' or (published_by is not null and published_at is not null)),
  check (status <> 'encerrado' or (closed_by is not null and closed_at is not null))
);

create table public.internship_activity_types (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.internship_programs(id) on delete restrict,
  code text not null check (code ~ '^[a-z0-9_]+$'),
  name text not null check (length(btrim(name)) >= 2),
  training_axis text not null check (training_axis in ('aph','salvamento','integrado')),
  default_minutes integer not null check (default_minutes > 0),
  requires_operation_plan boolean not null default false,
  active boolean not null default true,
  unique (program_id, code),
  unique (id, program_id)
);

create table public.internship_sites (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.internship_programs(id) on delete restrict,
  site_type text not null check (site_type in ('gbm','praia','evento','outro')),
  code text not null check (length(btrim(code)) > 0),
  name text not null check (length(btrim(name)) > 0),
  gbm_number integer check (gbm_number > 0),
  active boolean not null default true,
  unique (program_id, code),
  unique (id, program_id),
  check (site_type <> 'gbm' or gbm_number is not null)
);

create table public.internship_resources (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.internship_sites(id) on delete restrict,
  code text not null check (length(btrim(code)) > 0),
  display_name text not null check (length(btrim(display_name)) > 0),
  resource_type text not null
    check (resource_type in ('usb','abs','posto_guarda_vida','equipe_operacional')),
  regular_team_size integer check (regular_team_size > 0),
  capacity_per_shift integer not null default 1 check (capacity_per_shift > 0),
  active boolean not null default true,
  unique (site_id, code),
  unique (id, site_id)
);

create table public.internship_shift_templates (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.internship_programs(id) on delete restrict,
  activity_type_id uuid not null,
  code text not null check (code ~ '^[A-Z0-9-]+$'),
  name text not null check (length(btrim(name)) >= 3),
  start_weekdays integer[] not null check (start_weekdays <@ array[1,2,3,4,5,6,7]),
  journey_minutes integer not null check (journey_minutes in (720,1440)),
  abm_departure_time time not null,
  obm_arrival_time time not null,
  obm_departure_time time not null,
  abm_return_time time not null,
  end_day_offset integer not null check (end_day_offset in (0,1)),
  active boolean not null default true,
  unique (program_id, code),
  unique (id, program_id),
  foreign key (activity_type_id, program_id)
    references public.internship_activity_types(id, program_id) on delete restrict,
  check (cardinality(start_weekdays) > 0)
);

create table public.internship_operation_plans (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.internship_programs(id) on delete restrict,
  code text not null check (length(btrim(code)) > 0),
  title text not null check (length(btrim(title)) >= 3),
  status text not null default 'reserva'
    check (status in ('reserva','em_definicao','autorizado','executado','encerrado')),
  starts_at timestamptz,
  ends_at timestamptz,
  document_reference text,
  officer_name text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  authorized_by uuid references auth.users(id),
  authorized_at timestamptz,
  unique (program_id, code),
  unique (id, program_id),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (status not in ('autorizado','executado','encerrado')
    or (starts_at is not null and ends_at is not null
      and length(btrim(coalesce(document_reference,''))) > 0
      and length(btrim(coalesce(officer_name,''))) > 0))
);

create table public.internship_shifts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.internship_programs(id) on delete restrict,
  activity_type_id uuid not null,
  site_id uuid not null,
  resource_id uuid not null,
  template_id uuid,
  operation_plan_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  planned_minutes integer generated always as
    ((extract(epoch from (ends_at - starts_at)) / 60)::integer) stored,
  capacity integer not null check (capacity > 0),
  status text not null default 'rascunho' check (status in ('rascunho','publicado','cancelado')),
  planned_supervisor_name text,
  additional_member_required boolean not null default true check (additional_member_required),
  change_reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  foreign key (activity_type_id, program_id)
    references public.internship_activity_types(id, program_id) on delete restrict,
  foreign key (site_id, program_id)
    references public.internship_sites(id, program_id) on delete restrict,
  foreign key (resource_id, site_id)
    references public.internship_resources(id, site_id) on delete restrict,
  foreign key (template_id, program_id)
    references public.internship_shift_templates(id, program_id) on delete restrict,
  foreign key (operation_plan_id, program_id)
    references public.internship_operation_plans(id, program_id) on delete restrict,
  check (ends_at > starts_at),
  check (extract(epoch from (ends_at - starts_at)) <= 72 * 3600),
  check (mod(extract(epoch from (ends_at - starts_at))::numeric, 60) = 0),
  check (status <> 'publicado' or (published_by is not null and published_at is not null))
);
create index internship_shifts_period on public.internship_shifts(program_id, starts_at);

create table public.internship_assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.internship_shifts(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  status text not null default 'prevista'
    check (status in ('prevista','cancelada','substituida')),
  assignment_source text not null default 'manual'
    check (assignment_source in
      ('manual','importacao','geracao','remanejamento','reposicao','substituicao')),
  reason text,
  replaces_assignment_id uuid references public.internship_assignments(id) on delete restrict,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (shift_id, student_id),
  check (assignment_source not in ('remanejamento','reposicao','substituicao')
    or length(btrim(coalesce(reason,''))) >= 5),
  check (assignment_source not in ('remanejamento','reposicao','substituicao')
    or replaces_assignment_id is not null)
);
create index internship_assignments_student on public.internship_assignments(student_id, shift_id);

-- Restrições operacionais estruturadas evitam inferir dias bloqueados de texto livre.
create table public.internship_student_blackouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.internship_programs(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  starts_on date not null,
  ends_on date not null,
  blocked_weekdays integer[] not null check (blocked_weekdays <@ array[0,1,2,3,4,5,6]),
  reason text not null check (length(btrim(reason)) >= 5),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

-- O relato do cadete é apêndice e nunca altera os horários oficiais.
create table public.internship_cadet_reports (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.internship_assignments(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  report_type text not null check (report_type in ('presenca','saida_antecipada','outra_ocorrencia')),
  reported_exit_at timestamptz,
  reason text,
  reported_by uuid not null references auth.users(id),
  reported_at timestamptz not null default now(),
  check (report_type <> 'saida_antecipada' or
    (reported_exit_at is not null and length(btrim(coalesce(reason,''))) >= 5))
);
create index internship_reports_assignment on public.internship_cadet_reports(assignment_id, reported_at desc);
create unique index internship_reports_one_presence
  on public.internship_cadet_reports(assignment_id) where report_type = 'presenca';

-- Cada lançamento é imutável. Aprovar ou corrigir cria uma nova versão.
create table public.internship_execution_records (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.internship_assignments(id) on delete restrict,
  revision_of_id uuid unique references public.internship_execution_records(id) on delete restrict,
  validation_status text not null check (validation_status in ('pendente','homologado')),
  attendance_status text not null
    check (attendance_status in ('integral','parcial','falta','dispensa')),
  actual_starts_at timestamptz,
  actual_ends_at timestamptz,
  calculated_minutes integer generated always as
    (case when actual_starts_at is not null and actual_ends_at is not null
      then (extract(epoch from (actual_ends_at - actual_starts_at)) / 60)::integer
      else null end) stored,
  approved_minutes integer check (approved_minutes >= 0),
  supervisor_name text,
  supervisor_rank text,
  supervisor_unit text,
  paper_reference text,
  occurrence_reason text,
  occurrence_justified boolean,
  decision_reason text,
  entered_by uuid not null references auth.users(id),
  entered_at timestamptz not null default now(),
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  check ((actual_starts_at is null and actual_ends_at is null)
    or (actual_starts_at is not null and actual_ends_at is not null
      and actual_ends_at > actual_starts_at
      and mod(extract(epoch from (actual_ends_at - actual_starts_at))::numeric, 60) = 0)),
  check (validation_status <> 'pendente' or
    (approved_minutes is null and validated_by is null and validated_at is null)),
  check (validation_status <> 'homologado' or
    (approved_minutes is not null and validated_by is not null and validated_at is not null
      and length(btrim(coalesce(supervisor_name,''))) > 0
      and length(btrim(coalesce(paper_reference,''))) > 0
      and (attendance_status in ('falta','dispensa')
        or (actual_starts_at is not null and actual_ends_at is not null))
      and (approved_minutes = coalesce(calculated_minutes,0)
        or length(btrim(coalesce(decision_reason,''))) >= 5)))
);
create unique index internship_execution_root on public.internship_execution_records(assignment_id)
  where revision_of_id is null;
create index internship_execution_assignment on public.internship_execution_records(assignment_id, entered_at desc);

-- O total oficial considera uma única versão homologada por participação.
create view public.internship_official_workload with (security_invoker = true) as
select a.student_id, sh.program_id, a.id as assignment_id, r.id as record_id,
  r.approved_minutes, r.calculated_minutes, sh.planned_minutes,
  r.validated_at
from public.internship_execution_records r
join public.internship_assignments a on a.id = r.assignment_id
join public.internship_shifts sh on sh.id = a.shift_id
where r.validation_status = 'homologado'
  and not exists (
    select 1 from public.internship_execution_records next
    where next.revision_of_id = r.id and next.validation_status = 'homologado'
  );

-- Segurança: as tabelas novas começam sem leitura/escrita para anon.
alter table public.internship_programs enable row level security;
alter table public.internship_activity_types enable row level security;
alter table public.internship_sites enable row level security;
alter table public.internship_resources enable row level security;
alter table public.internship_shift_templates enable row level security;
alter table public.internship_operation_plans enable row level security;
alter table public.internship_shifts enable row level security;
alter table public.internship_assignments enable row level security;
alter table public.internship_student_blackouts enable row level security;
alter table public.internship_cadet_reports enable row level security;
alter table public.internship_execution_records enable row level security;

-- Supabase concede privilégios padrão em public; removê-los antes de expor as tabelas.
revoke all on public.internship_programs, public.internship_activity_types,
  public.internship_sites, public.internship_resources,
  public.internship_shift_templates,
  public.internship_operation_plans, public.internship_shifts,
  public.internship_assignments, public.internship_student_blackouts,
  public.internship_cadet_reports, public.internship_execution_records,
  public.internship_official_workload from public, anon, authenticated;

create function public.internship_has_role(p_roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p
    where p.id = auth.uid() and p.active and p.role = any(p_roles));
$$;
revoke all on function public.internship_has_role(text[]) from public, anon;
grant execute on function public.internship_has_role(text[]) to authenticated;

create function public.internship_own_published_assignment(p_assignment_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.internship_assignments a
    join public.internship_shifts sh on sh.id = a.shift_id
    where a.id = p_assignment_id and a.student_id = public.current_student_id()
      and a.status = 'prevista' and sh.status = 'publicado'
  );
$$;
revoke all on function public.internship_own_published_assignment(uuid) from public, anon;
grant execute on function public.internship_own_published_assignment(uuid) to authenticated;

create function public.internship_own_published_shift(p_shift_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.internship_assignments a
    join public.internship_shifts sh on sh.id = a.shift_id
    where a.shift_id = p_shift_id and a.student_id = public.current_student_id()
      and a.status = 'prevista' and sh.status = 'publicado'
  );
$$;
revoke all on function public.internship_own_published_shift(uuid) from public, anon;
grant execute on function public.internship_own_published_shift(uuid) to authenticated;

create policy internship_programs_admin_read on public.internship_programs
  for select to authenticated using (public.internship_has_role(array['coordenacao','secretaria']));
create policy internship_programs_cadet_read on public.internship_programs
  for select to authenticated using (public.internship_has_role(array['aluno'])
    and status = 'publicado' and exists (
    select 1 from public.students s where s.id = public.current_student_id()
      and s.class_id = internship_programs.class_id
  ));
create policy internship_programs_coord_write on public.internship_programs
  for all to authenticated using (public.internship_has_role(array['coordenacao']))
    with check (public.internship_has_role(array['coordenacao']));

create policy internship_activities_admin_read on public.internship_activity_types
  for select to authenticated using (public.internship_has_role(array['coordenacao','secretaria']));
create policy internship_activities_coord_write on public.internship_activity_types
  for all to authenticated using (public.internship_has_role(array['coordenacao']))
    with check (public.internship_has_role(array['coordenacao']));
create policy internship_sites_admin_read on public.internship_sites
  for select to authenticated using (public.internship_has_role(array['coordenacao','secretaria']));
create policy internship_sites_coord_write on public.internship_sites
  for all to authenticated using (public.internship_has_role(array['coordenacao']))
    with check (public.internship_has_role(array['coordenacao']));
create policy internship_resources_admin_read on public.internship_resources
  for select to authenticated using (public.internship_has_role(array['coordenacao','secretaria']));
create policy internship_resources_coord_write on public.internship_resources
  for all to authenticated using (public.internship_has_role(array['coordenacao']))
    with check (public.internship_has_role(array['coordenacao']));
create policy internship_templates_admin_read on public.internship_shift_templates
  for select to authenticated using (public.internship_has_role(array['coordenacao','secretaria']));
create policy internship_templates_coord_write on public.internship_shift_templates
  for all to authenticated using (public.internship_has_role(array['coordenacao']))
    with check (public.internship_has_role(array['coordenacao']));
create policy internship_plans_admin_read on public.internship_operation_plans
  for select to authenticated using (public.internship_has_role(array['coordenacao','secretaria']));
create policy internship_plans_coord_write on public.internship_operation_plans
  for all to authenticated using (public.internship_has_role(array['coordenacao']))
    with check (public.internship_has_role(array['coordenacao']));
create policy internship_shifts_admin_read on public.internship_shifts
  for select to authenticated using (public.internship_has_role(array['coordenacao','secretaria']));
create policy internship_shifts_cadet_read on public.internship_shifts
  for select to authenticated using (public.internship_has_role(array['aluno'])
    and public.internship_own_published_shift(id));
create policy internship_shifts_coord_write on public.internship_shifts
  for all to authenticated using (public.internship_has_role(array['coordenacao']))
    with check (public.internship_has_role(array['coordenacao']));
create policy internship_assignments_admin_read on public.internship_assignments
  for select to authenticated using (public.internship_has_role(array['coordenacao','secretaria']));
create policy internship_assignments_cadet_read on public.internship_assignments
  for select to authenticated using (public.internship_has_role(array['aluno'])
    and public.internship_own_published_assignment(id));
create policy internship_assignments_coord_write on public.internship_assignments
  for all to authenticated using (public.internship_has_role(array['coordenacao']))
    with check (public.internship_has_role(array['coordenacao']));
create policy internship_blackouts_coord_only on public.internship_student_blackouts
  for all to authenticated using (public.internship_has_role(array['coordenacao']))
    with check (public.internship_has_role(array['coordenacao']));
create policy internship_reports_admin_read on public.internship_cadet_reports
  for select to authenticated using (public.internship_has_role(array['coordenacao','secretaria']));
create policy internship_reports_self_read on public.internship_cadet_reports
  for select to authenticated using (public.internship_has_role(array['aluno'])
    and student_id = public.current_student_id());
create policy internship_reports_self_insert on public.internship_cadet_reports
  for insert to authenticated with check (
    public.internship_has_role(array['aluno'])
    and student_id = public.current_student_id() and reported_by = auth.uid()
    and public.internship_own_published_assignment(assignment_id)
  );
create policy internship_execution_admin_read on public.internship_execution_records
  for select to authenticated using (public.internship_has_role(array['coordenacao']));
create policy internship_execution_coord_insert on public.internship_execution_records
  for insert to authenticated with check (
    public.internship_has_role(array['coordenacao']) and entered_by = auth.uid()
    and (validated_by is null or validated_by = auth.uid())
  );

grant select, insert, update, delete on public.internship_programs,
  public.internship_activity_types, public.internship_sites,
  public.internship_resources, public.internship_shift_templates,
  public.internship_operation_plans, public.internship_shifts,
  public.internship_assignments, public.internship_student_blackouts to authenticated;
grant select, insert on public.internship_cadet_reports,
  public.internship_execution_records to authenticated;
grant select on public.internship_official_workload to authenticated;

-- Integridade das versões, papel e vínculo da ficha são conferidos mesmo sem RLS.
create function public.internship_guard_execution() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_parent public.internship_execution_records;
  v_shift public.internship_shifts;
  v_assignment_status text;
begin
  if auth.uid() is not null
    and not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação lança a ficha.' using errcode = '42501';
  end if;
  if auth.uid() is not null then
    new.entered_at := now();
    if new.validation_status = 'homologado' then
      new.validated_by := auth.uid();
      new.validated_at := now();
    end if;
  end if;
  select sh.* into v_shift from public.internship_assignments a
    join public.internship_shifts sh on sh.id = a.shift_id
    where a.id = new.assignment_id;
  select a.status into v_assignment_status from public.internship_assignments a
    where a.id = new.assignment_id;
  if v_shift.status is distinct from 'publicado' or v_assignment_status is distinct from 'prevista' then
    raise exception 'Somente participação ativa em turno publicado admite execução.' using errcode = '23514';
  end if;
  if new.revision_of_id is not null then
    select * into v_parent from public.internship_execution_records
      where id = new.revision_of_id for update;
    if not found or v_parent.assignment_id <> new.assignment_id then
      raise exception 'A revisão deve pertencer à mesma participação.' using errcode = '23514';
    end if;
    if new.validation_status <> 'homologado' then
      raise exception 'A revisão deve concluir a homologação ou correção.' using errcode = '23514';
    end if;
    if new.validation_status = 'homologado' and v_parent.validation_status = 'homologado'
      and length(btrim(coalesce(new.decision_reason,''))) < 5 then
      raise exception 'Correção de carga homologada exige justificativa.' using errcode = '23514';
    end if;
  end if;
  if new.validation_status = 'homologado' and new.attendance_status in ('falta','dispensa')
    and new.approved_minutes <> 0 and length(btrim(coalesce(new.decision_reason,''))) < 5 then
    raise exception 'Homologação de falta ou dispensa com carga exige justificativa.' using errcode = '23514';
  end if;
  if new.validation_status = 'homologado'
    and new.actual_ends_at is not null and new.actual_ends_at > now() then
    raise exception 'Não é possível homologar horário ainda não realizado.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger internship_execution_guard before insert on public.internship_execution_records
  for each row execute function public.internship_guard_execution();

create function public.internship_guard_cadet_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  if new.student_id is distinct from public.current_student_id()
    or new.reported_by is distinct from auth.uid()
    or not public.internship_has_role(array['aluno']) then
    raise exception 'O cadete só pode relatar sua própria participação.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.internship_assignments a
    where a.id = new.assignment_id and a.student_id = new.student_id) then
    raise exception 'O relato deve pertencer ao cadete da participação.' using errcode = '42501';
  end if;
  if new.report_type = 'saida_antecipada' then
    select sh.starts_at, sh.ends_at into v_starts_at, v_ends_at
    from public.internship_assignments a
    join public.internship_shifts sh on sh.id = a.shift_id
    where a.id = new.assignment_id;
    if new.reported_exit_at <= v_starts_at or new.reported_exit_at >= v_ends_at then
      raise exception 'Informe uma saída dentro do plantão previsto.' using errcode = '23514';
    end if;
  end if;
  new.reported_at := now();
  return new;
end;
$$;
create trigger internship_cadet_report_guard before insert on public.internship_cadet_reports
  for each row execute function public.internship_guard_cadet_report();

create function public.internship_check_assignment(p_assignment_id uuid, p_student_id uuid,
  p_shift_id uuid, p_source text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_shift public.internship_shifts;
  v_program public.internship_programs;
  v_first date;
  v_last date;
begin
  select * into v_shift from public.internship_shifts where id = p_shift_id for update;
  select * into v_program from public.internship_programs where id = v_shift.program_id;
  perform pg_advisory_xact_lock(hashtext(p_student_id::text));
  if not exists (select 1 from public.students s where s.id = p_student_id
    and s.class_id = v_program.class_id and s.deleted_at is null) then
    raise exception 'O cadete não pertence à turma do programa.' using errcode = '23514';
  end if;
  if (select count(*) from public.internship_assignments a
      where a.shift_id = p_shift_id and a.status = 'prevista' and a.id <> p_assignment_id)
      >= v_shift.capacity then
    raise exception 'Capacidade do turno excedida.' using errcode = '23514';
  end if;
  v_first := (v_shift.starts_at at time zone v_program.timezone)::date;
  v_last := ((v_shift.ends_at - interval '1 second') at time zone v_program.timezone)::date;
  if exists (
    select 1 from public.internship_assignments a
    join public.internship_shifts sh on sh.id = a.shift_id
    where a.student_id = p_student_id and a.id <> p_assignment_id
      and a.status = 'prevista' and sh.status = 'publicado'
      and tstzrange(sh.starts_at, sh.ends_at, '[)') &&
        tstzrange(v_shift.starts_at, v_shift.ends_at, '[)')
  ) then
    raise exception 'O cadete já possui estágio neste horário.' using errcode = '23514';
  end if;
  if p_source not in ('remanejamento','reposicao') and exists (
    select 1 from public.internship_assignments a
    join public.internship_shifts sh on sh.id = a.shift_id
    where a.student_id = p_student_id and a.id <> p_assignment_id
      and a.status = 'prevista' and sh.status = 'publicado'
      and (
        ((sh.ends_at - interval '1 second') at time zone v_program.timezone)::date = v_first - 1
        or (sh.starts_at at time zone v_program.timezone)::date = v_last + 1
      )
  ) then
    raise exception 'Previsão-base não permite estágio em dias consecutivos.' using errcode = '23514';
  end if;
  if exists (select 1 from public.duty_assignments d
      where d.student_id = p_student_id and d.status in ('prevista','confirmada')
        and d.duty_date between v_first - v_program.abm_buffer_days
          and v_last + v_program.abm_buffer_days) then
    raise exception 'Conflito com serviço ABM em D-1, D ou D+1.' using errcode = '23514';
  end if;
  if exists (select 1 from public.duty_impediments i
      where i.student_id = p_student_id and i.active
        and i.starts_on <= v_last and i.ends_on >= v_first) then
    raise exception 'Cadete com impedimento operacional ativo.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.internship_student_blackouts b,
      generate_series(v_first, v_last, interval '1 day') as day(value)
    where b.program_id = v_program.id and b.student_id = p_student_id
      and day.value::date between b.starts_on and b.ends_on
      and extract(dow from day.value)::integer = any(b.blocked_weekdays)
  ) then
    raise exception 'Cadete indisponível por restrição operacional cadastrada.' using errcode = '23514';
  end if;
end;
$$;

create function public.internship_guard_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  if auth.uid() is not null
    and not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação altera participações.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    select status into v_status from public.internship_shifts where id = old.shift_id;
    if v_status <> 'rascunho' then
      raise exception 'Participação em turno publicado não pode ser excluída.' using errcode = '23514';
    end if;
    return old;
  end if;
  select status into v_status from public.internship_shifts where id = new.shift_id;
  if v_status = 'cancelado' then
    raise exception 'Turno cancelado não aceita participação.' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and new.assignment_source = 'remanejamento'
    and not exists (select 1 from public.internship_assignments replaced
      where replaced.id = new.replaces_assignment_id
        and replaced.student_id = new.student_id
        and replaced.status in ('cancelada','substituida')) then
    raise exception 'Remanejamento exige participação anterior cancelada ou substituída.'
      using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and new.assignment_source = 'substituicao'
    and not exists (select 1 from public.internship_assignments replaced
      where replaced.id = new.replaces_assignment_id
        and replaced.student_id <> new.student_id
        and replaced.shift_id = new.shift_id
        and replaced.status = 'substituida') then
    raise exception 'Substituição exige outro cadete e participação anterior substituída.'
      using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and new.assignment_source = 'reposicao'
    and not exists (
      select 1 from public.internship_assignments replaced
      join public.internship_shifts replaced_shift on replaced_shift.id = replaced.shift_id
      join public.internship_execution_records record on record.assignment_id = replaced.id
      where replaced.id = new.replaces_assignment_id
        and replaced.student_id = new.student_id and replaced.status = 'prevista'
        and record.validation_status = 'homologado'
        and record.approved_minutes < replaced_shift.planned_minutes
        and not exists (select 1 from public.internship_execution_records child
          where child.revision_of_id = record.id)
    ) then
    raise exception 'Reposição exige carga homologada inferior à prevista para o mesmo cadete.'
      using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    if old.shift_id <> new.shift_id or old.student_id <> new.student_id
      or old.assignment_source <> new.assignment_source or old.created_by is distinct from new.created_by
      or old.created_at <> new.created_at then
      raise exception 'Remanejamento exige nova participação.' using errcode = '23514';
    end if;
    if old.status <> 'prevista' or new.status not in ('cancelada','substituida')
      or length(btrim(coalesce(new.reason,''))) < 5 then
      raise exception 'Alteração de participação exige cancelamento ou substituição motivada.'
        using errcode = '23514';
    end if;
    if exists (select 1 from public.internship_execution_records r
      where r.assignment_id = old.id) then
      raise exception 'Participação executada não pode ser cancelada.' using errcode = '23514';
    end if;
    new.updated_at := now();
  end if;
  if new.status = 'prevista' then
    perform public.internship_check_assignment(new.id, new.student_id, new.shift_id,
      new.assignment_source);
  end if;
  return new;
end;
$$;
create trigger internship_assignment_guard before insert or update or delete on public.internship_assignments
  for each row execute function public.internship_guard_assignment();

create function public.internship_guard_shift() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_program public.internship_programs;
  v_activity public.internship_activity_types;
  v_site public.internship_sites;
  v_resource public.internship_resources;
  v_template public.internship_shift_templates;
  v_plan public.internship_operation_plans;
  v_assignment record;
begin
  if auth.uid() is not null
    and not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação altera turnos.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    if old.status <> 'rascunho' then
      raise exception 'Turno publicado não pode ser excluído.' using errcode = '23514';
    end if;
    return old;
  end if;
  select * into v_program from public.internship_programs where id = new.program_id;
  select * into v_activity from public.internship_activity_types where id = new.activity_type_id;
  select * into v_site from public.internship_sites where id = new.site_id;
  select * into v_resource from public.internship_resources where id = new.resource_id;
  if new.template_id is not null then
    select * into v_template from public.internship_shift_templates
      where id = new.template_id;
    if v_template.id is null or not v_template.active
      or v_template.program_id <> new.program_id
      or v_template.activity_type_id <> new.activity_type_id
      or extract(isodow from (new.starts_at at time zone v_program.timezone))::integer
        <> all(v_template.start_weekdays)
      or (new.starts_at at time zone v_program.timezone)::time <> v_template.abm_departure_time
      or extract(epoch from (new.ends_at - new.starts_at)) <> v_template.journey_minutes * 60 then
      raise exception 'Turno incompatível com o padrão operacional selecionado.'
        using errcode = '23514';
    end if;
  end if;
  if (new.starts_at at time zone v_program.timezone)::date < v_program.starts_on
    or ((new.ends_at - interval '1 second') at time zone v_program.timezone)::date > v_program.ends_on then
    raise exception 'Turno fora do período do programa.' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.status <> 'rascunho' then
    if old.status <> 'publicado' or new.status <> 'cancelado'
      or length(btrim(coalesce(new.change_reason,''))) < 5
      or row(new.program_id, new.activity_type_id, new.site_id, new.resource_id, new.template_id,
        new.operation_plan_id, new.starts_at, new.ends_at, new.capacity,
        new.planned_supervisor_name, new.additional_member_required,
        new.created_by, new.created_at, new.published_by, new.published_at)
        is distinct from
        row(old.program_id, old.activity_type_id, old.site_id, old.resource_id, old.template_id,
        old.operation_plan_id, old.starts_at, old.ends_at, old.capacity,
        old.planned_supervisor_name, old.additional_member_required,
        old.created_by, old.created_at, old.published_by, old.published_at) then
      raise exception 'Turno publicado só pode ser cancelado com motivo.' using errcode = '23514';
    end if;
    if exists (select 1 from public.internship_execution_records r
      join public.internship_assignments a on a.id = r.assignment_id
      where a.shift_id = old.id) then
      raise exception 'Turno com execução não pode ser cancelado.' using errcode = '23514';
    end if;
  end if;
  if new.status = 'publicado' then
    perform pg_advisory_xact_lock(hashtext(new.resource_id::text));
    if exists (select 1 from public.internship_shifts other_shift
      where other_shift.resource_id = new.resource_id and other_shift.id <> new.id
        and other_shift.status = 'publicado'
        and tstzrange(other_shift.starts_at, other_shift.ends_at, '[)') &&
          tstzrange(new.starts_at, new.ends_at, '[)')) then
      raise exception 'O recurso já possui turno publicado neste horário.' using errcode = '23514';
    end if;
    if v_program.status <> 'publicado' or not v_activity.active or not v_site.active
      or not v_resource.active or new.capacity > v_resource.capacity_per_shift
      or length(btrim(coalesce(new.planned_supervisor_name,''))) = 0 then
      raise exception 'Programa, modalidade, local, recurso e supervisor devem estar aptos.'
        using errcode = '23514';
    end if;
    if v_activity.requires_operation_plan then
      select * into v_plan from public.internship_operation_plans
        where id = new.operation_plan_id;
      if v_plan.id is null or v_plan.status not in ('autorizado','executado') then
        raise exception 'Operação exige plano autorizado.' using errcode = '23514';
      end if;
    end if;
    if tg_op = 'UPDATE' then
      if old.status <> 'rascunho' or
        row(new.program_id, new.activity_type_id, new.site_id, new.resource_id, new.template_id,
          new.operation_plan_id, new.starts_at, new.ends_at, new.capacity,
          new.planned_supervisor_name, new.additional_member_required,
          new.change_reason, new.created_by, new.created_at)
          is distinct from
          row(old.program_id, old.activity_type_id, old.site_id, old.resource_id, old.template_id,
          old.operation_plan_id, old.starts_at, old.ends_at, old.capacity,
          old.planned_supervisor_name, old.additional_member_required,
          old.change_reason, old.created_by, old.created_at) then
        raise exception 'Publique o turno sem alterar sua configuração na mesma ação.'
          using errcode = '23514';
      end if;
      for v_assignment in select id, student_id, assignment_source from public.internship_assignments
        where shift_id = new.id and status = 'prevista' loop
        perform public.internship_check_assignment(v_assignment.id, v_assignment.student_id,
          new.id, v_assignment.assignment_source);
      end loop;
    end if;
  end if;
  return new;
end;
$$;
create trigger internship_shift_guard before insert or update or delete on public.internship_shifts
  for each row execute function public.internship_guard_shift();

create function public.internship_guard_program() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
    and not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação altera programas.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    if old.status <> 'rascunho' then
      raise exception 'Programa publicado não pode ser excluído.' using errcode = '23514';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.status <> 'rascunho' then
    if old.status <> 'publicado' or new.status <> 'encerrado'
      or (to_jsonb(new) - 'status' - 'closed_by' - 'closed_at')
        <> (to_jsonb(old) - 'status' - 'closed_by' - 'closed_at') then
      raise exception 'Programa publicado só pode ser encerrado.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger internship_program_guard before update or delete on public.internship_programs
  for each row execute function public.internship_guard_program();

create function public.internship_guard_operation_plan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
    and not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação altera planos operacionais.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    if old.status <> 'reserva' then
      raise exception 'Plano operacional formalizado não pode ser excluído.' using errcode = '23514';
    end if;
    return old;
  end if;
  if old.status in ('autorizado','executado','encerrado') then
    if not ((old.status = 'autorizado' and new.status = 'executado')
      or (old.status = 'executado' and new.status = 'encerrado'))
      or row(new.program_id, new.code, new.title, new.starts_at, new.ends_at,
        new.document_reference, new.officer_name, new.created_by, new.created_at,
        new.authorized_by, new.authorized_at)
        is distinct from
        row(old.program_id, old.code, old.title, old.starts_at, old.ends_at,
        old.document_reference, old.officer_name, old.created_by, old.created_at,
        old.authorized_by, old.authorized_at) then
      raise exception 'Plano autorizado preserva documento, supervisor e horário.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger internship_operation_plan_guard before update or delete
  on public.internship_operation_plans
  for each row execute function public.internship_guard_operation_plan();

create function public.internship_guard_blackout() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
    and not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação altera restrições.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.internship_programs p
    join public.students s on s.class_id = p.class_id
    where p.id = new.program_id and s.id = new.student_id
  ) then
    raise exception 'Restrição vinculada a cadete de outra turma.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger internship_blackout_guard before insert or update
  on public.internship_student_blackouts
  for each row execute function public.internship_guard_blackout();

create function public.internship_guard_catalog() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_used boolean;
begin
  if auth.uid() is not null
    and not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação altera o catálogo.' using errcode = '42501';
  end if;
  if tg_table_name = 'internship_activity_types' then
    select exists (select 1 from public.internship_shifts sh
      where sh.activity_type_id = old.id and sh.status <> 'rascunho') into v_used;
  elsif tg_table_name = 'internship_sites' then
    select exists (select 1 from public.internship_shifts sh
      where sh.site_id = old.id and sh.status <> 'rascunho') into v_used;
  elsif tg_table_name = 'internship_resources' then
    select exists (select 1 from public.internship_shifts sh
      where sh.resource_id = old.id and sh.status <> 'rascunho') into v_used;
  else
    select exists (select 1 from public.internship_shifts sh
      where sh.template_id = old.id and sh.status <> 'rascunho') into v_used;
  end if;
  if v_used then
    if tg_op = 'DELETE' then
      raise exception 'Catálogo usado em turno publicado não pode ser excluído.'
        using errcode = '23514';
    elsif (to_jsonb(new) - 'active') is distinct from (to_jsonb(old) - 'active') then
      raise exception 'Catálogo usado em turno publicado não pode ser reescrito.'
        using errcode = '23514';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger internship_activity_catalog_guard before update or delete
  on public.internship_activity_types
  for each row execute function public.internship_guard_catalog();
create trigger internship_site_catalog_guard before update or delete
  on public.internship_sites
  for each row execute function public.internship_guard_catalog();
create trigger internship_resource_catalog_guard before update or delete
  on public.internship_resources
  for each row execute function public.internship_guard_catalog();
create trigger internship_template_catalog_guard before update or delete
  on public.internship_shift_templates
  for each row execute function public.internship_guard_catalog();

create function public.internship_audit_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_row_id uuid;
begin
  v_row_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.audit_logs(actor_id, actor_role, entity, entity_id, action,
    before_data, after_data, reason)
  values (auth.uid(), public.current_role(), tg_table_name, v_row_id, lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    case when tg_op = 'DELETE' then null
      else coalesce(to_jsonb(new)->>'change_reason', to_jsonb(new)->>'reason') end);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger internship_program_audit after insert or update or delete on public.internship_programs
  for each row execute function public.internship_audit_change();
create trigger internship_shift_audit after insert or update or delete on public.internship_shifts
  for each row execute function public.internship_audit_change();
create trigger internship_assignment_audit after insert or update or delete on public.internship_assignments
  for each row execute function public.internship_audit_change();
create trigger internship_plan_audit after insert or update or delete on public.internship_operation_plans
  for each row execute function public.internship_audit_change();
create trigger internship_blackout_audit after insert or update or delete on public.internship_student_blackouts
  for each row execute function public.internship_audit_change();

revoke all on function public.internship_guard_execution() from public, anon, authenticated;
revoke all on function public.internship_guard_cadet_report() from public, anon, authenticated;
revoke all on function public.internship_check_assignment(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.internship_guard_assignment() from public, anon, authenticated;
revoke all on function public.internship_guard_shift() from public, anon, authenticated;
revoke all on function public.internship_guard_program() from public, anon, authenticated;
revoke all on function public.internship_guard_operation_plan() from public, anon, authenticated;
revoke all on function public.internship_guard_blackout() from public, anon, authenticated;
revoke all on function public.internship_guard_catalog() from public, anon, authenticated;
revoke all on function public.internship_audit_change() from public, anon, authenticated;

-- Não há políticas de UPDATE/DELETE para relatos e execuções: são append-only.
comment on table public.internship_execution_records is
  'Versões append-only; minutos realizados vêm dos horários e carga oficial de approved_minutes homologados.';

-- Cria somente a configuração conhecida. Não publica programa, turnos ou carga.
create function public.internship_initialize_cfo_2026() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_class_id uuid;
  v_program_id uuid;
  v_site_id uuid;
  v_silva_nunes uuid;
  v_gbm record;
  v_beach record;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação configura o estágio.' using errcode = '42501';
  end if;
  select c.id into v_class_id from public.classes c
    join public.courses course on course.id = c.course_id
    where course.code = 'CFO-2026' and c.name = 'CFO 2026.1';
  if v_class_id is null then
    raise exception 'Turma CFO 2026.1 não encontrada.' using errcode = '23514';
  end if;
  insert into public.internship_programs(class_id,course_phase,name,starts_on,ends_on,
    required_minutes,target_minutes,timezone,created_by)
  values (v_class_id,'CFO I','Estágio Supervisionado CFO 2026.1',
    date '2026-09-26',date '2026-12-13',15000,15120,'America/Belem',auth.uid())
  on conflict (class_id,course_phase) do nothing;
  select id into v_program_id from public.internship_programs
    where class_id = v_class_id and course_phase = 'CFO I';

  insert into public.internship_activity_types(program_id,code,name,training_axis,
    default_minutes,requires_operation_plan)
  values
    (v_program_id,'usb','USB — Atendimento Pré-Hospitalar','aph',720,false),
    (v_program_id,'abs','ABS — Salvamento','salvamento',720,false),
    (v_program_id,'guarda_vida','Guarda-vida','integrado',480,true),
    (v_program_id,'operacao_especial','Operação especial','integrado',480,true)
  on conflict (program_id,code) do nothing;

  insert into public.internship_shift_templates(program_id,activity_type_id,code,name,
    start_weekdays,journey_minutes,abm_departure_time,obm_arrival_time,
    obm_departure_time,abm_return_time,end_day_offset)
  values
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'DU-USB-12','USB em dia útil — 12 horas',array[1,2,3,4,5],720,'18:00','18:30','05:30','06:00',1),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='abs'),
      'DU-ABS-12','ABS em dia útil — 12 horas',array[1,2,3,4,5],720,'18:00','18:30','05:30','06:00',1),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'SAB-USB-D12','USB diurna de sábado — 12 horas',array[6],720,'06:00','06:30','17:30','18:00',0),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'SAB-USB-N12','USB noturna de sábado — 12 horas',array[6],720,'18:00','18:30','05:30','06:00',1),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'DOM-USB-D12','USB diurna de domingo — 12 horas',array[7],720,'06:00','06:30','17:30','18:00',0),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'DOM-USB-N12','USB noturna de domingo — 12 horas',array[7],720,'18:00','18:30','05:30','06:00',1),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='abs'),
      'SAB-ABS-24','ABS de sábado — 24 horas',array[6],1440,'06:00','06:30','05:30','06:00',1),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='abs'),
      'DOM-ABS-24','ABS de domingo — 24 horas',array[7],1440,'06:00','06:30','05:30','06:00',1)
  on conflict (program_id,code) do nothing;

  for v_gbm in select * from (values (1,'1º GBM'),(2,'2º GBM'),(5,'5º GBM'))
    as gbm(number,name) loop
    insert into public.internship_sites(program_id,site_type,code,name,gbm_number)
    values (v_program_id,'gbm','gbm_' || v_gbm.number,v_gbm.name,v_gbm.number)
    on conflict (program_id,code) do nothing;
    select id into v_site_id from public.internship_sites
      where program_id = v_program_id and code = 'gbm_' || v_gbm.number;
    insert into public.internship_resources(site_id,code,display_name,resource_type)
    values (v_site_id,'usb','Vaga adicional USB','usb'),
      (v_site_id,'abs','Vaga adicional ABS','abs')
    on conflict (site_id,code) do nothing;
  end loop;

  for v_beach in select * from (values
    (1,'Fazendinha'),(2,'Santa Inês'),(3,'Araxá'),
    (4,'Cidade Nova'),(5,'Curiaú')
  ) as beach(number,name) loop
    insert into public.internship_sites(program_id,site_type,code,name)
    values (v_program_id,'praia','praia_' || v_beach.number,v_beach.name)
    on conflict (program_id,code) do nothing;
    select id into v_site_id from public.internship_sites
      where program_id = v_program_id and code = 'praia_' || v_beach.number;
    insert into public.internship_resources(site_id,code,display_name,resource_type,
      regular_team_size)
    values (v_site_id,'posto','Vaga adicional de guarda-vida','posto_guarda_vida',3)
    on conflict (site_id,code) do nothing;
  end loop;

  insert into public.internship_operation_plans(program_id,code,title,status,created_by)
  values (v_program_id,'cirio_fluvial_2026','Círio Fluvial — reserva DOP',
    'reserva',auth.uid())
  on conflict (program_id,code) do nothing;

  select id into v_silva_nunes from public.students
    where class_id = v_class_id and war_name = 'SILVA NUNES' and deleted_at is null;
  if v_silva_nunes is not null and not exists (
    select 1 from public.internship_student_blackouts b
    where b.program_id = v_program_id and b.student_id = v_silva_nunes
      and b.starts_on = date '2026-09-26' and b.ends_on = date '2026-12-13'
      and b.blocked_weekdays = array[5,6]
  ) then
    insert into public.internship_student_blackouts(program_id,student_id,starts_on,
      ends_on,blocked_weekdays,reason,created_by)
    values (v_program_id,v_silva_nunes,date '2026-09-26',date '2026-12-13',
      array[5,6],'Restrição religiosa operacional: sexta-feira e sábado',auth.uid());
  end if;
  return v_program_id;
end;
$$;
revoke all on function public.internship_initialize_cfo_2026() from public, anon;
grant execute on function public.internship_initialize_cfo_2026() to authenticated;

create function public.internship_configure_cfo_2026_beaches(p_names text[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_program public.internship_programs;
  v_site_id uuid;
  v_index integer;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação configura locais de estágio.' using errcode = '42501';
  end if;
  if coalesce(array_length(p_names,1),0) <> 5
    or exists (select 1 from unnest(p_names) as names(value)
      where value is null or length(btrim(value)) < 3 or length(btrim(value)) > 120)
    or (select count(distinct lower(btrim(value))) from unnest(p_names) as names(value)) <> 5 then
    raise exception 'Informe cinco locais de praia distintos.' using errcode = '23514';
  end if;
  select p.* into v_program from public.internship_programs p
    join public.classes c on c.id = p.class_id
    join public.courses course on course.id = c.course_id
    where course.code = 'CFO-2026' and c.name = 'CFO 2026.1'
      and p.course_phase = 'CFO I' for update of p;
  if v_program.id is null or v_program.status <> 'rascunho' then
    raise exception 'Configure os locais antes da publicação do programa.' using errcode = '23514';
  end if;
  for v_index in 1..5 loop
    insert into public.internship_sites(program_id,site_type,code,name)
    values (v_program.id,'praia','praia_' || v_index,btrim(p_names[v_index]))
    on conflict (program_id,code) do update set name = excluded.name;
    select id into v_site_id from public.internship_sites
      where program_id = v_program.id and code = 'praia_' || v_index;
    insert into public.internship_resources(site_id,code,display_name,resource_type,
      regular_team_size)
    values (v_site_id,'posto','Vaga adicional de guarda-vida','posto_guarda_vida',3)
    on conflict (site_id,code) do nothing;
  end loop;
  return v_program.id;
end;
$$;
revoke all on function public.internship_configure_cfo_2026_beaches(text[]) from public, anon;
grant execute on function public.internship_configure_cfo_2026_beaches(text[]) to authenticated;

create function public.internship_publish_cfo_2026() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_program public.internship_programs;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação publica o programa.' using errcode = '42501';
  end if;
  select p.* into v_program from public.internship_programs p
    join public.classes c on c.id = p.class_id
    join public.courses course on course.id = c.course_id
    where course.code = 'CFO-2026' and c.name = 'CFO 2026.1'
      and p.course_phase = 'CFO I' for update of p;
  if v_program.id is null or v_program.status <> 'rascunho' then
    raise exception 'Programa indisponível para publicação.' using errcode = '23514';
  end if;
  if (select count(*) from public.internship_sites s
      where s.program_id = v_program.id and s.site_type = 'praia' and s.active) <> 5
    or (select count(*) from public.internship_sites s
      where s.program_id = v_program.id and s.site_type = 'gbm' and s.active) <> 3
    or (select count(*) from public.internship_activity_types t
      where t.program_id = v_program.id and t.active) < 4 then
    raise exception 'Complete locais e modalidades antes de publicar.' using errcode = '23514';
  end if;
  update public.internship_programs set status = 'publicado',
    published_by = auth.uid(), published_at = now()
    where id = v_program.id;
  return v_program.id;
end;
$$;
revoke all on function public.internship_publish_cfo_2026() from public, anon;
grant execute on function public.internship_publish_cfo_2026() to authenticated;

-- Primeira via de planejamento: um plantão GBM + uma vaga adicional, atômicos.
create function public.internship_schedule_gbm_shift(
  p_program_id uuid, p_activity_code text, p_site_id uuid, p_resource_id uuid,
  p_starts_at timestamptz, p_ends_at timestamptz, p_student_id uuid,
  p_supervisor_name text, p_template_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_program public.internship_programs;
  v_activity public.internship_activity_types;
  v_site public.internship_sites;
  v_resource public.internship_resources;
  v_expected integer;
  v_daily_limit integer;
  v_local_date date;
  v_shift_id uuid;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação cria turnos.' using errcode = '42501';
  end if;
  select * into v_program from public.internship_programs where id = p_program_id;
  select * into v_activity from public.internship_activity_types
    where program_id = p_program_id and code = p_activity_code and active;
  select * into v_site from public.internship_sites
    where id = p_site_id and program_id = p_program_id and site_type = 'gbm' and active;
  select * into v_resource from public.internship_resources
    where id = p_resource_id and site_id = p_site_id and resource_type = p_activity_code and active;
  if v_program.status is distinct from 'publicado' or v_activity.id is null
    or v_site.id is null or v_resource.id is null
    or length(btrim(coalesce(p_supervisor_name,''))) < 3 then
    raise exception 'Programa, modalidade, GBM, recurso ou supervisor inválido.' using errcode = '23514';
  end if;
  v_expected := case
    when p_activity_code = 'abs'
      and extract(isodow from (p_starts_at at time zone v_program.timezone)) in (6,7)
      then 1440
    else 720
  end;
  if p_ends_at <= p_starts_at or
    extract(epoch from (p_ends_at - p_starts_at)) <> v_expected * 60 then
    raise exception 'Duração incompatível com a modalidade e o dia.' using errcode = '23514';
  end if;
  v_local_date := (p_starts_at at time zone v_program.timezone)::date;
  v_daily_limit := case
    when p_activity_code = 'usb' and extract(isodow from v_local_date) in (6,7)
      then 2 else 1 end;
  perform pg_advisory_xact_lock(hashtext(p_site_id::text || p_activity_code || v_local_date::text));
  if (select count(*) from public.internship_shifts sh
      join public.internship_activity_types activity on activity.id = sh.activity_type_id
      where sh.site_id = p_site_id and activity.code = p_activity_code
        and sh.status = 'publicado'
        and (sh.starts_at at time zone v_program.timezone)::date = v_local_date)
      >= v_daily_limit then
    raise exception 'Capacidade diária da modalidade neste GBM esgotada.' using errcode = '23514';
  end if;
  insert into public.internship_shifts(program_id,activity_type_id,site_id,resource_id,template_id,
    starts_at,ends_at,capacity,status,planned_supervisor_name,created_by)
  values (p_program_id,v_activity.id,p_site_id,p_resource_id,p_template_id,p_starts_at,p_ends_at,
    1,'rascunho',btrim(p_supervisor_name),auth.uid()) returning id into v_shift_id;
  insert into public.internship_assignments(shift_id,student_id,assignment_source,created_by)
  values (v_shift_id,p_student_id,'manual',auth.uid());
  update public.internship_shifts set status = 'publicado', published_by = auth.uid(),
    published_at = now() where id = v_shift_id;
  return v_shift_id;
end;
$$;
revoke all on function public.internship_schedule_gbm_shift(
  uuid,text,uuid,uuid,timestamptz,timestamptz,uuid,text,uuid) from public, anon;
grant execute on function public.internship_schedule_gbm_shift(
  uuid,text,uuid,uuid,timestamptz,timestamptz,uuid,text,uuid) to authenticated;

-- Via principal: o padrão fixa jornada e marcos operacionais; a Coordenação escolhe data e equipe.
create function public.internship_schedule_gbm_from_template(
  p_program_id uuid, p_template_code text, p_site_id uuid, p_shift_date date,
  p_student_id uuid, p_supervisor_name text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_program public.internship_programs;
  v_template public.internship_shift_templates;
  v_activity public.internship_activity_types;
  v_resource public.internship_resources;
  v_starts_at timestamptz;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação cria turnos.' using errcode = '42501';
  end if;
  select * into v_program from public.internship_programs
    where id = p_program_id and status = 'publicado';
  select * into v_template from public.internship_shift_templates
    where program_id = p_program_id and code = upper(btrim(p_template_code)) and active;
  select * into v_activity from public.internship_activity_types
    where id = v_template.activity_type_id and active;
  select * into v_resource from public.internship_resources
    where site_id = p_site_id and resource_type = v_activity.code and active;
  if v_program.id is null or v_template.id is null or v_activity.id is null
    or v_resource.id is null or p_shift_date < v_program.starts_on
    or p_shift_date > v_program.ends_on
    or extract(isodow from p_shift_date)::integer <> all(v_template.start_weekdays)
    or length(btrim(coalesce(p_supervisor_name,''))) < 3 then
    raise exception 'Padrão, data, GBM ou supervisor inválido.' using errcode = '23514';
  end if;
  v_starts_at := make_timestamptz(
    extract(year from p_shift_date)::integer,
    extract(month from p_shift_date)::integer,
    extract(day from p_shift_date)::integer,
    extract(hour from v_template.abm_departure_time)::integer,
    extract(minute from v_template.abm_departure_time)::integer,
    0, v_program.timezone
  );
  return public.internship_schedule_gbm_shift(
    p_program_id, v_activity.code, p_site_id, v_resource.id,
    v_starts_at, v_starts_at + make_interval(mins => v_template.journey_minutes),
    p_student_id, p_supervisor_name, v_template.id
  );
end;
$$;
revoke all on function public.internship_schedule_gbm_from_template(
  uuid,text,uuid,date,uuid,text) from public, anon;
grant execute on function public.internship_schedule_gbm_from_template(
  uuid,text,uuid,date,uuid,text) to authenticated;

create function public.internship_cancel_assignment(
  p_assignment_id uuid, p_reason text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_assignment public.internship_assignments;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação cancela participações.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason,''))) < 5 then
    raise exception 'Cancelamento exige motivo.' using errcode = '23514';
  end if;
  select * into v_assignment from public.internship_assignments
    where id = p_assignment_id for update;
  if v_assignment.id is null or v_assignment.status <> 'prevista' then
    raise exception 'Participação indisponível para cancelamento.' using errcode = '23514';
  end if;
  update public.internship_assignments set status = 'cancelada', reason = btrim(p_reason),
    updated_by = auth.uid() where id = v_assignment.id;
  if not exists (select 1 from public.internship_assignments
    where shift_id = v_assignment.shift_id and status = 'prevista') then
    update public.internship_shifts set status = 'cancelado', change_reason = btrim(p_reason)
      where id = v_assignment.shift_id and status = 'publicado';
  end if;
  return v_assignment.id;
end;
$$;
revoke all on function public.internship_cancel_assignment(uuid,text) from public, anon;
grant execute on function public.internship_cancel_assignment(uuid,text) to authenticated;

create function public.internship_substitute_assignment(
  p_assignment_id uuid, p_new_student_id uuid, p_reason text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_assignment public.internship_assignments;
  v_new_id uuid;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação substitui cadetes.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason,''))) < 5 then
    raise exception 'Substituição exige motivo.' using errcode = '23514';
  end if;
  select * into v_assignment from public.internship_assignments
    where id = p_assignment_id for update;
  if v_assignment.id is null or v_assignment.status <> 'prevista'
    or v_assignment.student_id = p_new_student_id then
    raise exception 'Participação ou cadete substituto inválido.' using errcode = '23514';
  end if;
  update public.internship_assignments set status = 'substituida', reason = btrim(p_reason),
    updated_by = auth.uid() where id = v_assignment.id;
  insert into public.internship_assignments(shift_id,student_id,assignment_source,
    reason,replaces_assignment_id,created_by)
  values (v_assignment.shift_id,p_new_student_id,'substituicao',btrim(p_reason),
    v_assignment.id,auth.uid()) returning id into v_new_id;
  return v_new_id;
end;
$$;
revoke all on function public.internship_substitute_assignment(uuid,uuid,text)
  from public, anon;
grant execute on function public.internship_substitute_assignment(uuid,uuid,text)
  to authenticated;

-- Remanejamento transfere uma participação GBM não executada para novo turno.
-- Reposição mantém a execução parcial original e acrescenta novo plantão GBM.
create function public.internship_reschedule_gbm_assignment(
  p_assignment_id uuid, p_resource_id uuid, p_starts_at timestamptz,
  p_ends_at timestamptz, p_supervisor_name text, p_reason text, p_source text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_assignment public.internship_assignments;
  v_old_shift public.internship_shifts;
  v_program public.internship_programs;
  v_activity public.internship_activity_types;
  v_site public.internship_sites;
  v_resource public.internship_resources;
  v_expected integer;
  v_daily_limit integer;
  v_local_date date;
  v_shift_id uuid;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação remaneja ou cria reposição.' using errcode = '42501';
  end if;
  if p_source not in ('remanejamento','reposicao')
    or length(btrim(coalesce(p_reason,''))) < 5
    or length(btrim(coalesce(p_supervisor_name,''))) < 3 then
    raise exception 'Origem, motivo ou supervisor inválido.' using errcode = '23514';
  end if;
  select * into v_assignment from public.internship_assignments
    where id = p_assignment_id for update;
  select * into v_old_shift from public.internship_shifts
    where id = v_assignment.shift_id;
  select * into v_program from public.internship_programs
    where id = v_old_shift.program_id;
  select r.* into v_resource from public.internship_resources r
    where r.id = p_resource_id and r.resource_type in ('usb','abs') and r.active;
  select s.* into v_site from public.internship_sites s
    where s.id = v_resource.site_id and s.program_id = v_program.id
      and s.site_type = 'gbm' and s.active;
  select activity.* into v_activity from public.internship_activity_types activity
    where activity.program_id = v_program.id
      and activity.code = v_resource.resource_type and activity.active;
  if v_assignment.id is null or v_assignment.status <> 'prevista'
    or v_old_shift.status <> 'publicado' or v_program.status <> 'publicado'
    or v_resource.id is null or v_site.id is null or v_activity.id is null then
    raise exception 'Participação ou novo plantão GBM inválido.' using errcode = '23514';
  end if;
  if p_source = 'remanejamento' and not exists (
    select 1 from public.internship_sites old_site
    where old_site.id = v_old_shift.site_id and old_site.site_type = 'gbm'
  ) then
    raise exception 'Remanejamento para novo turno GBM exige origem em GBM.' using errcode = '23514';
  end if;
  v_expected := case
    when v_resource.resource_type = 'abs'
      and extract(isodow from (p_starts_at at time zone v_program.timezone)) in (6,7)
      then 1440
    else 720
  end;
  if p_ends_at <= p_starts_at
    or extract(epoch from (p_ends_at - p_starts_at)) <> v_expected * 60 then
    raise exception 'Duração incompatível com a modalidade e o dia.' using errcode = '23514';
  end if;
  v_local_date := (p_starts_at at time zone v_program.timezone)::date;
  v_daily_limit := case
    when v_resource.resource_type = 'usb' and extract(isodow from v_local_date) in (6,7)
      then 2 else 1 end;
  perform pg_advisory_xact_lock(hashtext(v_site.id::text ||
    v_resource.resource_type || v_local_date::text));
  if p_source = 'remanejamento' then
    update public.internship_assignments set status = 'substituida',
      reason = btrim(p_reason), updated_by = auth.uid() where id = v_assignment.id;
    if not exists (select 1 from public.internship_assignments
      where shift_id = v_assignment.shift_id and status = 'prevista') then
      update public.internship_shifts set status = 'cancelado',
        change_reason = btrim(p_reason)
        where id = v_assignment.shift_id and status = 'publicado';
    end if;
  end if;
  if (select count(*) from public.internship_shifts sh
      join public.internship_activity_types activity on activity.id = sh.activity_type_id
      where sh.site_id = v_site.id and activity.code = v_resource.resource_type
        and sh.status = 'publicado'
        and (sh.starts_at at time zone v_program.timezone)::date = v_local_date)
      >= v_daily_limit then
    raise exception 'Capacidade diária da modalidade neste GBM esgotada.' using errcode = '23514';
  end if;
  insert into public.internship_shifts(program_id,activity_type_id,site_id,resource_id,
    starts_at,ends_at,capacity,status,planned_supervisor_name,created_by)
  values (v_program.id,v_activity.id,v_site.id,v_resource.id,p_starts_at,p_ends_at,
    1,'rascunho',btrim(p_supervisor_name),auth.uid()) returning id into v_shift_id;
  insert into public.internship_assignments(shift_id,student_id,assignment_source,
    reason,replaces_assignment_id,created_by)
  values (v_shift_id,v_assignment.student_id,p_source,btrim(p_reason),
    v_assignment.id,auth.uid());
  update public.internship_shifts set status = 'publicado', published_by = auth.uid(),
    published_at = now() where id = v_shift_id;
  return v_shift_id;
end;
$$;
revoke all on function public.internship_reschedule_gbm_assignment(
  uuid,uuid,timestamptz,timestamptz,text,text,text) from public, anon;
grant execute on function public.internship_reschedule_gbm_assignment(
  uuid,uuid,timestamptz,timestamptz,text,text,text) to authenticated;

-- Publica os cinco postos de um dia de uma vez, sempre como quarta vaga adicional.
-- A referência documental e o oficial vêm da Coordenação; não há plano presumido.
create function public.internship_schedule_lifeguard_day(
  p_program_id uuid, p_shift_date date, p_student_ids uuid[],
  p_document_reference text, p_officer_name text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_program public.internship_programs;
  v_activity_id uuid;
  v_site_id uuid;
  v_resource_id uuid;
  v_plan_id uuid;
  v_shift_id uuid;
  v_index integer;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação publica a escala de guarda-vida.' using errcode = '42501';
  end if;
  select * into v_program from public.internship_programs
    where id = p_program_id for update;
  if v_program.status is distinct from 'publicado' or p_shift_date is null
    or p_shift_date < v_program.starts_on or p_shift_date > v_program.ends_on
    or extract(isodow from p_shift_date) not in (6,7) then
    raise exception 'Guarda-vida exige programa publicado e sábado ou domingo no período.'
      using errcode = '23514';
  end if;
  if coalesce(cardinality(p_student_ids),0) <> 5
    or (select count(distinct student_id) from unnest(p_student_ids) as ids(student_id)) <> 5
    or length(btrim(coalesce(p_document_reference,''))) < 5
    or length(btrim(coalesce(p_officer_name,''))) < 3 then
    raise exception 'Informe cinco cadetes distintos, documento e oficial supervisor.'
      using errcode = '23514';
  end if;
  select id into v_activity_id from public.internship_activity_types
    where program_id = p_program_id and code = 'guarda_vida' and active;
  if v_activity_id is null or (select count(*) from public.internship_sites
    where program_id = p_program_id and site_type = 'praia' and active
      and code in ('praia_1','praia_2','praia_3','praia_4','praia_5')) <> 5 then
    raise exception 'Cinco postos oficiais de guarda-vida devem estar ativos.'
      using errcode = '23514';
  end if;
  v_starts_at := make_timestamptz(extract(year from p_shift_date)::integer,
    extract(month from p_shift_date)::integer, extract(day from p_shift_date)::integer,
    10,0,0,v_program.timezone);
  v_ends_at := v_starts_at + interval '8 hours';
  insert into public.internship_operation_plans(program_id,code,title,status,
    starts_at,ends_at,document_reference,officer_name,created_by,
    authorized_by,authorized_at)
  values (p_program_id,'guarda_vida_' || to_char(p_shift_date,'YYYYMMDD'),
    'Guarda-vida ' || to_char(p_shift_date,'DD/MM/YYYY'),'autorizado',
    v_starts_at,v_ends_at,btrim(p_document_reference),btrim(p_officer_name),
    auth.uid(),auth.uid(),now()) returning id into v_plan_id;
  for v_index in 1..5 loop
    select s.id, r.id into v_site_id, v_resource_id
    from public.internship_sites s
    join public.internship_resources r on r.site_id = s.id
    where s.program_id = p_program_id and s.code = 'praia_' || v_index
      and s.site_type = 'praia' and s.active and r.code = 'posto'
      and r.resource_type = 'posto_guarda_vida' and r.active
      and r.regular_team_size = 3 and r.capacity_per_shift = 1;
    if v_site_id is null or v_resource_id is null then
      raise exception 'Posto de guarda-vida incompleto.' using errcode = '23514';
    end if;
    insert into public.internship_shifts(program_id,activity_type_id,site_id,
      resource_id,operation_plan_id,starts_at,ends_at,capacity,status,
      planned_supervisor_name,created_by)
    values (p_program_id,v_activity_id,v_site_id,v_resource_id,v_plan_id,
      v_starts_at,v_ends_at,1,'rascunho',btrim(p_officer_name),auth.uid())
    returning id into v_shift_id;
    insert into public.internship_assignments(shift_id,student_id,
      assignment_source,created_by)
    values (v_shift_id,p_student_ids[v_index],'manual',auth.uid());
    update public.internship_shifts set status = 'publicado',
      published_by = auth.uid(),published_at = now() where id = v_shift_id;
  end loop;
  return v_plan_id;
end;
$$;
revoke all on function public.internship_schedule_lifeguard_day(
  uuid,date,uuid[],text,text) from public, anon;
grant execute on function public.internship_schedule_lifeguard_day(
  uuid,date,uuid[],text,text) to authenticated;

-- Fonte consolidada do controle da Coordenação. Os futuros relatórios devem
-- consumir esta mesma regra para não recalcular carga por caminhos diferentes.
create function public.internship_coordination_workload(p_program_id uuid)
returns table (
  student_id uuid, student_number integer, war_name text,
  planned_minutes bigint, performed_minutes bigint, validated_minutes bigint,
  required_minutes integer, target_minutes integer,
  missing_required_minutes bigint, missing_target_minutes bigint,
  excess_minutes bigint, assigned_shifts bigint,
  awaiting_homologation bigint, open_occurrences bigint, concluded boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Consulta restrita à Coordenação.' using errcode = '42501';
  end if;
  return query
    with program as (
      select p.id, p.class_id, p.required_minutes, p.target_minutes
      from public.internship_programs p
      where p.id = p_program_id
    ),
    cadets as (
      select s.id, s.student_number, s.war_name
      from public.students s
      join program p on p.class_id = s.class_id
      where s.deleted_at is null
    ),
    active_assignments as (
      select a.id, a.student_id, sh.ends_at, sh.planned_minutes
      from public.internship_assignments a
      join public.internship_shifts sh on sh.id = a.shift_id
      join program p on p.id = sh.program_id
      where a.status = 'prevista' and sh.status = 'publicado'
    ),
    current_records as (
      select r.assignment_id, r.validation_status, r.calculated_minutes,
        r.approved_minutes, r.validated_at
      from public.internship_execution_records r
      join active_assignments a on a.id = r.assignment_id
      where not exists (
        select 1 from public.internship_execution_records child
        where child.revision_of_id = r.id
      )
    ),
    report_state as (
      select report.assignment_id,
        max(report.reported_at) filter (where report.report_type <> 'presenca')
          as last_occurrence_at
      from public.internship_cadet_reports report
      join active_assignments a on a.id = report.assignment_id
      group by report.assignment_id
    ),
    totals as (
      select c.id, c.student_number, c.war_name,
        coalesce(sum(a.planned_minutes),0)::bigint as planned,
        coalesce(sum(cr.calculated_minutes),0)::bigint as performed,
        coalesce(sum(cr.approved_minutes)
          filter (where cr.validation_status = 'homologado'),0)::bigint as validated,
        count(a.id)::bigint as assigned,
        count(a.id) filter (where a.ends_at <= now()
          and cr.validation_status is distinct from 'homologado')::bigint as awaiting,
        count(a.id) filter (where rs.last_occurrence_at is not null
          and (cr.validated_at is null or rs.last_occurrence_at > cr.validated_at))::bigint
          as occurrences
      from cadets c
      left join active_assignments a on a.student_id = c.id
      left join current_records cr on cr.assignment_id = a.id
      left join report_state rs on rs.assignment_id = a.id
      group by c.id, c.student_number, c.war_name
    )
    select t.id, t.student_number, t.war_name,
      t.planned, t.performed, t.validated,
      p.required_minutes, p.target_minutes,
      greatest(0::bigint, p.required_minutes::bigint - t.validated),
      greatest(0::bigint, p.target_minutes::bigint - t.validated),
      greatest(0::bigint, t.validated - p.required_minutes::bigint),
      t.assigned, t.awaiting, t.occurrences,
      t.validated >= p.required_minutes
    from totals t cross join program p
    order by t.student_number nulls last, t.war_name;
end;
$$;
revoke all on function public.internship_coordination_workload(uuid) from public, anon;
grant execute on function public.internship_coordination_workload(uuid) to authenticated;

create function public.internship_coordination_schedule(p_program_id uuid)
returns table (
  shift_id uuid, assignment_id uuid, student_id uuid,
  student_number integer, war_name text,
  activity_code text, activity_name text, site_name text, resource_name text,
  template_code text, abm_departure_time time, obm_arrival_time time,
  obm_departure_time time, abm_return_time time,
  shift_date date, starts_at timestamptz, ends_at timestamptz, planned_minutes integer,
  shift_status text, assignment_status text, assignment_source text,
  movement_reason text, supervisor_name text, document_reference text,
  validation_status text, performed_minutes integer, approved_minutes integer,
  cadet_report_count bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Agenda restrita à Coordenação.' using errcode = '42501';
  end if;
  return query
    with current_records as (
      select record.* from public.internship_execution_records record
      where not exists (
        select 1 from public.internship_execution_records child
        where child.revision_of_id = record.id
      )
    ),
    report_counts as (
      select report.assignment_id, count(*)::bigint as total
      from public.internship_cadet_reports report
      group by report.assignment_id
    )
    select sh.id, assignment.id, student.id, student.student_number, student.war_name,
      activity.code, activity.name, site.name, resource.display_name,
      template.code, template.abm_departure_time, template.obm_arrival_time,
      template.obm_departure_time, template.abm_return_time,
      (sh.starts_at at time zone program.timezone)::date,
      sh.starts_at, sh.ends_at, sh.planned_minutes,
      sh.status, assignment.status, assignment.assignment_source, assignment.reason,
      sh.planned_supervisor_name, plan.document_reference,
      record.validation_status, record.calculated_minutes, record.approved_minutes,
      coalesce(reports.total,0)::bigint
    from public.internship_shifts sh
    join public.internship_programs program on program.id = sh.program_id
    join public.internship_activity_types activity on activity.id = sh.activity_type_id
    join public.internship_sites site on site.id = sh.site_id
    join public.internship_resources resource on resource.id = sh.resource_id
    left join public.internship_shift_templates template on template.id = sh.template_id
    left join public.internship_operation_plans plan on plan.id = sh.operation_plan_id
    left join public.internship_assignments assignment on assignment.shift_id = sh.id
    left join public.students student on student.id = assignment.student_id
    left join current_records record on record.assignment_id = assignment.id
    left join report_counts reports on reports.assignment_id = assignment.id
    where sh.program_id = p_program_id
    order by sh.starts_at, site.name, student.student_number nulls last;
end;
$$;
revoke all on function public.internship_coordination_schedule(uuid) from public, anon;
grant execute on function public.internship_coordination_schedule(uuid) to authenticated;

create function public.internship_my_shifts()
returns table (
  assignment_id uuid, shift_id uuid, activity_code text, activity_name text,
  site_name text, resource_name text, starts_at timestamptz, ends_at timestamptz,
  planned_minutes integer, supervisor_name text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.internship_has_role(array['aluno']) then
    raise exception 'Consulta restrita ao cadete.' using errcode = '42501';
  end if;
  return query
    select a.id, sh.id, activity.code, activity.name, site.name, resource.display_name,
      sh.starts_at, sh.ends_at, sh.planned_minutes, sh.planned_supervisor_name
    from public.internship_assignments a
    join public.internship_shifts sh on sh.id = a.shift_id
    join public.internship_programs p on p.id = sh.program_id
    join public.internship_activity_types activity on activity.id = sh.activity_type_id
    join public.internship_sites site on site.id = sh.site_id
    join public.internship_resources resource on resource.id = sh.resource_id
    where a.student_id = public.current_student_id() and a.status = 'prevista'
      and sh.status = 'publicado' and p.status = 'publicado'
    order by sh.starts_at;
end;
$$;
revoke all on function public.internship_my_shifts() from public, anon;
grant execute on function public.internship_my_shifts() to authenticated;

create function public.internship_my_workload()
returns table (
  planned_minutes bigint, performed_minutes bigint, validated_minutes bigint,
  required_minutes integer, target_minutes integer
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.internship_has_role(array['aluno']) then
    raise exception 'Consulta restrita ao cadete.' using errcode = '42501';
  end if;
  return query
    with program as (
      select p.id, p.required_minutes, p.target_minutes
      from public.internship_programs p
      join public.students s on s.class_id = p.class_id
      where s.id = public.current_student_id() and p.course_phase = 'CFO I'
        and p.status = 'publicado'
    ),
    active_assignments as (
      select a.id, sh.planned_minutes from public.internship_assignments a
      join public.internship_shifts sh on sh.id = a.shift_id
      join program p on p.id = sh.program_id
      where a.student_id = public.current_student_id()
        and a.status = 'prevista' and sh.status = 'publicado'
    ),
    performed as (
      select coalesce(sum(r.calculated_minutes),0)::bigint as minutes
      from public.internship_execution_records r
      join active_assignments a on a.id = r.assignment_id
      where not exists (select 1 from public.internship_execution_records child
        where child.revision_of_id = r.id)
    ),
    validated as (
      select coalesce(sum(r.approved_minutes),0)::bigint as minutes
      from public.internship_execution_records r
      join active_assignments a on a.id = r.assignment_id
      where r.validation_status = 'homologado'
        and not exists (select 1 from public.internship_execution_records child
          where child.revision_of_id = r.id and child.validation_status = 'homologado')
    )
    select coalesce((select sum(a.planned_minutes) from active_assignments a),0)::bigint,
      performed.minutes, validated.minutes,
      program.required_minutes, program.target_minutes
    from program cross join performed cross join validated;
end;
$$;
revoke all on function public.internship_my_workload() from public, anon;
grant execute on function public.internship_my_workload() to authenticated;

create function public.internship_homologate_execution(
  p_assignment_id uuid, p_attendance_status text,
  p_actual_starts_at timestamptz, p_actual_ends_at timestamptz,
  p_approved_minutes integer, p_supervisor_name text, p_paper_reference text,
  p_occurrence_reason text, p_occurrence_justified boolean,
  p_decision_reason text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_assignment public.internship_assignments;
  v_current public.internship_execution_records;
  v_record_id uuid;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação homologa carga.' using errcode = '42501';
  end if;
  select * into v_assignment from public.internship_assignments
    where id = p_assignment_id for update;
  if v_assignment.id is null then
    raise exception 'Participação não encontrada.' using errcode = '23514';
  end if;
  select r.* into v_current from public.internship_execution_records r
    where r.assignment_id = p_assignment_id
      and not exists (select 1 from public.internship_execution_records child
        where child.revision_of_id = r.id)
    for update of r;
  if v_current.id is not null and v_current.validation_status = 'homologado'
    and length(btrim(coalesce(p_decision_reason,''))) < 5 then
    raise exception 'Correção de carga homologada exige justificativa.' using errcode = '23514';
  end if;
  insert into public.internship_execution_records(
    assignment_id,revision_of_id,validation_status,attendance_status,
    actual_starts_at,actual_ends_at,approved_minutes,supervisor_name,paper_reference,
    occurrence_reason,occurrence_justified,decision_reason,entered_by,validated_by,validated_at
  ) values (
    p_assignment_id,v_current.id,'homologado',p_attendance_status,
    p_actual_starts_at,p_actual_ends_at,p_approved_minutes,btrim(p_supervisor_name),
    btrim(p_paper_reference),nullif(btrim(coalesce(p_occurrence_reason,'')),''),
    p_occurrence_justified,nullif(btrim(coalesce(p_decision_reason,'')),''),
    auth.uid(),auth.uid(),now()
  ) returning id into v_record_id;
  return v_record_id;
end;
$$;
revoke all on function public.internship_homologate_execution(
  uuid,text,timestamptz,timestamptz,integer,text,text,text,boolean,text)
  from public, anon;
grant execute on function public.internship_homologate_execution(
  uuid,text,timestamptz,timestamptz,integer,text,text,text,boolean,text)
  to authenticated;
