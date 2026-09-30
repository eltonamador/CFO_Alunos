-- Delegation is scoped to internship. The global profile remains aluno.
create table public.internship_administrators (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete restrict,
  active boolean not null default true,
  reason text not null check(length(btrim(reason))>=5),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.internship_administrators enable row level security;
revoke all on public.internship_administrators from public,anon,authenticated;
grant select,insert,update,delete on public.internship_administrators to authenticated;
-- Deliberately use the original global role, not internship_has_role, for delegation.
create policy internship_administrators_coord on public.internship_administrators
  for all to authenticated
  using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role='coordenacao'))
  with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role='coordenacao'));
create trigger internship_administrators_audit after insert or update or delete on public.internship_administrators
  for each row execute function public.internship_audit_change();

create function public.internship_can_manage() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and (
    p.role='coordenacao' or (p.role='aluno' and exists(
      select 1 from public.internship_administrators a join public.students s on s.id=a.student_id
      where a.student_id=p.student_id and a.active and s.deleted_at is null
    ))
  ));
$$;
revoke all on function public.internship_can_manage() from public,anon;
grant execute on function public.internship_can_manage() to authenticated;

-- All existing internship policies and RPCs share this module-only gate.
create or replace function public.internship_has_role(p_roles text[]) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.role=any(p_roles))
    or ('coordenacao'=any(p_roles) and public.internship_can_manage());
$$;

-- Minimal roster for planning; no access to students' full civil/sensitive records.
create function public.internship_planning_cadets(p_program_id uuid)
returns table(id uuid,war_name text,student_number integer)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.internship_can_manage() then raise exception 'Acesso restrito à administração do estágio.' using errcode='42501'; end if;
  return query select s.id,s.war_name,s.student_number from public.students s
    join public.internship_programs p on p.class_id=s.class_id
    where p.id=p_program_id and s.deleted_at is null order by s.student_number,s.id;
end;
$$;
revoke all on function public.internship_planning_cadets(uuid) from public,anon;
grant execute on function public.internship_planning_cadets(uuid) to authenticated;

-- Only blocked dates are exposed, not medical details, duty notes or other administration.
create function public.internship_planning_constraints(p_program_id uuid)
returns table(id uuid,student_id uuid,starts_on date,ends_on date,kind text)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.internship_can_manage() then raise exception 'Acesso restrito à administração do estágio.' using errcode='42501'; end if;
  return query
    select d.id,d.student_id,d.duty_date,d.duty_date,'abm'::text from public.duty_assignments d
    join public.students s on s.id=d.student_id join public.internship_programs p on p.class_id=s.class_id
    where p.id=p_program_id and s.deleted_at is null and d.status in ('prevista','confirmada')
    union all
    select i.id,i.student_id,i.starts_on,i.ends_on,'impedimento'::text from public.duty_impediments i
    join public.students s on s.id=i.student_id join public.internship_programs p on p.class_id=s.class_id
    where p.id=p_program_id and s.deleted_at is null and i.active;
end;
$$;
revoke all on function public.internship_planning_constraints(uuid) from public,anon;
grant execute on function public.internship_planning_constraints(uuid) to authenticated;

-- User-authorized grant, tied to the verified cadet identity rather than login metadata.
do $$
declare v_student uuid; v_count integer;
begin
  select count(*),(array_agg(s.id))[1] into v_count,v_student
    from public.students s join public.classes c on c.id=s.class_id join public.courses course on course.id=c.course_id
    where s.full_name='IAN CAVALCANTE LIMA' and s.war_name='IAN LIMA' and s.student_number=2
      and c.name='CFO 2026.1' and course.code='CFO-2026' and s.deleted_at is null;
  if v_count>1 then raise exception 'Identificação ambígua do cadete Ian Lima.'; end if;
  if v_count=1 then
    insert into public.internship_administrators(student_id,reason)
    values(v_student,'Administração do estágio delegada a Ian Lima por solicitação da Coordenação em 23/09/2026.');
  end if;
end $$;
