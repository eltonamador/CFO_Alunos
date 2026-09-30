-- A ficha de praia passa a exigir dois indicadores técnicos específicos.
-- Mantém o formato v2 e as respostas já registradas intactas.
create or replace function public.internship_validate_evaluation_details(
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
  if p_details->>'evaluatorFunction' is null
    or p_details->>'evaluatorFunction' not in
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
    when 'guarda_vida' then array['praia_prevencao','praia_apoio']
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

notify pgrst, 'reload schema';
