-- =====================================================================
-- 0057 - Chaves seguras para PDFs no Storage
--
-- O nome original permanece no banco para exibição e download. A chave
-- interna usa somente caracteres ASCII, pois o Storage rejeita alguns
-- nomes recebidos pelo WhatsApp, como arquivos com "º" e acentuação.
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
  if p_supersedes_document_id is not null then
    select * into v_previous from public.schedule_documents where id = p_supersedes_document_id;
    if not found or v_previous.publication_status <> 'published'
      or v_previous.processing_status = 'superseded'
      or v_previous.class_id <> p_class_id or v_previous.schedule_type_id <> p_schedule_type_id then
      raise exception 'Versão anterior vigente deve ter a mesma turma e o mesmo tipo.' using errcode = '23514';
    end if;
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

revoke all on function public.schedule_register_document(uuid,uuid,text,bigint,text,date,date,uuid) from public, anon;
grant execute on function public.schedule_register_document(uuid,uuid,text,bigint,text,date,date,uuid) to authenticated;
