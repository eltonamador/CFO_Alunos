create function public.schedule_claim_document_notification(p_document_id uuid)
returns table(event_id uuid, event_type text, idempotency_key text, student_id uuid,
  duty_date date, duty_function text, schedule_type_name text, original_filename text)
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  perform set_config('app.schedule_reason', 'Atualização da fila de avisos de escala', true);
  update public.schedule_notification_events set status = 'failed', last_error = 'Entrega interrompida.'
    where status = 'processing' and updated_at < now() - interval '15 minutes';
  update public.schedule_notification_events e set status = 'cancelled', last_error = 'Atribuição vencida ou substituída antes do envio.'
  from public.schedule_assignments a join public.schedule_documents d on d.id = a.document_id
  where e.assignment_id = a.id and e.status in ('pending','failed')
    and (p_document_id is null or d.id = p_document_id)
    and (a.duty_date < (now() at time zone 'America/Belem')::date
      or (e.event_type in ('assignment_published','assignment_corrected')
        and (a.status <> 'published' or d.publication_status <> 'published' or d.processing_status = 'superseded')));
  select e.id into v_id
  from public.schedule_notification_events e
  join public.schedule_assignments a on a.id = e.assignment_id
  where (e.status = 'pending' or (e.status = 'failed' and e.updated_at < now() - interval '1 minute'))
    and e.attempts < 10 and (p_document_id is null or a.document_id = p_document_id)
  order by e.attempts, e.created_at, e.id for update of e skip locked limit 1;
  if v_id is null then return; end if;
  update public.schedule_notification_events set status = 'processing', attempts = attempts + 1, last_error = null where id = v_id;
  return query
  select e.id, e.event_type, e.idempotency_key, e.student_id, a.duty_date, a.duty_function, t.name, d.original_filename
  from public.schedule_notification_events e
  join public.schedule_assignments a on a.id = e.assignment_id
  join public.schedule_documents d on d.id = a.document_id
  join public.schedule_types t on t.id = d.schedule_type_id where e.id = v_id;
end
$$;
revoke all on function public.schedule_claim_document_notification(uuid) from public, anon, authenticated;
grant execute on function public.schedule_claim_document_notification(uuid) to service_role;

create or replace function public.schedule_claim_notification_event()
returns table(event_id uuid, event_type text, idempotency_key text, student_id uuid,
  duty_date date, duty_function text, schedule_type_name text, original_filename text)
language sql security definer set search_path = public
as $$ select * from public.schedule_claim_document_notification(null) $$;
