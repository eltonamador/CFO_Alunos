-- Atomic weekly publication and retry protection. All shifts use existing business guards.
create table public.internship_weekly_publications (
  request_id uuid primary key,
  program_id uuid not null references public.internship_programs(id),
  week_start date not null check (extract(isodow from week_start)=1),
  payload jsonb not null,
  shift_ids uuid[] not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.internship_weekly_publications enable row level security;
revoke all on public.internship_weekly_publications from anon, authenticated;
grant select on public.internship_weekly_publications to authenticated;
create policy internship_weekly_coord_read on public.internship_weekly_publications
  for select to authenticated using (public.internship_has_role(array['coordenacao']));

create function public.internship_publish_week(
  p_program_id uuid, p_week_start date, p_request_id uuid, p_lines jsonb
) returns uuid[]
language plpgsql security definer set search_path=public as $$
declare
  v_previous public.internship_weekly_publications;
  v_line jsonb;
  v_date date;
  v_plan uuid;
  v_students uuid[];
  v_shifts uuid[] := '{}';
  v_shift uuid;
  v_count integer;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação publica a semana.' using errcode='42501';
  end if;
  if p_request_id is null or p_week_start is null or extract(isodow from p_week_start)<>1
    or p_lines is null or jsonb_typeof(p_lines)<>'array' then
    raise exception 'Informe a semana e os plantões para publicação.' using errcode='23514';
  end if;
  if jsonb_array_length(p_lines) not between 1 and 100 then
    raise exception 'A semana deve conter entre 1 e 100 vagas.' using errcode='23514';
  end if;
  perform pg_advisory_xact_lock(hashtext('internship-week:'||p_request_id::text));
  select * into v_previous from public.internship_weekly_publications where request_id=p_request_id;
  if found then
    if v_previous.program_id<>p_program_id or v_previous.week_start<>p_week_start or v_previous.payload<>p_lines then
      raise exception 'Esta publicação já foi usada com outros dados. Atualize a prévia.' using errcode='23514';
    end if;
    return v_previous.shift_ids;
  end if;
  perform 1 from public.internship_programs where id=p_program_id and status='publicado' for update;
  if not found then raise exception 'Programa indisponível para publicação.' using errcode='23514'; end if;
  -- Lock cadets in a stable order before invoking individual guards.
  for v_line in select value from jsonb_array_elements(p_lines) order by value->>'studentId' loop
    if nullif(v_line->>'studentId','') is null or nullif(v_line->>'siteId','') is null
      or nullif(v_line->>'date','') is null or nullif(v_line->>'templateCode','') is null
      or length(btrim(coalesce(v_line->>'supervisorName',''))) not between 3 and 120 then
      raise exception 'Preencha cadetes, locais, serviços, datas e supervisores de todas as vagas.' using errcode='23514';
    end if;
    v_date := (v_line->>'date')::date;
    if v_date not between p_week_start and p_week_start+6 then
      raise exception 'Todos os plantões devem iniciar na semana escolhida.' using errcode='23514';
    end if;
    perform pg_advisory_xact_lock(hashtext((v_line->>'studentId')::uuid::text));
  end loop;
  if exists(select 1 from jsonb_array_elements(p_lines) x group by x->>'date',x->>'templateCode',x->>'siteId' having count(*)>1) then
    raise exception 'Há serviços duplicados no mesmo local e data.' using errcode='23514';
  end if;
  for v_line in select value from jsonb_array_elements(p_lines) where value->>'templateCode'<>'GUARDA-VIDA'
    order by value->>'date',value->>'templateCode',value->>'siteId' loop
    begin
      v_shift := public.internship_schedule_gbm_from_template(p_program_id,v_line->>'templateCode',
        (v_line->>'siteId')::uuid,(v_line->>'date')::date,(v_line->>'studentId')::uuid,v_line->>'supervisorName');
      v_shifts := array_append(v_shifts,v_shift);
    exception when check_violation or exclusion_violation or unique_violation then
      raise exception '% · %: %',v_line->>'date',v_line->>'templateCode',sqlerrm using errcode='23514';
    end;
  end loop;
  for v_date in select distinct (value->>'date')::date from jsonb_array_elements(p_lines)
    where value->>'templateCode'='GUARDA-VIDA' order by 1 loop
    select count(*),array_agg((x->>'studentId')::uuid order by s.code)
      into v_count,v_students from jsonb_array_elements(p_lines) x
      join public.internship_sites s on s.id=(x->>'siteId')::uuid
      where x->>'templateCode'='GUARDA-VIDA' and (x->>'date')::date=v_date
        and s.program_id=p_program_id and s.active and s.site_type='praia'
        and s.code in ('praia_1','praia_2','praia_3','praia_4','praia_5');
    if v_count<>5 or (select count(*) from jsonb_array_elements(p_lines) x
      where x->>'templateCode'='GUARDA-VIDA' and (x->>'date')::date=v_date)<>5 then
      raise exception '%: guarda-vida exige os cinco postos oficiais.',v_date using errcode='23514';
    end if;
    if (select count(distinct (x->>'supervisorName',x->>'documentReference'))
      from jsonb_array_elements(p_lines) x where x->>'templateCode'='GUARDA-VIDA' and (x->>'date')::date=v_date)<>1 then
      raise exception '%: use o mesmo oficial e documento para os cinco postos.',v_date using errcode='23514';
    end if;
    select value into v_line from jsonb_array_elements(p_lines)
      where value->>'templateCode'='GUARDA-VIDA' and (value->>'date')::date=v_date limit 1;
    begin
      v_plan := public.internship_schedule_lifeguard_day(p_program_id,v_date,v_students,v_line->>'documentReference',v_line->>'supervisorName');
      v_shifts := v_shifts || array(select id from public.internship_shifts where operation_plan_id=v_plan order by site_id);
    exception when check_violation or exclusion_violation or unique_violation then
      raise exception '% · Guarda-vida: %',v_date,sqlerrm using errcode='23514';
    end;
  end loop;
  insert into public.internship_weekly_publications(request_id,program_id,week_start,payload,shift_ids,created_by)
    values(p_request_id,p_program_id,p_week_start,p_lines,v_shifts,auth.uid());
  return v_shifts;
end;
$$;
revoke all on function public.internship_publish_week(uuid,date,uuid,jsonb) from public,anon;
grant execute on function public.internship_publish_week(uuid,date,uuid,jsonb) to authenticated;

-- Include overnight services when enforcing nonconsecutive calendar days.
create or replace function public.internship_check_assignment(p_assignment_id uuid, p_student_id uuid,
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
        (sh.starts_at at time zone v_program.timezone)::date <= v_last + 1
        and ((sh.ends_at - interval '1 second') at time zone v_program.timezone)::date >= v_first - 1
        and not (
          (sh.starts_at at time zone v_program.timezone)::date = v_first
          and ((sh.ends_at - interval '1 second') at time zone v_program.timezone)::date = v_first
          and v_last = v_first
        )
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
