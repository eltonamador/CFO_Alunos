-- =====================================================================
-- SEED — dados fictícios de DEV
-- IMPORTANTE: usuários auth.users devem ser criados separadamente
-- (via Supabase Studio ou script). Aqui criamos profiles apenas após
-- existirem auth.users com os UUIDs correspondentes.
-- =====================================================================
-- Como popular:
--   1. Rodar migrations:  supabase db reset
--   2. Criar usuários:    pnpm tsx scripts/seed-users.ts
--   3. Rodar este seed:   supabase db execute --file supabase/seed.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- Curso e turma
-- ---------------------------------------------------------------------
insert into public.courses (id, code, name, year)
values
  ('11111111-1111-1111-1111-111111111111', 'CFO-2026', 'Curso de Formação de Oficiais 2026', 2026)
on conflict (code) do nothing;

insert into public.classes (id, course_id, name, start_date)
values
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   'CFO 2026.1', '2026-03-01')
on conflict (id) do update set name = excluded.name;

-- ---------------------------------------------------------------------
-- 30 alunos oficiais do CFO 2026.1 (idempotente)
-- ---------------------------------------------------------------------
insert into public.students (id, class_id, pelotao, student_number, situation, full_name, war_name, sex)
values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222222', 'CFO I', 1, 'matriculado', 'RIVALDO MARQUES DA SILVA', 'RIVALDO', 'M'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222222', 'CFO I', 2, 'matriculado', 'IAN CAVALCANTE LIMA', 'IAN LIMA', 'M'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222222', 'CFO I', 3, 'matriculado', 'CAIO PICANCO DO AMARAL', 'P. AMARAL', 'M'),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222222', 'CFO I', 4, 'matriculado', 'YANN VICTOR DE ALMEIDA MARTINS', 'V. MARTINS', 'M'),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222222', 'CFO I', 5, 'matriculado', 'FERNANDA SABRINA GUIMARAES DO NASCIMENTO', 'SABRINA', 'F'),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222222', 'CFO I', 6, 'matriculado', 'ALEXANDRE PACHECO CAXIAS DE SOUSA', 'CAXIAS', 'M'),
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222222', 'CFO I', 7, 'matriculado', 'GABRIEL CAVALCANTE DE SOUSA', 'GABRIEL', 'M'),
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222222', 'CFO I', 8, 'matriculado', 'PABLO MIRANDA MACEDO', 'PABLO', 'M'),
  ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222222', 'CFO I', 9, 'matriculado', 'VANESSA CRISTINE RIBEIRO AMARAL', 'CRISTINE', 'F'),
  ('33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222222', 'CFO I', 10, 'matriculado', 'GEOVAN DA LUZ', 'GEOVAN', 'M'),
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222222', 'CFO I', 11, 'matriculado', 'GLEITON FELIPE BACELAR SANTOS', 'GLEITON', 'M'),
  ('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222222', 'CFO I', 12, 'matriculado', 'FERNANDO HENRIQUE MARTINS FERNANDES', 'FERNANDES', 'M'),
  ('33333333-3333-3333-3333-333333333313', '22222222-2222-2222-2222-222222222222', 'CFO I', 13, 'matriculado', 'GIOVANNA BARROS DA SILVA DUTRA', 'GIOVANNA', 'F'),
  ('33333333-3333-3333-3333-333333333314', '22222222-2222-2222-2222-222222222222', 'CFO I', 14, 'matriculado', 'ARIADNE CRISTINA CARVALHO FERREIRA', 'ARIADNE', 'F'),
  ('33333333-3333-3333-3333-333333333315', '22222222-2222-2222-2222-222222222222', 'CFO I', 15, 'matriculado', 'MARCOS VICTOR OLIVEIRA CAMPOS', 'CAMPOS', 'M'),
  ('33333333-3333-3333-3333-333333333316', '22222222-2222-2222-2222-222222222222', 'CFO I', 16, 'matriculado', 'LUIZ VALDES BRAGA DIAS JUNIOR', 'DIAS JUNIOR', 'M'),
  ('33333333-3333-3333-3333-333333333317', '22222222-2222-2222-2222-222222222222', 'CFO I', 17, 'matriculado', 'HENRIQUE SALES DE AGUIAR', 'SALES', 'M'),
  ('33333333-3333-3333-3333-333333333318', '22222222-2222-2222-2222-222222222222', 'CFO I', 18, 'matriculado', 'DIEGO SERRA DIAS MONTEIRO', 'SERRA DIAS', 'M'),
  ('33333333-3333-3333-3333-333333333319', '22222222-2222-2222-2222-222222222222', 'CFO I', 19, 'matriculado', 'KELLISAN FREIRE OLIVEIRA', 'FREIRE', 'M'),
  ('33333333-3333-3333-3333-333333333320', '22222222-2222-2222-2222-222222222222', 'CFO I', 20, 'matriculado', 'THIAGO ALEXANDRE DOS SANTOS DA LUZ', 'T. SANTOS', 'M'),
  ('33333333-3333-3333-3333-333333333321', '22222222-2222-2222-2222-222222222222', 'CFO I', 21, 'matriculado', 'JOAO LUCAS COLARES COSTA', 'JOAO', 'M'),
  ('33333333-3333-3333-3333-333333333322', '22222222-2222-2222-2222-222222222222', 'CFO I', 22, 'matriculado', 'LORRAN SAMILO MENDES ARAUJO', 'SAMILO', 'M'),
  ('33333333-3333-3333-3333-333333333323', '22222222-2222-2222-2222-222222222222', 'CFO I', 23, 'matriculado', 'FELIPE MONTE DO NASCIMENTO', 'M. NASCIMENTO', 'M'),
  ('33333333-3333-3333-3333-333333333324', '22222222-2222-2222-2222-222222222222', 'CFO I', 24, 'matriculado', 'ARTUR JORGE BRAGA DE SOUZA', 'ARTUR', 'M'),
  ('33333333-3333-3333-3333-333333333325', '22222222-2222-2222-2222-222222222222', 'CFO I', 25, 'matriculado', 'FREDSON GREGORY DOS SANTOS SILVA NASCIMENTO', 'FREDSON', 'M'),
  ('33333333-3333-3333-3333-333333333326', '22222222-2222-2222-2222-222222222222', 'CFO I', 26, 'matriculado', 'JEFERSON DA SILVA NUNES', 'SILVA NUNES', 'M'),
  ('33333333-3333-3333-3333-333333333327', '22222222-2222-2222-2222-222222222222', 'CFO I', 27, 'matriculado', 'MILENA OLIMPIO SILVA NAIFF', 'MILENA', 'F'),
  ('33333333-3333-3333-3333-333333333328', '22222222-2222-2222-2222-222222222222', 'CFO I', 28, 'matriculado', 'JAQUELINE GONCALVES BORGES', 'J. BORGES', 'F'),
  ('33333333-3333-3333-3333-333333333329', '22222222-2222-2222-2222-222222222222', 'CFO I', 29, 'matriculado', 'CAROLINA NASCIMENTO OLIVEIRA', 'CAROLINA', 'F'),
  ('33333333-3333-3333-3333-333333333330', '22222222-2222-2222-2222-222222222222', 'CFO I', 30, 'matriculado', 'JULIANA GUEDES SENA', 'JULIANA', 'F')
on conflict (id) do update set
  full_name = excluded.full_name,
  war_name = excluded.war_name,
  pelotao = excluded.pelotao,
  student_number = excluded.student_number,
  sex = excluded.sex,
  situation = excluded.situation;

-- Catálogo de equipamentos: gerenciado pela migration 0016_reorganize_equipment_categories.sql
-- (15 categorias, 116 itens conforme PDF "ENXOVAL - CFO COMPLETO - CBMAP_Atualizado_")
-- Não inserir aqui — a migration já popula categories + requirements ao rodar.

-- ---------------------------------------------------------------------
-- Mensagem final
-- ---------------------------------------------------------------------
do $$
declare
  c_alunos int;
  c_eq int;
begin
  select count(*) into c_alunos from public.students;
  select count(*) into c_eq from public.equipment_requirements;
  raise notice 'Seed concluído: % alunos, % itens de equipamento (15 categorias via migration 0016).', c_alunos, c_eq;
end $$;
