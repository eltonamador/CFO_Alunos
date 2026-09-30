create function public.duty_replace_assignment(p_assignment_id uuid,p_student_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path=public as $$
declare oldrow public.duty_assignments; replacement uuid;
begin
 if not (public.is_coord() and public.internship_can_manage()) then raise exception 'Somente a Coordenação altera a escala.' using errcode='42501';end if;
 if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'Informe o motivo da substituição.';end if;
 select * into strict oldrow from public.duty_assignments where id=p_assignment_id;
 perform pg_advisory_xact_lock(hashtext('permanence:'||oldrow.class_id::text));
 select * into strict oldrow from public.duty_assignments where id=p_assignment_id and status in ('prevista','confirmada') for update;
 if oldrow.student_id=p_student_id then raise exception 'Selecione outro cadete.';end if;
 update public.duty_assignments set status='substituida',updated_by=auth.uid() where id=oldrow.id;
 insert into public.duty_assignments(roster_id,class_id,duty_date,role_id,student_id,status,assignment_source,manual_reason,replaced_assignment_id,created_by,updated_by)
 values(oldrow.roster_id,oldrow.class_id,oldrow.duty_date,oldrow.role_id,p_student_id,'confirmada','manual',p_reason,oldrow.id,auth.uid(),auth.uid()) returning id into replacement;
 insert into public.duty_assignment_logs(assignment_id,roster_id,action,actor_id,actor_role,before_data,after_data,reason) values(replacement,oldrow.roster_id,'manual_change',auth.uid(),public.current_role(),to_jsonb(oldrow),jsonb_build_object('student_id',p_student_id,'replacement_id',replacement),p_reason);
 return replacement;
end $$;
revoke all on function public.duty_replace_assignment(uuid,uuid,text) from public,anon;
grant execute on function public.duty_replace_assignment(uuid,uuid,text) to authenticated;

-- Minimal public-to-the-class display, with no notes, contacts or civil records.
create function public.permanence_dashboard_schedule() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare profile public.profiles; result jsonb;
begin
 select * into profile from public.profiles where id=auth.uid() and active;
 if profile.id is null then raise exception 'Sessão inválida.' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'studentId',d.student_id,'studentNumber',s.student_number,'warName',s.war_name,'role',role.name,'location',ps.location,'uniformCode',ps.uniform_code,'startsAt',ps.starts_at,'endsAt',ps.ends_at) order by ps.starts_at,role.code),'[]'::jsonb) into result
 from public.duty_assignments d join public.duty_rosters r on r.id=d.roster_id join public.duty_permanence_services ps on ps.roster_id=r.id join public.students s on s.id=d.student_id join public.duty_roles role on role.id=d.role_id
 where r.status='publicada' and d.status in ('prevista','confirmada') and s.deleted_at is null and s.course_status='matriculado' and ps.ends_at>now() and ps.starts_at<((now() at time zone 'America/Belem')::date+7)::timestamp at time zone 'America/Belem'
 and (profile.role in ('coordenacao','secretaria','instrutor') or (profile.role='aluno' and exists(select 1 from public.students me where me.id=profile.student_id and me.class_id=r.class_id and me.deleted_at is null and me.course_status='matriculado')));
 return result;
end $$;
revoke all on function public.permanence_dashboard_schedule() from public,anon;
grant execute on function public.permanence_dashboard_schedule() to authenticated;
