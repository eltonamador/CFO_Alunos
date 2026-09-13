-- Identidades oficiais usadas somente para vincular, com segurança, o nome
-- abreviado que aparece na escala ODA a uma conta individual já existente.
alter table public.cfo_coordination_members add column service_alias text;
update public.cfo_coordination_members
set service_alias = source.alias
from (values
  ('1175742', 'MAJ MÁRCIO COSTA'),
  ('1195506', 'CAP AMADOR'),
  ('1195867', 'CAP JOSIANE'),
  ('1195808', 'CAP NAHUM'),
  ('943894', 'TEN CECÍLIA')
) as source(registration, alias)
where cfo_coordination_members.registration = source.registration;
create unique index uniq_cfo_coordination_service_alias
  on public.cfo_coordination_members(lower(service_alias)) where service_alias is not null;

-- As linhas extraídas do PDF permanecem vinculadas à tentativa de leitura.
-- Uma nova tentativa preserva a anterior; somente a última bem-sucedida é
-- exibida no painel.
create table public.schedule_officer_assignments (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.schedule_processing_runs(id) on delete restrict,
  document_id uuid not null references public.schedule_documents(id) on delete restrict,
  sequence integer not null check (sequence > 0),
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null check (length(btrim(display_name)) > 0),
  duty_date date not null,
  duty_function text not null check (length(btrim(duty_function)) > 0),
  shift text not null check (shift in ('manha','tarde','noite','diurno','noturno')),
  starts_at time not null,
  ends_at time not null,
  source_line text not null,
  created_at timestamptz not null default now(),
  unique (run_id, sequence)
);
create index idx_schedule_officer_dashboard
  on public.schedule_officer_assignments(duty_date, profile_id);

create or replace function public.schedule_can_read_document(p_document_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(exists (
    select 1
    from public.schedule_documents d
    where d.id = p_document_id
      and d.publication_status = 'published'
      and d.processing_status <> 'superseded'
      and (
        public.schedule_active_role() in ('coordenacao','instrutor','secretaria')
        or (public.schedule_active_role() = 'aluno' and exists (
          select 1 from public.students s
          where s.id = public.current_student_id()
            and s.class_id = d.class_id
            and s.deleted_at is null
            and s.course_status = 'matriculado'
        ))
      )
  ), false)
$$;

create function public.schedule_is_current_officer_run(p_document_id uuid, p_run_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select p_run_id = (
    select r.id
    from public.schedule_processing_runs r
    where r.document_id = p_document_id and r.status in ('succeeded','partial')
    order by r.attempt desc limit 1
  )
$$;
revoke all on function public.schedule_is_current_officer_run(uuid,uuid) from public, anon;
grant execute on function public.schedule_is_current_officer_run(uuid,uuid) to authenticated;

alter table public.schedule_officer_assignments enable row level security;
revoke all on public.schedule_officer_assignments from public, anon, authenticated;
grant select on public.schedule_officer_assignments to authenticated;
create policy schedule_officer_assignments_read
  on public.schedule_officer_assignments for select to authenticated
  using (
    public.schedule_can_read_document(document_id)
    and public.schedule_is_current_officer_run(document_id, run_id)
  );
