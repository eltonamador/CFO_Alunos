-- Decisão da Coordenação: Sales (Aluno de Dia) e Artur (Apoio 1) assistem
-- ao APH na ABM em sobreaviso da permanência, de 08h a 12h40 de 26/09.
do $$
declare v_roster uuid; v_count integer;
begin
  select r.id into v_roster from public.duty_rosters r
  join public.duty_permanence_services ps on ps.roster_id=r.id
  where r.status='publicada' and ps.location='ABM'
    and ps.starts_at=timestamptz '2026-09-26 06:00:00-03'
    and ps.ends_at=timestamptz '2026-09-26 18:00:00-03';
  if v_roster is null then raise exception 'Permanência de sábado não encontrada.'; end if;
  select count(*) into v_count from public.duty_assignments d
  join public.students s on s.id=d.student_id
  join public.duty_roles role on role.id=d.role_id
  where d.roster_id=v_roster and d.status in ('prevista','confirmada')
    and (s.war_name='SALES' and role.code='aluno_dia'
      or s.war_name='ARTUR' and role.code='apoio_1');
  if v_count<>2 then raise exception 'Sales ou Artur não constam da permanência esperada.'; end if;
  update public.duty_rosters set notes=notes ||
    ' Coordenação confirmou em 24/09/2026: Sales e Artur assistirão à instrução de APH de 26/09, 08h–12h40, na ABM, em sobreaviso da permanência.'
  where id=v_roster and notes not like '%Sales e Artur assistirão à instrução de APH%';
end $$;
