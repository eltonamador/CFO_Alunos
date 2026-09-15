-- =====================================================================
-- 0065 — KPIs da Coordenação em uma única RPC
-- SECURITY INVOKER + guarda explícita de Coordenação: não amplia acesso
-- aos dados sensíveis e deixa as políticas RLS como fonte de autorização.
-- =====================================================================

create or replace function public.coordination_dashboard_summary()
returns table (
  total_students integer,
  completed_profiles integer,
  documents_validated integer,
  open_pending_items integer,
  students_with_documents integer,
  students_quarantine_equipment integer,
  students_equipment_completed integer,
  students_without_canga integer,
  pending_health_validations integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with active_students as (
    select
      s.id, s.sex, s.cpf, s.rg, s.birth_date, s.marital_status, s.mother_name, s.education_level,
      contacts.whatsapp, contacts.email_personal,
      address.street, address.city, address.zip, address.state,
      health.blood_type, health.validation_status,
      health.has_allergies, health.has_continuous_medication, health.has_chronic_disease,
      health.has_physical_restriction, health.has_dietary_restriction,
      emergency.id as emergency_contact_id,
      logistics.student_id as logistics_student_id,
      vehicle.student_id as vehicle_student_id,
      vehicle.has_cnh
    from public.students s
    left join public.student_contacts contacts on contacts.student_id = s.id
    left join public.student_addresses address on address.student_id = s.id
    left join public.health_restrictions health on health.student_id = s.id
    left join public.emergency_contacts emergency
      on emergency.student_id = s.id and emergency.priority = 1
    left join public.student_logistics logistics on logistics.student_id = s.id
    left join public.vehicles vehicle on vehicle.student_id = s.id
    where s.deleted_at is null and s.course_status = 'matriculado'
  ),
  profile_totals as (
    select
      count(*)::integer as total_students,
      count(*) filter (where
        cpf is not null and rg is not null and birth_date is not null and marital_status is not null
        and mother_name is not null and sex is not null and education_level is not null
        and whatsapp is not null and email_personal is not null
        and street is not null and city is not null and zip is not null and state is not null
        and blood_type is not null and emergency_contact_id is not null
        and logistics_student_id is not null and vehicle_student_id is not null
      )::integer as completed_profiles,
      count(*) filter (where validation_status = 'pendente')::integer as pending_health_validations
    from active_students
  ),
  document_totals as (
    select
      count(*) filter (where d.status = 'validado')::integer as documents_validated
    from public.documents d
    join active_students s on s.id = d.student_id
  ),
  students_with_documents as (
    select count(*)::integer as value
    from active_students s
    where not exists (
      select 1
      from (values
        ('rg_cpf'::text),
        ('comprovante_residencia'::text),
        ('foto_3x4'::text)
      ) required(doc_type)
      where not exists (
        select 1 from public.documents d
        where d.student_id = s.id and d.doc_type = required.doc_type and d.status <> 'recusado'
      )
    )
    and (
      not coalesce(s.has_cnh, false)
      or exists (
        select 1 from public.documents d
        where d.student_id = s.id and d.doc_type = 'cnh' and d.status <> 'recusado'
      )
    )
    and (
      not (
        coalesce(s.has_allergies, false) or coalesce(s.has_continuous_medication, false)
        or coalesce(s.has_chronic_disease, false) or coalesce(s.has_physical_restriction, false)
        or coalesce(s.has_dietary_restriction, false)
      )
      or exists (
        select 1 from public.documents d
        where d.student_id = s.id and d.doc_type = 'declaracao_medica' and d.status <> 'recusado'
      )
    )
  ),
  applicable_equipment as (
    select s.id as student_id, r.id as requirement_id, r.phase
    from active_students s
    join public.equipment_requirements r on r.active and r.mandatory
    where r.applicability in ('todos', 'condicional')
      or (s.sex = 'M' and r.applicability = 'masculino')
      or (s.sex = 'F' and r.applicability = 'feminino')
  ),
  equipment_completion as (
    select
      required.student_id,
      count(*) filter (where required.phase = 'quarentena') > 0
        and bool_and(coalesce(status.status in ('ok', 'comprado', 'nao_se_aplica'), false))
          filter (where required.phase = 'quarentena') as quarantine_complete,
      count(*) filter (where required.phase <> 'posterior') > 0
        and bool_and(coalesce(status.status in ('ok', 'comprado', 'nao_se_aplica'), false))
          filter (where required.phase <> 'posterior') as general_complete
    from applicable_equipment required
    left join public.student_equipment_status status
      on status.student_id = required.student_id and status.requirement_id = required.requirement_id
    group by required.student_id
  ),
  equipment_totals as (
    select
      count(*) filter (where quarantine_complete)::integer as students_quarantine_equipment,
      count(*) filter (where general_complete)::integer as students_equipment_completed
    from equipment_completion
  ),
  pending_totals as (
    select (
      (select count(*) from public.pending_changes p join active_students s on s.id = p.student_id where p.status = 'pendente')
      + (select count(*) from public.documents d join active_students s on s.id = d.student_id where d.status in ('enviado', 'em_analise'))
      + (select count(*) from public.student_equipment_status status join active_students s on s.id = status.student_id where status.status = 'comprado' and status.validation_status = 'nao_validado')
    )::integer as open_pending_items
  ),
  canga_totals as (
    select count(*)::integer as students_without_canga
    from active_students s
    where not exists (
      select 1 from public.canga_assignments c where c.student_id = s.id and c.is_current
    )
  )
  select
    profiles.total_students,
    profiles.completed_profiles,
    documents.documents_validated,
    pending.open_pending_items,
    required_documents.value as students_with_documents,
    equipment.students_quarantine_equipment,
    equipment.students_equipment_completed,
    canga.students_without_canga,
    profiles.pending_health_validations
  from profile_totals profiles
  cross join document_totals documents
  cross join students_with_documents required_documents
  cross join equipment_totals equipment
  cross join pending_totals pending
  cross join canga_totals canga
  where public.is_coord();
$$;

revoke execute on function public.coordination_dashboard_summary() from public;
grant execute on function public.coordination_dashboard_summary() to authenticated;
