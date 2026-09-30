-- Uniformes são atribuídos à escala, sem alterar o conteúdo imutável do plantão publicado.
create table public.internship_shift_uniforms (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null unique references public.internship_shifts(id) on delete restrict,
  uniform_code text not null check (uniform_code in ('3A','2C','4A','4D')),
  reason text not null check (length(btrim(reason)) >= 5),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.internship_shift_uniforms enable row level security;
revoke all on public.internship_shift_uniforms from public,anon,authenticated;
grant select,insert,update on public.internship_shift_uniforms to authenticated;
create policy internship_uniform_manager on public.internship_shift_uniforms for all to authenticated
 using(public.internship_can_manage()) with check(public.internship_can_manage());
create function public.internship_stamp_uniform() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito à administração do estágio.' using errcode='42501'; end if;
 if tg_op='UPDATE' and new.shift_id<>old.shift_id then raise exception 'O uniforme não pode mudar de plantão.' using errcode='23514'; end if;
 if not exists(select 1 from public.internship_shifts where id=new.shift_id and status<>'cancelado') then
   raise exception 'Somente plantões ativos podem receber uniforme.' using errcode='23514';
 end if;
 new.updated_by:=auth.uid();new.updated_at:=now();return new;
end$$;
revoke all on function public.internship_stamp_uniform() from public,anon,authenticated;
create trigger internship_uniform_stamp before insert or update on public.internship_shift_uniforms for each row execute function public.internship_stamp_uniform();
create trigger internship_uniform_audit after insert or update on public.internship_shift_uniforms for each row execute function public.internship_audit_change();

create function public.internship_set_shift_uniform(p_shift_id uuid,p_uniform_code text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito à administração do estágio.' using errcode='42501'; end if;
 insert into public.internship_shift_uniforms(shift_id,uniform_code,reason,updated_by)
 values(p_shift_id,p_uniform_code,'Uniforme conferido na agenda operacional.',auth.uid())
 on conflict(shift_id) do update set uniform_code=excluded.uniform_code,reason=excluded.reason;
end$$;
revoke all on function public.internship_set_shift_uniform(uuid,text) from public,anon;
grant execute on function public.internship_set_shift_uniform(uuid,text) to authenticated;

create function public.internship_schedule_gbm_from_template_uniform(
 p_program_id uuid,p_template_code text,p_site_id uuid,p_shift_date date,p_student_id uuid,p_supervisor_name text,p_uniform_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_shift uuid;
begin
 v_shift:=public.internship_schedule_gbm_from_template(p_program_id,p_template_code,p_site_id,p_shift_date,p_student_id,p_supervisor_name);
 insert into public.internship_shift_uniforms(shift_id,uniform_code,reason,updated_by)
 values(v_shift,coalesce(nullif(p_uniform_code,''),'3A'),'Uniforme definido ao publicar a escala.',auth.uid());
 return v_shift;
end$$;
revoke all on function public.internship_schedule_gbm_from_template_uniform(uuid,text,uuid,date,uuid,text,text) from public,anon;
grant execute on function public.internship_schedule_gbm_from_template_uniform(uuid,text,uuid,date,uuid,text,text) to authenticated;

create function public.internship_schedule_lifeguard_day_uniform(
 p_program_id uuid,p_shift_date date,p_student_ids uuid[],p_document_reference text,p_officer_name text,p_uniform_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_plan uuid;
begin
 v_plan:=public.internship_schedule_lifeguard_day(p_program_id,p_shift_date,p_student_ids,p_document_reference,p_officer_name);
 insert into public.internship_shift_uniforms(shift_id,uniform_code,reason,updated_by)
 select id,coalesce(nullif(p_uniform_code,''),'4D'),'Uniforme definido ao publicar a escala.',auth.uid()
 from public.internship_shifts where operation_plan_id=v_plan;
 return v_plan;
end$$;
revoke all on function public.internship_schedule_lifeguard_day_uniform(uuid,date,uuid[],text,text,text) from public,anon;
grant execute on function public.internship_schedule_lifeguard_day_uniform(uuid,date,uuid[],text,text,text) to authenticated;

create function public.internship_schedule_gbm_shift_uniform(
 p_program_id uuid,p_activity_code text,p_site_id uuid,p_resource_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_student_id uuid,p_supervisor_name text,p_uniform_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_shift uuid;
begin
 v_shift:=public.internship_schedule_gbm_shift(p_program_id,p_activity_code,p_site_id,p_resource_id,p_starts_at,p_ends_at,p_student_id,p_supervisor_name);
 insert into public.internship_shift_uniforms(shift_id,uniform_code,reason,updated_by)
 values(v_shift,coalesce(nullif(p_uniform_code,''),'3A'),'Uniforme definido ao publicar a escala.',auth.uid());
 return v_shift;
end$$;
revoke all on function public.internship_schedule_gbm_shift_uniform(uuid,text,uuid,uuid,timestamptz,timestamptz,uuid,text,text) from public,anon;
grant execute on function public.internship_schedule_gbm_shift_uniform(uuid,text,uuid,uuid,timestamptz,timestamptz,uuid,text,text) to authenticated;

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
      or coalesce(nullif(v_line->>'uniformCode',''),case when v_line->>'templateCode'='GUARDA-VIDA' then '4D' else '3A' end) not in ('3A','2C','4A','4D')
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
      v_shift := public.internship_schedule_gbm_from_template_uniform(p_program_id,v_line->>'templateCode',
        (v_line->>'siteId')::uuid,(v_line->>'date')::date,(v_line->>'studentId')::uuid,v_line->>'supervisorName',
        coalesce(nullif(v_line->>'uniformCode',''),'3A'));
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
    if (select count(distinct (x->>'supervisorName',x->>'documentReference',coalesce(nullif(x->>'uniformCode',''),'4D')))
      from jsonb_array_elements(p_lines) x where x->>'templateCode'='GUARDA-VIDA' and (x->>'date')::date=v_date)<>1 then
      raise exception '%: use o mesmo oficial e documento para os cinco postos.',v_date using errcode='23514';
    end if;
    select value into v_line from jsonb_array_elements(p_lines)
      where value->>'templateCode'='GUARDA-VIDA' and (value->>'date')::date=v_date limit 1;
    begin
      v_plan := public.internship_schedule_lifeguard_day_uniform(p_program_id,v_date,v_students,v_line->>'documentReference',v_line->>'supervisorName',coalesce(nullif(v_line->>'uniformCode',''),'4D'));
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


notify pgrst,'reload schema';
