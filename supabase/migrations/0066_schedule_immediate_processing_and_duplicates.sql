-- =====================================================================
-- 0066 - Processamento imediato e proteção contra PDF duplicado
--
-- A fila diária continua como contingência. Publicações feitas pela
-- coordenação são processadas no mesmo fluxo da aplicação, e documentos
-- idênticos não podem criar duas versões vigentes por engano.
-- =====================================================================

create or replace function public.schedule_register_document(
  p_class_id uuid, p_schedule_type_id uuid, p_original_filename text,
  p_size_bytes bigint, p_checksum_sha256 text,
  p_period_start date default null, p_period_end date default null,
  p_supersedes_document_id uuid default null
) returns public.schedule_documents
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_previous public.schedule_documents;
  v_document public.schedule_documents;
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente coordenação ativa publica escalas.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.classes where id = p_class_id) then
    raise exception 'Turma não encontrada.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.schedule_types where id = p_schedule_type_id and active) then
    raise exception 'Tipo de escala indisponível.' using errcode = '23514';
  end if;
  if p_original_filename ~ '[/\\]' or p_original_filename like '%..%'
    or lower(p_original_filename) not like '%.pdf' then
    raise exception 'Nome de arquivo PDF inválido.' using errcode = '23514';
  end if;
  if lower(coalesce(p_checksum_sha256, '')) !~ '^[0-9a-f]{64}$' then
    raise exception 'Checksum do PDF inválido.' using errcode = '23514';
  end if;
  if p_period_end is not null and p_period_start is not null and p_period_end < p_period_start then
    raise exception 'A data final não pode ser anterior à inicial.' using errcode = '23514';
  end if;
  if p_supersedes_document_id is not null then
    select * into v_previous from public.schedule_documents where id = p_supersedes_document_id for update;
    if not found or v_previous.publication_status <> 'published'
      or v_previous.processing_status = 'superseded'
      or v_previous.class_id <> p_class_id or v_previous.schedule_type_id <> p_schedule_type_id then
      raise exception 'Versão anterior vigente deve ter a mesma turma e o mesmo tipo.' using errcode = '23514';
    end if;
  end if;
  if exists (
    select 1 from public.schedule_documents d
    where d.class_id = p_class_id
      and d.schedule_type_id = p_schedule_type_id
      and d.checksum_sha256 = lower(p_checksum_sha256)
      and d.publication_status in ('reserved', 'published')
      and d.processing_status <> 'superseded'
  ) and p_supersedes_document_id is null then
    raise exception 'Este PDF já possui uma versão vigente. Se for uma correção, selecione a publicação anterior para substituição.' using errcode = '23505';
  end if;

  insert into public.schedule_documents(
    id, class_id, schedule_type_id, storage_path, original_filename, size_bytes,
    checksum_sha256, period_start, period_end, supersedes_document_id,
    publication_status, published_by, published_at
  ) values (
    v_id, p_class_id, p_schedule_type_id,
    p_class_id::text || '/' || v_id::text || '/document.pdf',
    btrim(p_original_filename), p_size_bytes, lower(p_checksum_sha256),
    p_period_start, p_period_end, p_supersedes_document_id,
    'reserved', auth.uid(), null
  ) returning * into v_document;
  return v_document;
end
$$;

create function public.schedule_claim_processing_run_for_document(
  p_document_id uuid,
  p_parser_revision text
) returns table(
  run_id uuid,
  document_id uuid,
  class_id uuid,
  storage_path text,
  schedule_type_name text,
  period_start date,
  method text,
  attempt integer
)
language plpgsql security definer set search_path = public
as $$
declare v_run_id uuid;
begin
  if length(btrim(coalesce(p_parser_revision, ''))) < 3 then
    raise exception 'Versão do parser inválida.' using errcode = '23514';
  end if;
  select r.id into v_run_id
  from public.schedule_processing_runs r
  join public.schedule_documents d on d.id = r.document_id
  where r.document_id = p_document_id
    and r.status = 'queued'
    and d.publication_status = 'published'
    and d.processing_status <> 'superseded'
  order by r.created_at, r.id
  for update of r skip locked
  limit 1;
  if v_run_id is null then return; end if;

  perform set_config('app.schedule_reason', 'Execução imediata solicitada pela coordenação', true);
  update public.schedule_processing_runs
    set status = 'running', started_at = now(), parser_revision = btrim(p_parser_revision)
    where id = v_run_id;

  return query
  select r.id, r.document_id, d.class_id, d.storage_path, t.name, d.period_start, r.method, r.attempt
  from public.schedule_processing_runs r
  join public.schedule_documents d on d.id = r.document_id
  join public.schedule_types t on t.id = d.schedule_type_id
  where r.id = v_run_id;
end
$$;

create function public.schedule_retire_duplicate_document(
  p_document_id uuid,
  p_reason text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_document public.schedule_documents;
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente coordenação ativa remove uma cópia duplicada da vigência.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Informe o motivo do descarte da cópia duplicada.' using errcode = '23514';
  end if;
  select * into v_document from public.schedule_documents where id = p_document_id for update;
  if not found or v_document.publication_status <> 'published' or v_document.processing_status = 'superseded' then
    raise exception 'Documento vigente não encontrado.' using errcode = '23514';
  end if;
  if exists (select 1 from public.schedule_assignments where document_id = p_document_id and status = 'published') then
    raise exception 'Não é possível descartar uma cópia com atribuições vigentes.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.schedule_documents d
    where d.id <> v_document.id
      and d.class_id = v_document.class_id
      and d.schedule_type_id = v_document.schedule_type_id
      and d.checksum_sha256 = v_document.checksum_sha256
      and d.publication_status = 'published'
      and d.processing_status <> 'superseded'
  ) then
    raise exception 'Não há outra cópia vigente com o mesmo PDF.' using errcode = '23514';
  end if;

  perform set_config('app.schedule_reason', btrim(p_reason), true);
  update public.schedule_processing_runs
    set status = 'failed',
        error_code = 'DOCUMENT_SUPERSEDED',
        error_message = 'Cópia duplicada retirada da vigência.',
        finished_at = now()
    where document_id = v_document.id and status = 'queued';
  update public.schedule_documents set processing_status = 'superseded' where id = v_document.id;
  return v_document.id;
end
$$;

revoke all on function public.schedule_claim_processing_run_for_document(uuid,text) from public, anon, authenticated;
grant execute on function public.schedule_claim_processing_run_for_document(uuid,text) to service_role;
revoke all on function public.schedule_retire_duplicate_document(uuid,text) from public, anon;
grant execute on function public.schedule_retire_duplicate_document(uuid,text) to authenticated;
