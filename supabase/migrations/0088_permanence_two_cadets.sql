-- A Coordenação decidiu manter somente Aluno de Dia e Apoio 1.
-- Na escala CFO recebida em 24/09, retirar os dois últimos nomes de cada turno.
do $$
declare
  v_class_id uuid;
  v_source text := '83d440fedd428392f518e33e0627b42acb7059bd7fac947487c639c6e01d08a1';
  v_roster record;
  v_before jsonb;
  v_after jsonb;
  v_roles text[];
  v_roster_count integer := 0;
  v_removed_count integer := 0;
  v_changed integer;
  v_definition text;
  v_old_rule text := 'coalesce(array_length(p_students,1),0) not between 2 and 4 or cardinality(p_students)<>(select count(distinct v) from unnest(p_students) v)';
  v_new_rule text := 'coalesce(array_length(p_students,1),0) <> 2 or cardinality(p_students)<>(select count(distinct v) from unnest(p_students) v)';
begin
  select id into strict v_class_id from public.classes where name = 'CFO 2026.1';
  perform pg_advisory_xact_lock(hashtext('permanence:' || v_class_id::text));

  for v_roster in
    select r.id from public.duty_rosters r
    join public.duty_permanence_services ps on ps.roster_id = r.id
    where r.class_id = v_class_id and r.status = 'publicada'
      and r.notes like '%' || v_source || '%'
    order by ps.starts_at
    for update of r
  loop
    v_roster_count := v_roster_count + 1;
    select array_agg(role.code order by role.sort_order),
           jsonb_agg(jsonb_build_object('id', d.id, 'student_id', d.student_id,
             'role', role.code, 'status', d.status) order by role.sort_order)
      into v_roles, v_before
    from public.duty_assignments d
    join public.duty_roles role on role.id = d.role_id
    where d.roster_id = v_roster.id and d.status in ('prevista', 'confirmada');
    if v_roles is distinct from array['aluno_dia', 'apoio_1', 'apoio_2', 'apoio_3']::text[] then
      raise exception 'Escala % mudou; revisar antes de retirar apoios.', v_roster.id;
    end if;

    update public.duty_assignments d
       set status = 'cancelada',
           manual_reason = 'Retirado da permanência por decisão da Coordenação: efetivo reduzido para dois cadetes.'
      from public.duty_roles role
     where d.roster_id = v_roster.id and role.id = d.role_id
       and role.code in ('apoio_2', 'apoio_3')
       and d.status in ('prevista', 'confirmada');
    get diagnostics v_changed = row_count;
    if v_changed <> 2 then raise exception 'Retirada incompleta na escala %.', v_roster.id; end if;
    v_removed_count := v_removed_count + v_changed;

    select jsonb_agg(jsonb_build_object('id', d.id, 'student_id', d.student_id,
      'role', role.code, 'status', d.status) order by role.sort_order)
      into v_after
    from public.duty_assignments d
    join public.duty_roles role on role.id = d.role_id
    where d.roster_id = v_roster.id and d.status in ('prevista', 'confirmada');
    insert into public.duty_assignment_logs (
      roster_id, action, actor_role, before_data, after_data, reason
    ) values (
      v_roster.id, 'manual_change', 'sistema',
      jsonb_build_object('assignments', v_before),
      jsonb_build_object('assignments', v_after),
      'Coordenação: permanência com Aluno de Dia e Apoio 1; Apoios 2 e 3 liberados para estágio operacional e guarda-vidas.'
    );
  end loop;
  if v_roster_count <> 9 or v_removed_count <> 18 then
    raise exception 'Esperadas nove escalas e 18 retiradas; obtidas % e %.', v_roster_count, v_removed_count;
  end if;

  -- A regra também vale para novas publicações e alterações futuras.
  select pg_get_functiondef('public.permanence_publish(uuid,timestamptz,timestamptz,text,text,uuid[],uuid,text)'::regprocedure)
    into v_definition;
  if position(v_old_rule in v_definition) = 0 then
    raise exception 'A validação do efetivo mudou; revisar antes de impor dois cadetes.';
  end if;
  v_definition := replace(v_definition, v_old_rule, v_new_rule);
  v_definition := replace(v_definition,
    'Selecione de dois a quatro cadetes diferentes.',
    'Selecione exatamente dois cadetes diferentes.');
  execute v_definition;
end $$;
