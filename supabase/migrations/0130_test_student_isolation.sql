-- O aluno de teste entra no portal publicado sem integrar efetivo, escalas,
-- relatórios e mural oficial. O marcador é protegido no banco.
alter table public.students
  add column is_test boolean not null default false;

create index students_test_flag on public.students(id) where is_test;

create function public.students_guard_test_marker() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.is_test is distinct from old.is_test
    and auth.uid() is not null then
    raise exception 'Marcador de aluno de teste não pode ser alterado pelo aplicativo.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.students_guard_test_marker() from public, anon, authenticated;
create trigger students_guard_test_marker before update on public.students
  for each row execute function public.students_guard_test_marker();

-- Coordenação, Secretaria e Instrutores não recebem a ficha de teste em
-- consultas comuns; o próprio Boris conserva acesso à sua ficha.
create policy students_hide_test_from_others on public.students
  as restrictive for select to authenticated
  using (not is_test or id = public.current_student_id());

-- Views existentes usam privilégios do dono e precisam de filtro explícito.
create or replace view public.v_student_card_instructor as
select
  s.id, s.class_id, s.student_number, s.war_name, s.full_name, s.pelotao,
  s.photo_path, c.whatsapp, c.email_institutional,
  case when a.from_other_state is true then 'outro_estado' else 'amapa' end as origin_label,
  (v.has_vehicle is true) as has_vehicle,
  exists (select 1 from public.health_restrictions h
    where h.student_id = s.id and h.validation_status = 'validado'
      and h.operational_summary is not null) as has_restriction,
  (select operational_summary from public.health_restrictions h
    where h.student_id = s.id and h.validation_status = 'validado') as operational_summary,
  (select cs.war_name from public.canga_assignments ca
    join public.students cs on cs.id = ca.canga_student_id
    where ca.student_id = s.id and ca.is_current = true) as canga_war_name,
  (select cs.student_number from public.canga_assignments ca
    join public.students cs on cs.id = ca.canga_student_id
    where ca.student_id = s.id and ca.is_current = true) as canga_number
from public.students s
left join public.student_contacts c on c.student_id = s.id
left join public.student_addresses a on a.student_id = s.id
left join public.vehicles v on v.student_id = s.id
where s.deleted_at is null and s.course_status = 'matriculado' and not s.is_test;

create or replace view public.v_student_class_basic as
select s.id, s.class_id, s.student_number, s.war_name, s.pelotao, s.photo_path
from public.students s
where s.deleted_at is null and s.course_status = 'matriculado' and not s.is_test;

create function public.student_is_test(p_student_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select s.is_test from public.students s where s.id = p_student_id), false);
$$;
revoke all on function public.student_is_test(uuid) from public, anon;
grant execute on function public.student_is_test(uuid) to authenticated;

-- Boris pode ver o mural dos colegas da turma; seu próprio relato nunca
-- aparece para cadetes reais ou para o painel de moderação da Coordenação.
create or replace function public.internship_diary_classmate(p_student_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles me
    join public.students mine on mine.id = me.student_id and mine.deleted_at is null
    join public.students author on author.id = p_student_id and author.class_id = mine.class_id
    where me.id = auth.uid() and me.active and me.role = 'aluno'
      and (not author.is_test or mine.is_test)
  );
$$;

create or replace function public.internship_diary_can_react(p_entry_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not public.student_is_test(public.current_student_id()) and exists (
    select 1 from public.internship_diary_entries e
    where e.id = p_entry_id and e.status = 'compartilhado' and e.hidden_at is null
      and e.student_id is distinct from public.current_student_id()
      and (public.internship_diary_classmate(e.student_id)
        or public.internship_diary_is_coordination())
  );
$$;

drop policy internship_diary_entries_coordination on public.internship_diary_entries;
create policy internship_diary_entries_coordination on public.internship_diary_entries
  for select to authenticated
  using (status <> 'rascunho' and public.internship_diary_is_coordination()
    and not public.student_is_test(student_id));

notify pgrst, 'reload schema';
