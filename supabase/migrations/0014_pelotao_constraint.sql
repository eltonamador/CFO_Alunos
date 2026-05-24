-- =====================================================================
-- 0014 — Fase/Pelotão como enum: CFO I, CFO II, CFO III
-- Default = 'CFO I' (todos os alunos iniciam aqui).
-- =====================================================================

-- 1. Migração de valores legados (se existirem) para um valor compatível
-- ou null antes de aplicar o check constraint.
update public.students
set pelotao = 'CFO I'
where pelotao is not null
  and pelotao not in ('CFO I', 'CFO II', 'CFO III');

-- 2. Default
alter table public.students
  alter column pelotao set default 'CFO I';

-- 3. Check constraint
alter table public.students
  drop constraint if exists chk_students_pelotao;
alter table public.students
  add constraint chk_students_pelotao
  check (pelotao is null or pelotao in ('CFO I', 'CFO II', 'CFO III'));

comment on column public.students.pelotao is
  'Fase/Pelotão do CFO. Enum: CFO I | CFO II | CFO III. Editável apenas pela Coordenação.';
