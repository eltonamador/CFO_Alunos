-- Replanejamento solicitado em 24/09/2026: APH sábado 08h–12h40,
-- AR sábado no 2º turno de 12h, retirada de USB da manhã, GV em rascunho.
-- Operações anteriores permanecem no histórico, com motivo explícito.
do $$
declare
  v_program_id uuid;
  v_reason text := 'Replanejamento por APH de sábado 08h–12h40 e descanso mínimo de 24 horas, solicitado pela Coordenação em 24/09/2026.';
  v_old record;
  v_new_shift uuid;
  v_ar_template uuid;
  v_activity_id uuid;
  v_plan_id uuid;
  v_site_id uuid;
  v_resource_id uuid;
  v_student_id uuid;
  v_old_fernandes uuid;
  v_fredson uuid;
  v_date date;
  v_start timestamptz;
  v_end timestamptz;
  v_names text[];
  v_index integer;
  v_count integer;
begin
  select p.id into strict v_program_id from public.internship_programs p
  join public.classes c on c.id = p.class_id
  where c.name = 'CFO 2026.1' and p.course_phase = 'CFO I';

  select t.id into strict v_ar_template from public.internship_shift_templates t
  where t.program_id = v_program_id and t.code = 'SAB-AR-T12' and t.active;

  -- A única avaliação aberta pertence ao AR de P. Amaral. O link anterior
  -- deixa de representar o novo turno e é revogado antes da substituição.
  if exists (
    select 1 from public.internship_evaluations e
    join public.internship_assignments a on a.id = e.assignment_id
    join public.internship_shifts sh on sh.id = a.shift_id
    join public.internship_activity_types act on act.id = sh.activity_type_id
    where sh.program_id = v_program_id and sh.status = 'publicado'
      and sh.starts_at = timestamptz '2026-09-26 07:45:00-03'
      and act.code in ('ar','usb')
      and e.status in ('respondida','liberada','devolvida')
  ) then
    raise exception 'Há avaliação respondida em plantão a alterar; revisar individualmente.';
  end if;
  if exists (
    select 1 from public.internship_shifts sh
    join public.internship_assignments a on a.shift_id = sh.id
    where sh.program_id = v_program_id and sh.status = 'publicado'
      and sh.starts_at = timestamptz '2026-09-26 07:45:00-03'
      and (exists(select 1 from public.internship_execution_records r where r.assignment_id=a.id)
        or exists(select 1 from public.internship_attendance_points pt where pt.assignment_id=a.id)
        or exists(select 1 from public.internship_cadet_reports report where report.assignment_id=a.id))
  ) then
    raise exception 'Há execução, ponto ou relato em plantão a alterar.';
  end if;
  select count(*) into v_count from public.internship_shifts sh
  join public.internship_activity_types act on act.id = sh.activity_type_id
  where sh.program_id = v_program_id and sh.status = 'publicado'
    and sh.starts_at = timestamptz '2026-09-26 07:45:00-03'
    and act.code in ('ar','usb');
  if v_count <> 6 then raise exception 'Esperados seis plantões de sábado de manhã; encontrados %.',v_count; end if;

  update public.internship_evaluations e set status = 'revogada'
  from public.internship_assignments a
  join public.internship_shifts sh on sh.id = a.shift_id
  where e.assignment_id = a.id and e.status = 'aguardando'
    and sh.program_id = v_program_id and sh.status = 'publicado'
    and sh.starts_at = timestamptz '2026-09-26 07:45:00-03';

  -- AR de sábado: preserva os três cadetes e locais, reduz a jornada de 24h
  -- para 12h no turno 19h45–07h45. O histórico da versão antiga é mantido.
  for v_old in
    select sh.*, a.id as assignment_id, a.student_id
    from public.internship_shifts sh
    join public.internship_assignments a on a.shift_id=sh.id and a.status='prevista'
    join public.internship_activity_types act on act.id=sh.activity_type_id
    where sh.program_id=v_program_id and sh.status='publicado'
      and sh.starts_at=timestamptz '2026-09-26 07:45:00-03'
      and act.code='ar'
    order by sh.site_id
  loop
    update public.internship_assignments set status='substituida',
      reason=v_reason where id=v_old.assignment_id;
    update public.internship_shifts set status='cancelado',change_reason=v_reason
      where id=v_old.id;
    insert into public.internship_shifts(
      program_id,activity_type_id,site_id,resource_id,template_id,
      starts_at,ends_at,capacity,status,change_reason
    ) values (
      v_program_id,v_old.activity_type_id,v_old.site_id,v_old.resource_id,v_ar_template,
      timestamptz '2026-09-26 19:45:00-03',timestamptz '2026-09-27 07:45:00-03',
      1,'rascunho',v_reason
    ) returning id into v_new_shift;
    insert into public.internship_assignments(
      shift_id,student_id,assignment_source,reason,replaces_assignment_id
    ) values (v_new_shift,v_old.student_id,'remanejamento',v_reason,v_old.assignment_id);
    -- A publicação administrativa mantém a identidade de quem publicou a
    -- escala original; o motivo e created_by nulo distinguem esta migração.
    update public.internship_shifts set status='publicado',
      published_by=v_old.published_by,published_at=now()
      where id=v_new_shift;
  end loop;

  -- As três USB de 07h45 atravessam o APH. Seus cadetes ficam livres para
  -- a janela de GV, após aula e deslocamento.
  for v_old in
    select sh.id as shift_id,a.id as assignment_id
    from public.internship_shifts sh
    join public.internship_assignments a on a.shift_id=sh.id and a.status='prevista'
    join public.internship_activity_types act on act.id=sh.activity_type_id
    where sh.program_id=v_program_id and sh.status='publicado'
      and sh.starts_at=timestamptz '2026-09-26 07:45:00-03'
      and act.code='usb'
  loop
    update public.internship_assignments set status='cancelada',reason=v_reason
      where id=v_old.assignment_id;
    update public.internship_shifts set status='cancelado',change_reason=v_reason
      where id=v_old.shift_id;
  end loop;

  -- Fernandes cumpre o Aluno de Dia por 24h no domingo. Fredson assume seu AR.
  select a.id into strict v_old_fernandes
  from public.internship_assignments a
  join public.internship_shifts sh on sh.id=a.shift_id
  join public.internship_activity_types act on act.id=sh.activity_type_id
  join public.internship_sites site on site.id=sh.site_id
  join public.students s on s.id=a.student_id
  where sh.program_id=v_program_id and sh.status='publicado'
    and sh.starts_at=timestamptz '2026-09-27 07:45:00-03'
    and act.code='ar' and site.name='1º GBM' and s.war_name='FERNANDES'
    and a.status='prevista';
  select s.id into strict v_fredson from public.students s
  join public.internship_programs p on p.class_id=s.class_id
  where p.id=v_program_id and s.war_name='FREDSON' and s.deleted_at is null
    and s.course_status='matriculado';
  update public.internship_assignments set status='substituida',reason=v_reason
    where id=v_old_fernandes;
  insert into public.internship_assignments(
    shift_id,student_id,assignment_source,reason,replaces_assignment_id
  ) select a.shift_id,v_fredson,'substituicao',v_reason,a.id
    from public.internship_assignments a where a.id=v_old_fernandes;

  select id into strict v_activity_id from public.internship_activity_types
    where program_id=v_program_id and code='guarda_vida' and active;
  for v_date,v_start,v_end,v_names in
    select * from (values
      (date '2026-09-26',timestamptz '2026-09-26 14:00:00-03',
       timestamptz '2026-09-26 18:00:00-03',
       array['V. MARTINS','SABRINA','CAXIAS','J. BORGES','CAROLINA']::text[]),
      (date '2026-09-27',timestamptz '2026-09-27 10:00:00-03',
       timestamptz '2026-09-27 18:00:00-03',
       array['SILVA NUNES','HAMILTON','FREIRE','T. SANTOS','JOAO']::text[])
    ) as days(shift_date,starts_at,ends_at,names)
  loop
    if exists(select 1 from public.internship_operation_plans
      where program_id=v_program_id and code='guarda_vida_'||to_char(v_date,'YYYYMMDD')) then
      raise exception 'Plano de GV para % já cadastrado.',v_date;
    end if;
    insert into public.internship_operation_plans(
      program_id,code,title,status,starts_at,ends_at
    ) values (
      v_program_id,'guarda_vida_'||to_char(v_date,'YYYYMMDD'),
      'Guarda-vida '||to_char(v_date,'DD/MM/YYYY')||' — aguardando documento',
      'reserva',v_start,v_end
    ) returning id into v_plan_id;
    for v_index in 1..5 loop
      select site.id,res.id into strict v_site_id,v_resource_id
      from public.internship_sites site
      join public.internship_resources res on res.site_id=site.id
      where site.program_id=v_program_id and site.code='praia_'||v_index
        and site.active and site.site_type='praia' and res.code='posto'
        and res.active and res.resource_type='posto_guarda_vida';
      select s.id into strict v_student_id from public.students s
      join public.internship_programs p on p.class_id=s.class_id
      where p.id=v_program_id and s.war_name=v_names[v_index]
        and s.deleted_at is null and s.course_status='matriculado';
      insert into public.internship_shifts(
        program_id,activity_type_id,site_id,resource_id,operation_plan_id,
        starts_at,ends_at,capacity,status,change_reason
      ) values (
        v_program_id,v_activity_id,v_site_id,v_resource_id,v_plan_id,
        v_start,v_end,1,'rascunho',
        'Proposta de GV aguardando documento operacional e oficial supervisor.'
      ) returning id into v_new_shift;
      insert into public.internship_assignments(
        shift_id,student_id,assignment_source
      ) values (v_new_shift,v_student_id,'geracao');
    end loop;
  end loop;

  if (select count(*) from public.internship_shifts sh
      where sh.program_id=v_program_id and sh.status='publicado'
        and sh.starts_at>=timestamptz '2026-09-26 00:00:00-03'
        and sh.starts_at<timestamptz '2026-09-28 00:00:00-03')<>12 then
    raise exception 'Contagem de GBM publicado diferente de 12 após replanejamento.';
  end if;
  if (select count(*) from public.internship_shifts sh
      join public.internship_activity_types act on act.id=sh.activity_type_id
      where sh.program_id=v_program_id and sh.status='rascunho'
        and act.code='guarda_vida'
        and sh.starts_at>=timestamptz '2026-09-26 00:00:00-03'
        and sh.starts_at<timestamptz '2026-09-28 00:00:00-03')<>10 then
    raise exception 'Rascunho de GV incompleto.';
  end if;
end $$;
