-- Escala CFO recebida em imagem em 24/09/2026: Aluno de Dia e três apoios.
-- Fonte SHA-256: 83d440fedd428392f518e33e0627b42acb7059bd7fac947487c639c6e01d08a1
-- Dias úteis seguem 06h–18h; turnos do fim de semana foram confirmados
-- pela Coordenação como 06h–18h e 18h–06h do dia seguinte.

-- O índice legado por data impede dois turnos contíguos no mesmo dia.
-- O gatilho de permanência valida sobreposição real de intervalos; os novos
-- índices conservam a unicidade de papel e cadete dentro de cada turno.
drop index public.uniq_duty_assignment_active_role_date;
drop index public.uniq_duty_assignment_active_student_date;
create unique index uniq_duty_assignment_active_role_roster_day
  on public.duty_assignments(roster_id, duty_date, role_id)
  where status in ('prevista', 'confirmada');
create unique index uniq_duty_assignment_active_student_roster_day
  on public.duty_assignments(roster_id, duty_date, student_id)
  where status in ('prevista', 'confirmada');

-- Serializa também a função operacional antes da verificação de conflito.
-- Isso preserva a proteção que o índice diário oferecia em publicações simultâneas.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.permanence_guard_assignment()'::regprocedure)
    into definition;
  if position('perform pg_advisory_xact_lock(hashtext(new.student_id::text));' in definition) = 0 then
    raise exception 'O gatilho de permanência mudou; revisar antes de migrar.';
  end if;
  definition := replace(
    definition,
    'perform pg_advisory_xact_lock(hashtext(new.student_id::text));',
    'perform pg_advisory_xact_lock(hashtext(new.student_id::text));' || chr(10) ||
    ' perform pg_advisory_xact_lock(hashtext(''duty-role:'' || new.class_id::text || '':'' || new.role_id::text));'
  );
  execute definition;
end $$;

do $$
declare
  v_class_id uuid;
  v_roster_id uuid;
  v_student_id uuid;
  v_role_id uuid;
  v_matches integer;
  v_index integer;
  v_count integer := 0;
  v_original_guard text;
  v_stage_check text := $guard$if exists(select 1 from public.internship_assignments a join public.internship_shifts sh on sh.id=a.shift_id join public.internship_programs p on p.id=sh.program_id where a.student_id=new.student_id and a.status='prevista' and sh.status='publicado' and first_day<=((sh.ends_at-interval '1 second') at time zone p.timezone)::date+p.abm_buffer_days and last_day>=(sh.starts_at at time zone p.timezone)::date-p.abm_buffer_days) then raise exception 'Conflito com estágio em D-1, D ou D+1.';end if;$guard$;
  shift record;
begin
  select count(*), (array_agg(id))[1] into v_matches, v_class_id
  from public.classes where name = 'CFO 2026.1';
  if v_matches <> 1 then raise exception 'Turma CFO 2026.1 ausente ou ambígua.'; end if;

  -- A escala recebida é registrada para revisão sem alterar plantões já publicados.
  -- Nesta transação a guarda dispensa SOMENTE o confronto com o estágio; todas
  -- as demais verificações continuam ativas. A definição original é restaurada
  -- antes do commit. Se qualquer inserção falhar, a transação inteira reverte.
  select pg_get_functiondef('public.permanence_guard_assignment()'::regprocedure)
    into v_original_guard;
  if position(v_stage_check in v_original_guard) = 0 then
    raise exception 'A guarda de conflito mudou; revisar antes de importar a escala externa.';
  end if;
  execute replace(v_original_guard, v_stage_check, 'null;');

  for shift in
    select * from (values
      ('2026-09-21'::date, 'único'::text, '2026-09-21 06:00:00-03'::timestamptz, '2026-09-21 18:00:00-03'::timestamptz,
        array['CAXIAS','GABRIEL','SILVA NUNES','GLEITON']::text[]),
      ('2026-09-22'::date, 'único', '2026-09-22 06:00:00-03'::timestamptz, '2026-09-22 18:00:00-03'::timestamptz,
        array['SABRINA','SALES','FERNANDES','SAMILO']::text[]),
      ('2026-09-23'::date, 'único', '2026-09-23 06:00:00-03'::timestamptz, '2026-09-23 18:00:00-03'::timestamptz,
        array['SERRA DIAS','JOAO','CRISTINE','CAMPOS']::text[]),
      ('2026-09-24'::date, 'único', '2026-09-24 06:00:00-03'::timestamptz, '2026-09-24 18:00:00-03'::timestamptz,
        array['FREIRE','T. SANTOS','RIVALDO','J. BORGES']::text[]),
      ('2026-09-25'::date, 'único', '2026-09-25 06:00:00-03'::timestamptz, '2026-09-25 18:00:00-03'::timestamptz,
        array['HAMILTON','IAN LIMA','PABLO','V. MARTINS']::text[]),
      ('2026-09-26'::date, '1º turno', '2026-09-26 06:00:00-03'::timestamptz, '2026-09-26 18:00:00-03'::timestamptz,
        array['SALES','ARTUR','P. AMARAL','GLEITON']::text[]),
      ('2026-09-26'::date, '2º turno', '2026-09-26 18:00:00-03'::timestamptz, '2026-09-27 06:00:00-03'::timestamptz,
        array['SALES','DIAS JUNIOR','ARIADNE','GABRIEL']::text[]),
      ('2026-09-27'::date, '1º turno', '2026-09-27 06:00:00-03'::timestamptz, '2026-09-27 18:00:00-03'::timestamptz,
        array['FERNANDES','SAMILO','JULIANA','FREDSON']::text[]),
      ('2026-09-27'::date, '2º turno', '2026-09-27 18:00:00-03'::timestamptz, '2026-09-28 06:00:00-03'::timestamptz,
        array['FERNANDES','SABRINA','SILVA NUNES','JOAO']::text[])
    ) as source(duty_date, turn_name, starts_at, ends_at, cadets)
    order by source.starts_at
  loop
    if cardinality(shift.cadets) <> 4 then
      raise exception 'O turno % de % não tem quatro cadetes.', shift.turn_name, shift.duty_date;
    end if;
    if exists (
      select 1 from public.duty_rosters r
      join public.duty_permanence_services ps on ps.roster_id = r.id
      where r.class_id = v_class_id and r.status = 'publicada'
        and ps.starts_at = shift.starts_at and ps.ends_at = shift.ends_at
    ) then
      raise exception 'O turno % de % já está publicado.', shift.turn_name, shift.duty_date;
    end if;

    insert into public.duty_rosters (
      class_id, period_start, period_end, status, generated_at, published_at, notes
    ) values (
      v_class_id, shift.duty_date,
      ((shift.ends_at - interval '1 second') at time zone 'America/Belem')::date,
      'publicada', now(), now(),
      'Escala CFO recebida em 24/09/2026; ' || shift.turn_name ||
      '; fonte SHA-256 83d440fedd428392f518e33e0627b42acb7059bd7fac947487c639c6e01d08a1.'
    ) returning id into v_roster_id;
    insert into public.duty_permanence_services (
      roster_id, starts_at, ends_at, location, uniform_code
    ) values (v_roster_id, shift.starts_at, shift.ends_at, 'ABM', '3A');

    for v_index in 1..4 loop
      select count(*), (array_agg(s.id))[1]
        into v_matches, v_student_id
      from public.students s
      where s.class_id = v_class_id and s.deleted_at is null
        and s.course_status = 'matriculado' and s.war_name = shift.cadets[v_index];
      if v_matches <> 1 then
        raise exception 'Cadete % não identificado de forma única.', shift.cadets[v_index];
      end if;
      select id into strict v_role_id from public.duty_roles
        where code = case when v_index = 1 then 'aluno_dia'
          else 'apoio_' || (v_index - 1)::text end and active;
      insert into public.duty_assignments (
        roster_id, class_id, duty_date, role_id, student_id,
        status, assignment_source, manual_reason
      ) values (
        v_roster_id, v_class_id, shift.duty_date, v_role_id, v_student_id,
        'confirmada', 'manual', 'Escala CFO enviada pela Coordenação em 24/09/2026.'
      );
      v_count := v_count + 1;
    end loop;
    insert into public.duty_assignment_logs (
      roster_id, action, actor_role, after_data, reason
    ) values (
      v_roster_id, 'published', 'sistema',
      jsonb_build_object('cadets', shift.cadets, 'turn', shift.turn_name,
        'startsAt', shift.starts_at, 'endsAt', shift.ends_at,
        'location', 'ABM', 'uniformCode', '3A'),
      'Importação da escala enviada pela Coordenação em 24/09/2026.'
    );
  end loop;
  if v_count <> 36 then raise exception 'Importação incompleta: % designações.', v_count; end if;
  execute v_original_guard;
end $$;

-- Os choques continuam visíveis até que a Coordenação revise a escala de estágio.
-- A consulta é dinâmica: ao corrigir uma participação, o alerta desaparece.
create function public.permanence_stage_conflicts(p_program_id uuid)
returns table(
  duty_assignment_id uuid, roster_id uuid, student_id uuid,
  student_number integer, war_name text, duty_role text,
  duty_starts_at timestamptz, duty_ends_at timestamptz,
  shift_id uuid, stage_starts_at timestamptz, stage_ends_at timestamptz,
  conflict_kind text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do estágio.' using errcode = '42501';
  end if;
  return query
    select d.id, d.roster_id, d.student_id, s.student_number::integer,
      s.war_name::text, role.name::text, ps.starts_at, ps.ends_at,
      sh.id, sh.starts_at, sh.ends_at,
      case when (ps.starts_at at time zone p.timezone)::date <=
          ((sh.ends_at - interval '1 second') at time zone p.timezone)::date
        and ((ps.ends_at - interval '1 second') at time zone p.timezone)::date >=
          (sh.starts_at at time zone p.timezone)::date
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
      and d.status in ('prevista', 'confirmada')
      and sh.status = 'publicado' and a.status = 'prevista'
      and (ps.starts_at at time zone p.timezone)::date <=
        ((sh.ends_at - interval '1 second') at time zone p.timezone)::date + p.abm_buffer_days
      and ((ps.ends_at - interval '1 second') at time zone p.timezone)::date >=
        (sh.starts_at at time zone p.timezone)::date - p.abm_buffer_days
    order by ps.starts_at, role.sort_order;
end;
$$;
revoke all on function public.permanence_stage_conflicts(uuid) from public, anon;
grant execute on function public.permanence_stage_conflicts(uuid) to authenticated;
