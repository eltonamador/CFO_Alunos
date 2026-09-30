-- Delegação específica do repositório de escalas ao cadete Ian Lima.
-- O papel global permanece aluno e a Coordenação pode revogar a delegação.
create table public.schedule_publishers (
  student_id uuid primary key references public.students(id) on delete restrict,
  active boolean not null default true,
  reason text not null check (length(btrim(reason)) >= 5),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.schedule_publishers enable row level security;
revoke all on public.schedule_publishers from public, anon, authenticated;
grant select, insert, update on public.schedule_publishers to authenticated;
create policy schedule_publishers_coord on public.schedule_publishers
  for all to authenticated
  using (public.schedule_active_role() = 'coordenacao')
  with check (public.schedule_active_role() = 'coordenacao');

create function public.schedule_can_publish() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active
      and (
        p.role = 'coordenacao'
        or (p.role = 'aluno' and exists (
          select 1 from public.schedule_publishers delegated
          join public.students s on s.id = delegated.student_id
          where delegated.student_id = p.student_id and delegated.active
            and s.deleted_at is null and s.course_status = 'matriculado'
        ))
      )
  );
$$;
revoke all on function public.schedule_can_publish() from public, anon;
grant execute on function public.schedule_can_publish() to authenticated;

-- Somente as identidades operacionais necessárias para conferir a escala.
create function public.schedule_publishing_people()
returns table(kind text, id uuid, class_id uuid, student_number integer,
  war_name text, full_name text, enrollment_id text, service_alias text,
  registration text, profile_id uuid)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.schedule_can_publish() then
    raise exception 'Acesso restrito à publicação de escalas.' using errcode = '42501';
  end if;
  return query
    select 'cadet'::text, s.id, s.class_id, s.student_number::integer,
      s.war_name::text, s.full_name::text, s.enrollment_id::text,
      null::text, null::text, null::uuid
    from public.students s
    where s.deleted_at is null and s.course_status = 'matriculado'
    union all
    select 'officer'::text, m.profile_id, null::uuid, null::integer,
      null::text, null::text, null::text,
      m.service_alias::text, m.registration::text, m.profile_id
    from public.cfo_coordination_members m
    join public.profiles p on p.id = m.profile_id and p.active
    where m.active and m.service_alias is not null;
end;
$$;
revoke all on function public.schedule_publishing_people() from public, anon;
grant execute on function public.schedule_publishing_people() to authenticated;

-- O administrador do repositório vê inclusive a reserva para concluir o upload.
create or replace function public.schedule_can_read_document(p_document_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(exists (
    select 1 from public.schedule_documents d
    where d.id = p_document_id
      and (
        public.schedule_can_publish()
        or (
          d.publication_status = 'published'
          and d.processing_status <> 'superseded'
          and (
            public.schedule_active_role() in ('instrutor', 'secretaria')
            or (public.schedule_active_role() = 'aluno' and exists (
              select 1 from public.students s
              where s.id = public.current_student_id()
                and s.class_id = d.class_id
                and s.deleted_at is null and s.course_status = 'matriculado'
            ))
          )
        )
      )
  ), false);
$$;

drop policy "schedule pdfs: coord insert" on storage.objects;
create policy "schedule pdfs: publisher insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'schedule-pdfs'
    and public.schedule_can_publish()
    and exists (
      select 1 from public.schedule_documents d
      where d.storage_path = name and d.published_by = auth.uid()
        and d.publication_status = 'reserved'
    )
  );

drop policy schedule_types_insert on public.schedule_types;
create policy schedule_types_insert on public.schedule_types for insert to authenticated
  with check (public.schedule_can_publish());
drop policy schedule_types_update on public.schedule_types;
create policy schedule_types_update on public.schedule_types for update to authenticated
  using (public.schedule_active_role() = 'coordenacao')
  with check (public.schedule_active_role() = 'coordenacao');
drop policy schedule_processing_runs_coord_read on public.schedule_processing_runs;
create policy schedule_processing_runs_publisher_read on public.schedule_processing_runs
  for select to authenticated using (public.schedule_can_publish());
drop policy schedule_candidates_coord_read on public.schedule_candidates;
create policy schedule_candidates_publisher_read on public.schedule_candidates
  for select to authenticated using (public.schedule_can_publish());
drop policy schedule_assignments_read on public.schedule_assignments;
create policy schedule_assignments_read on public.schedule_assignments for select to authenticated
  using (public.schedule_can_publish() or
    (public.schedule_active_role() = 'aluno' and student_id = public.current_student_id()));
drop policy schedule_notifications_coord_read on public.schedule_notification_events;
create policy schedule_notifications_publisher_read on public.schedule_notification_events
  for select to authenticated using (public.schedule_can_publish());
drop policy schedule_audit_coord_read on public.schedule_audit_events;
create policy schedule_audit_publisher_read on public.schedule_audit_events
  for select to authenticated using (public.schedule_can_publish());

-- Políticas adicionadas em migrations posteriores, usadas pela tela de revisão.
drop policy if exists schedule_notification_deliveries_coord_read on public.schedule_notification_deliveries;
create policy schedule_notification_deliveries_publisher_read on public.schedule_notification_deliveries
  for select to authenticated using (public.schedule_can_publish());

do $$
declare v_student uuid; v_count integer; v_profile_count integer;
begin
  select count(*), (array_agg(s.id))[1] into v_count, v_student
  from public.students s
  join public.classes c on c.id = s.class_id
  join public.courses course on course.id = c.course_id
  where s.full_name = 'IAN CAVALCANTE LIMA' and s.war_name = 'IAN LIMA'
    and s.student_number = 2 and c.name = 'CFO 2026.1'
    and course.code = 'CFO-2026' and s.deleted_at is null;
  if v_count <> 1 then raise exception 'Ian Lima não foi identificado de forma única.'; end if;
  select count(*) into v_profile_count from public.profiles p
  where p.student_id = v_student and p.active and p.role = 'aluno';
  if v_profile_count <> 1 then raise exception 'O login ativo de Ian Lima não foi identificado de forma única.'; end if;
  insert into public.schedule_publishers(student_id, reason)
  values (v_student, 'Publicação e revisão das escalas institucionais delegadas a Ian Lima pela Coordenação em 24/09/2026.');
end $$;

-- Gates das RPCs de publicação e revisão; a lógica de negócio original é preservada.

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
  if not public.schedule_can_publish() then
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

create or replace function public.schedule_finalize_document(p_document_id uuid)
returns public.schedule_documents
language plpgsql security definer set search_path = public
as $$
declare
  v_document public.schedule_documents;
  v_previous public.schedule_documents;
  v_assignment public.schedule_assignments;
begin
  if not public.schedule_can_publish() then
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

create or replace function public.schedule_fail_upload(p_document_id uuid, p_reason text)
returns public.schedule_documents
language plpgsql security definer set search_path = public
as $$
declare v_document public.schedule_documents;
begin
  if not public.schedule_can_publish() then
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
  if not public.schedule_can_publish() then
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

create or replace function public.schedule_publish_reviewed_import(
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
  if not public.schedule_can_publish() then
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

create or replace function public.schedule_confirm_candidate(
  p_candidate_id uuid, p_student_id uuid, p_reason text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_candidate public.schedule_candidates;
  v_assignment_id uuid := gen_random_uuid();
begin
  if not public.schedule_can_publish() then
    raise exception 'Somente coordenação ativa confirma vínculos.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Confirmação manual exige justificativa.' using errcode = '23514';
  end if;
  select c.* into v_candidate
  from public.schedule_candidates c
  join public.schedule_documents d on d.id = c.document_id
  where c.id = p_candidate_id and d.processing_status <> 'superseded'
  for update of c;
  if not found or v_candidate.match_status not in ('needs_review','not_found') then
    raise exception 'Candidato não está pendente de revisão em documento vigente.' using errcode = '23514';
  end if;
  perform set_config('app.schedule_reason', btrim(p_reason), true);
  update public.schedule_candidates set match_status = 'manually_confirmed', matched_student_id = p_student_id,
    resolved_by = auth.uid(), resolved_at = now(), resolution_reason = btrim(p_reason)
    where id = p_candidate_id;
  insert into public.schedule_assignments(
    id, document_id, candidate_id, student_id, duty_date, duty_function,
    match_method, confidence, correction_reason, published_by
  ) values (
    v_assignment_id, v_candidate.document_id, v_candidate.id, p_student_id,
    v_candidate.duty_date, v_candidate.duty_function, 'manual', v_candidate.confidence,
    btrim(p_reason), auth.uid()
  );
  insert into public.schedule_notification_events(
    assignment_id, student_id, event_type, idempotency_key, payload
  ) values (
    v_assignment_id, p_student_id, 'assignment_published',
    'schedule:' || v_assignment_id::text || ':published',
    jsonb_build_object('documentId', v_candidate.document_id, 'assignmentId', v_assignment_id)
  );
  return v_assignment_id;
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
  if not public.schedule_can_publish() then
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

create or replace function public.schedule_cancel_assignment(
  p_assignment_id uuid, p_reason text
) returns void
language plpgsql security definer set search_path = public
as $$
declare v_assignment public.schedule_assignments;
begin
  if not public.schedule_can_publish() then
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

create or replace function public.schedule_retire_duplicate_document(
  p_document_id uuid,
  p_reason text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_document public.schedule_documents;
begin
  if not public.schedule_can_publish() then
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
