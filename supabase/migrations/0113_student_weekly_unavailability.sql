-- Indisponibilidade semanal com horário (ex.: guarda do sábado adventista).
-- A regra por dia da semana continua valendo; a janela bloqueia só o intervalo informado,
-- em horário de Belém, no estágio e nas escalas de permanência/serviço da ABM.
alter table public.internship_student_blackouts
  add column window_start_dow smallint check (window_start_dow between 0 and 6),
  add column window_start time,
  add column window_minutes integer check (window_minutes between 1 and 10080),
  add constraint internship_student_blackouts_window check (
    (window_start_dow is null and window_start is null and window_minutes is null)
    or (window_start_dow is not null and window_start is not null and window_minutes is not null)
  );

create function public.student_weekly_window_conflict(
  p_student_id uuid, p_class_id uuid, p_starts timestamptz, p_ends timestamptz
) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.internship_student_blackouts b
    join public.internship_programs p on p.id = b.program_id
    cross join lateral generate_series(
      ((p_starts at time zone 'America/Belem')::date - 7)::timestamp,
      ((p_ends at time zone 'America/Belem')::date)::timestamp,
      interval '1 day'
    ) as occurrence(day)
    where b.student_id = p_student_id and p.class_id = p_class_id
      and b.window_start_dow is not null
      and extract(dow from occurrence.day)::integer = b.window_start_dow
      and occurrence.day::date between b.starts_on and b.ends_on
      and (occurrence.day::date + b.window_start) at time zone 'America/Belem' < p_ends
      and (occurrence.day::date + b.window_start) at time zone 'America/Belem'
        + make_interval(mins => b.window_minutes) > p_starts
  );
$$;
revoke all on function public.student_weekly_window_conflict(uuid,uuid,timestamptz,timestamptz)
  from public, anon, authenticated;

create function public.internship_guard_weekly_window() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_shift record;
begin
  if new.status <> 'prevista' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'prevista' and old.student_id = new.student_id
    and old.shift_id = new.shift_id then return new; end if;
  select sh.starts_at, sh.ends_at, p.class_id into v_shift
    from public.internship_shifts sh
    join public.internship_programs p on p.id = sh.program_id
    where sh.id = new.shift_id;
  if found and public.student_weekly_window_conflict(
    new.student_id, v_shift.class_id, v_shift.starts_at, v_shift.ends_at
  ) then
    raise exception 'Cadete indisponível por restrição operacional cadastrada.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.internship_guard_weekly_window() from public, anon, authenticated;
create trigger internship_assignment_weekly_window before insert or update
  on public.internship_assignments
  for each row execute function public.internship_guard_weekly_window();

create function public.duty_guard_weekly_window() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_starts timestamptz;
  v_ends timestamptz;
begin
  if new.status not in ('prevista', 'confirmada') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('prevista', 'confirmada')
    and old.student_id = new.student_id and old.roster_id = new.roster_id
    and old.duty_date = new.duty_date then return new; end if;
  select ps.starts_at, ps.ends_at into v_starts, v_ends
    from public.duty_permanence_services ps where ps.roster_id = new.roster_id;
  -- Escala de serviço sem horário ocupa o dia inteiro.
  if v_starts is null then
    v_starts := new.duty_date::timestamp at time zone 'America/Belem';
    v_ends := (new.duty_date + 1)::timestamp at time zone 'America/Belem';
  end if;
  if public.student_weekly_window_conflict(new.student_id, new.class_id, v_starts, v_ends) then
    raise exception 'Cadete indisponível por restrição operacional cadastrada.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.duty_guard_weekly_window() from public, anon, authenticated;
create trigger duty_assignment_weekly_window before insert or update
  on public.duty_assignments
  for each row execute function public.duty_guard_weekly_window();

-- Cad SILVA NUNES (adventista): a restrição de sexta e sábado inteiros passa a cobrir
-- só a guarda do sábado, de sexta 18h a sábado 19h (pôr do sol em Macapá entre ~18h12 e ~18h42),
-- e continua valendo depois do estágio, nas escalas da ABM.
update public.internship_student_blackouts b
  set blocked_weekdays = '{}',
      window_start_dow = 5,
      window_start = time '18:00',
      window_minutes = 25 * 60,
      ends_on = date '2028-12-31',
      reason = 'Guarda do sábado (adventista): sem escala de sexta 18h a sábado 19h.'
  from public.students s
  where s.id = b.student_id and s.war_name = 'SILVA NUNES' and s.deleted_at is null
    and b.blocked_weekdays = array[5,6];

notify pgrst, 'reload schema';
