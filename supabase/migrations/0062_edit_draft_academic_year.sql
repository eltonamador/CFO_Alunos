-- 0062 — Permite corrigir calendário acadêmico enquanto estiver em rascunho.
-- A edição exige revisão e motivo, preservando a trilha de auditoria.

create function public.academic_update_year(
  p_academic_year_id uuid,
  p_starts_on date,
  p_ends_on date,
  p_source_ref text,
  p_expected_revision int,
  p_reason text
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
        revision = revision + 1,
        change_reason = btrim(p_reason)
    where id = p_academic_year_id;

  return p_academic_year_id;
end
$$;

revoke all on function public.academic_update_year(uuid, date, date, text, int, text) from public, anon;
grant execute on function public.academic_update_year(uuid, date, date, text, int, text) to authenticated;
