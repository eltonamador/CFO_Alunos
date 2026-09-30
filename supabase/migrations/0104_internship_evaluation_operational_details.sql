-- Versão 2 da ficha: contexto operacional e dois indicadores técnicos
-- específicos para USB ou AR. As seis respostas anteriores permanecem
-- intactas; avaliações já recebidas conservam details = {}.
alter table public.internship_evaluations
  add column details jsonb not null default '{}'::jsonb
  check (jsonb_typeof(details) = 'object');

create function public.internship_validate_evaluation_details(
  p_details jsonb, p_activity_code text
) returns void
language plpgsql immutable set search_path = public as $$
declare
  v_expected text[];
begin
  if p_details is null or jsonb_typeof(p_details) <> 'object' then
    raise exception 'Dados complementares da avaliação inválidos.' using errcode = '23514';
  end if;
  if (select count(*) from jsonb_object_keys(p_details)) <> 10
    or not p_details ?& array[
      'formVersion','evaluatorFunction','evaluatorFunctionOther','vehiclePrefix',
      'occurrenceCount','activities','technicalRatings','positiveNote',
      'feedbackGiven','coordinationNotified'
    ] or jsonb_typeof(p_details->'formVersion') <> 'number'
      or p_details->>'formVersion' is distinct from '2' then
    raise exception 'Dados complementares da avaliação inválidos.' using errcode = '23514';
  end if;
  if (p_details->>'evaluatorFunction') is null
    or (p_details->>'evaluatorFunction') not in
      ('comandante','chefe','outro','nao_informado')
    or jsonb_typeof(p_details->'evaluatorFunctionOther') <> 'string'
    or length(btrim(p_details->>'evaluatorFunctionOther')) > 80
    or (p_details->>'evaluatorFunction' = 'outro'
      and length(btrim(p_details->>'evaluatorFunctionOther')) < 3)
    or jsonb_typeof(p_details->'vehiclePrefix') <> 'string'
    or length(btrim(p_details->>'vehiclePrefix')) > 30
    or jsonb_typeof(p_details->'positiveNote') <> 'string'
    or length(btrim(p_details->>'positiveNote')) > 1000
    or p_details->>'feedbackGiven' is null
    or p_details->>'feedbackGiven' not in ('sim','nao','nao_informado')
    or jsonb_typeof(p_details->'coordinationNotified') <> 'boolean' then
    raise exception 'Identificação ou devolutiva inválida.' using errcode = '23514';
  end if;
  if jsonb_typeof(p_details->'activities') <> 'array' then
    raise exception 'Resumo das atividades inválido.' using errcode = '23514';
  end if;
  if jsonb_typeof(p_details->'occurrenceCount') <> 'number'
    or (p_details->>'occurrenceCount') !~ '^[0-9]{1,2}$'
    or jsonb_array_length(p_details->'activities') > 5
    or exists (
      select 1 from jsonb_array_elements(p_details->'activities') item
      where jsonb_typeof(item) <> 'string'
        or item #>> '{}' not in ('materiais','cena','apoio','comunicacao','prontificacao')
    ) or (select count(distinct item #>> '{}')
      from jsonb_array_elements(p_details->'activities') item)
      <> jsonb_array_length(p_details->'activities') then
    raise exception 'Resumo das atividades inválido.' using errcode = '23514';
  end if;
  v_expected := case p_activity_code
    when 'usb' then array['usb_abordagem','usb_cuidado']
    when 'ar' then array['ar_preparo','ar_apoio']
    else array[]::text[] end;
  if jsonb_typeof(p_details->'technicalRatings') <> 'object' then
    raise exception 'Responda aos critérios técnicos aplicáveis ao serviço.' using errcode = '23514';
  end if;
  if (select count(*) from jsonb_object_keys(p_details->'technicalRatings'))
      <> cardinality(v_expected)
    or (cardinality(v_expected) > 0
      and not (p_details->'technicalRatings') ?& v_expected)
    or exists (
      select 1 from jsonb_each(p_details->'technicalRatings') answer
      where jsonb_typeof(answer.value) <> 'string'
        or answer.value #>> '{}' not in ('reforco','esperado','acima','nao_observado')
    ) then
    raise exception 'Responda aos critérios técnicos aplicáveis ao serviço.' using errcode = '23514';
  end if;
end;
$$;
revoke all on function public.internship_validate_evaluation_details(jsonb,text)
  from public, anon, authenticated;

create function public.internship_submit_evaluation_v2(
  p_token text, p_evaluator_name text, p_evaluator_unit text,
  p_ratings jsonb, p_guidance text, p_incident boolean,
  p_incident_note text, p_confirmed boolean, p_details jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_activity_code text;
begin
  if p_details->>'evaluatorFunction' = 'nao_informado'
    or p_details->>'feedbackGiven' = 'nao_informado' then
    raise exception 'O avaliador deve informar sua função e a devolutiva ao cadete.'
      using errcode = '23514';
  end if;
  v_id := public.internship_submit_evaluation(
    p_token,p_evaluator_name,p_evaluator_unit,p_ratings,p_guidance,
    p_incident,p_incident_note,p_confirmed
  );
  select activity.code into v_activity_code
    from public.internship_evaluations evaluation
    join public.internship_assignments assignment on assignment.id = evaluation.assignment_id
    join public.internship_shifts shift_row on shift_row.id = assignment.shift_id
    join public.internship_activity_types activity on activity.id = shift_row.activity_type_id
    where evaluation.id = v_id;
  perform public.internship_validate_evaluation_details(p_details,v_activity_code);
  if exists (
    select 1 from jsonb_each_text(p_details->'technicalRatings') answer
    where answer.value = 'reforco'
  ) and length(btrim(coalesce(p_guidance,''))) < 5 then
    raise exception 'Informe a orientação para o reforço técnico.' using errcode = '23514';
  end if;
  update public.internship_evaluations set details = p_details where id = v_id;
  return v_id;
end;
$$;
revoke all on function public.internship_submit_evaluation_v2(
  text,text,text,jsonb,text,boolean,text,boolean,jsonb
) from public;
grant execute on function public.internship_submit_evaluation_v2(
  text,text,text,jsonb,text,boolean,text,boolean,jsonb
) to anon, authenticated;

create function public.internship_record_paper_evaluation_v2(
  p_assignment_id uuid, p_evaluator_name text, p_evaluator_unit text,
  p_ratings jsonb, p_guidance text, p_incident boolean,
  p_incident_note text, p_paper_reference text, p_details jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_activity_code text;
begin
  v_id := public.internship_record_paper_evaluation(
    p_assignment_id,p_evaluator_name,p_evaluator_unit,p_ratings,p_guidance,
    p_incident,p_incident_note,p_paper_reference
  );
  select activity.code into v_activity_code
    from public.internship_evaluations evaluation
    join public.internship_assignments assignment on assignment.id = evaluation.assignment_id
    join public.internship_shifts shift_row on shift_row.id = assignment.shift_id
    join public.internship_activity_types activity on activity.id = shift_row.activity_type_id
    where evaluation.id = v_id;
  perform public.internship_validate_evaluation_details(p_details,v_activity_code);
  if exists (
    select 1 from jsonb_each_text(p_details->'technicalRatings') answer
    where answer.value = 'reforco'
  ) and length(btrim(coalesce(p_guidance,''))) < 5 then
    raise exception 'Informe a orientação para o reforço técnico.' using errcode = '23514';
  end if;
  update public.internship_evaluations set details = p_details where id = v_id;
  return v_id;
end;
$$;
revoke all on function public.internship_record_paper_evaluation_v2(
  uuid,text,text,jsonb,text,boolean,text,text,jsonb
) from public, anon;
grant execute on function public.internship_record_paper_evaluation_v2(
  uuid,text,text,jsonb,text,boolean,text,text,jsonb
) to authenticated;

create or replace function public.internship_my_evaluations() returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not exists(select 1 from public.profiles
    where id=auth.uid() and active and role='aluno') then
    raise exception 'Acesso negado.' using errcode='42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',e.id,'context',e.context,'ratings',e.ratings,'details',e.details,
    'guidance',e.guidance,'reviewed_at',e.reviewed_at
  ) order by e.submitted_at desc)
    from public.internship_evaluations e
    where e.student_id=public.current_student_id() and e.status='liberada'),'[]'::jsonb);
end;
$$;

notify pgrst, 'reload schema';
