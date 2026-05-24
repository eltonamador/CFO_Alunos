-- =====================================================================
-- 0007 — Canga assignments
-- =====================================================================

create table public.canga_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  canga_student_id uuid not null references public.students(id) on delete cascade,
  assigned_at date not null default current_date,
  assigned_by uuid not null references auth.users(id),
  is_current boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  check (student_id <> canga_student_id)
);

-- Apenas uma designação atual por aluno
create unique index uniq_canga_current on public.canga_assignments(student_id)
  where is_current = true;

create index idx_canga_student on public.canga_assignments(student_id);
create index idx_canga_history on public.canga_assignments(student_id, assigned_at desc);
