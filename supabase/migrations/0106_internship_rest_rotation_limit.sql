-- Até três intervalos de exatamente 24h em qualquer janela móvel de 28 dias.
-- A quarta ocorrência é recusada também por publicação manual, troca e permanência.
-- Não altera as escalas existentes. Intervalos sem horário continuam na regra legada.
create function public.internship_assert_rest_frequency(p_student_id uuid, p_starts_at timestamptz, p_ends_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(p_student_id::text));
  if exists (
    with intervals as (
      select sh.starts_at as starts, sh.ends_at as ends
      from public.internship_assignments a
      join public.internship_shifts sh on sh.id = a.shift_id
      where a.student_id = p_student_id and a.status = 'prevista' and sh.status = 'publicado'
      union
      select ps.starts_at, ps.ends_at
      from public.duty_assignments d
      join public.duty_permanence_services ps on ps.roster_id = d.roster_id
      where d.student_id = p_student_id and d.status in ('prevista','confirmada')
    ), previous_ends as (
      select *, max(ends) over (order by starts,ends rows between unbounded preceding and 1 preceding) as previous_end
      from intervals
    ), islands as (
      select *, sum(case when previous_end is null or starts > previous_end then 1 else 0 end)
        over (order by starts,ends) as island
      from previous_ends
    ), merged as (
      select min(starts) as starts,max(ends) as ends from islands group by island
    ), gaps as (
      select starts,starts-lag(ends) over (order by starts) as rest from merged
    ), occurrences as (
      select starts from gaps where rest = interval '24 hours'
    )
    select 1 from occurrences last_occurrence
    where exists (select 1 from occurrences changed
      where changed.starts in (p_starts_at, p_ends_at + interval '24 hours')
        and changed.starts > last_occurrence.starts - interval '672 hours'
        and changed.starts <= last_occurrence.starts)
    and (select count(*) from occurrences occurrence
      where occurrence.starts > last_occurrence.starts - interval '672 hours'
        and occurrence.starts <= last_occurrence.starts) > 3
  ) then
    raise exception 'Limite de três descansos de 24 horas em 28 dias excedido. Escolha outro cadete ou amplie o intervalo.'
      using errcode = '23514';
  end if;
end;
$$;
revoke all on function public.internship_assert_rest_frequency(uuid,timestamptz,timestamptz) from public,anon,authenticated;

create function public.internship_guard_rest_frequency()
returns trigger language plpgsql security definer set search_path = public as $$
declare student uuid; service_start timestamptz; service_end timestamptz;
begin
  if tg_table_name = 'internship_assignments' then
    if new.status = 'prevista' and exists (
      select 1 from public.internship_shifts where id = new.shift_id and status = 'publicado'
    ) then
      select starts_at,ends_at into service_start,service_end from public.internship_shifts where id = new.shift_id;
      perform public.internship_assert_rest_frequency(new.student_id,service_start,service_end);
    end if;
  elsif tg_table_name = 'internship_shifts' then
    if new.status = 'publicado' then
      for student in select student_id from public.internship_assignments
        where shift_id = new.id and status = 'prevista' order by student_id
      loop perform public.internship_assert_rest_frequency(student,new.starts_at,new.ends_at); end loop;
    end if;
  elsif tg_table_name = 'duty_assignments' then
    if new.status in ('prevista','confirmada') then
      select starts_at,ends_at into service_start,service_end from public.duty_permanence_services where roster_id = new.roster_id;
      if service_start is not null then
        perform public.internship_assert_rest_frequency(new.student_id,service_start,service_end);
      end if;
    end if;
  elsif tg_table_name = 'duty_permanence_services' then
    for student in select student_id from public.duty_assignments
      where roster_id = new.roster_id and status in ('prevista','confirmada') order by student_id
    loop perform public.internship_assert_rest_frequency(student,new.starts_at,new.ends_at); end loop;
  end if;
  return new;
end;
$$;
revoke all on function public.internship_guard_rest_frequency() from public,anon,authenticated;
create trigger internship_assignment_rest_frequency after insert or update
  on public.internship_assignments for each row execute function public.internship_guard_rest_frequency();
create trigger internship_shift_rest_frequency after insert or update
  on public.internship_shifts for each row execute function public.internship_guard_rest_frequency();
create trigger duty_assignment_rest_frequency after insert or update
  on public.duty_assignments for each row execute function public.internship_guard_rest_frequency();
create trigger permanence_service_rest_frequency after insert or update
  on public.duty_permanence_services for each row execute function public.internship_guard_rest_frequency();
-- Inclui os serviços anteriores necessários à janela e seus predecessores.
create or replace function public.permanence_planning_context(p_program_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare p public.internship_programs; result jsonb;
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito.' using errcode='42501';end if;
 select * into strict p from public.internship_programs where id=p_program_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'rosterId',d.roster_id,'studentId',d.student_id,'date',d.duty_date,'startsAt',ps.starts_at,'endsAt',ps.ends_at,'location',ps.location,'uniformCode',ps.uniform_code,'role',role.name,'status',d.status,'editable',ps.roster_id is not null,'studentNumber',s.student_number,'warName',s.war_name) order by d.duty_date,d.id),'[]'::jsonb) into result
 from public.duty_assignments d join public.students s on s.id=d.student_id join public.duty_roles role on role.id=d.role_id left join public.duty_permanence_services ps on ps.roster_id=d.roster_id
 where d.class_id=p.class_id and d.duty_date between p.starts_on-35 and p.ends_on+35 and d.status in ('prevista','confirmada') and s.deleted_at is null and s.course_status='matriculado';
 return result;
end $$;
revoke all on function public.permanence_planning_context(uuid) from public,anon;
grant execute on function public.permanence_planning_context(uuid) to authenticated;


notify pgrst,'reload schema';
