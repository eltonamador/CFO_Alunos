-- A turma mantém desligados para histórico, mas as cargas e opções de escala
-- correntes incluem somente quem permanece matriculado.
create or replace function public.internship_coordination_workload(p_program_id uuid)
returns table (
  student_id uuid, student_number integer, war_name text,
  planned_minutes bigint, performed_minutes bigint, validated_minutes bigint,
  required_minutes integer, target_minutes integer,
  missing_required_minutes bigint, missing_target_minutes bigint,
  excess_minutes bigint, assigned_shifts bigint,
  awaiting_homologation bigint, open_occurrences bigint, concluded boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Consulta restrita à Coordenação.' using errcode = '42501';
  end if;
  return query
    with program as (
      select p.id, p.class_id, p.required_minutes, p.target_minutes
      from public.internship_programs p
      where p.id = p_program_id
    ),
    cadets as (
      select s.id, s.student_number, s.war_name
      from public.students s
      join program p on p.class_id = s.class_id
      where s.deleted_at is null and s.course_status = 'matriculado'
    ),
    active_assignments as (
      select a.id, a.student_id, sh.ends_at, sh.planned_minutes
      from public.internship_assignments a
      join public.internship_shifts sh on sh.id = a.shift_id
      join program p on p.id = sh.program_id
      where a.status = 'prevista' and sh.status = 'publicado'
    ),
    current_records as (
      select r.assignment_id, r.validation_status, r.calculated_minutes,
        r.approved_minutes, r.validated_at
      from public.internship_execution_records r
      join active_assignments a on a.id = r.assignment_id
      where not exists (
        select 1 from public.internship_execution_records child
        where child.revision_of_id = r.id
      )
    ),
    report_state as (
      select report.assignment_id,
        max(report.reported_at) filter (where report.report_type <> 'presenca')
          as last_occurrence_at
      from public.internship_cadet_reports report
      join active_assignments a on a.id = report.assignment_id
      group by report.assignment_id
    ),
    totals as (
      select c.id, c.student_number, c.war_name,
        coalesce(sum(a.planned_minutes),0)::bigint as planned,
        coalesce(sum(cr.calculated_minutes),0)::bigint as performed,
        coalesce(sum(cr.approved_minutes)
          filter (where cr.validation_status = 'homologado'),0)::bigint as validated,
        count(a.id)::bigint as assigned,
        count(a.id) filter (where a.ends_at <= now()
          and cr.validation_status is distinct from 'homologado')::bigint as awaiting,
        count(a.id) filter (where rs.last_occurrence_at is not null
          and (cr.validated_at is null or rs.last_occurrence_at > cr.validated_at))::bigint
          as occurrences
      from cadets c
      left join active_assignments a on a.student_id = c.id
      left join current_records cr on cr.assignment_id = a.id
      left join report_state rs on rs.assignment_id = a.id
      group by c.id, c.student_number, c.war_name
    )
    select t.id, t.student_number, t.war_name,
      t.planned, t.performed, t.validated,
      p.required_minutes, p.target_minutes,
      greatest(0::bigint, p.required_minutes::bigint - t.validated),
      greatest(0::bigint, p.target_minutes::bigint - t.validated),
      greatest(0::bigint, t.validated - p.required_minutes::bigint),
      t.assigned, t.awaiting, t.occurrences,
      t.validated >= p.required_minutes
    from totals t cross join program p
    order by t.student_number nulls last, t.war_name;
end;
$$;

create or replace function public.internship_planning_cadets(p_program_id uuid)
returns table(id uuid,war_name text,student_number integer)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do estágio.' using errcode='42501';
  end if;
  return query select s.id,s.war_name,s.student_number from public.students s
    join public.internship_programs p on p.class_id=s.class_id
    where p.id=p_program_id and s.deleted_at is null
      and s.course_status='matriculado'
    order by s.student_number,s.id;
end;
$$;

-- A validação na tabela também impede uma atribuição manual a cadete desligado.
create function public.internship_require_enrolled_assignment() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.status='prevista' and not exists (
    select 1 from public.students s
    where s.id=new.student_id and s.deleted_at is null
      and s.course_status='matriculado'
  ) then
    raise exception 'Cadete inativo não pode ser escalado.' using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger internship_enrolled_assignment_guard before insert on public.internship_assignments
  for each row execute function public.internship_require_enrolled_assignment();

notify pgrst, 'reload schema';
