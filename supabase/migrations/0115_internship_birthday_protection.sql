-- Respeita o aniversário em todos os serviços do CFO, inclusive plantões
-- noturnos que alcançam a data. A validação usa o dia civil de Belém.
create function public.internship_birthday_overlaps(
  p_student_id uuid, p_starts_at timestamptz, p_ends_at timestamptz,
  p_timezone text default 'America/Belem'
) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students student,
      generate_series(
        (p_starts_at at time zone p_timezone)::date,
        ((p_ends_at - interval '1 microsecond') at time zone p_timezone)::date,
        interval '1 day'
      ) as service_day(day)
    where student.id = p_student_id and student.birth_date is not null
      and to_char(service_day.day, 'MM-DD') = to_char(student.birth_date, 'MM-DD')
  );
$$;
revoke all on function public.internship_birthday_overlaps(uuid,timestamptz,timestamptz,text)
  from public, anon, authenticated;

-- Informa apenas mês e dia a quem administra o estágio; o ano de nascimento
-- permanece fora das prévias de rodízio.
create function public.internship_planning_birthdays(p_program_id uuid)
returns table(student_id uuid, birth_month_day text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do estágio.' using errcode = '42501';
  end if;
  return query
    select student.id, to_char(student.birth_date, 'MM-DD')
    from public.students student
    join public.internship_programs program on program.class_id = student.class_id
    where program.id = p_program_id and student.deleted_at is null
      and student.course_status = 'matriculado' and student.birth_date is not null
    order by student.id;
end;
$$;
revoke all on function public.internship_planning_birthdays(uuid) from public, anon;
grant execute on function public.internship_planning_birthdays(uuid) to authenticated;

create function public.internship_guard_assignment_birthday() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  service public.internship_shifts;
  service_timezone text;
begin
  if new.status <> 'prevista' then return new; end if;
  select * into service from public.internship_shifts where id = new.shift_id;
  if service.status = 'cancelado' then return new; end if;
  select timezone into service_timezone from public.internship_programs where id = service.program_id;
  if public.internship_birthday_overlaps(
    new.student_id, service.starts_at, service.ends_at, service_timezone
  ) then
    raise exception 'Cadete indisponível no aniversário. Escolha outra data ou outro cadete.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger internship_assignment_birthday_guard
  before insert or update on public.internship_assignments
  for each row execute function public.internship_guard_assignment_birthday();
revoke all on function public.internship_guard_assignment_birthday() from public, anon, authenticated;

create function public.internship_guard_shift_birthday() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  service_timezone text;
begin
  if new.status = 'cancelado' then return new; end if;
  select timezone into service_timezone from public.internship_programs where id = new.program_id;
  if exists (
    select 1 from public.internship_assignments assignment
    where assignment.shift_id = new.id and assignment.status = 'prevista'
      and public.internship_birthday_overlaps(
        assignment.student_id, new.starts_at, new.ends_at, service_timezone
      )
  ) then
    raise exception 'O horário do plantão alcança o aniversário de um cadete escalado.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger internship_shift_birthday_guard
  before insert or update on public.internship_shifts
  for each row execute function public.internship_guard_shift_birthday();
revoke all on function public.internship_guard_shift_birthday() from public, anon, authenticated;

create function public.permanence_guard_assignment_birthday() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  service public.duty_permanence_services;
  begins_at timestamptz;
  finishes_at timestamptz;
begin
  if new.status not in ('prevista','confirmada') then return new; end if;
  select * into service from public.duty_permanence_services where roster_id = new.roster_id;
  begins_at := coalesce(service.starts_at, new.duty_date::timestamp at time zone 'America/Belem');
  finishes_at := coalesce(service.ends_at, (new.duty_date + 1)::timestamp at time zone 'America/Belem');
  if public.internship_birthday_overlaps(new.student_id, begins_at, finishes_at) then
    raise exception 'Cadete indisponível no aniversário. Escolha outra data ou outro cadete.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger permanence_assignment_birthday_guard
  before insert or update on public.duty_assignments
  for each row execute function public.permanence_guard_assignment_birthday();
revoke all on function public.permanence_guard_assignment_birthday() from public, anon, authenticated;

create function public.permanence_guard_service_birthday() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.duty_assignments assignment
    where assignment.roster_id = new.roster_id
      and assignment.status in ('prevista','confirmada')
      and public.internship_birthday_overlaps(
        assignment.student_id, new.starts_at, new.ends_at
      )
  ) then
    raise exception 'O horário da permanência alcança o aniversário de um cadete escalado.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger permanence_service_birthday_guard
  before insert or update on public.duty_permanence_services
  for each row execute function public.permanence_guard_service_birthday();
revoke all on function public.permanence_guard_service_birthday() from public, anon, authenticated;

notify pgrst, 'reload schema';
