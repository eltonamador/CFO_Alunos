-- Permanência reuses the existing duty roster/history. Legacy duties keep their original roles.
alter table public.duty_roles drop constraint duty_roles_code_check;
alter table public.duty_roles add constraint duty_roles_code_check check(code in ('aluno_dia','subxerife','aluno_alimentacao','aluno_logistica','apoio_1','apoio_2','apoio_3'));
insert into public.duty_roles(code,name,sort_order) values ('apoio_1','Apoio 1',5),('apoio_2','Apoio 2',6),('apoio_3','Apoio 3',7);
create table public.duty_permanence_services (
 id uuid not null unique default gen_random_uuid(),
 roster_id uuid primary key references public.duty_rosters(id) on delete restrict,
 starts_at timestamptz not null, ends_at timestamptz not null,
 location text not null check(length(btrim(location)) between 2 and 200),
 uniform_code text not null check(uniform_code in ('3A','2C','4A','4D')),
 check(ends_at>starts_at)
);
alter table public.duty_permanence_services enable row level security;
revoke all on public.duty_permanence_services from public,anon,authenticated;
grant select on public.duty_permanence_services to authenticated;
create policy permanence_read on public.duty_permanence_services for select to authenticated using (
 public.internship_can_manage() or exists(select 1 from public.duty_rosters r where r.id=roster_id and r.status='publicada')
);
create trigger permanence_audit after insert or update or delete on public.duty_permanence_services
 for each row execute function public.internship_audit_change();

-- Matches the internship lock, so simultaneous publications cannot bypass reciprocal checks.
create function public.permanence_guard_assignment() returns trigger
language plpgsql security definer set search_path=public as $$
declare first_day date; last_day date; svc public.duty_permanence_services; r public.duty_rosters;
begin
 if new.status not in ('prevista','confirmada') then return new;end if;
 perform pg_advisory_xact_lock(hashtext(new.student_id::text));
 select * into r from public.duty_rosters where id=new.roster_id;
 select * into svc from public.duty_permanence_services where roster_id=new.roster_id;
 first_day:=coalesce((svc.starts_at at time zone 'America/Belem')::date,new.duty_date);
 last_day:=coalesce(((svc.ends_at-interval '1 second') at time zone 'America/Belem')::date,new.duty_date);
 if new.class_id<>r.class_id or new.duty_date<>first_day or first_day<r.period_start or last_day>r.period_end then raise exception 'Datas e turma incompatíveis com a escala.';end if;
 if not exists(select 1 from public.students where id=new.student_id and class_id=r.class_id and deleted_at is null and course_status='matriculado') then raise exception 'Selecione um cadete ativo da turma.';end if;
 if exists(select 1 from public.duty_impediments i where i.student_id=new.student_id and i.active and i.starts_on<=last_day and i.ends_on>=first_day and (i.affected_role_ids is null or new.role_id=any(i.affected_role_ids))) then raise exception 'Cadete com impedimento operacional ativo.';end if;
 if exists(select 1 from public.internship_student_blackouts b join public.internship_programs p on p.id=b.program_id, generate_series(first_day,last_day,interval '1 day') day where b.student_id=new.student_id and p.class_id=new.class_id and day::date between b.starts_on and b.ends_on and extract(dow from day)::integer=any(b.blocked_weekdays)) then raise exception 'Cadete indisponível por restrição operacional cadastrada.';end if;
 if exists(select 1 from public.internship_assignments a join public.internship_shifts sh on sh.id=a.shift_id join public.internship_programs p on p.id=sh.program_id where a.student_id=new.student_id and a.status='prevista' and sh.status='publicado' and first_day<=((sh.ends_at-interval '1 second') at time zone p.timezone)::date+p.abm_buffer_days and last_day>=(sh.starts_at at time zone p.timezone)::date-p.abm_buffer_days) then raise exception 'Conflito com estágio em D-1, D ou D+1.';end if;
 if exists(select 1 from public.duty_assignments a left join public.duty_permanence_services s on s.roster_id=a.roster_id where a.id<>new.id and (a.student_id=new.student_id or (a.class_id=new.class_id and a.role_id=new.role_id)) and a.status in ('prevista','confirmada') and tstzrange(coalesce(s.starts_at,a.duty_date::timestamp at time zone 'America/Belem'),coalesce(s.ends_at,(a.duty_date+1)::timestamp at time zone 'America/Belem'),'[)') && tstzrange(coalesce(svc.starts_at,new.duty_date::timestamp at time zone 'America/Belem'),coalesce(svc.ends_at,(new.duty_date+1)::timestamp at time zone 'America/Belem'),'[)')) then raise exception 'Cadete ou função já ocupada no horário da permanência.';end if;
 return new;
end $$;
create trigger permanence_assignment_guard before insert or update on public.duty_assignments for each row execute function public.permanence_guard_assignment();
revoke all on function public.permanence_guard_assignment() from public,anon,authenticated;

-- Extend the existing internship guard to the full permanence interval (including overnight).
do $$ declare def text;begin
 select pg_get_functiondef('public.internship_check_assignment(uuid,uuid,uuid,text)'::regprocedure) into def;
 def:=replace(def,'from public.duty_assignments d','from public.duty_assignments d left join public.duty_permanence_services ps on ps.roster_id=d.roster_id');
 def:=replace(def,'d.duty_date between v_first - v_program.abm_buffer_days'||chr(10)||'          and v_last + v_program.abm_buffer_days','coalesce((ps.starts_at at time zone v_program.timezone)::date,d.duty_date) <= v_last + v_program.abm_buffer_days and coalesce(((ps.ends_at-interval ''1 second'') at time zone v_program.timezone)::date,d.duty_date) >= v_first - v_program.abm_buffer_days');
 if position('coalesce((ps.starts_at' in def)=0 then raise exception 'Internship guard layout changed; inspect before migrating.';end if;
 execute def;
end $$;
create or replace function public.internship_planning_constraints(p_program_id uuid)
returns table(id uuid,student_id uuid,starts_on date,ends_on date,kind text)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito.' using errcode='42501';end if;
 return query select d.id,d.student_id,coalesce((ps.starts_at at time zone p.timezone)::date,d.duty_date),coalesce(((ps.ends_at-interval '1 second') at time zone p.timezone)::date,d.duty_date),'abm'::text from public.duty_assignments d left join public.duty_permanence_services ps on ps.roster_id=d.roster_id join public.students s on s.id=d.student_id join public.internship_programs p on p.class_id=s.class_id where p.id=p_program_id and s.deleted_at is null and s.course_status='matriculado' and d.status in ('prevista','confirmada')
 union all select i.id,i.student_id,i.starts_on,i.ends_on,'impedimento'::text from public.duty_impediments i join public.students s on s.id=i.student_id join public.internship_programs p on p.class_id=s.class_id where p.id=p_program_id and s.deleted_at is null and s.course_status='matriculado' and i.active;
end $$;

-- Read-only, minimal data shared with internship managers for balancing. No operational notes.
create function public.permanence_planning_context(p_program_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare p public.internship_programs; result jsonb;
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito.' using errcode='42501';end if;
 select * into strict p from public.internship_programs where id=p_program_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'rosterId',d.roster_id,'studentId',d.student_id,'date',d.duty_date,'startsAt',ps.starts_at,'endsAt',ps.ends_at,'location',ps.location,'uniformCode',ps.uniform_code,'role',role.name,'status',d.status,'editable',ps.roster_id is not null,'studentNumber',s.student_number,'warName',s.war_name) order by d.duty_date,d.id),'[]'::jsonb) into result
 from public.duty_assignments d join public.students s on s.id=d.student_id join public.duty_roles role on role.id=d.role_id left join public.duty_permanence_services ps on ps.roster_id=d.roster_id
 where d.class_id=p.class_id and d.duty_date between p.starts_on-7 and p.ends_on+7 and d.status in ('prevista','confirmada') and s.deleted_at is null and s.course_status='matriculado';
 return result;
end $$;
revoke all on function public.permanence_planning_context(uuid) from public,anon;
grant execute on function public.permanence_planning_context(uuid) to authenticated;

-- Explicit schedule times, 2-4 different cadets, publication/amendment in one transaction.
-- Management remains with Coordination until a separate delegation is authorized.
create function public.permanence_publish(p_program_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_location text,p_uniform_code text,p_students uuid[],p_roster_id uuid default null,p_reason text default '') returns uuid
language plpgsql security definer set search_path=public as $$
declare p public.internship_programs; rid uuid; sid uuid; i integer; roleid uuid; before_rows jsonb; before_service jsonb; first_day date; last_day date;
begin
 if not (public.is_coord() and public.internship_can_manage()) then raise exception 'Somente a Coordenação administra a permanência.' using errcode='42501';end if;
 select * into strict p from public.internship_programs where id=p_program_id and status='publicado';
 if p_starts_at is null or p_ends_at is null or p_ends_at<=p_starts_at then raise exception 'Informe início e término válidos.';end if;
 first_day:=(p_starts_at at time zone p.timezone)::date;last_day:=((p_ends_at-interval '1 second') at time zone p.timezone)::date;
 if first_day<p.starts_on or last_day>p.ends_on then raise exception 'Serviço fora do período do programa.';end if;
 if coalesce(array_length(p_students,1),0) not between 2 and 4 or cardinality(p_students)<>(select count(distinct v) from unnest(p_students) v) then raise exception 'Selecione de dois a quatro cadetes diferentes.';end if;
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
revoke all on function public.permanence_publish(uuid,timestamptz,timestamptz,text,text,uuid[],uuid,text) from public,anon;
grant execute on function public.permanence_publish(uuid,timestamptz,timestamptz,text,text,uuid[],uuid,text) to authenticated;
create function public.permanence_cancel(p_roster_id uuid,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
declare r public.duty_rosters; before_rows jsonb;
begin
 if not (public.is_coord() and public.internship_can_manage()) then raise exception 'Somente a Coordenação administra a permanência.' using errcode='42501';end if;
 if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'Informe o motivo do cancelamento.';end if;
 select * into strict r from public.duty_rosters where id=p_roster_id;
 perform pg_advisory_xact_lock(hashtext('permanence:'||r.class_id::text));
 perform 1 from public.duty_rosters where id=r.id and status='publicada' for update;
 if not found or not exists(select 1 from public.duty_permanence_services where roster_id=r.id) then raise exception 'Permanência publicada não encontrada.';end if;
 select jsonb_agg(to_jsonb(d)) into before_rows from public.duty_assignments d where roster_id=r.id and status in ('prevista','confirmada');
 update public.duty_assignments set status='cancelada',updated_by=auth.uid() where roster_id=r.id and status in ('prevista','confirmada');
 update public.duty_rosters set status='arquivada' where id=r.id;
 insert into public.duty_assignment_logs(roster_id,action,actor_id,actor_role,before_data,reason) values(r.id,'cancelled',auth.uid(),public.current_role(),before_rows,p_reason);
end $$;
revoke all on function public.permanence_cancel(uuid,text) from public,anon;
grant execute on function public.permanence_cancel(uuid,text) to authenticated;
