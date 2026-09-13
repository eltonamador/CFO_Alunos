-- =====================================================================
-- 0046 — Preserva a participante desligada como registro histórico
-- =====================================================================

-- A aluna 27 deixou o CFO no início do curso. O cadastro permanece para
-- auditoria e histórico, mas não deve ser tratado como efetivo operacional.
update public.students
set
  course_status = 'excluido',
  situation = 'desligado',
  coordination_notes = case
    when coalesce(coordination_notes, '') ilike '%registro histórico%'
      then coordination_notes
    when nullif(trim(coordination_notes), '') is null
      then 'Registro histórico: participante no início do CFO 2026.1; desligada a pedido durante a quarentena.'
    else coordination_notes || E'\nRegistro histórico: participante no início do CFO 2026.1; desligada a pedido durante a quarentena.'
  end
where student_number = 27
  and upper(war_name) = 'MILENA'
  and deleted_at is null;

-- Desativa apenas designações atuais envolvendo a ex-participante. As linhas
-- permanecem na tabela para preservar o histórico das cangas.
update public.canga_assignments ca
set is_current = false
where ca.is_current = true
  and (
    ca.student_id in (
      select s.id from public.students s
      where s.student_number = 27 and upper(s.war_name) = 'MILENA'
    )
    or ca.canga_student_id in (
      select s.id from public.students s
      where s.student_number = 27 and upper(s.war_name) = 'MILENA'
    )
  );

comment on column public.students.course_status is
  'Situacao estruturada do cadete no curso. Registros excluidos permanecem para historico e ficam fora do escopo operacional.';

-- As views sao recriadas aqui porque a migration original ja pode ter sido
-- aplicada em ambientes existentes.
create or replace view public.v_student_card_instructor as
select
  s.id,
  s.class_id,
  s.student_number,
  s.war_name,
  s.full_name,
  s.pelotao,
  s.photo_path,
  c.whatsapp,
  c.email_institutional,
  case when a.from_other_state is true then 'outro_estado' else 'amapa' end as origin_label,
  (v.has_vehicle is true) as has_vehicle,
  exists (
    select 1 from public.health_restrictions h
    where h.student_id = s.id
      and h.validation_status = 'validado'
      and h.operational_summary is not null
  ) as has_restriction,
  (
    select operational_summary from public.health_restrictions h
    where h.student_id = s.id and h.validation_status = 'validado'
  ) as operational_summary,
  (
    select cs.war_name from public.canga_assignments ca
    join public.students cs on cs.id = ca.canga_student_id
    where ca.student_id = s.id and ca.is_current = true
  ) as canga_war_name,
  (
    select cs.student_number from public.canga_assignments ca
    join public.students cs on cs.id = ca.canga_student_id
    where ca.student_id = s.id and ca.is_current = true
  ) as canga_number
from public.students s
left join public.student_contacts c on c.student_id = s.id
left join public.student_addresses a on a.student_id = s.id
left join public.vehicles v on v.student_id = s.id
where s.deleted_at is null
  and s.course_status = 'matriculado';

create or replace view public.v_student_class_basic as
select
  s.id,
  s.class_id,
  s.student_number,
  s.war_name,
  s.pelotao,
  s.photo_path
from public.students s
where s.deleted_at is null
  and s.course_status = 'matriculado';
