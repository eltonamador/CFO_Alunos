-- Calendário compartilhado: expõe somente nome operacional, função e data.
-- O acesso às tabelas de histórico e dados pessoais permanece com a RLS original.
create function public.schedule_calendar(p_start date, p_end date)
returns table(id uuid, kind text, date date, person text, duty text, mine boolean)
language plpgsql stable security definer set search_path = public
as $$
declare v_role text := public.schedule_active_role();
begin
  if v_role is null or v_role not in ('coordenacao','secretaria','instrutor','aluno') then
    raise exception 'Sessão ativa necessária.' using errcode = '42501';
  end if;
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 62 then
    raise exception 'Selecione um intervalo de até 63 dias.' using errcode = '23514';
  end if;
  return query
  select r.id, r.kind, r.duty_date, r.person, r.duty,
    bool_or(coalesce(r.profile_id = auth.uid(), false)
      or coalesce(r.student_id = public.current_student_id(), false))
  from public.schedule_live_roster(p_start, p_end) r
  where v_role in ('coordenacao','secretaria','instrutor')
    or (v_role = 'aluno' and exists (
      select 1 from public.students s where s.id = public.current_student_id()
      and s.class_id = r.class_id and s.deleted_at is null and s.course_status = 'matriculado'
    ))
  group by r.id, r.kind, r.duty_date, r.person, r.duty
  order by r.duty_date, r.person, r.duty;
end
$$;
revoke all on function public.schedule_calendar(date,date) from public, anon;
grant execute on function public.schedule_calendar(date,date) to authenticated;
