-- =====================================================================
-- 0045 - Correção, cancelamento e histórico das atribuições
-- =====================================================================

create or replace function public.schedule_finalize_document(p_document_id uuid)
returns public.schedule_documents
language plpgsql security definer set search_path = public
as $$
declare
  v_document public.schedule_documents;
  v_previous public.schedule_documents;
  v_assignment public.schedule_assignments;
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

    for v_assignment in
      update public.schedule_assignments
        set status = 'superseded',
            correction_reason = 'Documento substituído por nova versão: ' || p_document_id::text
        where document_id = v_previous.id and status = 'published'
        returning *
    loop
      insert into public.schedule_notification_events(
        assignment_id, student_id, event_type, idempotency_key, payload
      ) values (
        v_assignment.id, v_assignment.student_id, 'assignment_cancelled',
        'schedule:' || v_assignment.id::text || ':superseded:' || p_document_id::text,
        jsonb_build_object(
          'documentId', v_previous.id,
          'replacementDocumentId', p_document_id,
          'assignmentId', v_assignment.id
        )
      );
    end loop;
  end if;

  update public.schedule_documents
    set publication_status = 'published', published_at = now()
    where id = p_document_id returning * into v_document;
  return v_document;
end
$$;

create or replace function public.schedule_correct_assignment(
  p_assignment_id uuid, p_student_id uuid, p_duty_date date,
  p_duty_function text, p_reason text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_old public.schedule_assignments;
  v_new_id uuid := gen_random_uuid();
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente coordenação ativa corrige designações.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Correção exige justificativa.' using errcode = '23514';
  end if;
  select a.* into v_old
  from public.schedule_assignments a
  join public.schedule_documents d on d.id = a.document_id
  where a.id = p_assignment_id and a.status = 'published'
    and d.publication_status = 'published' and d.processing_status <> 'superseded'
  for update of a;
  if not found then
    raise exception 'Designação vigente não encontrada.' using errcode = '23514';
  end if;

  perform set_config('app.schedule_reason', btrim(p_reason), true);
  update public.schedule_assignments set status = 'corrected', correction_reason = btrim(p_reason)
    where id = p_assignment_id;
  insert into public.schedule_assignments(
    id, document_id, candidate_id, student_id, duty_date, duty_function, status,
    match_method, confidence, supersedes_assignment_id, correction_reason, published_by
  ) values (
    v_new_id, v_old.document_id, v_old.candidate_id, p_student_id,
    coalesce(p_duty_date, v_old.duty_date),
    coalesce(nullif(btrim(p_duty_function), ''), v_old.duty_function),
    'published', 'manual', v_old.confidence, v_old.id, btrim(p_reason), auth.uid()
  );
  if v_old.student_id <> p_student_id then
    insert into public.schedule_notification_events(
      assignment_id, student_id, event_type, idempotency_key, payload
    ) values (
      v_old.id, v_old.student_id, 'wrong_recipient_correction',
      'schedule:' || v_old.id::text || ':wrong-recipient:' || v_new_id::text,
      jsonb_build_object('documentId', v_old.document_id, 'replacementAssignmentId', v_new_id)
    );
  end if;
  insert into public.schedule_notification_events(
    assignment_id, student_id, event_type, idempotency_key, payload
  ) values (
    v_new_id, p_student_id, 'assignment_corrected',
    'schedule:' || v_new_id::text || ':corrected',
    jsonb_build_object('documentId', v_old.document_id, 'assignmentId', v_new_id)
  );
  return v_new_id;
end
$$;

create function public.schedule_cancel_assignment(
  p_assignment_id uuid, p_reason text
) returns void
language plpgsql security definer set search_path = public
as $$
declare v_assignment public.schedule_assignments;
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente coordenação ativa cancela designações.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Cancelamento exige justificativa.' using errcode = '23514';
  end if;
  select a.* into v_assignment
  from public.schedule_assignments a
  join public.schedule_documents d on d.id = a.document_id
  where a.id = p_assignment_id and a.status = 'published'
    and d.publication_status = 'published' and d.processing_status <> 'superseded'
  for update of a;
  if not found then
    raise exception 'Designação vigente não encontrada.' using errcode = '23514';
  end if;
  perform set_config('app.schedule_reason', btrim(p_reason), true);
  update public.schedule_assignments
    set status = 'cancelled', correction_reason = btrim(p_reason)
    where id = p_assignment_id;
  insert into public.schedule_notification_events(
    assignment_id, student_id, event_type, idempotency_key, payload
  ) values (
    v_assignment.id, v_assignment.student_id, 'assignment_cancelled',
    'schedule:' || v_assignment.id::text || ':cancelled',
    jsonb_build_object('documentId', v_assignment.document_id, 'assignmentId', v_assignment.id)
  );
end
$$;

revoke all on function public.schedule_cancel_assignment(uuid,text) from public, anon;
grant execute on function public.schedule_cancel_assignment(uuid,text) to authenticated;

comment on function public.schedule_cancel_assignment(uuid,text) is
  'Cancela uma atribuição vigente sem excluir o histórico e cria aviso compensatório.';
