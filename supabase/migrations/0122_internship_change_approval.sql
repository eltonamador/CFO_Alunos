-- A administração delegada propõe trocas; somente um perfil real de Coordenação
-- pode efetivá-las. A proposta não altera a escala.
create function public.internship_is_coordinator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active and p.role = 'coordenacao'
  );
$$;
revoke all on function public.internship_is_coordinator() from public, anon;
grant execute on function public.internship_is_coordinator() to authenticated;

create table public.internship_change_requests (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.internship_assignments(id) on delete restrict,
  change_type text not null check (change_type in ('troca', 'substituicao', 'remanejamento', 'passagem')),
  new_student_id uuid references public.students(id),
  resource_id uuid references public.internship_resources(id),
  starts_at timestamptz,
  ends_at timestamptz,
  handover_at timestamptz,
  supervisor_name text,
  reason_kind text,
  reason_details text,
  impediment_until date,
  reason text,
  status text not null default 'pendente' check (status in ('pendente', 'homologada', 'recusada')),
  requested_by uuid not null references auth.users(id),
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_note text,
  result_id uuid,
  check ((status = 'pendente' and decided_by is null and decided_at is null)
    or (status <> 'pendente' and decided_by is not null and decided_at is not null))
);
create unique index internship_change_one_pending_per_assignment
  on public.internship_change_requests(assignment_id) where status = 'pendente';
create index internship_change_requests_recent
  on public.internship_change_requests(requested_at desc);
alter table public.internship_change_requests enable row level security;
revoke all on public.internship_change_requests from public, anon, authenticated;
grant select on public.internship_change_requests to authenticated;
create policy internship_change_requests_read on public.internship_change_requests
  for select to authenticated using (
    public.internship_is_coordinator() or requested_by = auth.uid()
  );
create trigger internship_change_requests_audit
  after insert or update on public.internship_change_requests
  for each row execute function public.internship_audit_change();

-- A guarda também protege chamadas diretas das RPCs antigas e escritas diretas
-- nas participações, independentemente de qual tela iniciou a troca.
do $$
declare definition text; marker text;
begin
  select pg_get_functiondef('public.internship_guard_assignment()'::regprocedure) into definition;
  marker := E'begin\n  if auth.uid() is not null';
  if position(marker in definition) = 0 then
    raise exception 'Guarda de participações mudou; revisar bloqueio de troca delegada.';
  end if;
  definition := replace(definition, marker, $patch$begin
  if auth.uid() is not null and not public.internship_is_coordinator() then
    if tg_op = 'UPDATE' and new.status = 'substituida' then
      raise exception 'Troca proposta pela administração delegada exige homologação da Coordenação.' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' and new.assignment_source in ('substituicao', 'remanejamento') then
      raise exception 'Troca proposta pela administração delegada exige homologação da Coordenação.' using errcode = '42501';
    end if;
  end if;
  if auth.uid() is not null$patch$);
  execute definition;
end $$;

create function public.internship_request_change(
  p_assignment_id uuid, p_change_type text, p_new_student_id uuid default null,
  p_resource_id uuid default null, p_starts_at timestamptz default null,
  p_ends_at timestamptz default null, p_handover_at timestamptz default null,
  p_supervisor_name text default null, p_reason_kind text default null,
  p_reason_details text default null, p_impediment_until date default null,
  p_reason text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  assignment public.internship_assignments;
  service public.internship_shifts;
  request_id uuid;
begin
  if not public.internship_can_manage() or public.internship_is_coordinator() then
    raise exception 'Somente a administração delegada solicita homologação de troca.' using errcode = '42501';
  end if;
  if p_change_type not in ('troca', 'substituicao', 'remanejamento', 'passagem')
    or p_change_type is null then
    raise exception 'Tipo de troca inválido.' using errcode = '23514';
  end if;
  select * into assignment from public.internship_assignments where id = p_assignment_id;
  select * into service from public.internship_shifts where id = assignment.shift_id;
  if assignment.id is null or service.id is null
    or service.status not in ('publicado', 'cancelado') then
    raise exception 'Participação indisponível para troca.' using errcode = '23514';
  end if;
  if p_change_type <> 'passagem' and service.starts_at <= now() then
    raise exception 'Trocas futuras devem ser solicitadas antes do início do plantão.' using errcode = '23514';
  end if;
  if p_change_type = 'troca' then
    if assignment.status not in ('prevista', 'cancelada')
      or p_new_student_id is null or p_new_student_id = assignment.student_id
      or p_reason_kind not in ('saude', 'outro')
      or (p_reason_kind = 'outro' and length(btrim(coalesce(p_reason_details, ''))) < 5)
      or p_impediment_until is null then
      raise exception 'Confira o substituto, o motivo e o fim do impedimento.' using errcode = '23514';
    end if;
  elsif p_change_type = 'substituicao' then
    if assignment.status <> 'prevista' or p_new_student_id is null
      or p_new_student_id = assignment.student_id
      or length(btrim(coalesce(p_reason, ''))) not between 5 and 500 then
      raise exception 'Confira o substituto e o motivo.' using errcode = '23514';
    end if;
  elsif p_change_type = 'remanejamento' then
    if assignment.status <> 'prevista' or p_resource_id is null
      or p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at
      or length(btrim(coalesce(p_supervisor_name, ''))) not between 3 and 120
      or length(btrim(coalesce(p_reason, ''))) not between 5 and 500 then
      raise exception 'Confira novo plantão e motivo do remanejamento.' using errcode = '23514';
    end if;
  else
    if assignment.status <> 'prevista' or service.status <> 'publicado'
      or p_new_student_id is null or p_new_student_id = assignment.student_id
      or p_handover_at is null or p_handover_at <= service.starts_at
      or p_handover_at >= service.ends_at or p_handover_at > now()
      or length(btrim(coalesce(p_reason, ''))) not between 5 and 500 then
      raise exception 'Confira substituto, horário e motivo da passagem.' using errcode = '23514';
    end if;
  end if;
  insert into public.internship_change_requests(
    assignment_id, change_type, new_student_id, resource_id, starts_at,
    ends_at, handover_at, supervisor_name, reason_kind, reason_details,
    impediment_until, reason, requested_by
  ) values (
    p_assignment_id, p_change_type, p_new_student_id, p_resource_id, p_starts_at,
    p_ends_at, p_handover_at, nullif(btrim(p_supervisor_name), ''), p_reason_kind,
    nullif(btrim(p_reason_details), ''), p_impediment_until,
    nullif(btrim(p_reason), ''), auth.uid()
  ) returning id into request_id;
  return request_id;
end;
$$;
revoke all on function public.internship_request_change(
  uuid,text,uuid,uuid,timestamptz,timestamptz,timestamptz,text,text,text,date,text
) from public, anon;
grant execute on function public.internship_request_change(
  uuid,text,uuid,uuid,timestamptz,timestamptz,timestamptz,text,text,text,date,text
) to authenticated;

create function public.internship_decide_change(
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
    if request.change_type = 'troca' then
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
revoke all on function public.internship_decide_change(uuid,boolean,text) from public, anon;
grant execute on function public.internship_decide_change(uuid,boolean,text) to authenticated;

notify pgrst, 'reload schema';
