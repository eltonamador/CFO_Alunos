-- =====================================================================
-- 0064 — Resumo do painel do aluno em uma única RPC
--
-- A função é SECURITY INVOKER: cada SELECT continua submetido às políticas
-- RLS da sessão. O aluno não informa nem recebe um student_id arbitrário.
-- =====================================================================

create or replace function public.student_dashboard_summary()
returns table (
  profile_completion_percent integer,
  documents_completion_percent integer,
  quarantine_equipment_completion_percent integer,
  equipment_completion_percent integer,
  missing_document_types text[],
  pending_quarantine_equipment integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with student as (
    select
      s.id,
      s.cpf,
      s.rg,
      s.birth_date,
      s.marital_status,
      s.mother_name,
      s.sex,
      s.education_level,
      c.whatsapp,
      c.email_personal,
      a.street,
      a.city,
      a.zip,
      a.state,
      h.student_id as health_student_id,
      h.blood_type,
      emergency.id as emergency_contact_id,
      logistics.student_id as logistics_student_id,
      vehicle.student_id as vehicle_student_id
    from public.students s
    left join public.student_contacts c on c.student_id = s.id
    left join public.student_addresses a on a.student_id = s.id
    left join public.health_restrictions h on h.student_id = s.id
    left join public.emergency_contacts emergency
      on emergency.student_id = s.id and emergency.priority = 1
    left join public.student_logistics logistics on logistics.student_id = s.id
    left join public.vehicles vehicle on vehicle.student_id = s.id
    where s.id = public.current_student_id()
  ),
  documents_uploaded as (
    select distinct d.doc_type
    from public.documents d
    where d.student_id = public.current_student_id()
      and d.status <> 'recusado'
  ),
  required_documents (ordinal, doc_type) as (
    values
      (1, 'rg_cpf'::text),
      (2, 'cnh'::text),
      (3, 'comprovante_residencia'::text),
      (4, 'foto_3x4'::text),
      (5, 'declaracao_medica'::text)
  ),
  equipment as (
    select
      r.phase,
      r.mandatory,
      status.status
    from public.equipment_requirements r
    left join public.student_equipment_status status
      on status.requirement_id = r.id
      and status.student_id = public.current_student_id()
    where r.active = true
  ),
  equipment_totals as (
    select
      count(*) filter (where phase = 'quarentena') as quarantine_total,
      count(*) filter (
        where phase = 'quarentena'
          and status in ('ok', 'comprado', 'nao_se_aplica')
      ) as quarantine_done,
      count(*) as total,
      count(*) filter (where status in ('ok', 'comprado', 'nao_se_aplica')) as done,
      count(*) filter (
        where phase = 'quarentena'
          and mandatory
          and coalesce(status not in ('ok', 'comprado', 'nao_se_aplica'), true)
      ) as pending_quarantine
    from equipment
  )
  select
    round(
      100.0 * (
        (s.cpf is not null)::int +
        (s.rg is not null)::int +
        (s.birth_date is not null)::int +
        (s.marital_status is not null)::int +
        (s.mother_name is not null)::int +
        (s.sex is not null)::int +
        (s.education_level is not null)::int +
        (s.whatsapp is not null)::int +
        (s.email_personal is not null)::int +
        (s.street is not null)::int +
        (s.city is not null)::int +
        (s.zip is not null)::int +
        (s.state is not null)::int +
        (s.health_student_id is not null)::int +
        (s.blood_type is not null)::int +
        (s.emergency_contact_id is not null)::int +
        (s.logistics_student_id is not null)::int +
        (s.vehicle_student_id is not null)::int
      ) / 18.0
    )::integer as profile_completion_percent,
    round(100.0 * count(uploaded.doc_type) / 5.0)::integer as documents_completion_percent,
    case
      when totals.quarantine_total = 0 then 0
      else round(100.0 * totals.quarantine_done / totals.quarantine_total)::integer
    end as quarantine_equipment_completion_percent,
    case
      when totals.total = 0 then 0
      else round(100.0 * totals.done / totals.total)::integer
    end as equipment_completion_percent,
    coalesce(
      array_agg(required.doc_type order by required.ordinal)
        filter (where uploaded.doc_type is null),
      '{}'::text[]
    ) as missing_document_types,
    totals.pending_quarantine::integer as pending_quarantine_equipment
  from student s
  cross join equipment_totals totals
  cross join required_documents required
  left join documents_uploaded uploaded on uploaded.doc_type = required.doc_type
  group by
    s.cpf, s.rg, s.birth_date, s.marital_status, s.mother_name, s.sex, s.education_level,
    s.whatsapp, s.email_personal, s.street, s.city, s.zip, s.state,
    s.health_student_id, s.blood_type, s.emergency_contact_id,
    s.logistics_student_id, s.vehicle_student_id,
    totals.quarantine_total, totals.quarantine_done, totals.total, totals.done,
    totals.pending_quarantine;
$$;

revoke execute on function public.student_dashboard_summary() from public;
grant execute on function public.student_dashboard_summary() to authenticated;
