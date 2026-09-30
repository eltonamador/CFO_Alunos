-- Mesmo uma gravação direta de Coordenação não pode reativar Apoio 2 ou 3
-- em serviços de permanência. Escalas operacionais legadas não são afetadas.
do $$
declare
  v_definition text;
  v_anchor text := 'select * into svc from public.duty_permanence_services where roster_id=new.roster_id;';
begin
  select pg_get_functiondef('public.permanence_guard_assignment()'::regprocedure)
    into v_definition;
  if position(v_anchor in v_definition) = 0 then
    raise exception 'A guarda da permanência mudou; revisar antes de restringir funções.';
  end if;
  v_definition := replace(v_definition, v_anchor,
    v_anchor || chr(10) ||
    ' if svc.roster_id is not null and not exists (' ||
    'select 1 from public.duty_roles role where role.id=new.role_id ' ||
    'and role.code in (''aluno_dia'',''apoio_1'')) then ' ||
    'raise exception ''Permanência permite somente Aluno de Dia e Apoio 1.'';end if;');
  execute v_definition;
end $$;
