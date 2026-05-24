-- =====================================================================
-- 0013 — Storage buckets + policies
-- Convenção de path: <bucket>/<student_id>/<arquivo>
-- =====================================================================

-- Buckets privados (todos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-photos', 'student-photos', false, 5242880,
   array['image/jpeg','image/png','image/webp']),
  ('student-documents', 'student-documents', false, 10485760,
   array['image/jpeg','image/png','application/pdf']),
  ('equipment-attachments', 'equipment-attachments', false, 5242880,
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Helper: extrai student_id do primeiro segmento do path
create or replace function public._storage_student_id(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

-- ---------------------------------------------------------------------
-- student-photos: aluno gerencia próprio; coord/secr leem todos;
-- instrutor LÊ (para card)
-- ---------------------------------------------------------------------
create policy "photos: self all"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'student-photos'
    and public._storage_student_id(name) = public.current_student_id()
  )
  with check (
    bucket_id = 'student-photos'
    and public._storage_student_id(name) = public.current_student_id()
  );

create policy "photos: admin all"
  on storage.objects for all to authenticated
  using (bucket_id = 'student-photos' and public.is_admin())
  with check (bucket_id = 'student-photos' and public.is_admin());

create policy "photos: instructor read"
  on storage.objects for select to authenticated
  using (bucket_id = 'student-photos' and public.current_role() = 'instrutor');

-- ---------------------------------------------------------------------
-- student-documents: aluno (próprio) + admin; INSTRUTOR NEGADO
-- ---------------------------------------------------------------------
create policy "docs: self all"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'student-documents'
    and public._storage_student_id(name) = public.current_student_id()
  )
  with check (
    bucket_id = 'student-documents'
    and public._storage_student_id(name) = public.current_student_id()
  );

create policy "docs: admin all"
  on storage.objects for all to authenticated
  using (bucket_id = 'student-documents' and public.is_admin())
  with check (bucket_id = 'student-documents' and public.is_admin());

-- ---------------------------------------------------------------------
-- equipment-attachments: aluno (próprio) + coord
-- ---------------------------------------------------------------------
create policy "eq: self all"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'equipment-attachments'
    and public._storage_student_id(name) = public.current_student_id()
  )
  with check (
    bucket_id = 'equipment-attachments'
    and public._storage_student_id(name) = public.current_student_id()
  );

create policy "eq: coord all"
  on storage.objects for all to authenticated
  using (bucket_id = 'equipment-attachments' and public.is_coord())
  with check (bucket_id = 'equipment-attachments' and public.is_coord());
