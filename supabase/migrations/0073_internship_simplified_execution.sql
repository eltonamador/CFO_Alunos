-- Supervisor is identified during execution/homologation, not required for planning.
-- Physical document reference remains required for operations and final homologation.
do $$declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.internship_operation_plans'::regclass
  and contype='c' and pg_get_constraintdef(oid) like '%officer_name%' loop
  execute format('alter table public.internship_operation_plans drop constraint %I',c.conname);
 end loop;
end$$;
alter table public.internship_operation_plans add constraint internship_operation_authorization_document
 check(status not in ('autorizado','executado','encerrado') or
 (starts_at is not null and ends_at is not null and length(btrim(coalesce(document_reference,'')))>0));

create or replace function public.internship_schedule_gbm_shift(
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
    or (nullif(btrim(p_supervisor_name),'') is not null and length(btrim(p_supervisor_name)) not between 3 and 120) then
    raise exception 'Programa, modalidade, GBM, recurso ou supervisor inválido.' using errcode = '23514';
  end if;
  v_expected := case
    when p_activity_code = 'ar'
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
    1,'rascunho',nullif(btrim(p_supervisor_name),''),auth.uid()) returning id into v_shift_id;
  insert into public.internship_assignments(shift_id,student_id,assignment_source,created_by)
  values (v_shift_id,p_student_id,'manual',auth.uid());
  update public.internship_shifts set status = 'publicado', published_by = auth.uid(),
    published_at = now() where id = v_shift_id;
  return v_shift_id;
end;
$$;

create or replace function public.internship_schedule_gbm_from_template(
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
    or (nullif(btrim(p_supervisor_name),'') is not null and length(btrim(p_supervisor_name)) not between 3 and 120) then
    raise exception 'Padrão, data, GBM ou supervisor inválido.' using errcode = '23514';
  end if;
  v_starts_at := make_timestamptz(
    extract(year from p_shift_date)::integer,
    extract(month from p_shift_date)::integer,
    extract(day from p_shift_date)::integer,
    extract(hour from v_template.counting_start_time)::integer,
    extract(minute from v_template.counting_start_time)::integer,
    0, v_program.timezone
  );
  return public.internship_schedule_gbm_shift(
    p_program_id, v_activity.code, p_site_id, v_resource.id,
    v_starts_at, v_starts_at + make_interval(mins => v_template.journey_minutes),
    p_student_id, p_supervisor_name, v_template.id
  );
end;
$$;

create or replace function public.internship_reschedule_gbm_assignment(
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
    or (nullif(btrim(p_supervisor_name),'') is not null and length(btrim(p_supervisor_name)) not between 3 and 120) then
    raise exception 'Origem, motivo ou supervisor inválido.' using errcode = '23514';
  end if;
  select * into v_assignment from public.internship_assignments
    where id = p_assignment_id for update;
  select * into v_old_shift from public.internship_shifts
    where id = v_assignment.shift_id;
  select * into v_program from public.internship_programs
    where id = v_old_shift.program_id;
  select r.* into v_resource from public.internship_resources r
    where r.id = p_resource_id and r.resource_type in ('usb','ar') and r.active;
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
    when v_resource.resource_type = 'ar'
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
    1,'rascunho',nullif(btrim(p_supervisor_name),''),auth.uid()) returning id into v_shift_id;
  insert into public.internship_assignments(shift_id,student_id,assignment_source,
    reason,replaces_assignment_id,created_by)
  values (v_shift_id,v_assignment.student_id,p_source,btrim(p_reason),
    v_assignment.id,auth.uid());
  update public.internship_shifts set status = 'publicado', published_by = auth.uid(),
    published_at = now() where id = v_shift_id;
  return v_shift_id;
end;
$$;

create or replace function public.internship_guard_shift() returns trigger
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
    if v_template.id is null or (not v_template.active and (tg_op = 'INSERT' or old.status = 'rascunho'))
      or v_template.program_id <> new.program_id
      or v_template.activity_type_id <> new.activity_type_id
      or extract(isodow from (new.starts_at at time zone v_program.timezone))::integer
        <> all(v_template.start_weekdays)
      or (new.starts_at at time zone v_program.timezone)::time <> v_template.counting_start_time
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
      or not v_resource.active or new.capacity > v_resource.capacity_per_shift then
      raise exception 'Programa, modalidade, local, recurso devem estar aptos.'
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

create or replace function public.internship_schedule_lifeguard_day(
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
    or (nullif(nullif(btrim(p_officer_name),''),'') is not null and length(nullif(btrim(p_officer_name),'')) not between 3 and 120) then
    raise exception 'Informe cinco cadetes distintos e documento operacional.'
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
    v_starts_at,v_ends_at,btrim(p_document_reference),nullif(btrim(p_officer_name),''),
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
      v_starts_at,v_ends_at,1,'rascunho',nullif(btrim(p_officer_name),''),auth.uid())
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

create or replace function public.internship_publish_week(
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
      or (nullif(btrim(v_line->>'supervisorName'),'') is not null and length(btrim(v_line->>'supervisorName')) not between 3 and 120) then
      raise exception 'Preencha cadetes, locais, serviços, datas e documentos das vagas.' using errcode='23514';
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

create or replace function public.internship_guard_execution() returns trigger
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
    and coalesce(new.actual_ends_at,v_shift.ends_at) > now() then
    raise exception 'Não é possível homologar horário ainda não realizado.' using errcode = '23514';
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';

-- Relatórios refletem o supervisor e a ficha informados após o serviço.
create or replace function public.internship_coordination_schedule(p_program_id uuid)
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
      coalesce(record.supervisor_name, sh.planned_supervisor_name),
      coalesce(record.paper_reference, plan.document_reference),
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
