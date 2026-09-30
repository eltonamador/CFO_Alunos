-- Remanejamentos e reposições usam as mesmas janelas de 12h que a criação da escala.
do $$
declare
  definition text;
  old_duration text := 'v_expected := case' || chr(10) ||
    '    when v_resource.resource_type = ''ar''' || chr(10) ||
    '      and extract(isodow from (p_starts_at at time zone v_program.timezone)) in (6,7)' || chr(10) ||
    '      then 1440' || chr(10) ||
    '    else 720' || chr(10) ||
    '  end;';
begin
  select pg_get_functiondef('public.internship_reschedule_gbm_assignment(uuid,uuid,timestamptz,timestamptz,text,text,text)'::regprocedure)
    into definition;
  if position(old_duration in definition) = 0
    or position('when v_resource.resource_type = ''usb'' and extract(isodow from v_local_date) in (6,7)' in definition) = 0 then
    raise exception 'Função de remanejamento mudou; conferir as regras antes de adaptar.';
  end if;
  definition := replace(definition, old_duration,
    'v_expected := case when v_resource.resource_type = ''ar'' and extract(isodow from (p_starts_at at time zone v_program.timezone)) in (6,7) and (p_starts_at at time zone v_program.timezone)::time = time ''07:45'' and p_ends_at - p_starts_at = interval ''24 hours'' then 1440 else 720 end;' || chr(10) ||
    '  if extract(isodow from (p_starts_at at time zone v_program.timezone)) = 6 and v_expected = 720 and (p_starts_at at time zone v_program.timezone)::time not in (time ''07:45'',time ''19:45'') then raise exception ''Use 07h45 ou 19h45 para 12h no sábado.'' using errcode = ''23514''; end if;');
  definition := replace(definition,
    'when v_resource.resource_type = ''usb'' and extract(isodow from v_local_date) in (6,7)',
    'when v_resource.resource_type in (''usb'',''ar'') and extract(isodow from v_local_date) in (6,7)');
  execute definition;
end $$;

notify pgrst, 'reload schema';
