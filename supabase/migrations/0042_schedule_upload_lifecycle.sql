-- =====================================================================
-- 0042 - Ciclo seguro de reserva, upload e publicação da escala
--
-- O Storage exige que o metadado exista antes do INSERT do objeto. Esta
-- migration impede que essa reserva apareça como PDF publicado e só supera a
-- versão anterior depois de confirmar que o arquivo chegou ao bucket.
-- =====================================================================

alter table public.schedule_documents
  add column publication_status text not null default 'reserved'
    check (publication_status in ('reserved','published','upload_failed'));

update public.schedule_documents
set publication_status = 'published'
where published_at is not null;

alter table public.schedule_documents
  alter column published_at drop not null,
  alter column published_at drop default;

create index idx_schedule_documents_publication
  on public.schedule_documents(publication_status, published_at desc);

create or replace function public.schedule_can_read_document(p_document_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(exists (
    select 1
    from public.schedule_documents d
    where d.id = p_document_id
      and (
        public.schedule_active_role() = 'coordenacao'
        or (
          d.publication_status = 'published' and d.published_at is not null
          and (
            public.schedule_active_role() = 'instrutor'
            or (public.schedule_active_role() = 'aluno' and exists (
              select 1 from public.students s
              where s.id = public.current_student_id() and s.class_id = d.class_id and s.deleted_at is null
            ))
          )
        )
      )
  ), false)
$$;

drop trigger schedule_guard on public.schedule_documents;

create function public.schedule_guard_document() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Registros de escala não podem ser excluídos.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.class_id <> old.class_id
      or new.schedule_type_id <> old.schedule_type_id or new.storage_path <> old.storage_path
      or new.original_filename <> old.original_filename or new.mime_type <> old.mime_type
      or new.size_bytes <> old.size_bytes or new.checksum_sha256 <> old.checksum_sha256
      or new.period_start is distinct from old.period_start or new.period_end is distinct from old.period_end
      or new.supersedes_document_id is distinct from old.supersedes_document_id
      or new.published_by <> old.published_by or new.created_at <> old.created_at then
      raise exception 'Documento reservado é imutável; envie uma nova versão.' using errcode = '23514';
    end if;
    if new.publication_status <> old.publication_status and not (
      old.publication_status = 'reserved' and new.publication_status in ('published','upload_failed')
    ) then
      raise exception 'Transição de publicação inválida.' using errcode = '23514';
    end if;
    if new.published_at is distinct from old.published_at and not (
      old.published_at is null and new.published_at is not null
      and old.publication_status = 'reserved' and new.publication_status = 'published'
    ) then
      raise exception 'Data de publicação não pode ser alterada.' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;

create trigger schedule_guard before insert or update or delete on public.schedule_documents
for each row execute function public.schedule_guard_document();

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
    p_class_id::text || '/' || v_id::text || '/' || btrim(p_original_filename),
    btrim(p_original_filename), p_size_bytes, lower(p_checksum_sha256),
    p_period_start, p_period_end, p_supersedes_document_id,
    'reserved', auth.uid(), null
  ) returning * into v_document;
  return v_document;
end
$$;

create function public.schedule_finalize_document(p_document_id uuid) returns public.schedule_documents
language plpgsql security definer set search_path = public
as $$
declare
  v_document public.schedule_documents;
  v_previous public.schedule_documents;
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente coordenação ativa conclui publicações.' using errcode = '42501';
  end if;
  select * into v_document from public.schedule_documents where id = p_document_id for update;
  if not found or v_document.publication_status <> 'reserved' then
    raise exception 'Reserva de documento indisponível.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'schedule-pdfs' and name = v_document.storage_path
  ) then
    raise exception 'O PDF ainda não existe no Storage.' using errcode = '23514';
  end if;
  perform set_config('app.schedule_reason', 'Upload confirmado e PDF publicado', true);
  if v_document.supersedes_document_id is not null then
    select * into v_previous from public.schedule_documents
      where id = v_document.supersedes_document_id for update;
    if not found or v_previous.publication_status <> 'published'
      or v_previous.processing_status = 'superseded' then
      raise exception 'Versão anterior deixou de estar vigente.' using errcode = '40001';
    end if;
    update public.schedule_documents set processing_status = 'superseded'
      where id = v_previous.id;
  end if;
  update public.schedule_documents
    set publication_status = 'published', published_at = now()
    where id = p_document_id returning * into v_document;
  return v_document;
end
$$;

create function public.schedule_fail_upload(p_document_id uuid, p_reason text)
returns public.schedule_documents
language plpgsql security definer set search_path = public
as $$
declare v_document public.schedule_documents;
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente coordenação ativa registra falha de upload.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Informe o motivo da falha.' using errcode = '23514';
  end if;
  perform set_config('app.schedule_reason', btrim(p_reason), true);
  update public.schedule_documents
    set publication_status = 'upload_failed', processing_status = 'failed'
    where id = p_document_id and publication_status = 'reserved'
    returning * into v_document;
  if not found then raise exception 'Reserva de documento indisponível.' using errcode = '23514'; end if;
  return v_document;
end
$$;

create or replace function public.schedule_request_reprocess(p_document_id uuid, p_method text default 'auto') returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_run_id uuid;
  v_attempt integer;
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente coordenação ativa solicita processamento.' using errcode = '42501';
  end if;
  if p_method not in ('auto','native_text','ocr') then
    raise exception 'Método de processamento inválido.' using errcode = '23514';
  end if;
  perform 1 from public.schedule_documents
    where id = p_document_id and publication_status = 'published'
      and processing_status <> 'superseded' for update;
  if not found then raise exception 'Documento publicado indisponível.' using errcode = '23514'; end if;
  select coalesce(max(attempt), 0) + 1 into v_attempt
    from public.schedule_processing_runs where document_id = p_document_id;
  insert into public.schedule_processing_runs(document_id, attempt, method, requested_by)
    values (p_document_id, v_attempt, p_method, auth.uid()) returning id into v_run_id;
  perform set_config('app.schedule_reason', 'Processamento solicitado', true);
  update public.schedule_documents set processing_status = 'processing' where id = p_document_id;
  return v_run_id;
end
$$;

revoke all on function public.schedule_finalize_document(uuid) from public, anon;
revoke all on function public.schedule_fail_upload(uuid,text) from public, anon;
grant execute on function public.schedule_finalize_document(uuid) to authenticated;
grant execute on function public.schedule_fail_upload(uuid,text) to authenticated;

comment on column public.schedule_documents.publication_status is
  'Estado do upload: reserva interna, publicação confirmada no Storage ou falha preservada para auditoria.';
