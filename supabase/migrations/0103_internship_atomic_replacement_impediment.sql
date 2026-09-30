-- A troca e o impedimento do cadete retirado são uma única transação.
-- O registro de saúde usa somente uma descrição operacional, sem diagnóstico.
create function public.internship_replace_with_impediment(
  p_assignment_id uuid,
  p_new_student_id uuid,
  p_reason_kind text,
  p_reason_details text,
  p_impediment_until date
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_assignment public.internship_assignments;
  v_shift public.internship_shifts;
  v_program public.internship_programs;
  v_first date;
  v_last date;
  v_reason text;
  v_new_assignment_id uuid;
begin
  if not public.internship_has_role(array['coordenacao']) then
    raise exception 'Somente a Coordenação substitui cadetes.' using errcode = '42501';
  end if;
  if p_reason_kind not in ('saude','outro') then
    raise exception 'Informe o tipo de impedimento.' using errcode = '23514';
  end if;
  if p_reason_kind = 'outro' and length(btrim(coalesce(p_reason_details,''))) < 5 then
    raise exception 'Descreva o outro impedimento.' using errcode = '23514';
  end if;
  select * into v_assignment from public.internship_assignments
    where id = p_assignment_id for update;
  if v_assignment.id is null or v_assignment.status not in ('prevista','cancelada')
    or v_assignment.student_id = p_new_student_id then
    raise exception 'Participação ou substituto inválido.' using errcode = '23514';
  end if;
  select * into v_shift from public.internship_shifts
    where id = v_assignment.shift_id for update;
  select * into v_program from public.internship_programs
    where id = v_shift.program_id;
  v_first := (v_shift.starts_at at time zone v_program.timezone)::date;
  v_last := ((v_shift.ends_at - interval '1 second') at time zone v_program.timezone)::date;
  if v_shift.starts_at <= now() or p_impediment_until is null
    or p_impediment_until < v_last or p_impediment_until > v_program.ends_on then
    raise exception 'Confira o período do impedimento e o plantão futuro.' using errcode = '23514';
  end if;
  v_reason := case when p_reason_kind = 'saude'
    then 'Impedimento de saúde informado pela Coordenação.'
    else 'Outro impedimento: ' || btrim(p_reason_details) end;

  if v_assignment.status = 'prevista' then
    v_new_assignment_id := public.internship_substitute_assignment(
      v_assignment.id, p_new_student_id, v_reason);
  else
    v_new_assignment_id := public.internship_fill_cancelled_vacancy(
      v_assignment.id, p_new_student_id, v_reason);
  end if;

  if not exists (
    select 1 from public.duty_impediments i
    where i.student_id = v_assignment.student_id and i.active
      and i.starts_on <= v_first and i.ends_on >= p_impediment_until
  ) then
    insert into public.duty_impediments (
      student_id, impediment_type, starts_on, ends_on,
      reason, operational_note, registered_by
    ) values (
      v_assignment.student_id,
      case when p_reason_kind = 'saude' then 'restricao_medica' else 'outro' end,
      v_first, p_impediment_until, v_reason,
      'Indisponível para escala no período informado.', auth.uid()
    );
  end if;
  return v_new_assignment_id;
end;
$$;
revoke all on function public.internship_replace_with_impediment(uuid,uuid,text,text,date)
  from public, anon;
grant execute on function public.internship_replace_with_impediment(uuid,uuid,text,text,date)
  to authenticated;

notify pgrst, 'reload schema';
