-- =====================================================================
-- 0003 — Course Management: courses, classes
-- =====================================================================

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  year int not null,
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  name text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  unique (course_id, name)
);

comment on table public.courses is 'Cursos (CFO 2026, CFO 2027, ...)';
comment on table public.classes is 'Turmas dentro de um curso';
