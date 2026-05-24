-- =====================================================================
-- 0011 — Views (projeções LGPD-safe)
-- =====================================================================

-- View do card do Instrutor — campos operacionais APENAS.
-- NÃO inclui: CPF, RG, PIS, naturalidade detalhada, mãe/pai, dados clínicos.
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
where s.deleted_at is null;

comment on view public.v_student_card_instructor is
  'Projeção LGPD-safe para Instrutor. Não expõe CPF/RG/clínico/mãe/pai.';

-- View básica da turma para o Aluno — sem contatos.
create or replace view public.v_student_class_basic as
select
  s.id,
  s.class_id,
  s.student_number,
  s.war_name,
  s.pelotao,
  s.photo_path
from public.students s
where s.deleted_at is null;

comment on view public.v_student_class_basic is
  'Lista básica da turma para o Aluno. Sem contatos nem sensíveis.';

-- View "tem restrição? sim/não" para a Secretaria
create or replace view public.v_health_indicator_secretaria as
select
  h.student_id,
  (h.allergies is not null
    or h.continuous_medication is not null
    or h.chronic_disease is not null
    or h.physical_restriction is not null
    or h.dietary_restriction is not null) as has_restriction,
  h.validation_status
from public.health_restrictions h;
