-- =====================================================================
-- 0024 — Enrollment Status (Matrícula pendente/confirmada)
-- Acrescenta um flag de controle do status da matrícula do aluno.
-- Não obriga preenchimento de enrollment_id; o número segue opcional.
-- =====================================================================

alter table public.students
  add column if not exists enrollment_status text not null default 'pendente';

-- Garante valores válidos. Faz drop/add do constraint para ser idempotente.
alter table public.students
  drop constraint if exists students_enrollment_status_check;

alter table public.students
  add constraint students_enrollment_status_check
  check (enrollment_status in ('pendente','confirmada'));

-- Backfill explícito (registros existentes ficam como pendente até confirmação).
update public.students
  set enrollment_status = 'pendente'
  where enrollment_status is null;

comment on column public.students.enrollment_status is
  'Status da matrícula do aluno: pendente (default) ou confirmada. '
  'Só Coordenação altera. Não está relacionado a enrollment_id, que segue opcional.';
