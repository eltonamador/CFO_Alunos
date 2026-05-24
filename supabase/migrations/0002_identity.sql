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

-- ---------------------------------------------------------------------
-- current_role(): retorna a role do usuário autenticado.
-- Usada por todas as policies de RLS. SECURITY DEFINER para
-- evitar recursão nas policies da própria tabela `profiles`.
-- ---------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- current_student_id(): retorna o student_id vinculado ao usuário
-- (apenas para role='aluno').
-- ---------------------------------------------------------------------
create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select student_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- is_admin(): atalho — Coordenação OU Secretaria.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('coordenacao','secretaria'), false);
$$;

create or replace function public.is_coord()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'coordenacao', false);
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create index idx_profiles_role on public.profiles(role) where active = true;
create unique index uniq_profiles_student_id on public.profiles(student_id)
  where student_id is not null;

comment on table public.profiles is
  'Perfis vinculados a auth.users. role=aluno tem student_id 1:1; demais não.';
