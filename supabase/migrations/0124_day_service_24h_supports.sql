-- Serviço do Dia ao 1º Ano: 24h com um a quatro apoios. Preserva os serviços já publicados.
alter table public.duty_roles drop constraint duty_roles_code_check;
alter table public.duty_roles add constraint duty_roles_code_check check(code in ('aluno_dia','subxerife','aluno_alimentacao','aluno_logistica','apoio_1','apoio_2','apoio_3','apoio_4'));
insert into public.duty_roles(code,name,sort_order) values ('apoio_4','Apoio 4',8)
on conflict (code) do update set name=excluded.name, active=true;

create or replace function public.permanence_publish(p_program_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_location text,p_uniform_code text,p_students uuid[],p_roster_id uuid default null,p_reason text default '') returns uuid
language plpgsql security definer set search_path=public as $$
declare p public.internship_programs; rid uuid; sid uuid; i integer; roleid uuid; before_rows jsonb; before_service jsonb; first_day date; last_day date;
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito à administração da permanência.' using errcode='42501';end if;
 select * into strict p from public.internship_programs where id=p_program_id and status='publicado';
 if p_starts_at is null or p_ends_at is null or p_ends_at<=p_starts_at then raise exception 'Informe início e término válidos.';end if;
 first_day:=(p_starts_at at time zone p.timezone)::date;last_day:=((p_ends_at-interval '1 second') at time zone p.timezone)::date;
 if first_day<p.starts_on or last_day>p.ends_on then raise exception 'Serviço fora do período do programa.';end if;
 if coalesce(array_length(p_students,1),0) not between 2 and 5 or cardinality(p_students)<>(select count(distinct v) from unnest(p_students) v) then raise exception 'Selecione o Dia ao 1º Ano e de um a quatro apoios diferentes.';end if;
 if p_uniform_code is null or p_uniform_code not in ('3A','2C','4A','4D') or p_location is null or length(btrim(p_location)) not between 2 and 200 then raise exception 'Informe local e uniforme.';end if;
 -- Serialize same-class roster changes; stable student ordering matches subsequent guard locks.
 perform pg_advisory_xact_lock(hashtext('permanence:'||p.class_id::text));
 for sid in select v from unnest(p_students) v order by v loop perform pg_advisory_xact_lock(hashtext(sid::text));end loop;
 if p_roster_id is null then
  insert into public.duty_rosters(class_id,period_start,period_end,status,generated_by,generated_at,published_by,published_at) values(p.class_id,first_day,last_day,'publicada',auth.uid(),now(),auth.uid(),now()) returning id into rid;
  insert into public.duty_permanence_services(roster_id,starts_at,ends_at,location,uniform_code) values(rid,p_starts_at,p_ends_at,btrim(p_location),p_uniform_code);
 else
  if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'Informe o motivo da alteração.';end if;
  select r.id into strict rid from public.duty_rosters r join public.duty_permanence_services ps on ps.roster_id=r.id where r.id=p_roster_id and r.class_id=p.class_id and r.status='publicada' for update of r;
  select jsonb_agg(to_jsonb(d)) into before_rows from public.duty_assignments d where roster_id=rid and status in ('prevista','confirmada');
  select to_jsonb(ps) into before_service from public.duty_permanence_services ps where roster_id=rid;
  update public.duty_assignments set status='substituida',updated_by=auth.uid() where roster_id=rid and status in ('prevista','confirmada');
  update public.duty_rosters set period_start=first_day,period_end=last_day where id=rid;
  update public.duty_permanence_services set starts_at=p_starts_at,ends_at=p_ends_at,location=btrim(p_location),uniform_code=p_uniform_code where roster_id=rid;
 end if;
 for i in 1..cardinality(p_students) loop
  select id into strict roleid from public.duty_roles where code=case when i=1 then 'aluno_dia' else 'apoio_'||(i-1)::text end and active;
  insert into public.duty_assignments(roster_id,class_id,duty_date,role_id,student_id,status,assignment_source,manual_reason,created_by) values(rid,p.class_id,first_day,roleid,p_students[i],'confirmada','manual',case when rid=p_roster_id then p_reason else 'Escala de permanência conferida e publicada.' end,auth.uid());
 end loop;
 insert into public.duty_assignment_logs(roster_id,action,actor_id,actor_role,before_data,after_data,reason) values(rid,case when p_roster_id is null then 'published' else 'manual_change' end,auth.uid(),public.current_role(),jsonb_build_object('assignments',before_rows,'service',before_service),jsonb_build_object('students',p_students,'starts_at',p_starts_at,'ends_at',p_ends_at,'location',p_location,'uniform',p_uniform_code),coalesce(nullif(p_reason,''),'Publicação de permanência'));
 return rid;
end $$;


-- Mantém todos os outros controles de impedimento, estágio e descanso de 24h.
do $$
declare v_definition text;
begin
  select pg_get_functiondef('public.permanence_guard_assignment()'::regprocedure) into v_definition;
  if position('role.code in (''aluno_dia'',''apoio_1'')' in v_definition) = 0 then
    raise exception 'Guarda de funções alterada; revisar antes de ampliar os apoios.';
  end if;
  v_definition := replace(v_definition,
    'role.code in (''aluno_dia'',''apoio_1'')',
    'role.code in (''aluno_dia'', ''apoio_1'', ''apoio_2'', ''apoio_3'', ''apoio_4'')');
  v_definition := replace(v_definition,
    'Permanência permite somente Aluno de Dia e Apoio 1.',
    'Serviço do Dia ao 1º Ano permite Apoios 1 a 4.');
  execute v_definition;
end $$;

-- Uma publicação para o período inteiro: ou todas as datas entram, ou nenhuma.
create function public.permanence_publish_batch(
  p_program_id uuid, p_location text, p_uniform_code text, p_services jsonb
) returns integer
language plpgsql security definer set search_path=public as $$
declare
  v_service jsonb;
  v_start timestamptz;
  v_end timestamptz;
  v_students uuid[];
  v_day date;
  v_previous date;
  v_count integer := 0;
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do serviço.' using errcode='42501';
  end if;
  if jsonb_typeof(p_services) <> 'array' or jsonb_array_length(p_services) not between 1 and 14 then
    raise exception 'Selecione de um a 14 dias de serviço.';
  end if;
  for v_service in select value from jsonb_array_elements(p_services) loop
    v_start := (v_service->>'startsAt')::timestamptz;
    v_end := (v_service->>'endsAt')::timestamptz;
    v_day := (v_start at time zone 'America/Belem')::date;
    if v_start is null or v_end is null or v_end-v_start <> interval '24 hours'
      or (v_start at time zone 'America/Belem')::time <> time '06:00'
      or (v_end at time zone 'America/Belem')::time <> time '06:00'
      or (v_previous is not null and v_day <> v_previous + 1) then
      raise exception 'O período deve ter datas consecutivas, cada serviço das 06h às 06h.';
    end if;
    select array_agg(value::uuid order by ordinality) into v_students
      from jsonb_array_elements_text(v_service->'students') with ordinality;
    perform public.permanence_publish(
      p_program_id, v_start, v_end, p_location, p_uniform_code, v_students
    );
    v_previous := v_day;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke all on function public.permanence_publish_batch(uuid,text,text,jsonb) from public,anon;
grant execute on function public.permanence_publish_batch(uuid,text,text,jsonb) to authenticated;
