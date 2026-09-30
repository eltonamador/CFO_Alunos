-- Um número por escala e recorte. Reimpressões conservam o número original.
create table public.internship_scale_numbers (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.internship_programs(id),
  sequence_year integer not null check (sequence_year between 2020 and 2100),
  sequence_number integer not null check (sequence_number > 0),
  service text not null check (service in ('estagio', 'todos', 'gbm', 'praia', 'permanencia')),
  gbm_site_id uuid references public.internship_sites(id),
  source_roster_id uuid references public.duty_rosters(id),
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  issued_by uuid not null references auth.users(id),
  issued_at timestamptz not null default now(),
  unique (program_id, sequence_year, sequence_number)
);

create unique index internship_scale_numbers_identity
  on public.internship_scale_numbers (
    program_id, service, period_start, period_end,
    coalesce(gbm_site_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(source_roster_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

alter table public.internship_scale_numbers enable row level security;
revoke all on public.internship_scale_numbers from public, anon, authenticated;
grant select on public.internship_scale_numbers to authenticated;
create policy internship_scale_numbers_manager_read on public.internship_scale_numbers
  for select to authenticated using (public.internship_can_manage());

create function public.internship_issue_scale_number(
  p_program_id uuid,
  p_service text,
  p_period_start date,
  p_period_end date,
  p_gbm_site_id uuid default null,
  p_source_roster_id uuid default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_year integer;
  v_number integer;
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do estágio.' using errcode = '42501';
  end if;
  if p_service not in ('estagio', 'todos', 'gbm', 'praia', 'permanencia')
    or p_period_start is null or p_period_end is null or p_period_end < p_period_start
    or (p_gbm_site_id is not null and p_service <> 'gbm')
    or (p_source_roster_id is not null and p_service <> 'permanencia') then
    raise exception 'Dados inválidos para numerar a escala.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.internship_programs
    where id = p_program_id and status = 'publicado'
  ) then
    raise exception 'Programa de estágio indisponível.' using errcode = '23514';
  end if;
  if p_gbm_site_id is not null and not exists (
    select 1 from public.internship_sites
    where id = p_gbm_site_id and program_id = p_program_id and site_type = 'gbm'
  ) then
    raise exception 'GBM inválido para esta escala.' using errcode = '23514';
  end if;
  if p_source_roster_id is not null and not exists (
    select 1 from public.duty_permanence_services ps
    join public.duty_rosters r on r.id = ps.roster_id
    join public.internship_programs p on p.class_id = r.class_id
    where ps.roster_id = p_source_roster_id and p.id = p_program_id
  ) then
    raise exception 'Permanência inválida para esta escala.' using errcode = '23514';
  end if;

  v_year := extract(year from p_period_start)::integer;
  perform pg_advisory_xact_lock(hashtext('internship-scale-number:' || p_program_id || ':' || v_year));
  select sequence_number into v_number
    from public.internship_scale_numbers
    where program_id = p_program_id and service = p_service
      and period_start = p_period_start and period_end = p_period_end
      and gbm_site_id is not distinct from p_gbm_site_id
      and source_roster_id is not distinct from p_source_roster_id;
  if found then return v_number; end if;

  select coalesce(max(sequence_number), 0) + 1 into v_number
    from public.internship_scale_numbers
    where program_id = p_program_id and sequence_year = v_year;
  insert into public.internship_scale_numbers (
    program_id, sequence_year, sequence_number, service,
    gbm_site_id, source_roster_id, period_start, period_end, issued_by
  ) values (
    p_program_id, v_year, v_number, p_service,
    p_gbm_site_id, p_source_roster_id, p_period_start, p_period_end, auth.uid()
  );
  return v_number;
end;
$$;

revoke all on function public.internship_issue_scale_number(uuid,text,date,date,uuid,uuid) from public, anon;
grant execute on function public.internship_issue_scale_number(uuid,text,date,date,uuid,uuid) to authenticated;
