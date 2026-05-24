-- =====================================================================
-- 0002 — Identity & Access: profiles
-- =====================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('coordenacao','secretaria','instrutor','aluno')),
  full_name text not null,
  active boolean not null default true,
  student_id uuid null, -- FK adicionado depois (após students)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create index idx_profiles_role on public.profiles(role) where active = true;
create unique index uniq_profiles_student_id on public.profiles(student_id)
  where student_id is not null;

comment on table public.profiles is
  'Perfis vinculados a auth.users. role=aluno tem student_id 1:1; demais não.';
