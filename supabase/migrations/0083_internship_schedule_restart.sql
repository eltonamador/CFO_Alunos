-- Recomeço administrativo da escala publicada, com histórico preservado.
create table public.internship_schedule_restarts (
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null references public.internship_programs(id) on delete restrict,
 actor_id uuid not null references auth.users(id),
 reason text not null check(length(btrim(reason)) >= 5),
 cancelled_shifts integer not null,
 cancelled_assignments integer not null,
 revoked_invites integer not null,
 created_at timestamptz not null default now()
);
alter table public.internship_schedule_restarts enable row level security;
revoke all on public.internship_schedule_restarts from public,anon,authenticated;
grant select on public.internship_schedule_restarts to authenticated;
create policy internship_restart_coord_read on public.internship_schedule_restarts
 for select to authenticated using(public.is_coord() and public.internship_can_manage());
create trigger internship_restart_audit after insert on public.internship_schedule_restarts
 for each row execute function public.internship_audit_change();

create function public.internship_schedule_restart_preview(p_program_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not (public.is_coord() and public.internship_can_manage()) then
   raise exception 'Somente a Coordenação pode recomeçar a escala.' using errcode='42501';
 end if;
 if not exists(select 1 from public.internship_programs where id=p_program_id and status='publicado') then
   raise exception 'Programa publicado não encontrado.' using errcode='23514';
 end if;
 with shifts as (
   select id,starts_at,ends_at from public.internship_shifts
   where program_id=p_program_id and status='publicado'
 ), assignments as (
   select a.id,a.shift_id from public.internship_assignments a join shifts sh on sh.id=a.shift_id
   where a.status='prevista'
 ), invitation as (
   select e.id,e.status from public.internship_evaluations e join assignments a on a.id=e.assignment_id
 )
 select jsonb_build_object(
  'published_shifts',(select count(*) from shifts),
  'active_assignments',(select count(*) from assignments),
  'future_shifts',(select count(*) from shifts where starts_at>now()),
  'attendance_points',(select count(*) from public.internship_attendance_points pt join assignments a on a.id=pt.assignment_id),
  'cadet_reports',(select count(*) from public.internship_cadet_reports report join assignments a on a.id=report.assignment_id),
  'execution_records',(select count(*) from public.internship_execution_records record join assignments a on a.id=record.assignment_id),
  'open_invites',(select count(*) from invitation where status='aguardando'),
  'answered_evaluations',(select count(*) from invitation where status in ('respondida','liberada','devolvida')),
  'snapshot',(select md5(coalesce(string_agg(sh.id::text||':'||sh.starts_at::text||':'||sh.ends_at::text||':'||coalesce(a.id::text,''),'|' order by sh.id,a.id),'empty'))
     from shifts sh left join assignments a on a.shift_id=sh.id)
 ) into result;
 return result;
end $$;
revoke all on function public.internship_schedule_restart_preview(uuid) from public,anon;
grant execute on function public.internship_schedule_restart_preview(uuid) to authenticated;

create function public.internship_schedule_restart(p_program_id uuid,p_snapshot text,p_reason text) returns uuid
language plpgsql security definer set search_path=public as $$
declare scope jsonb; batch_id uuid; shifts_count integer; assignments_count integer; invites_count integer; reason_clean text;
begin
 if not (public.is_coord() and public.internship_can_manage()) then
   raise exception 'Somente a Coordenação pode recomeçar a escala.' using errcode='42501';
 end if;
 reason_clean:=btrim(coalesce(p_reason,''));
 if length(reason_clean)<5 then raise exception 'Informe o motivo para recomeçar.' using errcode='23514';end if;
 -- Serialize publication, point, evaluation and execution until the snapshot has been checked.
 lock table public.internship_shifts,public.internship_assignments,
  public.internship_execution_records,public.internship_attendance_points,
  public.internship_cadet_reports,public.internship_evaluations in share row exclusive mode;
 scope:=public.internship_schedule_restart_preview(p_program_id);
 if scope->>'snapshot' is distinct from p_snapshot then
   raise exception 'A escala mudou desde a conferência. Recarregue a página.' using errcode='40001';
 end if;
 if (scope->>'published_shifts')::integer=0 then
   raise exception 'Não há plantões ativos para recomeçar.' using errcode='23514';
 end if;
 if (scope->>'published_shifts')::integer<>(scope->>'future_shifts')::integer
  or (scope->>'execution_records')::integer>0
  or (scope->>'attendance_points')::integer>0
  or (scope->>'cadet_reports')::integer>0
  or (scope->>'answered_evaluations')::integer>0 then
   raise exception 'Há plantão iniciado, ponto, relato, execução ou avaliação respondida. Faça a conferência individual antes de recomeçar.' using errcode='23514';
 end if;
 update public.internship_evaluations e set status='revogada'
  where e.status='aguardando' and exists(
   select 1 from public.internship_assignments a join public.internship_shifts sh on sh.id=a.shift_id
   where a.id=e.assignment_id and a.status='prevista' and sh.program_id=p_program_id and sh.status='publicado');
 get diagnostics invites_count=row_count;
 update public.internship_assignments a set status='cancelada',reason=reason_clean,updated_by=auth.uid()
  where a.status='prevista' and exists(
   select 1 from public.internship_shifts sh where sh.id=a.shift_id and sh.program_id=p_program_id and sh.status='publicado');
 get diagnostics assignments_count=row_count;
 update public.internship_shifts set status='cancelado',change_reason=reason_clean
  where program_id=p_program_id and status='publicado';
 get diagnostics shifts_count=row_count;
 insert into public.internship_schedule_restarts(program_id,actor_id,reason,cancelled_shifts,cancelled_assignments,revoked_invites)
 values(p_program_id,auth.uid(),reason_clean,shifts_count,assignments_count,invites_count)
 returning id into batch_id;
 return batch_id;
end $$;
revoke all on function public.internship_schedule_restart(uuid,text,text) from public,anon;
grant execute on function public.internship_schedule_restart(uuid,text,text) to authenticated;
