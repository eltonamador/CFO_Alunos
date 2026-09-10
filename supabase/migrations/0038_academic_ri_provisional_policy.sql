-- 0038 — Cria ofertas já vinculadas à interpretação provisória do RI ABM 2023.
-- A política é copiada por oferta para manter histórico e permitir evolução versionada.

create function public.academic_create_offering_ri(
  p_class_id uuid,
  p_discipline_id uuid,
  p_academic_year int,
  p_workload_hours int,
  p_vc_count int,
  p_decision_ref text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_policy_id uuid;
  v_offering_id uuid;
  v_parameters jsonb := jsonb_build_object(
    'version', 1,
    'directPassGrade', 7,
    'vfMinAverage', 0,
    'vfPassGrade', 5,
    'vfReduction', true,
    'vfMaxRecordedGrade', 6.75,
    'maxVfDisciplines', 3,
    'absenceLimitPercent', 25,
    'attendanceMode', 'unjustified',
    'absencePenaltyStage', 'after_vf',
    'averageDecimals', 2,
    'roundingMode', 'half_even',
    'comparisonStage', 'rounded',
    'courseAttendanceMinimum', 90
  );
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente coordenação ativa cria ofertas.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_decision_ref, ''))) < 5 then
    raise exception 'Informe a referência da decisão provisória.' using errcode = '23514';
  end if;

  insert into public.academic_policies(name, parameters, decision_ref, approved_by)
    values ('RI ABM 2023 — aplicação provisória', v_parameters, btrim(p_decision_ref), auth.uid())
    returning id into v_policy_id;

  insert into public.academic_offerings(
    class_id, discipline_id, academic_year, workload_hours, vc_count, policy_id, decision_ref
  ) values (
    p_class_id, p_discipline_id, p_academic_year, p_workload_hours, p_vc_count,
    v_policy_id, btrim(p_decision_ref)
  ) returning id into v_offering_id;

  return v_offering_id;
end
$$;

revoke all on function public.academic_create_offering_ri(uuid, uuid, int, int, int, text)
  from public, anon, authenticated;
grant execute on function public.academic_create_offering_ri(uuid, uuid, int, int, int, text)
  to authenticated;

comment on function public.academic_create_offering_ri(uuid, uuid, int, int, int, text) is
  'Cria oferta e política provisória RI na mesma transação; somente coordenação ativa.';
