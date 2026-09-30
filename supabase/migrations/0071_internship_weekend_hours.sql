-- Weekdays retain ABM departure/return; weekends count presentation-to-relief only.
-- Existing shifts keep their original template id and all historical timestamps.
alter table public.internship_shift_templates
  add column revision integer not null default 1 check (revision > 0),
  add column includes_travel boolean not null default true,
  alter column abm_departure_time drop not null,
  alter column abm_return_time drop not null;
alter table public.internship_shift_templates
  add column counting_start_time time generated always as
    (case when includes_travel then abm_departure_time else obm_arrival_time end) stored,
  add constraint internship_templates_travel_times check
    (not includes_travel or (abm_departure_time is not null and abm_return_time is not null)),
  drop constraint internship_shift_templates_program_id_code_key,
  add constraint internship_templates_revision_key unique(program_id,code,revision);
create unique index internship_templates_active_code on public.internship_shift_templates(program_id,code) where active;
comment on column public.internship_shift_templates.counting_start_time is
  'Início da contagem: saída ABM nos dias úteis; apresentação na OBM no fim de semana.';

create or replace function public.internship_guard_catalog() returns trigger
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
    elsif (to_jsonb(new) - 'active' - 'counting_start_time') is distinct from (to_jsonb(old) - 'active' - 'counting_start_time') then
      raise exception 'Catálogo usado em turno publicado não pode ser reescrito.'
        using errcode = '23514';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
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

-- Retire old weekend catalog entries, preserving references from published shifts.
update public.internship_shift_templates t set active=false
from public.internship_programs p join public.classes c on c.id=p.class_id
join public.courses course on course.id=c.course_id
where t.program_id=p.id and c.name='CFO 2026.1' and course.code='CFO-2026' and p.course_phase='CFO I'
  and t.code in ('SAB-USB-D12','SAB-USB-N12','DOM-USB-D12','DOM-USB-N12','SAB-ABS-24','DOM-ABS-24');
insert into public.internship_shift_templates(program_id,activity_type_id,code,name,start_weekdays,
  journey_minutes,abm_departure_time,obm_arrival_time,obm_departure_time,abm_return_time,
  end_day_offset,revision,includes_travel)
select t.program_id,t.activity_type_id,t.code,t.name,t.start_weekdays,t.journey_minutes,
  null,case when t.code like '%-N12' then time '19:45' else time '07:45' end,
  case when t.code like '%-D12' then time '19:45' else time '07:45' end,
  null,t.end_day_offset,2,false
from public.internship_shift_templates t
join public.internship_programs p on p.id=t.program_id
join public.classes c on c.id=p.class_id join public.courses course on course.id=c.course_id
where c.name='CFO 2026.1' and course.code='CFO-2026' and p.course_phase='CFO I' and t.revision=1
  and t.code in ('SAB-USB-D12','SAB-USB-N12','DOM-USB-D12','DOM-USB-N12','SAB-ABS-24','DOM-ABS-24');

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
    (v_program_id,'abs','ABS — Salvamento','salvamento',720,false),
    (v_program_id,'guarda_vida','Guarda-vida','integrado',480,true),
    (v_program_id,'operacao_especial','Operação especial','integrado',480,true)
  on conflict (program_id,code) do nothing;

  insert into public.internship_shift_templates(program_id,activity_type_id,code,name,
    start_weekdays,journey_minutes,abm_departure_time,obm_arrival_time,
    obm_departure_time,abm_return_time,end_day_offset,includes_travel,revision)
  values
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'DU-USB-12','USB em dia útil — 12 horas',array[1,2,3,4,5],720,'18:00','18:30','05:30','06:00',1,true,1),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='abs'),
      'DU-ABS-12','ABS em dia útil — 12 horas',array[1,2,3,4,5],720,'18:00','18:30','05:30','06:00',1,true,1),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'SAB-USB-D12','USB diurna de sábado — 12 horas',array[6],720,null,'07:45','19:45',null,0,false,2),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'SAB-USB-N12','USB noturna de sábado — 12 horas',array[6],720,null,'19:45','07:45',null,1,false,2),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'DOM-USB-D12','USB diurna de domingo — 12 horas',array[7],720,null,'07:45','19:45',null,0,false,2),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='usb'),
      'DOM-USB-N12','USB noturna de domingo — 12 horas',array[7],720,null,'19:45','07:45',null,1,false,2),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='abs'),
      'SAB-ABS-24','ABS de sábado — 24 horas',array[6],1440,null,'07:45','07:45',null,1,false,2),
    (v_program_id,(select id from public.internship_activity_types where program_id=v_program_id and code='abs'),
      'DOM-ABS-24','ABS de domingo — 24 horas',array[7],1440,null,'07:45','07:45',null,1,false,2)
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
    or length(btrim(coalesce(p_supervisor_name,''))) < 3 then
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

notify pgrst, 'reload schema';
