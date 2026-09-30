-- Decisão da Coordenação: descanso mínimo de 24 horas reais entre serviços.
-- Serviços ABM legados sem horário preservam o bloqueio por dia configurado.
-- Duas metades contíguas de Aluno de Dia no mesmo sábado ou domingo são uma
-- permanência dobrada permitida, mas continuam incompatíveis com estágio.

create or replace function public.internship_check_assignment(
  p_assignment_id uuid, p_student_id uuid, p_shift_id uuid, p_source text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_shift public.internship_shifts;
  v_program public.internship_programs;
  v_first date;
  v_last date;
begin
  select * into v_shift from public.internship_shifts where id = p_shift_id for update;
  select * into v_program from public.internship_programs where id = v_shift.program_id;
  perform pg_advisory_xact_lock(hashtext(p_student_id::text));
  if not exists (select 1 from public.students s where s.id = p_student_id
    and s.class_id = v_program.class_id and s.deleted_at is null) then
    raise exception 'O cadete não pertence à turma do programa.' using errcode = '23514';
  end if;
  if (select count(*) from public.internship_assignments a
      where a.shift_id = p_shift_id and a.status = 'prevista' and a.id <> p_assignment_id)
      >= v_shift.capacity then
    raise exception 'Capacidade do turno excedida.' using errcode = '23514';
  end if;
  v_first := (v_shift.starts_at at time zone v_program.timezone)::date;
  v_last := ((v_shift.ends_at - interval '1 second') at time zone v_program.timezone)::date;
  if exists (
    select 1 from public.internship_assignments a
    join public.internship_shifts sh on sh.id = a.shift_id
    where a.student_id = p_student_id and a.id <> p_assignment_id
      and a.status = 'prevista' and sh.status = 'publicado'
      and tstzrange(sh.starts_at, sh.ends_at, '[)') &&
        tstzrange(v_shift.starts_at, v_shift.ends_at, '[)')
  ) then
    raise exception 'O cadete já possui estágio neste horário.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.internship_assignments a
    join public.internship_shifts sh on sh.id = a.shift_id
    where a.student_id = p_student_id and a.id <> p_assignment_id
      and a.status = 'prevista' and sh.status = 'publicado'
      and sh.starts_at < v_shift.ends_at + interval '24 hours'
      and sh.ends_at > v_shift.starts_at - interval '24 hours'
  ) then
    raise exception 'Descanso mínimo de 24 horas entre plantões de estágio.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.duty_assignments d
    left join public.duty_permanence_services ps on ps.roster_id = d.roster_id
    where d.student_id = p_student_id and d.status in ('prevista','confirmada')
      and (
        (ps.roster_id is not null
          and ps.starts_at < v_shift.ends_at + interval '24 hours'
          and ps.ends_at > v_shift.starts_at - interval '24 hours')
        or (ps.roster_id is null and d.duty_date between
          v_first - v_program.abm_buffer_days and v_last + v_program.abm_buffer_days)
      )
  ) then
    raise exception 'Conflito com serviço ABM ou descanso mínimo de 24 horas.' using errcode = '23514';
  end if;
  if exists (select 1 from public.duty_impediments i
      where i.student_id = p_student_id and i.active
        and i.starts_on <= v_last and i.ends_on >= v_first) then
    raise exception 'Cadete com impedimento operacional ativo.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.internship_student_blackouts b,
      generate_series(v_first, v_last, interval '1 day') as day(value)
    where b.program_id = v_program.id and b.student_id = p_student_id
      and day.value::date between b.starts_on and b.ends_on
      and extract(dow from day.value)::integer = any(b.blocked_weekdays)
  ) then
    raise exception 'Cadete indisponível por restrição operacional cadastrada.' using errcode = '23514';
  end if;
end;
$$;

create or replace function public.permanence_guard_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  first_day date;
  last_day date;
  svc public.duty_permanence_services;
  r public.duty_rosters;
begin
  if new.status not in ('prevista','confirmada') then return new; end if;
  perform pg_advisory_xact_lock(hashtext(new.student_id::text));
  perform pg_advisory_xact_lock(hashtext('duty-role:' || new.class_id::text || ':' || new.role_id::text));
  select * into r from public.duty_rosters where id = new.roster_id;
  select * into svc from public.duty_permanence_services where roster_id = new.roster_id;
  if svc.roster_id is not null and not exists (
    select 1 from public.duty_roles role where role.id = new.role_id
      and role.code in ('aluno_dia','apoio_1')
  ) then raise exception 'Permanência permite somente Aluno de Dia e Apoio 1.'; end if;
  first_day := coalesce((svc.starts_at at time zone 'America/Belem')::date,new.duty_date);
  last_day := coalesce(((svc.ends_at-interval '1 second') at time zone 'America/Belem')::date,new.duty_date);
  if new.class_id <> r.class_id or new.duty_date <> first_day
    or first_day < r.period_start or last_day > r.period_end then
    raise exception 'Datas e turma incompatíveis com a escala.';
  end if;
  if not exists (select 1 from public.students where id = new.student_id
    and class_id = r.class_id and deleted_at is null and course_status = 'matriculado') then
    raise exception 'Selecione um cadete ativo da turma.';
  end if;
  if exists (select 1 from public.duty_impediments i where i.student_id = new.student_id
    and i.active and i.starts_on <= last_day and i.ends_on >= first_day
    and (i.affected_role_ids is null or new.role_id = any(i.affected_role_ids))) then
    raise exception 'Cadete com impedimento operacional ativo.';
  end if;
  if exists (select 1 from public.internship_student_blackouts b
    join public.internship_programs p on p.id = b.program_id,
    generate_series(first_day,last_day,interval '1 day') day
    where b.student_id = new.student_id and p.class_id = new.class_id
      and day::date between b.starts_on and b.ends_on
      and extract(dow from day)::integer = any(b.blocked_weekdays)) then
    raise exception 'Cadete indisponível por restrição operacional cadastrada.';
  end if;
  if exists (
    select 1 from public.internship_assignments a
    join public.internship_shifts sh on sh.id = a.shift_id
    join public.internship_programs p on p.id = sh.program_id
    where a.student_id = new.student_id and a.status = 'prevista'
      and sh.status = 'publicado'
      and (
        (svc.roster_id is not null
          and sh.starts_at < svc.ends_at + interval '24 hours'
          and sh.ends_at > svc.starts_at - interval '24 hours')
        or (svc.roster_id is null
          and first_day <= ((sh.ends_at-interval '1 second') at time zone p.timezone)::date + p.abm_buffer_days
          and last_day >= (sh.starts_at at time zone p.timezone)::date - p.abm_buffer_days)
      )
  ) then raise exception 'Conflito com estágio ou descanso mínimo de 24 horas.'; end if;
  if exists (
    select 1 from public.duty_assignments a
    left join public.duty_permanence_services s on s.roster_id = a.roster_id
    where a.id <> new.id and a.status in ('prevista','confirmada')
      and (a.student_id = new.student_id or (a.class_id = new.class_id and a.role_id = new.role_id))
      and tstzrange(coalesce(s.starts_at,a.duty_date::timestamp at time zone 'America/Belem'),
          coalesce(s.ends_at,(a.duty_date+1)::timestamp at time zone 'America/Belem'),'[)') &&
        tstzrange(coalesce(svc.starts_at,new.duty_date::timestamp at time zone 'America/Belem'),
          coalesce(svc.ends_at,(new.duty_date+1)::timestamp at time zone 'America/Belem'),'[)')
  ) then raise exception 'Cadete ou função já ocupada no horário da permanência.'; end if;
  if exists (
    select 1 from public.duty_assignments a
    left join public.duty_permanence_services s on s.roster_id = a.roster_id
    left join public.duty_roles previous_role on previous_role.id = a.role_id
    join public.duty_roles assigned_role on assigned_role.id = new.role_id
    where a.id <> new.id and a.student_id = new.student_id
      and a.status in ('prevista','confirmada')
      and (
        (s.roster_id is not null and svc.roster_id is not null
          and s.starts_at < svc.ends_at + interval '24 hours'
          and s.ends_at > svc.starts_at - interval '24 hours'
          and not (previous_role.code = 'aluno_dia' and assigned_role.code = 'aluno_dia'
            and (s.ends_at = svc.starts_at or svc.ends_at = s.starts_at)
            and (s.starts_at at time zone 'America/Belem')::date =
                (svc.starts_at at time zone 'America/Belem')::date
            and extract(isodow from (svc.starts_at at time zone 'America/Belem')::date) in (6,7)))
        or ((s.roster_id is null or svc.roster_id is null)
          and a.duty_date between first_day - 1 and last_day + 1)
      )
  ) then raise exception 'Descanso mínimo de 24 horas entre serviços de permanência.'; end if;
  return new;
end;
$$;

create or replace function public.permanence_stage_conflicts(p_program_id uuid)
returns table(
  duty_assignment_id uuid, roster_id uuid, student_id uuid,
  student_number integer, war_name text, duty_role text,
  duty_starts_at timestamptz, duty_ends_at timestamptz,
  shift_id uuid, stage_starts_at timestamptz, stage_ends_at timestamptz,
  conflict_kind text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do estágio.' using errcode = '42501';
  end if;
  return query
    select d.id, d.roster_id, d.student_id, s.student_number::integer,
      s.war_name::text, role.name::text, ps.starts_at, ps.ends_at,
      sh.id, sh.starts_at, sh.ends_at,
      case when tstzrange(ps.starts_at,ps.ends_at,'[)') &&
        tstzrange(sh.starts_at,sh.ends_at,'[)')
        then 'mesmo_dia'::text else 'folga'::text end
    from public.duty_assignments d
    join public.duty_rosters r on r.id = d.roster_id
    join public.duty_permanence_services ps on ps.roster_id = r.id
    join public.duty_roles role on role.id = d.role_id
    join public.students s on s.id = d.student_id
    join public.internship_assignments a on a.student_id = d.student_id
    join public.internship_shifts sh on sh.id = a.shift_id
    join public.internship_programs p on p.id = sh.program_id
    where p.id = p_program_id and r.status = 'publicada'
      and d.status in ('prevista','confirmada')
      and sh.status = 'publicado' and a.status = 'prevista'
      and sh.starts_at < ps.ends_at + interval '24 hours'
      and sh.ends_at > ps.starts_at - interval '24 hours'
    order by ps.starts_at, role.sort_order;
end;
$$;
