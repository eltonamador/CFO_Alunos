-- =====================================================================
-- 0029 - Fardamento, status do curso e conjuge
-- =====================================================================

alter table public.student_logistics
  add column if not exists gandola_size text,
  add column if not exists pants_size text;

alter table public.students
  add column if not exists course_status text not null default 'matriculado',
  add column if not exists spouse_name text;

alter table public.students
  drop constraint if exists students_course_status_check;

alter table public.students
  add constraint students_course_status_check
  check (course_status in (
    'matriculado',
    'excluido',
    'trancado',
    'desistente',
    'transferido',
    'concluido',
    'outro'
  ));

update public.students
  set course_status = 'matriculado'
  where course_status is null;

-- Apenas coordenacao pode alterar o status administrativo do cadete.
create or replace function public.prevent_non_coord_course_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.course_status is distinct from old.course_status
     and auth.uid() is not null
     and not public.is_coord() then
    raise exception 'Apenas Coordenacao pode alterar a situacao no curso.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_students_protect_course_status on public.students;
create trigger trg_students_protect_course_status
  before update on public.students
  for each row execute function public.prevent_non_coord_course_status_change();

-- Apenas coordenacao pode alterar os tamanhos de fardamento.
create or replace function public.prevent_non_coord_uniform_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_coord() then
    if tg_op = 'INSERT'
       and (new.gandola_size is not null or new.pants_size is not null) then
      raise exception 'Apenas Coordenacao pode alterar dados de fardamento.';
    end if;

    if tg_op = 'UPDATE'
       and (
         new.gandola_size is distinct from old.gandola_size
         or new.pants_size is distinct from old.pants_size
       ) then
      raise exception 'Apenas Coordenacao pode alterar dados de fardamento.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_logistics_protect_uniform on public.student_logistics;
create trigger trg_logistics_protect_uniform
  before insert or update on public.student_logistics
  for each row execute function public.prevent_non_coord_uniform_change();

-- Backfill inicial dos tamanhos por nome de guerra. Mantem MILENA sem valor.
with uniform_data(war_name, gandola_size, pants_size) as (
  values
    ('RIVALDO', '42M', '46M'),
    ('IAN LIMA', '42M', '44M'),
    ('P. AMARAL', '50M', '48M'),
    ('V. MARTINS', '44M', '44M'),
    ('SABRINA', '38F', '44F'),
    ('CAXIAS', '40M', '42M'),
    ('GABRIEL', '40M', '40M'),
    ('PABLO', '44M', '44M'),
    ('CRISTINE', '36F', '42F'),
    ('GEOVAN', '44M', '44M'),
    ('GLEITON', '48M', '46M'),
    ('FERNANDES', '42M', '46M'),
    ('GIOVANNA', '36F', '42F'),
    ('ARIADNE', '40F', '44F'),
    ('CAMPOS', '44M', '44M'),
    ('DIAS JUNIOR', '48M', '48M'),
    ('SALES', '40M', '42M'),
    ('SERRA DIAS', '40M', '44M'),
    ('FREIRE', '36F', '42F'),
    ('T. SANTOS', '38M', '40M'),
    ('JOAO', '40M', '44M'),
    ('SAMILO', '42M', '44M'),
    ('M. NASCIMENTO', '42M', '44M'),
    ('ARTUR', '42M', '46M'),
    ('FREDSON', '42M', '48M'),
    ('SILVA NUNES', '44M', '42M'),
    ('MILENA', null, null),
    ('J. BORGES', '38F', '40F'),
    ('CAROLINA', '40F', '44F'),
    ('JULIANA', '36F', '42F')
),
matched as (
  select s.id as student_id, u.gandola_size, u.pants_size
  from uniform_data u
  join public.students s on upper(s.war_name) = u.war_name
  where s.deleted_at is null
)
insert into public.student_logistics (student_id, gandola_size, pants_size)
select student_id, gandola_size, pants_size
from matched
on conflict (student_id) do update
  set gandola_size = excluded.gandola_size,
      pants_size = excluded.pants_size;

update public.students
  set course_status = 'excluido'
  where upper(war_name) = 'MILENA'
    and deleted_at is null;

comment on column public.student_logistics.gandola_size is
  'Tamanho da gandola do fardamento. Alteracao restrita a Coordenacao.';

comment on column public.student_logistics.pants_size is
  'Tamanho da calca do fardamento. Alteracao restrita a Coordenacao.';

comment on column public.students.course_status is
  'Situacao estruturada do cadete no curso. Alteracao restrita a Coordenacao.';

comment on column public.students.spouse_name is
  'Nome do conjuge ou companheiro(a), usado quando estado civil exige informacao.';
