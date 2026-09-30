-- Uma passagem de serviço divide o turno em dois períodos contíguos no mesmo
-- recurso. Cada participação mantém ficha, pontos, avaliação e carga próprios.
-- O vínculo imutável guarda a janela original; não reescreve escalas existentes.
create table public.internship_handovers (
  id uuid primary key default gen_random_uuid(),
  outgoing_assignment_id uuid not null unique references public.internship_assignments(id),
  outgoing_shift_id uuid not null unique references public.internship_shifts(id),
  incoming_assignment_id uuid not null unique references public.internship_assignments(id) deferrable initially deferred,
  incoming_shift_id uuid not null unique references public.internship_shifts(id) deferrable initially deferred,
  original_starts_at timestamptz not null,
  original_ends_at timestamptz not null,
  handover_at timestamptz not null,
  reason text not null check (length(btrim(reason)) between 5 and 500),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (original_starts_at < handover_at and handover_at < original_ends_at),
  check (date_trunc('minute',handover_at) = handover_at),
  check (outgoing_assignment_id <> incoming_assignment_id and outgoing_shift_id <> incoming_shift_id)
);
alter table public.internship_handovers enable row level security;
revoke all on public.internship_handovers from public,anon,authenticated;
grant select on public.internship_handovers to authenticated;
create policy internship_handovers_read on public.internship_handovers for select to authenticated
  using (public.internship_can_manage());
create trigger internship_handover_audit after insert on public.internship_handovers
  for each row execute function public.internship_audit_change();

-- Somente a RPC abaixo pode criar o vínculo que autoriza encurtar o turno.
-- Clientes não escrevem a tabela e nenhum parâmetro de sessão concede exceção.
do $$
declare definition text; marker text;
begin
  select pg_get_functiondef('public.internship_guard_shift()'::regprocedure) into definition;
  marker := '  select * into v_program from public.internship_programs where id = new.program_id;';
  if position(marker in definition)=0 then raise exception 'Revisar guarda de turnos antes da migração.'; end if;
  definition := replace(definition, marker, $patch$
  if tg_op = 'UPDATE' and old.status = 'publicado' and new.status = 'publicado'
    and exists (select 1 from public.internship_handovers h
      where h.outgoing_shift_id = old.id and old.starts_at = h.original_starts_at
        and old.ends_at = h.original_ends_at and new.ends_at = h.handover_at
        and new.change_reason = h.reason
        and (to_jsonb(new) - 'ends_at' - 'planned_minutes' - 'change_reason') =
            (to_jsonb(old) - 'ends_at' - 'planned_minutes' - 'change_reason')) then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.status = 'cancelado' and exists (
    select 1 from public.internship_handovers h
    where old.id in (h.outgoing_shift_id,h.incoming_shift_id)) then
    raise exception 'Período com passagem de serviço deve ser preservado; confira a ficha individual.' using errcode='23514';
  end if;
  if exists (select 1 from public.internship_handovers h where h.incoming_shift_id = new.id)
    and not exists (select 1 from public.internship_handovers h
      join public.internship_shifts previous on previous.id = h.outgoing_shift_id
      where h.incoming_shift_id = new.id
        and new.starts_at = h.handover_at and new.ends_at = h.original_ends_at
        and row(new.program_id,new.activity_type_id,new.site_id,new.resource_id,new.template_id,
          new.operation_plan_id,new.capacity,new.planned_supervisor_name,new.additional_member_required)
          is not distinct from row(previous.program_id,previous.activity_type_id,previous.site_id,
          previous.resource_id,previous.template_id,previous.operation_plan_id,previous.capacity,
          previous.planned_supervisor_name,previous.additional_member_required)) then
    raise exception 'O substituto deve permanecer no mesmo serviço e período da passagem.' using errcode='23514';
  end if;
$patch$ || marker);
  definition := replace(definition, 'if new.template_id is not null then',
    'if new.template_id is not null and not exists (select 1 from public.internship_handovers h where h.incoming_shift_id = new.id) then');
  execute definition;

  select pg_get_functiondef('public.internship_guard_assignment()'::regprocedure) into definition;
  marker := 'if tg_op = ''INSERT'' and new.assignment_source = ''substituicao''';
  if position(marker in definition)=0 then raise exception 'Revisar guarda de participações antes da migração.'; end if;
  definition := replace(definition, marker, marker || $patch$
    and not exists (select 1 from public.internship_handovers h
      join public.internship_assignments previous on previous.id = h.outgoing_assignment_id
      where h.incoming_assignment_id = new.id and h.incoming_shift_id = new.shift_id
        and h.outgoing_assignment_id = new.replaces_assignment_id
        and previous.student_id <> new.student_id and previous.status = 'prevista')
$patch$);
  definition := replace(definition, '  if tg_op = ''UPDATE'' then', $patch$
  if tg_op = 'UPDATE' and exists (select 1 from public.internship_handovers h
    where old.id in (h.outgoing_assignment_id,h.incoming_assignment_id)) then
    raise exception 'Participação com passagem de serviço deve ser preservada; use nova passagem ou confira a ficha.' using errcode='23514';
  end if;
  if tg_op = 'UPDATE' then
$patch$);
  execute definition;

  -- A homologação dos períodos não pode duplicar horas do plantão integral.
  select pg_get_functiondef('public.internship_guard_execution()'::regprocedure) into definition;
  marker := '  if new.revision_of_id is not null then';
  if position(marker in definition)=0 then raise exception 'Revisar guarda da homologação antes da migração.'; end if;
  definition := replace(definition,marker,$patch$
  if exists (select 1 from public.internship_handovers h
      where v_shift.id in (h.outgoing_shift_id,h.incoming_shift_id))
    and (new.actual_starts_at < v_shift.starts_at or new.actual_ends_at > v_shift.ends_at
      or new.approved_minutes > v_shift.planned_minutes) then
    raise exception 'A ficha deve respeitar o período individual da passagem de serviço.' using errcode='23514';
  end if;
$patch$ || marker);
  execute definition;

  -- Evita apagar as horas de quem já iniciou usando a troca integral antiga.
  select pg_get_functiondef('public.internship_substitute_assignment(uuid,uuid,text)'::regprocedure) into definition;
  marker := '  update public.internship_assignments set status = ''substituida''';
  if position(marker in definition)=0 then raise exception 'Revisar substituição integral antes da migração.'; end if;
  definition := replace(definition,marker,$patch$
  if exists (select 1 from public.internship_shifts where id=v_assignment.shift_id and starts_at <= now()) then
    raise exception 'Plantão iniciado: utilize a substituição durante o plantão.' using errcode='23514';
  end if;
$patch$ || marker);
  execute definition;
end $$;

create function public.internship_handover_assignment(
  p_assignment_id uuid, p_new_student_id uuid, p_handover_at timestamptz, p_reason text
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  original public.internship_assignments;
  service public.internship_shifts;
  existing public.internship_handovers;
  next_shift uuid := gen_random_uuid();
  next_assignment uuid := gen_random_uuid();
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do estágio.' using errcode='42501';
  end if;
  if p_new_student_id is null or p_handover_at is null or length(btrim(coalesce(p_reason,''))) not between 5 and 500 then
    raise exception 'Informe substituto, horário e motivo da passagem.' using errcode='23514';
  end if;
  select * into original from public.internship_assignments where id=p_assignment_id for update;
  select * into service from public.internship_shifts where id=original.shift_id for update;
  -- Reenvio idêntico é idempotente; outra troca da mesma participação é recusada.
  select * into existing from public.internship_handovers where outgoing_assignment_id=p_assignment_id;
  if found then
    if existing.handover_at = p_handover_at and existing.reason = btrim(p_reason)
      and exists(select 1 from public.internship_assignments where id=existing.incoming_assignment_id and student_id=p_new_student_id) then
      return existing.incoming_assignment_id;
    end if;
    raise exception 'Esta participação já teve passagem de serviço. Atualize a escala.' using errcode='23514';
  end if;
  if original.id is null or original.status <> 'prevista' or service.status <> 'publicado'
    or service.capacity <> 1 or original.student_id=p_new_student_id
    or p_handover_at <= service.starts_at or p_handover_at >= service.ends_at
    or p_handover_at > now() or date_trunc('minute',p_handover_at) <> p_handover_at then
    raise exception 'A passagem deve ter ocorrido entre o início e o término do plantão, com outro cadete.' using errcode='23514';
  end if;
  if not exists(select 1 from public.students s join public.internship_programs p on p.class_id=s.class_id
    where s.id=p_new_student_id and p.id=service.program_id and s.deleted_at is null and s.course_status='matriculado') then
    raise exception 'O substituto deve ser um cadete ativo da turma.' using errcode='23514';
  end if;
  if exists(select 1 from public.internship_execution_records where assignment_id=original.id)
    or exists(select 1 from public.internship_evaluations where assignment_id=original.id and submitted_at is not null) then
    raise exception 'A participação já tem ficha ou avaliação enviada. Revise-a antes de registrar a passagem.' using errcode='23514';
  end if;
  -- Mesma ordem de travas dos dois cadetes em toda passagem.
  perform pg_advisory_xact_lock(hashtext(s::text)) from unnest(array[original.student_id,p_new_student_id]) s order by s;
  perform pg_advisory_xact_lock(hashtext(service.resource_id::text));
  insert into public.internship_handovers(outgoing_assignment_id,outgoing_shift_id,incoming_assignment_id,
    incoming_shift_id,original_starts_at,original_ends_at,handover_at,reason,created_by)
  values(original.id,service.id,next_assignment,next_shift,service.starts_at,service.ends_at,
    p_handover_at,btrim(p_reason),auth.uid());

  update public.internship_shifts set ends_at=p_handover_at,change_reason=btrim(p_reason) where id=service.id;
  update public.internship_evaluations set context=public.internship_evaluation_context(original.id)
    where assignment_id=original.id and status='aguardando';
  insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,template_id,
    operation_plan_id,starts_at,ends_at,capacity,status,planned_supervisor_name,
    additional_member_required,change_reason,created_by)
  values(next_shift,service.program_id,service.activity_type_id,service.site_id,service.resource_id,
    service.template_id,service.operation_plan_id,p_handover_at,service.ends_at,1,'rascunho',
    service.planned_supervisor_name,service.additional_member_required,btrim(p_reason),auth.uid());
  -- Preserva a autorização já concedida ao GV com documento pendente.
  insert into public.internship_lifeguard_early_publications(shift_id,program_id,starts_at,ends_at,decision_reference)
  select next_shift,service.program_id,p_handover_at,service.ends_at,'Passagem de serviço: '||btrim(p_reason)
  from public.internship_activity_types activity where activity.id=service.activity_type_id
    and activity.code='guarda_vida';
  insert into public.internship_assignments(id,shift_id,student_id,assignment_source,reason,replaces_assignment_id,created_by)
  values(next_assignment,next_shift,p_new_student_id,'substituicao',btrim(p_reason),original.id,auth.uid());
  insert into public.internship_shift_uniforms(shift_id,uniform_code,reason,updated_by)
  select next_shift,uniform_code,'Uniforme mantido na passagem de serviço.',auth.uid()
  from public.internship_shift_uniforms where shift_id=service.id;
  update public.internship_shifts set status='publicado',published_by=auth.uid(),published_at=now() where id=next_shift;
  return next_assignment;
end $$;
revoke all on function public.internship_handover_assignment(uuid,uuid,timestamptz,text) from public,anon;
grant execute on function public.internship_handover_assignment(uuid,uuid,timestamptz,text) to authenticated;
notify pgrst,'reload schema';
