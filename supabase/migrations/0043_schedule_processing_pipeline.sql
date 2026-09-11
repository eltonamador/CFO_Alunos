-- =====================================================================
-- 0043 - Fila transacional de processamento das escalas
--
-- O worker recebe uma execução por vez com SKIP LOCKED, grava o resultado
-- inteiro em uma transação e publica somente vínculos inequívocos.
-- =====================================================================

alter table public.schedule_processing_runs
  add column parser_revision text;

create unique index uniq_schedule_processing_active_document
  on public.schedule_processing_runs(document_id)
  where status in ('queued', 'running');

create or replace function public.schedule_request_reprocess(
  p_document_id uuid, p_method text default 'auto'
) returns uuid
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
  if not found then
    raise exception 'Documento publicado indisponível.' using errcode = '23514';
  end if;

  select id into v_run_id
    from public.schedule_processing_runs
    where document_id = p_document_id and status in ('queued','running')
    order by attempt desc limit 1;
  if found then return v_run_id; end if;

  select coalesce(max(attempt), 0) + 1 into v_attempt
    from public.schedule_processing_runs where document_id = p_document_id;
  insert into public.schedule_processing_runs(document_id, attempt, method, requested_by)
    values (p_document_id, v_attempt, p_method, auth.uid()) returning id into v_run_id;
  perform set_config('app.schedule_reason', 'Processamento solicitado', true);
  update public.schedule_documents set processing_status = 'processing' where id = p_document_id;
  return v_run_id;
end
$$;

create function public.schedule_claim_processing_run(p_parser_revision text)
returns table(
  run_id uuid,
  document_id uuid,
  class_id uuid,
  storage_path text,
  schedule_type_name text,
  period_start date,
  method text,
  attempt integer
)
language plpgsql security definer set search_path = public
as $$
declare v_run_id uuid;
begin
  if length(btrim(coalesce(p_parser_revision, ''))) < 3 then
    raise exception 'Versão do parser inválida.' using errcode = '23514';
  end if;

  perform set_config('app.schedule_reason', 'Execução cancelada por versão superada', true);
  update public.schedule_processing_runs r
    set status = 'failed', error_code = 'DOCUMENT_SUPERSEDED',
        error_message = 'O documento foi substituído antes do início do processamento.',
        finished_at = now()
    from public.schedule_documents d
    where d.id = r.document_id and r.status = 'queued'
      and d.processing_status = 'superseded';

  select r.id into v_run_id
  from public.schedule_processing_runs r
  join public.schedule_documents d on d.id = r.document_id
  where r.status = 'queued'
    and d.publication_status = 'published'
    and d.processing_status <> 'superseded'
  order by r.created_at, r.id
  for update of r skip locked
  limit 1;

  if v_run_id is null then return; end if;

  perform set_config('app.schedule_reason', 'Execução assumida pelo worker', true);
  update public.schedule_processing_runs r
    set status = 'running', started_at = now(), parser_revision = btrim(p_parser_revision)
    where r.id = v_run_id;

  return query
  select r.id, r.document_id, d.class_id, d.storage_path, t.name, d.period_start,
    r.method, r.attempt
  from public.schedule_processing_runs r
  join public.schedule_documents d on d.id = r.document_id
  join public.schedule_types t on t.id = d.schedule_type_id
  where r.id = v_run_id;
end
$$;

create function public.schedule_complete_processing_run(
  p_run_id uuid,
  p_status text,
  p_metrics jsonb default '{}'::jsonb,
  p_candidates jsonb default '[]'::jsonb,
  p_error_code text default null,
  p_error_message text default null
) returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_run public.schedule_processing_runs;
  v_document_status text;
  v_candidate record;
  v_inserted_id uuid;
  v_count integer := 0;
begin
  if p_status not in ('succeeded','partial','failed') then
    raise exception 'Estado final de processamento inválido.' using errcode = '23514';
  end if;
  if jsonb_typeof(coalesce(p_metrics, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_candidates, '[]'::jsonb)) <> 'array' then
    raise exception 'Métricas e candidatos possuem formato inválido.' using errcode = '23514';
  end if;

  select * into v_run from public.schedule_processing_runs where id = p_run_id for update;
  if not found or v_run.status <> 'running' then
    raise exception 'Execução não está em andamento.' using errcode = '23514';
  end if;

  perform set_config('app.schedule_reason', 'Resultado do parser registrado', true);
  if p_status <> 'failed' then
    update public.schedule_candidates
      set match_status = 'superseded'
      where document_id = v_run.document_id
        and run_id <> p_run_id
        and match_status in ('auto_confirmed','needs_review','not_found');
  end if;

  for v_candidate in
    select * from jsonb_to_recordset(coalesce(p_candidates, '[]'::jsonb)) as item(
      sequence integer,
      raw_name text,
      duty_date date,
      duty_function text,
      original_line text,
      match_status text,
      confidence numeric,
      match_reasons jsonb,
      candidate_student_ids uuid[],
      matched_student_id uuid
    )
  loop
    insert into public.schedule_candidates(
      run_id, document_id, sequence, raw_name, duty_date, duty_function,
      original_line, match_status, confidence, match_reasons,
      candidate_student_ids, matched_student_id
    ) values (
      p_run_id, v_run.document_id, v_candidate.sequence, v_candidate.raw_name,
      v_candidate.duty_date, v_candidate.duty_function, v_candidate.original_line,
      v_candidate.match_status, v_candidate.confidence,
      coalesce(v_candidate.match_reasons, '[]'::jsonb),
      coalesce(v_candidate.candidate_student_ids, '{}'), v_candidate.matched_student_id
    ) returning id into v_inserted_id;
    v_count := v_count + 1;

    if v_candidate.match_status = 'auto_confirmed' then
      perform public.schedule_publish_auto_candidate(v_inserted_id);
    end if;
  end loop;

  update public.schedule_processing_runs
    set status = p_status,
        metrics = coalesce(p_metrics, '{}'::jsonb),
        error_code = nullif(btrim(p_error_code), ''),
        error_message = nullif(left(btrim(p_error_message), 2000), ''),
        finished_at = now()
    where id = p_run_id;

  v_document_status := case p_status
    when 'succeeded' then 'processed'
    when 'partial' then 'processed_with_issues'
    else 'failed'
  end;
  update public.schedule_documents set processing_status = v_document_status
    where id = v_run.document_id and processing_status <> 'superseded';

  return v_count;
end
$$;

revoke all on function public.schedule_claim_processing_run(text) from public, anon, authenticated;
revoke all on function public.schedule_complete_processing_run(uuid,text,jsonb,jsonb,text,text)
  from public, anon, authenticated;
grant execute on function public.schedule_claim_processing_run(text) to service_role;
grant execute on function public.schedule_complete_processing_run(uuid,text,jsonb,jsonb,text,text)
  to service_role;

comment on column public.schedule_processing_runs.parser_revision is
  'Versão efetiva do parser que assumiu a execução; preenchida atomicamente no claim.';
comment on function public.schedule_claim_processing_run(text) is
  'Entrega exclusiva da próxima execução ao worker com FOR UPDATE SKIP LOCKED.';
comment on function public.schedule_complete_processing_run(uuid,text,jsonb,jsonb,text,text) is
  'Persiste evidências, resultado, designações inequívocas e outbox na mesma transação.';
