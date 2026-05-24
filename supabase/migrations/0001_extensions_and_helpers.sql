-- =====================================================================
-- 0001 — Extensões e funções auxiliares (helpers de role/student)
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Função genérica para manter updated_at atualizado.
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

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
