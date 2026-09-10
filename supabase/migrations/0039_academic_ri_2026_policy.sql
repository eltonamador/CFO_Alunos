-- 0039 — Atualiza novas ofertas para a interpretação provisória do RI ABM 2026 revisado.
-- Políticas já gravadas permanecem válidas e imutáveis para preservar o histórico.

create or replace function public.academic_valid_parameters(p jsonb) returns boolean
language sql immutable
as $$
  select case when jsonb_typeof(p) = 'object'
    and jsonb_typeof(p -> 'version') = 'number'
    and jsonb_typeof(p -> 'directPassGrade') = 'number'
    and jsonb_typeof(p -> 'vfMinAverage') = 'number'
    and jsonb_typeof(p -> 'vfPassGrade') = 'number'
    and jsonb_typeof(p -> 'vfReduction') = 'boolean'
    and jsonb_typeof(p -> 'vfMaxRecordedGrade') = 'number'
    and jsonb_typeof(p -> 'maxVfDisciplines') = 'number'
    and jsonb_typeof(p -> 'absenceLimitPercent') = 'number'
    and jsonb_typeof(p -> 'averageDecimals') = 'number'
    and jsonb_typeof(p -> 'courseAttendanceMinimum') = 'number'
  then coalesce(
    (p ->> 'version')::numeric in (1,2)
    and (p ->> 'directPassGrade')::numeric between 0 and 10
    and (p ->> 'vfMinAverage')::numeric >= 0
    and (p ->> 'vfMinAverage')::numeric < (p ->> 'directPassGrade')::numeric
    and (p ->> 'vfPassGrade')::numeric > 0 and (p ->> 'vfPassGrade')::numeric <= 10
    and (p ->> 'vfMaxRecordedGrade')::numeric >= (p ->> 'vfPassGrade')::numeric
    and (p ->> 'vfMaxRecordedGrade')::numeric <= 10
    and (p ->> 'maxVfDisciplines')::numeric between 0 and 2147483647
    and (p ->> 'maxVfDisciplines')::numeric = trunc((p ->> 'maxVfDisciplines')::numeric)
    and (p ->> 'absenceLimitPercent')::numeric between 0 and 100
    and (p ->> 'attendanceMode') in ('total','unjustified')
    and (p ->> 'absencePenaltyStage') in ('none','before_vf','after_vf')
    and (p ->> 'averageDecimals')::numeric in (2,3,7)
    and (p ->> 'roundingMode') = 'half_even'
    and (p ->> 'comparisonStage') in ('rounded','exact')
    and (p ->> 'courseAttendanceMinimum')::numeric between 0 and 100,
    false)
  else false end
$$;

create or replace function public.academic_create_offering_ri(
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
    'version', 2,
    'directPassGrade', 7,
    'vfMinAverage', 5,
    'vfPassGrade', 5,
    'vfReduction', true,
    'vfMaxRecordedGrade', 6.75,
    'maxVfDisciplines', 3,
    'absenceLimitPercent', 25,
    'attendanceMode', 'unjustified',
    'absencePenaltyStage', 'none',
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
    values (
      'RI ABM 2026 revisado — aplicação provisória',
      v_parameters,
      btrim(p_decision_ref),
      auth.uid()
    )
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

comment on function public.academic_create_offering_ri(uuid, uuid, int, int, int, text) is
  'Cria oferta e política provisória baseada no RI ABM 2026 revisado; somente coordenação ativa.';
