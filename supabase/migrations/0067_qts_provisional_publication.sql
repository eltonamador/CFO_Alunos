-- =====================================================================
-- 0067 - Publicação provisória de QTS enquanto o calendário é conferido
--
-- A programação semanal precisa estar disponível aos cadetes antes da
-- emissão do calendário anual. Este fluxo não cria diário, frequência ou
-- carga instrucional; esses efeitos continuam exclusivos de ano letivo aberto.
-- =====================================================================

create function public.qts_publish_provisional_document(
  p_document_id uuid,
  p_activities jsonb,
  p_reason text default 'Publicação provisória enquanto aguarda calendário letivo oficial'
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_document public.schedule_documents;
  v_index integer := 0;
  v_row jsonb;
  v_date date;
  v_start time;
  v_end time;
begin
  if public.schedule_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente a coordenação publica o QTS.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Informe o motivo da publicação provisória.' using errcode = '23514';
  end if;
  if jsonb_typeof(p_activities) is distinct from 'array' or jsonb_array_length(p_activities) not between 1 and 500 then
    raise exception 'A tabela conferida do QTS é inválida.' using errcode = '23514';
  end if;
  select d.* into v_document from public.schedule_documents d
    join public.schedule_types t on t.id = d.schedule_type_id
    where d.id = p_document_id and t.code = 'qts'
    for update of d;
  if not found or v_document.publication_status <> 'reserved' then
    raise exception 'Reserva de QTS indisponível.' using errcode = '23514';
  end if;
  if exists (select 1 from public.qts_activities where document_id = p_document_id) then
    raise exception 'A tabela deste QTS já foi publicada.' using errcode = '23514';
  end if;

  perform set_config('app.schedule_reason', btrim(p_reason), true);
  for v_row in select value from jsonb_array_elements(p_activities) loop
    v_index := v_index + 1;
    if coalesce(v_row->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$'
      or length(btrim(coalesce(v_row->>'activity', ''))) not between 2 and 220
      or length(coalesce(v_row->>'instructor', '')) > 200
      or length(coalesce(v_row->>'workload', '')) > 30
      or length(coalesce(v_row->>'uniform', '')) > 100
      or length(coalesce(v_row->>'location', '')) > 100
      or length(coalesce(v_row->>'sourceLine', '')) > 5000 then
      raise exception 'Revise a atividade % do QTS.', v_index using errcode = '23514';
    end if;
    v_date := (v_row->>'date')::date;
    if (v_document.period_start is not null and v_date < v_document.period_start)
      or (v_document.period_end is not null and v_date > v_document.period_end) then
      raise exception 'A atividade % está fora da vigência do QTS.', v_index using errcode = '23514';
    end if;
    if coalesce(v_row->>'startsAt', '') = '' and coalesce(v_row->>'endsAt', '') = '' then
      v_start := null;
      v_end := null;
    elsif coalesce(v_row->>'startsAt', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      and coalesce(v_row->>'endsAt', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      v_start := (v_row->>'startsAt')::time;
      v_end := (v_row->>'endsAt')::time;
      if v_start >= v_end then
        raise exception 'O horário da atividade % é inválido.', v_index using errcode = '23514';
      end if;
    else
      raise exception 'Informe início e término na atividade %.', v_index using errcode = '23514';
    end if;
    insert into public.qts_activities(
      document_id, activity_date, sequence, starts_at, ends_at, activity,
      instructor, workload, uniform, location, is_break, source_line
    ) values (
      p_document_id, v_date, v_index, v_start, v_end, btrim(v_row->>'activity'),
      nullif(btrim(coalesce(v_row->>'instructor', '')), ''),
      nullif(btrim(coalesce(v_row->>'workload', '')), ''),
      nullif(btrim(coalesce(v_row->>'uniform', '')), ''),
      nullif(btrim(coalesce(v_row->>'location', '')), ''),
      coalesce((v_row->>'isBreak')::boolean, false),
      coalesce(nullif(v_row->>'sourceLine', ''), 'Conferência manual')
    );
  end loop;
  perform public.schedule_finalize_document(p_document_id);
  update public.schedule_documents set processing_status = 'processed' where id = p_document_id;
  return p_document_id;
end
$$;

revoke all on function public.qts_publish_provisional_document(uuid,jsonb,text) from public, anon;
grant execute on function public.qts_publish_provisional_document(uuid,jsonb,text) to authenticated;

comment on function public.qts_publish_provisional_document(uuid,jsonb,text)
  is 'Publica agenda QTS conferida sem criar diário ou carga até o calendário anual oficial ser aberto.';
