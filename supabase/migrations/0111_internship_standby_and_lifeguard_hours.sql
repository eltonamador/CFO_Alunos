-- Confirmação explícita de participação na instrução em sobreaviso da permanência.
create table public.internship_instruction_standby (
 id uuid primary key default gen_random_uuid(),
 instruction_id uuid not null references public.internship_instruction_blocks(id),
 assignment_id uuid not null references public.duty_assignments(id),
 context jsonb not null,
 active boolean not null default true,
 reason text not null,
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now(),
 unique(instruction_id,assignment_id)
);
alter table public.internship_instruction_standby enable row level security;
revoke all on public.internship_instruction_standby from public,anon,authenticated;
grant select on public.internship_instruction_standby to authenticated;
create policy standby_manager_read on public.internship_instruction_standby for select to authenticated using(public.internship_can_manage());
create trigger standby_audit after insert or update on public.internship_instruction_standby for each row execute function public.internship_audit_change();

create function public.internship_standby_context(p_instruction_id uuid,p_assignment_id uuid) returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object('instructionUpdatedAt',b.updated_at,'instructionStart',b.starts_at,'instructionEnd',b.ends_at,
   'studentId',a.student_id,'roleId',a.role_id,'serviceStart',ps.starts_at,'serviceEnd',ps.ends_at,'location',ps.location)
 from public.internship_instruction_blocks b join public.internship_programs p on p.id=b.program_id
 join public.duty_rosters r on r.class_id=p.class_id and r.status='publicada'
 join public.duty_permanence_services ps on ps.roster_id=r.id
 join public.duty_assignments a on a.roster_id=r.id and a.status in('prevista','confirmada')
 where b.id=p_instruction_id and a.id=p_assignment_id and b.active and ps.ends_at>now()
 and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(ps.starts_at,ps.ends_at,'[)');
$$;
revoke all on function public.internship_standby_context(uuid,uuid) from public,anon,authenticated;

create function public.internship_review_instruction_conflicts(p_program_id uuid)
returns table(instruction_id uuid,instruction_title text,assignment_id uuid,service_id uuid,service_kind text,
 site_name text,war_name text,starts_at timestamptz,ends_at timestamptz,review_context jsonb,standby_confirmed boolean)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito.' using errcode='42501'; end if;
 return query select c.*,ctx.value,coalesce(s.active and s.context=ctx.value,false)
 from public.internship_instruction_conflicts(p_program_id) c
 left join lateral(select public.internship_standby_context(c.instruction_id,c.assignment_id) value) ctx on c.service_kind='permanencia'
 left join public.internship_instruction_standby s on s.instruction_id=c.instruction_id and s.assignment_id=c.assignment_id;
end $$;
revoke all on function public.internship_review_instruction_conflicts(uuid) from public,anon;
grant execute on function public.internship_review_instruction_conflicts(uuid) to authenticated;

create function public.internship_confirm_instruction_standby(p_instruction_id uuid,p_assignment_id uuid,p_expected_context jsonb,p_confirmed boolean)
returns void language plpgsql security definer set search_path=public as $$
declare ctx jsonb;
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito.' using errcode='42501'; end if;
 perform 1 from public.internship_instruction_blocks where id=p_instruction_id for update;
 perform 1 from public.duty_assignments where id=p_assignment_id for update;
 perform 1 from public.duty_permanence_services where roster_id=(select roster_id from public.duty_assignments where id=p_assignment_id) for update;
 ctx:=public.internship_standby_context(p_instruction_id,p_assignment_id);
 if ctx is null or ctx is distinct from p_expected_context then
   raise exception 'A instrução ou permanência mudou. Atualize a página.' using errcode='40001';
 end if;
 if p_confirmed is null or upper(btrim(ctx->>'location')) not in('ABM','ACADEMIA BOMBEIRO MILITAR') then
   raise exception 'Confirme sobreaviso somente para permanência na ABM.' using errcode='23514';
 end if;
 insert into public.internship_instruction_standby(instruction_id,assignment_id,context,active,reason,updated_by)
 values(p_instruction_id,p_assignment_id,ctx,p_confirmed,
 case when p_confirmed then 'Gestor confirmou participação na instrução em sobreaviso da permanência na ABM.' else 'Confirmação de sobreaviso retirada pelo gestor.' end,auth.uid())
 on conflict(instruction_id,assignment_id) do update set context=excluded.context,active=excluded.active,reason=excluded.reason,updated_by=auth.uid(),updated_at=clock_timestamp();
end $$;
revoke all on function public.internship_confirm_instruction_standby(uuid,uuid,jsonb,boolean) from public,anon;
grant execute on function public.internship_confirm_instruction_standby(uuid,uuid,jsonb,boolean) to authenticated;

-- O vínculo de retificação é privado; só esta RPC pode autorizar a revisão de horários do plano.
create table public.internship_lifeguard_time_changes (
 id uuid primary key default gen_random_uuid(),
 plan_id uuid not null references public.internship_operation_plans(id),
 old_starts_at timestamptz not null,old_ends_at timestamptz not null,
 new_starts_at timestamptz not null,new_ends_at timestamptz not null,
 previous_assignments uuid[] not null,
 reason text not null check(length(btrim(reason)) between 5 and 1000),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 transaction_id bigint not null default txid_current()
);
alter table public.internship_lifeguard_time_changes enable row level security;
revoke all on public.internship_lifeguard_time_changes from public,anon,authenticated;
grant select on public.internship_lifeguard_time_changes to authenticated;
create policy lifeguard_time_changes_read on public.internship_lifeguard_time_changes for select to authenticated using(public.internship_can_manage());
create trigger lifeguard_time_change_audit after insert on public.internship_lifeguard_time_changes for each row execute function public.internship_audit_change();
do $$ declare def text; marker text; begin
 select pg_get_functiondef('public.internship_guard_operation_plan()'::regprocedure) into def;
 marker:='  if tg_op = ''DELETE'' then';
 if position(marker in def)=0 then raise exception 'Revisar guarda do plano antes da migração'; end if;
 def:=replace(def,marker,$patch$
  if tg_op='UPDATE' and exists(select 1 from public.internship_lifeguard_time_changes c
    where c.plan_id=old.id and c.transaction_id=txid_current()
      and c.old_starts_at=old.starts_at and c.old_ends_at=old.ends_at
      and c.new_starts_at=new.starts_at and c.new_ends_at=new.ends_at
      and (to_jsonb(old)-'starts_at'-'ends_at')=(to_jsonb(new)-'starts_at'-'ends_at')) then return new; end if;
$patch$||marker);
 execute def;
end $$;

create function public.internship_reschedule_lifeguard_day(p_program_id uuid,p_shift_date date,
 p_starts_at timestamptz,p_ends_at timestamptz,p_expected_assignments uuid[],p_expected_start timestamptz,p_expected_end timestamptz,p_reason text)
returns integer language plpgsql security definer set search_path=public as $$
declare p public.internship_programs; plan public.internship_operation_plans; svc public.internship_shifts;
 ids uuid[]; sh_ids uuid[]; sid uuid; aid uuid; new_shift uuid; old_assignment public.internship_assignments; v_count integer;
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito.' using errcode='42501'; end if;
 select * into strict p from public.internship_programs where id=p_program_id and status='publicado';
 if p_starts_at is null or p_ends_at is null or p_shift_date is null or p_starts_at<=now()
   or p_ends_at-p_starts_at not between interval '1 hour' and interval '8 hours'
   or (p_starts_at at time zone p.timezone)::date<>p_shift_date
   or (p_ends_at at time zone p.timezone)::date<>p_shift_date
   or extract(isodow from p_shift_date) not in(6,7)
   or p_shift_date not between p.starts_on and p.ends_on
   or length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then
   raise exception 'Informe um horário futuro de 1 a 8 horas, no mesmo dia de praia, e o motivo.' using errcode='23514';
 end if;
 -- Mesmo bloqueio usado pelo publicador de GV.
 perform 1 from public.internship_programs where id=p_program_id for update;
 select * into plan from public.internship_operation_plans
   where program_id=p_program_id and code='guarda_vida_'||to_char(p_shift_date,'YYYYMMDD') for update;
 if plan.id is null or plan.status not in('em_definicao','autorizado') then
   raise exception 'Escala de praia vigente não encontrada.' using errcode='23514';
 end if;
 perform 1 from public.internship_shifts where operation_plan_id=plan.id order by id for update;
 perform 1 from public.internship_assignments where shift_id in(select id from public.internship_shifts where operation_plan_id=plan.id) order by id for update;
 select array_agg(a.id order by a.id),array_agg(sh.id order by sh.id),count(distinct sh.site_id)
 into ids,sh_ids,v_count from public.internship_assignments a join public.internship_shifts sh on sh.id=a.shift_id
 where sh.operation_plan_id=plan.id and sh.status='publicado' and a.status='prevista';
 if cardinality(ids)<>5 or v_count<>5 or ids is null then
   raise exception 'Complete os cinco postos da praia antes de ajustar o horário do dia.' using errcode='23514';
 end if;
 if ids is distinct from (select array_agg(x order by x) from unnest(p_expected_assignments)x)
   or exists(select 1 from public.internship_shifts where id=any(sh_ids) and (starts_at is distinct from p_expected_start or ends_at is distinct from p_expected_end)) then
   raise exception 'A escala mudou. Atualize a página antes de ajustar os horários.' using errcode='40001';
 end if;
 if p_expected_start<=now() or exists(select 1 from public.internship_execution_records where assignment_id=any(ids))
   or exists(select 1 from public.internship_attendance_points where assignment_id=any(ids))
   or exists(select 1 from public.internship_evaluations where assignment_id=any(ids) and submitted_at is not null)
   or exists(select 1 from public.internship_handovers where outgoing_shift_id=any(sh_ids) or incoming_shift_id=any(sh_ids)) then
   raise exception 'Serviço iniciado ou com registro de execução não pode ser remanejado por esta opção.' using errcode='23514';
 end if;
 if p_starts_at=p_expected_start and p_ends_at=p_expected_end then return 0; end if;
 for sid in select student_id from public.internship_assignments where id=any(ids) order by student_id loop
   perform pg_advisory_xact_lock(hashtext(sid::text));
 end loop;
 -- Cancelamento, novos períodos e publicação são uma única transação; qualquer conflito desfaz tudo.
 insert into public.internship_lifeguard_time_changes(plan_id,old_starts_at,old_ends_at,new_starts_at,new_ends_at,previous_assignments,reason,created_by)
 values(plan.id,plan.starts_at,plan.ends_at,p_starts_at,p_ends_at,ids,btrim(p_reason),auth.uid());
 update public.internship_assignments set status='substituida',reason=btrim(p_reason),updated_by=auth.uid() where id=any(ids);
 update public.internship_shifts set status='cancelado',change_reason=btrim(p_reason) where id=any(sh_ids);
 update public.internship_operation_plans set starts_at=p_starts_at,ends_at=p_ends_at where id=plan.id;
 insert into public.internship_lifeguard_windows(program_id,shift_date,starts_at,ends_at,reason)
 values(p_program_id,p_shift_date,p_starts_at,p_ends_at,btrim(p_reason))
 on conflict(program_id,shift_date) do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,reason=excluded.reason;
 foreach aid in array ids loop
   select * into old_assignment from public.internship_assignments where id=aid;
   select * into svc from public.internship_shifts where id=old_assignment.shift_id;
   insert into public.internship_shifts(program_id,activity_type_id,site_id,resource_id,template_id,operation_plan_id,starts_at,ends_at,capacity,status,planned_supervisor_name,additional_member_required,change_reason,created_by)
   values(svc.program_id,svc.activity_type_id,svc.site_id,svc.resource_id,svc.template_id,svc.operation_plan_id,p_starts_at,p_ends_at,svc.capacity,'rascunho',svc.planned_supervisor_name,svc.additional_member_required,btrim(p_reason),auth.uid()) returning id into new_shift;
   -- Publicações legadas podem ter plano sem authorized_by; manter a autorização nominal do plantão.
   insert into public.internship_lifeguard_early_publications(shift_id,program_id,starts_at,ends_at,decision_reference)
   select new_shift,p_program_id,p_starts_at,p_ends_at,'Ajuste autorizado de GV: '||btrim(p_reason)
   from public.internship_lifeguard_early_publications where shift_id=svc.id;
   insert into public.internship_assignments(shift_id,student_id,assignment_source,replaces_assignment_id,reason,created_by)
   values(new_shift,old_assignment.student_id,'remanejamento',aid,btrim(p_reason),auth.uid());
   insert into public.internship_shift_uniforms(shift_id,uniform_code,reason,updated_by)
   select new_shift,uniform_code,'Uniforme mantido no ajuste do horário de praia.',auth.uid() from public.internship_shift_uniforms where shift_id=svc.id;
   update public.internship_shifts set status='publicado',published_by=auth.uid(),published_at=now() where id=new_shift;
 end loop;
 update public.internship_evaluations set status='revogada' where assignment_id=any(ids) and status='aguardando';
 return cardinality(ids);
end $$;
revoke all on function public.internship_reschedule_lifeguard_day(uuid,date,timestamptz,timestamptz,uuid[],timestamptz,timestamptz,text) from public,anon;
grant execute on function public.internship_reschedule_lifeguard_day(uuid,date,timestamptz,timestamptz,uuid[],timestamptz,timestamptz,text) to authenticated;
notify pgrst,'reload schema';
