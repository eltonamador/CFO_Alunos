-- Permuta de duas participações GBM publicadas. Propor não modifica a escala;
-- a decisão da Coordenação troca os cadetes em uma única transação.
alter table public.internship_change_requests
  add column other_assignment_id uuid references public.internship_assignments(id) on delete restrict;
alter table public.internship_change_requests
  drop constraint internship_change_requests_change_type_check;
alter table public.internship_change_requests
  add constraint internship_change_requests_change_type_check
  check (change_type in ('troca', 'substituicao', 'remanejamento', 'passagem', 'permuta'));
alter table public.internship_change_requests
  add constraint internship_change_requests_pair_check
  check ((change_type = 'permuta') = (other_assignment_id is not null)
    and (other_assignment_id is null or other_assignment_id <> assignment_id));

create index internship_change_other_assignment_pending
  on public.internship_change_requests(other_assignment_id) where status = 'pendente';

-- Serializa propostas sobre as duas participações, inclusive as propostas
-- antigas de substituição/remanejamento que usem uma delas.
create function public.internship_guard_change_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare assignment_id uuid;
begin
  for assignment_id in
    select distinct id from unnest(array[new.assignment_id, new.other_assignment_id]) id
    where id is not null order by id
  loop
    perform pg_advisory_xact_lock(hashtext('internship-change:' || assignment_id::text));
  end loop;
  if exists (
    select 1 from public.internship_change_requests previous
    where previous.status = 'pendente'
      and (previous.assignment_id = any(array[new.assignment_id, new.other_assignment_id])
        or previous.other_assignment_id = any(array[new.assignment_id, new.other_assignment_id]))
  ) then
    raise exception 'Já existe uma alteração pendente para um dos plantões.' using errcode = '23505';
  end if;
  return new;
end;
$$;
create trigger internship_change_request_guard before insert
  on public.internship_change_requests for each row
  execute function public.internship_guard_change_request();

create function public.internship_request_pair_swap(
  p_first_assignment_id uuid, p_second_assignment_id uuid, p_reason text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  first_assignment public.internship_assignments;
  second_assignment public.internship_assignments;
  first_shift public.internship_shifts;
  second_shift public.internship_shifts;
  program_timezone text;
  request_id uuid;
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do estágio.' using errcode = '42501';
  end if;
  if p_first_assignment_id is null or p_second_assignment_id is null
    or p_first_assignment_id = p_second_assignment_id
    or length(btrim(coalesce(p_reason, ''))) not between 5 and 500 then
    raise exception 'Selecione dois plantões distintos e informe o motivo da permuta.' using errcode = '23514';
  end if;
  select * into first_assignment from public.internship_assignments where id = p_first_assignment_id;
  select * into second_assignment from public.internship_assignments where id = p_second_assignment_id;
  select * into first_shift from public.internship_shifts where id = first_assignment.shift_id;
  select * into second_shift from public.internship_shifts where id = second_assignment.shift_id;
  select timezone into program_timezone from public.internship_programs where id = first_shift.program_id;
  if first_assignment.id is null or second_assignment.id is null
    or first_assignment.status <> 'prevista' or second_assignment.status <> 'prevista'
    or first_assignment.student_id = second_assignment.student_id
    or first_shift.status <> 'publicado' or second_shift.status <> 'publicado'
    or first_shift.id = second_shift.id or first_shift.program_id <> second_shift.program_id
    or first_shift.starts_at <= now() or second_shift.starts_at <= now()
    or (first_shift.starts_at at time zone program_timezone)::date <>
       (second_shift.starts_at at time zone program_timezone)::date
    or not exists (select 1 from public.internship_sites site
      where site.id = first_shift.site_id and site.site_type = 'gbm')
    or not exists (select 1 from public.internship_sites site
      where site.id = second_shift.site_id and site.site_type = 'gbm')
    or exists (select 1 from public.internship_execution_records record
      where record.assignment_id in (first_assignment.id, second_assignment.id)) then
    raise exception 'Permuta disponível apenas entre dois plantões GBM futuros, publicados e não executados do mesmo dia.' using errcode = '23514';
  end if;
  insert into public.internship_change_requests(
    assignment_id, other_assignment_id, change_type, reason, requested_by
  ) values (
    first_assignment.id, second_assignment.id, 'permuta', btrim(p_reason), auth.uid()
  ) returning id into request_id;
  return request_id;
end;
$$;
revoke all on function public.internship_request_pair_swap(uuid,uuid,text) from public, anon;
grant execute on function public.internship_request_pair_swap(uuid,uuid,text) to authenticated;

create function public.internship_homologate_pair_swap(
  p_first_assignment_id uuid, p_second_assignment_id uuid, p_reason text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  first_assignment public.internship_assignments;
  second_assignment public.internship_assignments;
  first_shift public.internship_shifts;
  second_shift public.internship_shifts;
  assignment_id uuid;
  first_new_id uuid;
begin
  if not public.internship_is_coordinator() then
    raise exception 'Somente a Coordenação homologa a permuta.' using errcode = '42501';
  end if;
  if p_first_assignment_id is null or p_second_assignment_id is null
    or p_first_assignment_id = p_second_assignment_id
    or length(btrim(coalesce(p_reason, ''))) not between 5 and 500 then
    raise exception 'Permuta inválida.' using errcode = '23514';
  end if;
  for assignment_id in
    select id from unnest(array[p_first_assignment_id, p_second_assignment_id]) id order by id
  loop
    perform 1 from public.internship_assignments where id = assignment_id for update;
  end loop;
  select * into first_assignment from public.internship_assignments where id = p_first_assignment_id;
  select * into second_assignment from public.internship_assignments where id = p_second_assignment_id;
  select * into first_shift from public.internship_shifts where id = first_assignment.shift_id;
  select * into second_shift from public.internship_shifts where id = second_assignment.shift_id;
  if first_assignment.status <> 'prevista' or second_assignment.status <> 'prevista'
    or first_assignment.student_id = second_assignment.student_id
    or first_shift.status <> 'publicado' or second_shift.status <> 'publicado'
    or first_shift.starts_at <= now() or second_shift.starts_at <= now()
    or first_shift.program_id <> second_shift.program_id
    or exists (select 1 from public.internship_execution_records record
      where record.assignment_id in (first_assignment.id, second_assignment.id)) then
    raise exception 'Um dos plantões mudou desde a solicitação. Confira a agenda.' using errcode = '23514';
  end if;
  -- Os dois postos são liberados antes das novas inserções. Os gatilhos
  -- existentes verificam capacidade, descanso, ABM, impedimento e aniversário.
  update public.internship_assignments set status = 'substituida', reason = btrim(p_reason),
    updated_by = auth.uid() where id in (first_assignment.id, second_assignment.id);
  insert into public.internship_assignments(
    shift_id, student_id, assignment_source, reason, replaces_assignment_id, created_by
  ) values (
    first_assignment.shift_id, second_assignment.student_id, 'substituicao',
    btrim(p_reason), first_assignment.id, auth.uid()
  ) returning id into first_new_id;
  insert into public.internship_assignments(
    shift_id, student_id, assignment_source, reason, replaces_assignment_id, created_by
  ) values (
    second_assignment.shift_id, first_assignment.student_id, 'substituicao',
    btrim(p_reason), second_assignment.id, auth.uid()
  );
  return first_new_id;
end;
$$;
revoke all on function public.internship_homologate_pair_swap(uuid,uuid,text) from public, anon;
grant execute on function public.internship_homologate_pair_swap(uuid,uuid,text) to authenticated;

create or replace function public.internship_decide_change(
  p_request_id uuid, p_approve boolean, p_note text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  request public.internship_change_requests;
  outcome uuid;
begin
  if not public.internship_is_coordinator() then
    raise exception 'Somente a Coordenação homologa trocas de plantão.' using errcode = '42501';
  end if;
  select * into request from public.internship_change_requests
    where id = p_request_id for update;
  if request.id is null or request.status <> 'pendente' then
    raise exception 'Solicitação já decidida ou inexistente.' using errcode = '23514';
  end if;
  if p_approve is null or (not p_approve and length(btrim(coalesce(p_note, ''))) < 5) then
    raise exception 'Informe a decisão e o motivo da recusa.' using errcode = '23514';
  end if;
  if p_approve then
    if request.change_type = 'permuta' then
      outcome := public.internship_homologate_pair_swap(
        request.assignment_id, request.other_assignment_id, request.reason
      );
    elsif request.change_type = 'troca' then
      outcome := public.internship_replace_with_impediment(
        request.assignment_id, request.new_student_id, request.reason_kind,
        request.reason_details, request.impediment_until
      );
    elsif request.change_type = 'substituicao' then
      outcome := public.internship_substitute_assignment(
        request.assignment_id, request.new_student_id, request.reason
      );
    elsif request.change_type = 'remanejamento' then
      outcome := public.internship_reschedule_gbm_assignment(
        request.assignment_id, request.resource_id, request.starts_at,
        request.ends_at, request.supervisor_name, request.reason, 'remanejamento'
      );
    else
      outcome := public.internship_handover_assignment(
        request.assignment_id, request.new_student_id, request.handover_at,
        request.reason
      );
    end if;
  end if;
  update public.internship_change_requests set
    status = case when p_approve then 'homologada' else 'recusada' end,
    decided_by = auth.uid(), decided_at = now(),
    decision_note = nullif(btrim(p_note), ''), result_id = outcome
  where id = request.id;
  return outcome;
end;
$$;

notify pgrst, 'reload schema';
