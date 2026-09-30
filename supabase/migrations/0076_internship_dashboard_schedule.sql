-- Leitura operacional mínima para os painéis iniciais. Nenhum cliente lê tabelas de execução diretamente.
create function public.internship_dashboard_schedule(p_from date,p_to date)
returns table (
 assignment_id uuid,student_id uuid,student_number integer,war_name text,
 activity_name text,site_name text,resource_name text,
 starts_at timestamptz,ends_at timestamptz,uniform_code text,validated_minutes bigint
)
language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.active
   and p.role in ('aluno','coordenacao','instrutor','secretaria')
   and (p.role<>'aluno' or p.student_id is not null)) then
   raise exception 'Consulta restrita aos usuários ativos do CFO.' using errcode='42501';
 end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>30 then
   raise exception 'Consulte até 31 dias por vez.' using errcode='23514';
 end if;
 return query
 with programs as (
   select p.id,p.timezone from public.internship_programs p
   join public.classes class on class.id=p.class_id
   join public.courses course on course.id=class.course_id
   where p.status='publicado' and class.name='CFO 2026.1' and course.code='CFO-2026'
 ), active as (
   select a.id,a.student_id,sh.id as shift_id,sh.program_id
   from public.internship_assignments a
   join public.internship_shifts sh on sh.id=a.shift_id
   join programs p on p.id=sh.program_id
   where a.status='prevista' and sh.status='publicado'
 ), current_records as (
   select r.assignment_id,r.approved_minutes
   from public.internship_execution_records r
   join active a on a.id=r.assignment_id
   where r.validation_status='homologado' and not exists(
     select 1 from public.internship_execution_records child where child.revision_of_id=r.id
   )
 ), totals as (
   select a.student_id,coalesce(sum(r.approved_minutes),0)::bigint as minutes
   from active a left join current_records r on r.assignment_id=a.id
   group by a.student_id
 )
 select a.id,a.student_id,s.student_number,s.war_name,activity.name,site.name,resource.display_name,
   sh.starts_at,sh.ends_at,
   coalesce(uniform.uniform_code,case when activity.code='guarda_vida' then '4D' else '3A' end),
   coalesce(t.minutes,0)::bigint
 from active a
 join public.internship_shifts sh on sh.id=a.shift_id
 join programs p on p.id=sh.program_id
 join public.students s on s.id=a.student_id and s.deleted_at is null
 join public.internship_activity_types activity on activity.id=sh.activity_type_id
 join public.internship_sites site on site.id=sh.site_id
 join public.internship_resources resource on resource.id=sh.resource_id
 left join public.internship_shift_uniforms uniform on uniform.shift_id=sh.id
 left join totals t on t.student_id=a.student_id
 where (sh.starts_at at time zone p.timezone)::date between p_from and p_to
 order by sh.starts_at,site.name,s.student_number;
end$$;
revoke all on function public.internship_dashboard_schedule(date,date) from public,anon;
grant execute on function public.internship_dashboard_schedule(date,date) to authenticated;
notify pgrst,'reload schema';
