-- Repor uma vaga cancelada preserva o plantão original e a participação
-- cancelada. A nova publicação passa novamente por todas as guardas de
-- disponibilidade, impedimento e descanso de 24 horas.
do $$
declare
  definition text;
  old_text text := 'and replaced.shift_id = new.shift_id
        and replaced.status = ''substituida''';
begin
  select pg_get_functiondef('public.internship_guard_assignment()'::regprocedure)
    into definition;
  if position(old_text in definition) = 0 then
    raise exception 'Guarda de substituição mudou; revisar a reposição de vaga.';
  end if;
  definition := replace(definition, old_text,
    'and ((replaced.shift_id = new.shift_id and replaced.status = ''substituida'')
          or (replaced.status = ''cancelada'' and exists (
            select 1 from public.internship_shifts previous_shift
            join public.internship_shifts replacement_shift
              on replacement_shift.id = new.shift_id
            where previous_shift.id = replaced.shift_id
              and previous_shift.status = ''cancelado''
              and replacement_shift.status = ''rascunho''
              and replacement_shift.program_id = previous_shift.program_id
              and replacement_shift.activity_type_id = previous_shift.activity_type_id
              and replacement_shift.site_id = previous_shift.site_id
              and replacement_shift.resource_id = previous_shift.resource_id
              and replacement_shift.template_id is not distinct from previous_shift.template_id
              and replacement_shift.operation_plan_id is not distinct from previous_shift.operation_plan_id
              and replacement_shift.starts_at = previous_shift.starts_at
              and replacement_shift.ends_at = previous_shift.ends_at
              and replacement_shift.capacity = previous_shift.capacity
          ) and not exists (
            select 1 from public.internship_assignments child
            where child.replaces_assignment_id = replaced.id
          )))');
  execute definition;
end $$;

create function public.internship_fill_cancelled_vacancy(
  p_assignment_id uuid, p_new_student_id uuid, p_reason text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_assignment public.internship_assignments;
  v_shift public.internship_shifts;
  v_new_shift_id uuid;
  v_new_assignment_id uuid;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação preenche vagas canceladas.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason,''))) < 5 then
    raise exception 'Informe o motivo da troca.' using errcode = '23514';
  end if;
  select * into v_assignment from public.internship_assignments
    where id = p_assignment_id for update;
  if v_assignment.id is null or v_assignment.status <> 'cancelada'
    or v_assignment.student_id = p_new_student_id then
    raise exception 'Participação cancelada ou substituto inválido.' using errcode = '23514';
  end if;
  select * into v_shift from public.internship_shifts
    where id = v_assignment.shift_id for update;
  if v_shift.status <> 'cancelado' or v_shift.capacity <> 1
    or v_shift.ends_at <= now() then
    raise exception 'Esta vaga não pode ser reaberta automaticamente.' using errcode = '23514';
  end if;
  if exists (select 1 from public.internship_assignments child
      where child.replaces_assignment_id = v_assignment.id) then
    raise exception 'Esta vaga já foi preenchida. Consulte a escala atual.' using errcode = '23514';
  end if;

  insert into public.internship_shifts (
    program_id, activity_type_id, site_id, resource_id, template_id,
    operation_plan_id, starts_at, ends_at, capacity, status,
    planned_supervisor_name, additional_member_required, change_reason, created_by
  ) values (
    v_shift.program_id, v_shift.activity_type_id, v_shift.site_id,
    v_shift.resource_id, v_shift.template_id, v_shift.operation_plan_id,
    v_shift.starts_at, v_shift.ends_at, v_shift.capacity, 'rascunho',
    v_shift.planned_supervisor_name, v_shift.additional_member_required,
    'Vaga reposta após cancelamento: ' || btrim(p_reason), auth.uid()
  ) returning id into v_new_shift_id;

  -- Escalas de praia publicadas enquanto o documento estava pendente têm
  -- uma exceção identificada por plantão. A reposição herda essa decisão.
  insert into public.internship_lifeguard_early_publications (
    shift_id, program_id, starts_at, ends_at, decision_reference
  )
  select v_new_shift_id, e.program_id, e.starts_at, e.ends_at,
    'Reposição da vaga ' || v_assignment.id::text || ': ' || btrim(p_reason)
  from public.internship_lifeguard_early_publications e
  where e.shift_id = v_shift.id;

  insert into public.internship_assignments (
    shift_id, student_id, assignment_source, reason,
    replaces_assignment_id, created_by
  ) values (
    v_new_shift_id, p_new_student_id, 'substituicao', btrim(p_reason),
    v_assignment.id, auth.uid()
  ) returning id into v_new_assignment_id;

  insert into public.internship_shift_uniforms (
    shift_id, uniform_code, reason, updated_by
  )
  select v_new_shift_id, u.uniform_code,
    'Uniforme mantido na reposição da vaga cancelada.', auth.uid()
  from public.internship_shift_uniforms u where u.shift_id = v_shift.id;

  update public.internship_shifts
    set status = 'publicado', published_by = auth.uid(), published_at = now()
    where id = v_new_shift_id;
  return v_new_assignment_id;
end;
$$;
revoke all on function public.internship_fill_cancelled_vacancy(uuid,uuid,text)
  from public, anon;
grant execute on function public.internship_fill_cancelled_vacancy(uuid,uuid,text)
  to authenticated;

notify pgrst, 'reload schema';
