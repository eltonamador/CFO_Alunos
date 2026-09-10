-- =====================================================================
-- 0040 - Repositorio de escalas em PDF
--
-- Modulo independente de operational-duty. O PDF publicado e preservado;
-- extracoes, vinculacoes, correcoes, notificacoes e auditoria mantem o
-- historico sem apagar ou sobrescrever a evidencia original.
-- =====================================================================

create table public.schedule_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  name text not null check (length(btrim(name)) >= 3),
  description text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.schedule_types(code, name) values
  ('aluno_dia', 'Escala de Aluno de Dia'),
  ('acompanhante_oficial', 'Escala de Acompanhante do Oficial'),
  ('oficial_dia', 'Escala de Oficial de Dia'),
  ('alunos_cfsd', 'Escala dos Alunos CFSD');

create table public.schedule_documents (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  schedule_type_id uuid not null references public.schedule_types(id) on delete restrict,
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  original_filename text not null check (lower(original_filename) like '%.pdf'),
  mime_type text not null default 'application/pdf' check (mime_type = 'application/pdf'),
  size_bytes bigint not null check (size_bytes > 0),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  period_start date,
  period_end date,
  processing_status text not null default 'uploaded'
    check (processing_status in ('uploaded','processing','processed','processed_with_issues','failed','superseded')),
  supersedes_document_id uuid references public.schedule_documents(id) on delete restrict,
  published_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end >= period_start),
  check (supersedes_document_id is null or supersedes_document_id <> id)
);

create index idx_schedule_documents_class_period
  on public.schedule_documents(class_id, period_start desc, published_at desc);
create index idx_schedule_documents_type
  on public.schedule_documents(schedule_type_id, published_at desc);
create index idx_schedule_documents_checksum
  on public.schedule_documents(class_id, schedule_type_id, checksum_sha256);

create table public.schedule_processing_runs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.schedule_documents(id) on delete restrict,
  attempt integer not null check (attempt > 0),
  method text not null default 'auto' check (method in ('auto','native_text','ocr')),
  parser_version text,
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','partial','failed')),
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  error_code text,
  error_message text,
  requested_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (document_id, attempt),
  check (finished_at is null or started_at is null or finished_at >= started_at)
);

create index idx_schedule_processing_runs_document
  on public.schedule_processing_runs(document_id, attempt desc);
create index idx_schedule_processing_runs_queue
  on public.schedule_processing_runs(status, created_at) where status in ('queued','running');

create table public.schedule_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.schedule_processing_runs(id) on delete restrict,
  document_id uuid not null references public.schedule_documents(id) on delete restrict,
  sequence integer not null check (sequence > 0),
  raw_name text,
  duty_date date,
  duty_function text,
  original_line text not null,
  match_status text not null
    check (match_status in ('auto_confirmed','needs_review','not_found','manually_confirmed','superseded')),
  confidence numeric(5,4) check (confidence between 0 and 1),
  match_reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(match_reasons) = 'array'),
  candidate_student_ids uuid[] not null default '{}',
  matched_student_id uuid references public.students(id) on delete restrict,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolution_reason text,
  created_at timestamptz not null default now(),
  unique (run_id, sequence)
);

create index idx_schedule_candidates_review
  on public.schedule_candidates(document_id, match_status, sequence);
create index idx_schedule_candidates_student
  on public.schedule_candidates(matched_student_id) where matched_student_id is not null;

create table public.schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.schedule_documents(id) on delete restrict,
  candidate_id uuid references public.schedule_candidates(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  duty_date date,
  duty_function text,
  status text not null default 'published'
    check (status in ('published','corrected','cancelled','superseded')),
  match_method text not null check (match_method in ('automatic','manual')),
  confidence numeric(5,4) check (confidence between 0 and 1),
  supersedes_assignment_id uuid references public.schedule_assignments(id) on delete restrict,
  correction_reason text,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (supersedes_assignment_id is null or supersedes_assignment_id <> id)
);

create index idx_schedule_assignments_student_date
  on public.schedule_assignments(student_id, duty_date desc, published_at desc);
create index idx_schedule_assignments_document
  on public.schedule_assignments(document_id, published_at desc);
create unique index uniq_schedule_current_candidate_assignment
  on public.schedule_assignments(candidate_id)
  where candidate_id is not null and status = 'published';

create table public.schedule_notification_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.schedule_assignments(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  event_type text not null
    check (event_type in ('assignment_published','assignment_corrected','wrong_recipient_correction','assignment_cancelled')),
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending','sent','failed','cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_schedule_notification_events_pending
  on public.schedule_notification_events(status, created_at) where status in ('pending','failed');
create index idx_schedule_notification_events_student
  on public.schedule_notification_events(student_id, created_at desc);

create table public.schedule_audit_events (
  id bigint generated always as identity primary key,
  document_id uuid references public.schedule_documents(id) on delete restrict,
  student_id uuid references public.students(id) on delete restrict,
  entity text not null,
  entity_id uuid not null,
  action text not null check (action in ('insert','update','delete')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index idx_schedule_audit_entity on public.schedule_audit_events(entity, entity_id, created_at desc);
create index idx_schedule_audit_document on public.schedule_audit_events(document_id, created_at desc);

create function public.schedule_active_role() returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create function public.schedule_can_read_document(p_document_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(exists (
    select 1
    from public.schedule_documents d
    where d.id = p_document_id
      and d.published_at is not null
      and (
        public.schedule_active_role() in ('coordenacao','instrutor')
        or (public.schedule_active_role() = 'aluno' and exists (
          select 1 from public.students s
          where s.id = public.current_student_id() and s.class_id = d.class_id and s.deleted_at is null
        ))
      )
  ), false)
$$;

create function public.schedule_guard_record() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_document_class uuid;
  v_student_class uuid;
  v_linked_document uuid;
begin
  if tg_op = 'DELETE' then
    raise exception 'Registros de escala não podem ser excluídos.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.id <> old.id then
    raise exception 'Identificador de escala é imutável.' using errcode = '23514';
  end if;

  if tg_table_name = 'schedule_types' then
    if tg_op = 'INSERT' then new.created_by := auth.uid(); end if;
    if tg_op = 'UPDATE' then
      new.code := old.code;
      new.created_by := old.created_by;
      new.created_at := old.created_at;
      new.updated_at := now();
    end if;
  elsif tg_table_name = 'schedule_documents' then
    if tg_op = 'UPDATE' then
      if new.class_id <> old.class_id or new.schedule_type_id <> old.schedule_type_id
        or new.storage_path <> old.storage_path or new.original_filename <> old.original_filename
        or new.mime_type <> old.mime_type or new.size_bytes <> old.size_bytes
        or new.checksum_sha256 <> old.checksum_sha256 or new.period_start is distinct from old.period_start
        or new.period_end is distinct from old.period_end or new.supersedes_document_id is distinct from old.supersedes_document_id
        or new.published_by <> old.published_by or new.published_at <> old.published_at then
        raise exception 'Documento publicado é imutável; envie uma nova versão.' using errcode = '23514';
      end if;
    end if;
  elsif tg_table_name = 'schedule_processing_runs' and tg_op = 'UPDATE' then
    if new.document_id <> old.document_id or new.attempt <> old.attempt or new.method <> old.method
      or new.parser_version is distinct from old.parser_version or new.requested_by is distinct from old.requested_by
      or new.created_at <> old.created_at then
      raise exception 'Identidade da execução de processamento é imutável.' using errcode = '23514';
    end if;
  elsif tg_table_name = 'schedule_candidates' then
    select document_id into v_linked_document from public.schedule_processing_runs where id = new.run_id;
    if v_linked_document is distinct from new.document_id then
      raise exception 'Candidato deve pertencer ao documento da execução.' using errcode = '23514';
    end if;
    select class_id into v_document_class from public.schedule_documents where id = new.document_id;
    if tg_op = 'UPDATE' and (
      new.run_id <> old.run_id or new.document_id <> old.document_id or new.sequence <> old.sequence
      or new.raw_name is distinct from old.raw_name or new.duty_date is distinct from old.duty_date
      or new.duty_function is distinct from old.duty_function or new.original_line <> old.original_line
      or new.confidence is distinct from old.confidence or new.match_reasons <> old.match_reasons
      or new.candidate_student_ids <> old.candidate_student_ids or new.created_at <> old.created_at
    ) then
      raise exception 'Evidência extraída é imutável; reprocesse o documento.' using errcode = '23514';
    end if;
    if new.matched_student_id is not null then
      select class_id into v_student_class from public.students where id = new.matched_student_id and deleted_at is null;
      if v_student_class is distinct from v_document_class then
        raise exception 'Cadete deve pertencer à turma do documento.' using errcode = '23514';
      end if;
    end if;
  elsif tg_table_name = 'schedule_assignments' then
    if new.candidate_id is not null then
      select document_id into v_linked_document from public.schedule_candidates where id = new.candidate_id;
      if v_linked_document is distinct from new.document_id then
        raise exception 'Designação deve pertencer ao documento do candidato.' using errcode = '23514';
      end if;
    end if;
    select class_id into v_document_class from public.schedule_documents where id = new.document_id;
    select class_id into v_student_class from public.students where id = new.student_id and deleted_at is null;
    if v_student_class is distinct from v_document_class then
      raise exception 'Cadete deve pertencer à turma do documento.' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and (
      new.document_id <> old.document_id or new.candidate_id is distinct from old.candidate_id
      or new.student_id <> old.student_id or new.duty_date is distinct from old.duty_date
      or new.duty_function is distinct from old.duty_function or new.match_method <> old.match_method
      or new.confidence is distinct from old.confidence
      or new.supersedes_assignment_id is distinct from old.supersedes_assignment_id
      or new.published_by is distinct from old.published_by or new.published_at <> old.published_at
      or new.created_at <> old.created_at
    ) then
      raise exception 'Designação publicada é imutável; registre uma correção.' using errcode = '23514';
    end if;
  elsif tg_table_name = 'schedule_notification_events' and tg_op = 'UPDATE' then
    if new.assignment_id <> old.assignment_id or new.student_id <> old.student_id
      or new.event_type <> old.event_type or new.idempotency_key <> old.idempotency_key
      or new.payload <> old.payload or new.created_at <> old.created_at then
      raise exception 'Identidade da notificação é imutável.' using errcode = '23514';
    end if;
    new.updated_at := now();
  elsif tg_table_name = 'schedule_notification_events' then
    select document_id into v_linked_document from public.schedule_assignments
      where id = new.assignment_id and student_id = new.student_id;
    if v_linked_document is null then
      raise exception 'Notificação deve usar o destinatário da designação.' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;

create function public.schedule_audit_record() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_row jsonb;
  v_document uuid;
  v_student uuid;
begin
  if tg_op <> 'INSERT' then v_before := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_after := to_jsonb(new); end if;
  v_row := coalesce(v_after, v_before);
  if tg_table_name = 'schedule_documents' then
    v_document := (v_row ->> 'id')::uuid;
  elsif tg_table_name = 'schedule_notification_events' then
    select document_id into v_document from public.schedule_assignments
      where id = (v_row ->> 'assignment_id')::uuid;
  else
    v_document := nullif(v_row ->> 'document_id', '')::uuid;
  end if;
  v_student := nullif(v_row ->> 'student_id', '')::uuid;
  insert into public.schedule_audit_events
    (document_id, student_id, entity, entity_id, action, actor_id, actor_role, before_data, after_data, reason)
  values (
    v_document, v_student, tg_table_name, (v_row ->> 'id')::uuid, lower(tg_op), auth.uid(),
    public.schedule_active_role(), v_before, v_after,
    coalesce(nullif(current_setting('app.schedule_reason', true), ''), v_row ->> 'resolution_reason', v_row ->> 'correction_reason')
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create function public.schedule_reject_audit_change() returns trigger
language plpgsql as $$
begin
  raise exception 'Histórico de escalas é imutável.' using errcode = '42501';
end
$$;

create trigger schedule_audit_immutable before update or delete on public.schedule_audit_events
for each row execute function public.schedule_reject_audit_change();

do $$
declare t text;
begin
  foreach t in array array['schedule_types','schedule_documents','schedule_processing_runs',
    'schedule_candidates','schedule_assignments','schedule_notification_events'] loop
    execute format('create trigger schedule_guard before insert or update or delete on public.%I for each row execute function public.schedule_guard_record()', t);
    execute format('create trigger schedule_audit after insert or update or delete on public.%I for each row execute function public.schedule_audit_record()', t);
  end loop;
end
$$;

create function public.schedule_register_document(
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
    select * into v_previous from public.schedule_documents where id = p_supersedes_document_id for update;
    if not found or v_previous.processing_status = 'superseded'
      or v_previous.class_id <> p_class_id or v_previous.schedule_type_id <> p_schedule_type_id then
      raise exception 'Versão anterior deve ter a mesma turma e o mesmo tipo.' using errcode = '23514';
    end if;
    perform set_config('app.schedule_reason', 'Substituição por nova versão do PDF', true);
    update public.schedule_documents set processing_status = 'superseded' where id = p_supersedes_document_id;
  end if;
  insert into public.schedule_documents(
    id, class_id, schedule_type_id, storage_path, original_filename, size_bytes,
    checksum_sha256, period_start, period_end, supersedes_document_id, published_by
  ) values (
    v_id, p_class_id, p_schedule_type_id,
    p_class_id::text || '/' || v_id::text || '/' || btrim(p_original_filename),
    btrim(p_original_filename), p_size_bytes,
    lower(p_checksum_sha256), p_period_start, p_period_end, p_supersedes_document_id, auth.uid()
  ) returning * into v_document;
  return v_document;
end
$$;

create function public.schedule_request_reprocess(p_document_id uuid, p_method text default 'auto') returns uuid
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
  perform 1 from public.schedule_documents where id = p_document_id and processing_status <> 'superseded' for update;
  if not found then raise exception 'Documento indisponível.' using errcode = '23514'; end if;
  select coalesce(max(attempt), 0) + 1 into v_attempt
    from public.schedule_processing_runs where document_id = p_document_id;
  insert into public.schedule_processing_runs(document_id, attempt, method, requested_by)
    values (p_document_id, v_attempt, p_method, auth.uid()) returning id into v_run_id;
  perform set_config('app.schedule_reason', 'Processamento solicitado', true);
  update public.schedule_documents set processing_status = 'processing' where id = p_document_id;
  return v_run_id;
end
$$;

create function public.schedule_confirm_candidate(
  p_candidate_id uuid, p_student_id uuid, p_reason text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_candidate public.schedule_candidates;
  v_assignment_id uuid := gen_random_uuid();
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente coordenação ativa confirma vínculos.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Confirmação manual exige justificativa.' using errcode = '23514';
  end if;
  select * into v_candidate from public.schedule_candidates where id = p_candidate_id for update;
  if not found or v_candidate.match_status not in ('needs_review','not_found') then
    raise exception 'Candidato não está pendente de revisão.' using errcode = '23514';
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

-- Chamada somente pelo backend com service_role. O candidato já deve ter sido
-- conciliado de forma inequívoca pelo parser; publicação e outbox são atômicas.
create function public.schedule_publish_auto_candidate(p_candidate_id uuid) returns uuid
language plpgsql security invoker set search_path = public
as $$
declare
  v_candidate public.schedule_candidates;
  v_assignment_id uuid := gen_random_uuid();
begin
  select * into v_candidate from public.schedule_candidates where id = p_candidate_id for update;
  if not found or v_candidate.match_status <> 'auto_confirmed'
    or v_candidate.matched_student_id is null then
    raise exception 'Candidato não está apto à publicação automática.' using errcode = '23514';
  end if;
  insert into public.schedule_assignments(
    id, document_id, candidate_id, student_id, duty_date, duty_function,
    match_method, confidence
  ) values (
    v_assignment_id, v_candidate.document_id, v_candidate.id, v_candidate.matched_student_id,
    v_candidate.duty_date, v_candidate.duty_function, 'automatic', v_candidate.confidence
  );
  insert into public.schedule_notification_events(
    assignment_id, student_id, event_type, idempotency_key, payload
  ) values (
    v_assignment_id, v_candidate.matched_student_id, 'assignment_published',
    'schedule:' || v_assignment_id::text || ':published',
    jsonb_build_object('documentId', v_candidate.document_id, 'assignmentId', v_assignment_id)
  );
  return v_assignment_id;
end
$$;

create function public.schedule_correct_assignment(
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
  select * into v_old from public.schedule_assignments where id = p_assignment_id for update;
  if not found or v_old.status <> 'published' then
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
    coalesce(p_duty_date, v_old.duty_date), coalesce(nullif(btrim(p_duty_function), ''), v_old.duty_function),
    'published', 'manual', v_old.confidence, v_old.id, btrim(p_reason), auth.uid()
  );
  if v_old.student_id <> p_student_id then
    insert into public.schedule_notification_events(
      assignment_id, student_id, event_type, idempotency_key, payload
    ) values (
      v_old.id, v_old.student_id, 'wrong_recipient_correction',
      'schedule:' || v_old.id::text || ':wrong-recipient',
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

-- Segurança: o navegador consulta somente o que seu papel precisa. Escritas do
-- parser/notificador usam service_role; coordenação usa as RPCs transacionais.
do $$
declare t text;
begin
  foreach t in array array['schedule_types','schedule_documents','schedule_processing_runs',
    'schedule_candidates','schedule_assignments','schedule_notification_events','schedule_audit_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
  end loop;
end
$$;

grant select on public.schedule_types, public.schedule_documents, public.schedule_processing_runs,
  public.schedule_candidates, public.schedule_assignments, public.schedule_notification_events,
  public.schedule_audit_events to authenticated;
grant insert, update on public.schedule_types to authenticated;

create policy schedule_types_read on public.schedule_types for select to authenticated
using (public.schedule_active_role() in ('coordenacao','instrutor','aluno'));
create policy schedule_types_insert on public.schedule_types for insert to authenticated
with check (public.schedule_active_role() = 'coordenacao');
create policy schedule_types_update on public.schedule_types for update to authenticated
using (public.schedule_active_role() = 'coordenacao') with check (public.schedule_active_role() = 'coordenacao');

create policy schedule_documents_read on public.schedule_documents for select to authenticated
using (public.schedule_can_read_document(id));
create policy schedule_processing_runs_coord_read on public.schedule_processing_runs for select to authenticated
using (public.schedule_active_role() = 'coordenacao');
create policy schedule_candidates_coord_read on public.schedule_candidates for select to authenticated
using (public.schedule_active_role() = 'coordenacao');
create policy schedule_assignments_read on public.schedule_assignments for select to authenticated
using (public.schedule_active_role() = 'coordenacao'
  or (public.schedule_active_role() = 'aluno' and student_id = public.current_student_id()));
create policy schedule_notifications_coord_read on public.schedule_notification_events for select to authenticated
using (public.schedule_active_role() = 'coordenacao');
create policy schedule_audit_coord_read on public.schedule_audit_events for select to authenticated
using (public.schedule_active_role() = 'coordenacao');

revoke all on function public.schedule_register_document(uuid,uuid,text,bigint,text,date,date,uuid) from public, anon;
revoke all on function public.schedule_request_reprocess(uuid,text) from public, anon;
revoke all on function public.schedule_confirm_candidate(uuid,uuid,text) from public, anon;
revoke all on function public.schedule_correct_assignment(uuid,uuid,date,text,text) from public, anon;
revoke all on function public.schedule_publish_auto_candidate(uuid) from public, anon, authenticated;
grant execute on function public.schedule_register_document(uuid,uuid,text,bigint,text,date,date,uuid) to authenticated;
grant execute on function public.schedule_request_reprocess(uuid,text) to authenticated;
grant execute on function public.schedule_confirm_candidate(uuid,uuid,text) to authenticated;
grant execute on function public.schedule_correct_assignment(uuid,uuid,date,text,text) to authenticated;
grant execute on function public.schedule_publish_auto_candidate(uuid) to service_role;

comment on table public.schedule_documents is 'Metadados imutáveis dos PDFs publicados no repositório de escalas.';
comment on table public.schedule_candidates is 'Evidências extraídas do PDF e resultado rastreável da conciliação de nomes.';
comment on table public.schedule_notification_events is 'Outbox idempotente do módulo de escalas; o envio é feito pelo backend.';
comment on table public.schedule_audit_events is 'Histórico transacional e imutável das mudanças do módulo de escalas.';
