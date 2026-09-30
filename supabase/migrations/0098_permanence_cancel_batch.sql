-- Cancela somente os turnos futuros conferidos na prévia, em uma única transação.
create or replace function public.permanence_cancel_batch(
 p_program_id uuid, p_roster_ids uuid[], p_assignment_ids uuid[], p_reason text
) returns integer language plpgsql security definer set search_path=public as $$
declare p public.internship_programs; rid uuid; actual_ids uuid[]; expected_ids uuid[]; total integer;
begin
 if not public.internship_can_manage() then
  raise exception 'Acesso restrito à administração da permanência.' using errcode='42501';
 end if;
 select * into strict p from public.internship_programs where id=p_program_id and status='publicado';
 total:=coalesce(cardinality(p_roster_ids),0);
 if total not between 1 and 62 or total<>(select count(distinct v) from unnest(p_roster_ids) v)
    or coalesce(cardinality(p_assignment_ids),0) not between 1 and 248
    or coalesce(length(btrim(p_reason)),0) not between 5 and 1000 then
  raise exception 'Confira o período e o motivo do cancelamento.';
 end if;
 perform pg_advisory_xact_lock(hashtext('permanence:'||p.class_id::text));
 perform 1 from public.duty_rosters r join public.duty_permanence_services s on s.roster_id=r.id
  where r.id=any(p_roster_ids) order by r.id for update of r,s;
 if (select count(*) from public.duty_rosters r join public.duty_permanence_services s on s.roster_id=r.id
     where r.id=any(p_roster_ids) and r.class_id=p.class_id and r.status='publicada'
       and s.starts_at>now()
       and (s.starts_at at time zone p.timezone)::date between p.starts_on-7 and p.ends_on+7)<>total then
  raise exception 'A escala mudou ou um turno já começou. Confira novamente o período.';
 end if;
 perform 1 from public.duty_assignments where roster_id=any(p_roster_ids) order by id for update;
 select array_agg(id order by id) into actual_ids from public.duty_assignments
  where roster_id=any(p_roster_ids) and status in ('prevista','confirmada');
 select array_agg(v order by v) into expected_ids from unnest(p_assignment_ids) v;
 if actual_ids is distinct from expected_ids then
  raise exception 'Os cadetes da escala mudaram. Confira novamente antes de cancelar.';
 end if;
 for rid in select v from unnest(p_roster_ids) v order by v loop
  perform public.permanence_cancel(rid,btrim(p_reason));
 end loop;
 return total;
end $$;
revoke all on function public.permanence_cancel_batch(uuid,uuid[],uuid[],text) from public,anon;
grant execute on function public.permanence_cancel_batch(uuid,uuid[],uuid[],text) to authenticated;
