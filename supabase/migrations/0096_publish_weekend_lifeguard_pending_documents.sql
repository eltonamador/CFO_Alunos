-- A Coordenação determinou publicar somente os dez postos de 26 e 27/09
-- mesmo sem documento operacional e oficial identificados. A exceção à
-- trava é vinculada a estes dez IDs; futuros planos seguem a regra normal.
create table public.internship_lifeguard_early_publications (
  shift_id uuid primary key references public.internship_shifts(id) on delete restrict,
  program_id uuid not null references public.internship_programs(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  decision_reference text not null check (length(btrim(decision_reference)) >= 10),
  registered_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
alter table public.internship_lifeguard_early_publications enable row level security;
revoke all on public.internship_lifeguard_early_publications from public, anon, authenticated;

do $$
declare definition text;
begin
  select pg_get_functiondef('public.internship_guard_shift()'::regprocedure) into definition;
  if position('v_plan.status not in (''autorizado'',''executado'')' in definition) = 0 then
    raise exception 'Guarda de plano mudou; conferir antes de publicar GV pendente.';
  end if;
  definition := replace(definition,
    'v_plan.status not in (''autorizado'',''executado'')',
    '(v_plan.status not in (''autorizado'',''executado'') and not (' ||
    'v_plan.status = ''em_definicao'' and v_activity.code = ''guarda_vida'' ' ||
    'and exists (select 1 from public.internship_lifeguard_early_publications exception_row ' ||
    'where exception_row.shift_id = new.id and exception_row.program_id = new.program_id ' ||
    'and exception_row.starts_at = new.starts_at and exception_row.ends_at = new.ends_at)))');
  execute definition;
end $$;

do $$
declare
  v_program_id uuid;
  v_plan record;
  v_shift record;
  v_count integer;
  v_ids text;
begin
  select p.id into strict v_program_id from public.internship_programs p
  join public.classes c on c.id=p.class_id
  where c.name='CFO 2026.1' and p.course_phase='CFO I' and p.status='publicado';
  select count(*),string_agg(quote_literal(sh.id::text)||'::uuid',',')
    into v_count,v_ids from public.internship_shifts sh
    join public.internship_operation_plans p on p.id=sh.operation_plan_id
    where p.program_id=v_program_id
      and p.code in ('guarda_vida_20260926','guarda_vida_20260927')
      and p.status='reserva' and sh.status='rascunho';
  if v_count<>10 then raise exception 'Esperados exatamente dez rascunhos de GV.'; end if;
  -- A publicação por migração não possui auth.uid(). Somente estes dez IDs
  -- podem ter published_by nulo; a determinação está na tabela de exceções.
  alter table public.internship_shifts drop constraint internship_shifts_check3;
  execute 'alter table public.internship_shifts add constraint internship_shifts_check3 check ('||
    'status <> ''publicado'' or (published_at is not null and '||
    '(published_by is not null or id in ('||v_ids||'))))';
  for v_plan in select * from public.internship_operation_plans
    where program_id=v_program_id and code in ('guarda_vida_20260926','guarda_vida_20260927')
    order by code for update
  loop
    if v_plan.status<>'reserva' or v_plan.document_reference is not null
      or v_plan.officer_name is not null then
      raise exception 'Plano % não está no rascunho esperado.',v_plan.code;
    end if;
    select count(*) into v_count from public.internship_shifts sh
      join public.internship_assignments a on a.shift_id=sh.id and a.status='prevista'
      join public.internship_sites site on site.id=sh.site_id
      where sh.operation_plan_id=v_plan.id and sh.status='rascunho'
        and site.site_type='praia' and site.code in
          ('praia_1','praia_2','praia_3','praia_4','praia_5')
        and sh.starts_at=v_plan.starts_at and sh.ends_at=v_plan.ends_at;
    if v_count<>5 or
      (select count(distinct sh.site_id) from public.internship_shifts sh
        where sh.operation_plan_id=v_plan.id and sh.status='rascunho')<>5 or
      (select count(distinct a.student_id) from public.internship_assignments a
        join public.internship_shifts sh on sh.id=a.shift_id
        where sh.operation_plan_id=v_plan.id and a.status='prevista')<>5 then
      raise exception 'Plano % não contém cinco postos e cadetes distintos.',v_plan.code;
    end if;
    update public.internship_operation_plans set status='em_definicao',
      title='Guarda-vidas '||to_char((v_plan.starts_at at time zone 'America/Belem')::date,'DD/MM/YYYY')||
        ' — publicada; documento e oficial pendentes'
      where id=v_plan.id;
    insert into public.internship_lifeguard_early_publications
      (shift_id,program_id,starts_at,ends_at,decision_reference)
    select sh.id,sh.program_id,sh.starts_at,sh.ends_at,
      'Determinação da Coordenação no Codex em 24/09/2026: publicar a escala de GV; documento e oficial a complementar.'
    from public.internship_shifts sh where sh.operation_plan_id=v_plan.id and sh.status='rascunho';
    update public.internship_shifts set
      change_reason='Publicação determinada pela Coordenação em 24/09/2026; documento operacional e oficial supervisor pendentes.'
      where operation_plan_id=v_plan.id and status='rascunho';
    for v_shift in select id from public.internship_shifts
      where operation_plan_id=v_plan.id order by site_id for update
    loop
      update public.internship_shifts set status='publicado',published_at=now()
        where id=v_shift.id and status='rascunho';
    end loop;
  end loop;
  if (select count(*) from public.internship_shifts sh
      join public.internship_activity_types act on act.id=sh.activity_type_id
      where sh.program_id=v_program_id and sh.status='publicado' and act.code='guarda_vida'
        and sh.starts_at>=timestamptz '2026-09-26 00:00:00-03'
        and sh.starts_at<timestamptz '2026-09-28 00:00:00-03')<>10 then
    raise exception 'Publicação de guarda-vidas incompleta.';
  end if;
end $$;

-- A agenda mostra o oficial do plano depois que ele for formalizado.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.internship_coordination_schedule(uuid)'::regprocedure)
    into definition;
  if position('coalesce(record.supervisor_name, sh.planned_supervisor_name)' in definition)=0 then
    raise exception 'Consulta de agenda mudou; conferir supervisor do plano.';
  end if;
  definition:=replace(definition,
    'coalesce(record.supervisor_name, sh.planned_supervisor_name)',
    'coalesce(record.supervisor_name, sh.planned_supervisor_name, plan.officer_name)');
  execute definition;
end $$;

notify pgrst, 'reload schema';
