-- Correção de escalas já emitidas e reinício da numeração oficial em 01.
-- Correção sem retificação: escala ainda não divulgada; mantém o número e sai sem marca.
-- Retificação: escala já divulgada; mantém o número e registra RETIFICAÇÃO nº N no PDF.
-- Descarte: emissão feita por engano; o número volta a ficar disponível.
alter table public.internship_scale_revisions
  add column rectification integer check (rectification > 0);
update public.internship_scale_revisions set rectification = revision where revision > 0;

-- Números descartados deixam de ocupar a sequência: a próxima emissão usa o menor livre.
create or replace function public.internship_issue_scale_number(
  p_program_id uuid,
  p_service text,
  p_period_start date,
  p_period_end date,
  p_gbm_site_id uuid default null,
  p_source_roster_id uuid default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_year integer;
  v_number integer;
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do estágio.' using errcode = '42501';
  end if;
  if p_service not in ('estagio', 'todos', 'gbm', 'praia', 'permanencia')
    or p_period_start is null or p_period_end is null or p_period_end < p_period_start
    or (p_gbm_site_id is not null and p_service <> 'gbm')
    or (p_source_roster_id is not null and p_service <> 'permanencia') then
    raise exception 'Dados inválidos para numerar a escala.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.internship_programs
    where id = p_program_id and status = 'publicado'
  ) then
    raise exception 'Programa de estágio indisponível.' using errcode = '23514';
  end if;
  if p_gbm_site_id is not null and not exists (
    select 1 from public.internship_sites
    where id = p_gbm_site_id and program_id = p_program_id and site_type = 'gbm'
  ) then
    raise exception 'GBM inválido para esta escala.' using errcode = '23514';
  end if;
  if p_source_roster_id is not null and not exists (
    select 1 from public.duty_permanence_services ps
    join public.duty_rosters r on r.id = ps.roster_id
    join public.internship_programs p on p.class_id = r.class_id
    where ps.roster_id = p_source_roster_id and p.id = p_program_id
  ) then
    raise exception 'Permanência inválida para esta escala.' using errcode = '23514';
  end if;

  v_year := extract(year from p_period_start)::integer;
  perform pg_advisory_xact_lock(hashtext('internship-scale-number:' || p_program_id || ':' || v_year));
  select sequence_number into v_number
    from public.internship_scale_numbers
    where voided_at is null and program_id = p_program_id and service = p_service
      and period_start = p_period_start and period_end = p_period_end
      and gbm_site_id is not distinct from p_gbm_site_id
      and source_roster_id is not distinct from p_source_roster_id;
  if found then return v_number; end if;

  select min(candidate) into v_number
    from generate_series(1, (
      select count(*)::integer + 1 from public.internship_scale_numbers
      where voided_at is null and program_id = p_program_id and sequence_year = v_year
    )) candidate
    where not exists (
      select 1 from public.internship_scale_numbers n
      where n.voided_at is null and n.program_id = p_program_id
        and n.sequence_year = v_year and n.sequence_number = candidate
    );
  insert into public.internship_scale_numbers (
    program_id, sequence_year, sequence_number, service,
    gbm_site_id, source_roster_id, period_start, period_end, issued_by
  ) values (
    p_program_id, v_year, v_number, p_service,
    p_gbm_site_id, p_source_roster_id, p_period_start, p_period_end, auth.uid()
  );
  return v_number;
end;
$$;

revoke all on function public.internship_issue_scale_number(uuid,text,date,date,uuid,uuid) from public, anon;
grant execute on function public.internship_issue_scale_number(uuid,text,date,date,uuid,uuid) to authenticated;

drop function public.internship_archive_scale_revision(uuid,integer,jsonb,text,text,timestamptz);

-- p_mode: 'automatica' (download com dados vigentes), 'correcao' ou 'retificacao' (ação explícita).
-- p_rectification confirma a numeração impressa no PDF gerado pelo servidor.
create function public.internship_archive_scale_version(
  p_scale_number_id uuid, p_expected_revision integer, p_snapshot jsonb,
  p_summary text, p_pdf_base64 text, p_issued_at timestamptz,
  p_mode text, p_rectification integer
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  latest public.internship_scale_revisions;
  number public.internship_scale_numbers;
  v_rectification integer;
  result uuid;
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do estágio.' using errcode = '42501';
  end if;
  if p_mode is null or p_mode not in ('automatica', 'correcao', 'retificacao') then
    raise exception 'Versão da escala inválida.' using errcode = '23514';
  end if;
  select * into strict number from public.internship_scale_numbers where id = p_scale_number_id for update;
  if number.voided_at is not null then
    raise exception 'Emissão desconsiderada. Gere o PDF atual.' using errcode = '23514';
  end if;
  select * into latest from public.internship_scale_revisions
    where scale_number_id = p_scale_number_id order by revision desc limit 1;
  if p_mode = 'automatica' and latest.id is not null and latest.snapshot = p_snapshot then
    return latest.id;
  end if;
  if coalesce(latest.revision, -1) is distinct from p_expected_revision then
    raise exception 'A escala foi atualizada durante a emissão. Tente novamente.' using errcode = '40001';
  end if;
  if p_mode <> 'automatica' and latest.id is null then
    raise exception 'Emita a escala antes de corrigi-la.' using errcode = '23514';
  end if;
  v_rectification := case
    when latest.id is null or p_mode = 'correcao' then null
    else coalesce(latest.rectification, 0) + 1
  end;
  if p_rectification is distinct from v_rectification then
    raise exception 'A escala foi atualizada durante a emissão. Tente novamente.' using errcode = '40001';
  end if;
  if (p_mode <> 'automatica' and length(btrim(coalesce(p_summary, ''))) < 5)
    or p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object'
    or p_snapshot->>'programId' is distinct from number.program_id::text
    or p_snapshot->>'service' is distinct from number.service
    or p_snapshot->>'periodStart' is distinct from number.period_start::text
    or p_snapshot->>'periodEnd' is distinct from number.period_end::text
    or coalesce(jsonb_typeof(p_snapshot->'rows'), '') <> 'array'
    or p_snapshot->>'signatory' not in ('coordenador', 'supervisor')
    or p_snapshot->>'signatory' is null
    or p_issued_at is null or abs(extract(epoch from now() - p_issued_at)) > 300
    or p_pdf_base64 is null or left(p_pdf_base64, 7) <> 'JVBERi0' then
    raise exception 'Versão da escala inválida.' using errcode = '23514';
  end if;
  insert into public.internship_scale_revisions(
    scale_number_id, revision, rectification, snapshot, change_summary, pdf_base64, issued_at, issued_by
  ) values (
    p_scale_number_id, coalesce(latest.revision, -1) + 1, v_rectification, p_snapshot,
    btrim(p_summary), p_pdf_base64, p_issued_at, auth.uid()
  ) returning id into result;
  return result;
end $$;
revoke all on function public.internship_archive_scale_version(uuid,integer,jsonb,text,text,timestamptz,text,integer) from public, anon;
grant execute on function public.internship_archive_scale_version(uuid,integer,jsonb,text,text,timestamptz,text,integer) to authenticated;

-- Descarta emissão não divulgada. Arquivos e auditoria permanecem; o número é liberado.
create function public.internship_void_scale_number(p_scale_number_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  number public.internship_scale_numbers;
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do estágio.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) not between 5 and 300 then
    raise exception 'Informe o motivo do descarte.' using errcode = '23514';
  end if;
  select * into number from public.internship_scale_numbers where id = p_scale_number_id for update;
  if not found or number.voided_at is not null then
    raise exception 'Escala indisponível para descarte.' using errcode = '23514';
  end if;
  update public.internship_scale_numbers
    set voided_at = now(), void_reason = btrim(p_reason)
    where id = p_scale_number_id;
end $$;
revoke all on function public.internship_void_scale_number(uuid,text) from public, anon;
grant execute on function public.internship_void_scale_number(uuid,text) to authenticated;

-- Emissões até esta implantação foram testes, conforme a Coordenação. A escala oficial começa em 01.
update public.internship_scale_numbers
  set voided_at = now(),
      void_reason = 'Reinício autorizado pela Coordenação em 25/09/2026: emissões anteriores foram testes; a numeração oficial começa em 01.'
  where voided_at is null;

notify pgrst, 'reload schema';
