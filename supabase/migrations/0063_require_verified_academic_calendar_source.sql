-- 0063 — Impede a abertura de calendário acadêmico sem referência oficial conferida.

alter table public.academic_years
  add column source_verified boolean not null default false;

-- Mantém compatibilidade com clientes anteriores, mas eles só podem criar rascunhos.
create or replace function public.academic_create_year(
  p_course_id uuid, p_year int, p_starts_on date, p_ends_on date, p_source_ref text,
  p_status text default 'open'
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação cria ano letivo.' using errcode = '42501';
  end if;
  if p_status not in ('draft','open') then
    raise exception 'Situação inicial do ano letivo inválida.' using errcode = '23514';
  end if;
  if p_status = 'open' then
    raise exception 'Confirme a referência oficial antes de abrir o ano letivo.' using errcode = '23514';
  end if;
  perform set_config('app.academic_journal_write', 'true', true);
  insert into public.academic_years(course_id, year, starts_on, ends_on, status, source_ref, source_verified)
    values (p_course_id, p_year, p_starts_on, p_ends_on, 'draft', btrim(p_source_ref), false)
    returning id into v_id;
  return v_id;
end
$$;

create function public.academic_create_year(
  p_course_id uuid, p_year int, p_starts_on date, p_ends_on date, p_source_ref text,
  p_status text, p_source_verified boolean
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação cria ano letivo.' using errcode = '42501';
  end if;
  if p_status not in ('draft','open') then
    raise exception 'Situação inicial do ano letivo inválida.' using errcode = '23514';
  end if;
  if p_status = 'open' and not p_source_verified then
    raise exception 'Confirme a referência oficial antes de abrir o ano letivo.' using errcode = '23514';
  end if;
  perform set_config('app.academic_journal_write', 'true', true);
  insert into public.academic_years(course_id, year, starts_on, ends_on, status, source_ref, source_verified)
    values (p_course_id, p_year, p_starts_on, p_ends_on, p_status, btrim(p_source_ref), p_source_verified)
    returning id into v_id;
  return v_id;
end
$$;

create function public.academic_update_year(
  p_academic_year_id uuid,
  p_starts_on date,
  p_ends_on date,
  p_source_ref text,
  p_expected_revision int,
  p_reason text,
  p_source_verified boolean
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_year public.academic_years;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação altera o ano letivo.' using errcode = '42501';
  end if;
  if p_starts_on > p_ends_on then
    raise exception 'O término deve ser posterior ao início.' using errcode = '23514';
  end if;
  if length(btrim(coalesce(p_source_ref, ''))) < 5 or length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Informe a referência e o motivo da atualização.' using errcode = '23514';
  end if;
  select * into v_year from public.academic_years where id = p_academic_year_id for update;
  if not found or v_year.status <> 'draft' then
    raise exception 'Somente ano letivo em rascunho pode ser alterado.' using errcode = '23514';
  end if;
  if p_expected_revision <> v_year.revision then
    raise exception 'Ano letivo mudou; atualize antes de salvar.' using errcode = '40001';
  end if;
  perform set_config('app.academic_journal_write', 'true', true);
  update public.academic_years
    set starts_on = p_starts_on,
        ends_on = p_ends_on,
        source_ref = btrim(p_source_ref),
        source_verified = p_source_verified,
        revision = revision + 1,
        change_reason = btrim(p_reason)
    where id = p_academic_year_id;
  return p_academic_year_id;
end
$$;

create or replace function public.academic_open_year(p_academic_year_id uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_year public.academic_years;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação abre ano letivo.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason,''))) < 5 then
    raise exception 'Informe o motivo da abertura.' using errcode = '23514';
  end if;
  select * into v_year from public.academic_years where id = p_academic_year_id for update;
  if not found or v_year.status <> 'draft' then
    raise exception 'Ano letivo em rascunho não encontrado.' using errcode = '23514';
  end if;
  if not v_year.source_verified then
    raise exception 'Confirme a referência oficial antes de abrir o ano letivo.' using errcode = '23514';
  end if;
  perform set_config('app.academic_journal_write', 'true', true);
  update public.academic_years
    set status = 'open', revision = revision + 1, change_reason = btrim(p_reason)
    where id = p_academic_year_id;
  return p_academic_year_id;
end
$$;

revoke all on function public.academic_create_year(uuid, int, date, date, text, text, boolean) from public, anon;
revoke all on function public.academic_update_year(uuid, date, date, text, int, text, boolean) from public, anon;
grant execute on function public.academic_create_year(uuid, int, date, date, text, text, boolean) to authenticated;
grant execute on function public.academic_update_year(uuid, date, date, text, int, text, boolean) to authenticated;
