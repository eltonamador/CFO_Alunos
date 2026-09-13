-- Publica o documento e a tabela conferida na mesma transação. Não há
-- intervalo em que a versão anterior desapareça antes das novas atribuições.
create function public.schedule_publish_reviewed_import(
  p_document_id uuid, p_rows jsonb, p_extraction jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_document public.schedule_documents;
  v_run uuid := gen_random_uuid();
  v_existing public.schedule_processing_runs;
  v_row jsonb;
  v_date date;
  v_student uuid;
  v_profile uuid;
  v_assignment uuid;
  v_index integer := 0;
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação publica a tabela conferida.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_typeof(p_extraction) is distinct from 'object' then
    raise exception 'Tabela ou extração inválida.' using errcode = '23514';
  end if;
  if jsonb_array_length(p_rows) not between 1 and 500 or octet_length(p_extraction::text) > 200000 then
    raise exception 'Tabela ou extração inválida.' using errcode = '23514';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) r
    group by r ->> 'kind', r ->> 'date',
      case when r ->> 'kind' = 'cadet' then r ->> 'studentId'
        else coalesce(nullif(r ->> 'profileId', ''), lower(btrim(r ->> 'person'))) end,
      lower(btrim(r ->> 'dutyFunction')), lower(btrim(coalesce(r ->> 'shift', '')))
    having count(*) > 1
  ) then raise exception 'Há linhas repetidas na tabela.' using errcode = '23514'; end if;
  select * into v_document from public.schedule_documents where id = p_document_id for update;
  if not found then raise exception 'Documento indisponível.' using errcode = '23514'; end if;
  select * into v_existing from public.schedule_processing_runs
    where document_id = p_document_id and parser_revision = 'reviewed-import/1.0' limit 1;
  if found and v_existing.metrics ->> 'reviewDigest' = md5(p_rows::text) then return v_existing.id; end if;
  if v_document.publication_status <> 'reserved' or exists (
    select 1 from public.schedule_processing_runs where document_id = p_document_id
  ) then
    raise exception 'A publicação já foi concluída. Para alterar, envie uma nova versão.' using errcode = '23514';
  end if;
  perform public.schedule_finalize_document(p_document_id);
  perform set_config('app.schedule_reason', 'Tabela extraída conferida e publicada pela coordenação', true);
  insert into public.schedule_processing_runs(id, document_id, attempt, method, parser_revision, status,
    requested_by, started_at, finished_at, metrics)
  values (v_run, p_document_id, 1, 'auto', 'reviewed-import/1.0', 'succeeded', auth.uid(), now(), now(),
    p_extraction || jsonb_build_object('reviewDigest', md5(p_rows::text), 'reviewedRows', p_rows,
      'candidateCount', jsonb_array_length(p_rows), 'reviewCount', 0, 'reviewedBy', auth.uid()));
  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_index := v_index + 1;
    if (v_row ->> 'date') is null or (v_row ->> 'date') !~ '^\d{4}-\d{2}-\d{2}$'
      or length(btrim(coalesce(v_row ->> 'dutyFunction', ''))) not between 2 and 160
      or length(coalesce(v_row ->> 'shift', '')) > 35 then
      raise exception 'Revise data, função e turno na linha %.', v_index using errcode = '23514';
    end if;
    v_date := (v_row ->> 'date')::date;
    if (v_document.period_start is not null and v_date < v_document.period_start)
      or (v_document.period_end is not null and v_date > v_document.period_end) then
      raise exception 'A data da linha % está fora da vigência.', v_index using errcode = '23514';
    end if;
    if v_row ->> 'kind' = 'cadet' then
      v_student := nullif(v_row ->> 'studentId', '')::uuid;
      if not exists (select 1 from public.students where id = v_student
        and class_id = v_document.class_id and deleted_at is null and course_status = 'matriculado') then
        raise exception 'Selecione um cadete ativo da turma na linha %.', v_index using errcode = '23514';
      end if;
      insert into public.schedule_assignments(document_id, student_id, duty_date, duty_function,
        match_method, correction_reason, published_by)
      values (p_document_id, v_student, v_date,
        btrim(v_row ->> 'dutyFunction') || case when nullif(btrim(v_row ->> 'shift'), '') is not null
          then ' · ' || btrim(v_row ->> 'shift') else '' end,
        'manual', 'Importação conferida antes da publicação', auth.uid()) returning id into v_assignment;
      insert into public.schedule_notification_events(assignment_id, student_id, event_type, idempotency_key, payload)
      values (v_assignment, v_student, 'assignment_published', 'schedule:' || v_assignment::text || ':published',
        jsonb_build_object('documentId', p_document_id, 'assignmentId', v_assignment));
    elsif v_row ->> 'kind' = 'officer' then
      v_profile := nullif(v_row ->> 'profileId', '')::uuid;
      if length(btrim(coalesce(v_row ->> 'person', ''))) not between 3 and 150
        or coalesce(v_row ->> 'startsAt', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or coalesce(v_row ->> 'endsAt', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        raise exception 'Revise nome e horários do oficial na linha %.', v_index using errcode = '23514';
      end if;
      if v_profile is not null and not exists (
        select 1 from public.cfo_coordination_members m join public.profiles p on p.id = m.profile_id
        where p.id = v_profile and p.active and m.active and lower(m.service_alias) = lower(btrim(v_row ->> 'person'))
      ) then raise exception 'Vínculo do oficial inválido na linha %.', v_index using errcode = '23514'; end if;
      insert into public.schedule_officer_assignments(run_id, document_id, sequence, profile_id, display_name,
        duty_date, duty_function, shift, starts_at, ends_at, source_line)
      values (v_run, p_document_id, v_index, v_profile, btrim(v_row ->> 'person'), v_date,
        btrim(v_row ->> 'dutyFunction'), v_row ->> 'shift', (v_row ->> 'startsAt')::time,
        (v_row ->> 'endsAt')::time, left(coalesce(v_row ->> 'sourceLine', 'Conferência manual'), 5000));
    else raise exception 'Tipo de militar inválido na linha %.', v_index using errcode = '23514'; end if;
  end loop;
  update public.schedule_documents set processing_status = 'processed' where id = p_document_id;
  return v_run;
end
$$;
revoke all on function public.schedule_publish_reviewed_import(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.schedule_publish_reviewed_import(uuid,jsonb,jsonb) to authenticated;
