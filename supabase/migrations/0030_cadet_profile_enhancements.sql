-- =====================================================================
-- 0030 - Data de inclusao, observacoes da coordenacao, especializacao
--        operacional/estagio e correcao do nome do Cad Hamilton.
-- =====================================================================

alter table public.students
  add column if not exists enrollment_date date,
  add column if not exists coordination_notes text,
  add column if not exists has_specialization boolean,
  add column if not exists specialization_name text,
  add column if not exists specialization_institution text,
  add column if not exists specialization_period text;

-- Backfill da data de inclusao para a turma atual (CFO 2026.1).
update public.students
  set enrollment_date = date '2026-06-01'
  where enrollment_date is null
    and deleted_at is null;

-- Default para novos cadetes desta turma.
alter table public.students
  alter column enrollment_date set default date '2026-06-01';

-- Atualiza o nome completo do Cad Hamilton.
update public.students
  set full_name = 'Hamilton da Silva Cavalcante'
  where deleted_at is null
    and (
      lower(full_name) like 'hamilton%'
      or upper(war_name) = 'HAMILTON'
    );

comment on column public.students.enrollment_date is
  'Data de inclusao/matricula do cadete no curso.';

comment on column public.students.coordination_notes is
  'Observacoes livres da coordenacao sobre o cadete. Edicao restrita a Coordenacao.';

comment on column public.students.has_specialization is
  'Indica se o cadete possui curso de especializacao operacional ou estagio.';

comment on column public.students.specialization_name is
  'Nome do curso de especializacao operacional ou estagio.';

comment on column public.students.specialization_institution is
  'Instituicao do curso de especializacao/estagio, se houver.';

comment on column public.students.specialization_period is
  'Ano ou periodo do curso de especializacao/estagio, se houver.';
