-- Gestão da permanência delegada aos administradores ativos do módulo de estágio.
-- O perfil global de aluno permanece intacto; outras escalas operacionais seguem restritas à Coordenação.

create or replace function public.permanence_publish(p_program_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_location text,p_uniform_code text,p_students uuid[],p_roster_id uuid default null,p_reason text default '') returns uuid
language plpgsql security definer set search_path=public as $$
declare p public.internship_programs; rid uuid; sid uuid; i integer; roleid uuid; before_rows jsonb; before_service jsonb; first_day date; last_day date;
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito à administração da permanência.' using errcode='42501';end if;
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

create or replace function public.permanence_cancel(p_roster_id uuid,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
declare r public.duty_rosters; before_rows jsonb;
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito à administração da permanência.' using errcode='42501';end if;
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
