-- Official nomenclature supplied by Coordination: ABS becomes AR (Autorresgate).
-- Rename in place: preserve all ids, versions, shifts, cadets, times and hours.
-- Applied historical migrations and immutable audit before_data remain historical evidence.
create temporary table internship_ar_rename_before on commit drop as
select 'internship_activity_types'::text as entity,id as entity_id,to_jsonb(t) as before_data
 from public.internship_activity_types t where code='abs'
union all select 'internship_resources',id,to_jsonb(t) from public.internship_resources t where resource_type='abs'
union all select 'internship_shift_templates',id,to_jsonb(t) from public.internship_shift_templates t where code like '%-ABS-%'
union all select 'internship_weekly_publications',request_id,to_jsonb(t) from public.internship_weekly_publications t
 where exists(select 1 from jsonb_array_elements(payload) line where line->>'templateCode' like '%-ABS-%');

-- Only catalog immutability guards are suspended within this migration transaction.
-- Business guards on shifts/assignments and RLS remain in force.
alter table public.internship_activity_types disable trigger internship_activity_catalog_guard;
alter table public.internship_resources disable trigger internship_resource_catalog_guard;
alter table public.internship_shift_templates disable trigger internship_template_catalog_guard;
alter table public.internship_resources drop constraint internship_resources_resource_type_check;
update public.internship_activity_types set code='ar',name='AR — Autorresgate' where code='abs';
update public.internship_resources set code=case when code='abs' then 'ar' else code end,
 resource_type='ar',display_name=replace(display_name,'ABS','AR') where resource_type='abs';
update public.internship_shift_templates set code=replace(code,'-ABS-','-AR-'),name=replace(name,'ABS','AR') where code like '%-ABS-%';
alter table public.internship_resources add constraint internship_resources_resource_type_check
 check(resource_type in ('usb','ar','posto_guarda_vida','equipe_operacional'));
alter table public.internship_activity_types enable trigger internship_activity_catalog_guard;
alter table public.internship_resources enable trigger internship_resource_catalog_guard;
alter table public.internship_shift_templates enable trigger internship_template_catalog_guard;

-- Keep retry payload references consistent with the current catalog codes.
update public.internship_weekly_publications p set payload=(
 select jsonb_agg(case when line->>'templateCode' like '%-ABS-%'
   then jsonb_set(line,'{templateCode}',to_jsonb(replace(line->>'templateCode','-ABS-','-AR-')))
   else line end order by ordinal)
 from jsonb_array_elements(p.payload) with ordinality as items(line,ordinal)
) where exists(select 1 from internship_ar_rename_before b where b.entity='internship_weekly_publications' and b.entity_id=p.request_id);

insert into public.audit_logs(actor_id,actor_role,entity,entity_id,action,before_data,after_data,reason)
select auth.uid(),public.current_role(),b.entity,b.entity_id,'update',b.before_data,a.after_data,
 'Nomenclatura alterada de ABS para AR — Autorresgate conforme portaria informada e solicitação expressa da Coordenação em 23/09/2026; horários, cadetes e cargas preservados.'
from internship_ar_rename_before b join (
 select 'internship_activity_types'::text entity,id entity_id,to_jsonb(t) after_data from public.internship_activity_types t
 union all select 'internship_resources',id,to_jsonb(t) from public.internship_resources t
 union all select 'internship_shift_templates',id,to_jsonb(t) from public.internship_shift_templates t
 union all select 'internship_weekly_publications',request_id,to_jsonb(t) from public.internship_weekly_publications t
) a on a.entity=b.entity and a.entity_id=b.entity_id;

create or replace function public.internship_initialize_cfo_2026() returns uuid
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
    (v_program_id,'ar','AR — Autorresgate','salvamento',720,false),
    (v_program_id,'guarda_vida','Guarda-vida','integrado',480,true),
    (v_program_id,'operacao_especial','Operação especial','integrado',480,true)
  on conflict (program_id,code) do nothing;

  insert into public.internship_shift_templates(program_id,activity_type_id,code,name,
    start_weekdays,journey_minutes,abm_departure_time,obm_arrival_time,
    obm_departure_time,abm_return_time,end_day_offset,includes_travel,revision)
  values
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'DU-USB-12','USB em dia útil — 12 horas',array[1,2,3,4,5],720,'18:00','18:30','05:30','06:00',1,true,1),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='ar'),
      'DU-AR-12','AR em dia útil — 12 horas',array[1,2,3,4,5],720,'18:00','18:30','05:30','06:00',1,true,1),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'SAB-USB-D12','USB diurna de sábado — 12 horas',array[6],720,null,'07:45','19:45',null,0,false,2),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'SAB-USB-N12','USB noturna de sábado — 12 horas',array[6],720,null,'19:45','07:45',null,1,false,2),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'DOM-USB-D12','USB diurna de domingo — 12 horas',array[7],720,null,'07:45','19:45',null,0,false,2),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'DOM-USB-N12','USB noturna de domingo — 12 horas',array[7],720,null,'19:45','07:45',null,1,false,2),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='ar'),
      'SAB-AR-24','AR de sábado — 24 horas',array[6],1440,null,'07:45','07:45',null,1,false,2),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='ar'),
      'DOM-AR-24','AR de domingo — 24 horas',array[7],1440,null,'07:45','07:45',null,1,false,2)
  on conflict (program_id,code,revision) do nothing;

  for v_gbm in select * from (values (1,'1º GBM'),(2,'2º GBM'),(5,'5º GBM'))
    as gbm(number,name) loop
    insert into public.internship_sites(program_id,site_type,code,name,gbm_number)
    values (v_program_id,'gbm','gbm_' || v_gbm.number,v_gbm.name,v_gbm.number)
    on conflict (program_id,code) do nothing;
    select id into v_site_id from public.internship_sites
      where program_id = v_program_id and code = 'gbm_' || v_gbm.number;
    insert into public.internship_resources(site_id,code,display_name,resource_type)
    values (v_site_id,'usb','Vaga adicional USB','usb'),
      (v_site_id,'ar','Vaga adicional AR','ar')
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
    or length(btrim(coalesce(p_supervisor_name,''))) < 3 then
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
    1,'rascunho',btrim(p_supervisor_name),auth.uid()) returning id into v_shift_id;
  insert into public.internship_assignments(shift_id,student_id,assignment_source,created_by)
  values (v_shift_id,p_student_id,'manual',auth.uid());
  update public.internship_shifts set status = 'publicado', published_by = auth.uid(),
    published_at = now() where id = v_shift_id;
  return v_shift_id;
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

notify pgrst, 'reload schema';
