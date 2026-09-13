-- A coordenação precisa ler a reserva para que a política de INSERT do
-- Storage valide o caminho do PDF antes da publicação.
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
          d.publication_status = 'published'
          and d.processing_status <> 'superseded'
          and (
            public.schedule_active_role() in ('instrutor', 'secretaria')
            or (public.schedule_active_role() = 'aluno' and exists (
              select 1 from public.students s
              where s.id = public.current_student_id()
                and s.class_id = d.class_id
                and s.deleted_at is null
                and s.course_status = 'matriculado'
            ))
          )
        )
      )
  ), false)
$$;
