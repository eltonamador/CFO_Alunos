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


