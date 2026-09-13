-- A equipe do dia é informação operacional: cadetes da mesma turma podem
-- consultar somente as atribuições publicadas de hoje e amanhã. O histórico
-- completo dos demais cadetes continua protegido.
create function public.schedule_same_active_class(p_student_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.students viewer
    join public.students teammate on teammate.class_id = viewer.class_id
    where viewer.id = public.current_student_id()
      and teammate.id = p_student_id
      and viewer.deleted_at is null
      and teammate.deleted_at is null
      and viewer.course_status = 'matriculado'
      and teammate.course_status = 'matriculado'
  )
$$;

revoke all on function public.schedule_same_active_class(uuid) from public, anon;
grant execute on function public.schedule_same_active_class(uuid) to authenticated;

drop policy schedule_assignments_read on public.schedule_assignments;
create policy schedule_assignments_read on public.schedule_assignments for select to authenticated
using (
  public.schedule_active_role() = 'coordenacao'
  or (
    status = 'published'
    and duty_date between (now() at time zone 'America/Belem')::date
                      and (now() at time zone 'America/Belem')::date + 1
    and (
      public.schedule_active_role() in ('instrutor', 'secretaria')
      or (
        public.schedule_active_role() = 'aluno'
        and public.schedule_same_active_class(student_id)
      )
    )
  )
  or (
    public.schedule_active_role() = 'aluno'
    and student_id = public.current_student_id()
  )
);

create index idx_schedule_assignments_dashboard
  on public.schedule_assignments(duty_date, status, student_id)
  where status = 'published';
