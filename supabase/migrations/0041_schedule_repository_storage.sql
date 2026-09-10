-- =====================================================================
-- 0041 - Storage privado do repositorio de escalas
-- Convencao: schedule-pdfs/<class_id>/<document_id>/<arquivo.pdf>
-- Limite inicial configuravel: 20 MiB por PDF.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('schedule-pdfs', 'schedule-pdfs', false, 20971520, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- O registro do documento é reservado pela RPC antes do upload. Isso liga
-- cada objeto a uma turma, a um autor e a uma entrada auditada no banco.
create policy "schedule pdfs: authorized read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'schedule-pdfs'
    and exists (
      select 1 from public.schedule_documents d
      where d.storage_path = name and public.schedule_can_read_document(d.id)
    )
  );

create policy "schedule pdfs: coord insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'schedule-pdfs'
    and public.schedule_active_role() = 'coordenacao'
    and exists (
      select 1 from public.schedule_documents d
      where d.storage_path = name and d.published_by = auth.uid()
    )
  );

-- Sem policies de UPDATE/DELETE: uma correção cria um novo documento e o
-- objeto original permanece disponível para auditoria e histórico.
