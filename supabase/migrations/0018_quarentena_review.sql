-- =====================================================================
-- 0018 — Revisão do enxoval de quarentena
--        Itens alinhados com lista oficial (9 seções) + nova seção 4
--        (Material Operacional Básico e de Instrução)
-- =====================================================================

-- ── 1. Libera constraint: limpa status de alunos para itens que serão
--       recriados (cascade manual porque FK é ON DELETE RESTRICT) ──────

-- Itens de quarentena (serão deletados e recriados)
delete from public.student_equipment_status
where requirement_id in (
  select er.id from public.equipment_requirements er
  join public.equipment_categories ec on er.category_id = ec.id
  where er.phase = 'quarentena'
    and ec.name in (
      'Pernoite', 'Higiene Pessoal',
      'Entrada e Saída — Feminino', 'Entrada e Saída — Masculino',
      'M1', 'Educação Física', 'Meio Líquido / Natação'
    )
);

-- Itens de EPI que serão movidos para quarentena (capacete, apito, etc.)
delete from public.student_equipment_status
where requirement_id in (
  select er.id from public.equipment_requirements er
  join public.equipment_categories ec on er.category_id = ec.id
  where ec.name = 'EPI e Instrução Geral'
    and er.name in (
      'Capacete de salvamento branco com jugular e certificação',
      'Apito com cordão preto',
      'Lanterna de cabeça',
      'Cantil preto de 900 ml'
    )
);

-- ── 2. Delete itens de quarentena a reconstruir ────────────────────────

delete from public.equipment_requirements
where phase = 'quarentena'
  and category_id in (
    select id from public.equipment_categories
    where name in (
      'Pernoite', 'Higiene Pessoal',
      'Entrada e Saída — Feminino', 'Entrada e Saída — Masculino',
      'M1', 'Educação Física', 'Meio Líquido / Natação'
    )
  );

-- Remove do EPI os itens que passam para Material Operacional Básico (quarentena)
delete from public.equipment_requirements
where category_id = (select id from public.equipment_categories where name = 'EPI e Instrução Geral')
  and name in (
    'Capacete de salvamento branco com jugular e certificação',
    'Apito com cordão preto',
    'Lanterna de cabeça',
    'Cantil preto de 900 ml'
  );

-- ── 3. Muda fase de categorias que saem da quarentena ─────────────────

-- EPI: equipamentos avançados de rapel/resgate → inicio
update public.equipment_requirements set phase = 'inicio'
where category_id = (select id from public.equipment_categories where name = 'EPI e Instrução Geral');

-- Uniformes operacionais → inicio (não constam na lista de quarentena)
update public.equipment_requirements set phase = 'inicio'
where category_id in (
  select id from public.equipment_categories where name in ('Operacional 3º A', 'Operacional 3º G')
);

-- Apoio Pessoal / Materiais Diversos → inicio
update public.equipment_requirements set phase = 'inicio'
where category_id = (select id from public.equipment_categories where name = 'Apoio Pessoal / Materiais Diversos');

-- Manutenção do Uniforme → inicio (não consta na lista de quarentena)
update public.equipment_requirements set phase = 'inicio'
where category_id = (select id from public.equipment_categories where name = 'Manutenção do Uniforme');

-- Material Escolar: itens avançados → inicio; básicos ficam em quarentena
update public.equipment_requirements set phase = 'inicio'
where category_id = (select id from public.equipment_categories where name = 'Material Escolar')
  and name in (
    'Bloco e caneta impermeáveis',
    'Calculadora científica',
    'Notebook',
    'Mochila preta de 30 a 40 L',
    'Bolsa preta discreta'
  );

-- ── 4. Abre espaço para nova seção 4 (Material Operacional Básico)
--       Desloca section_ordinals 4..10 → 5..11 ─────────────────────────

update public.equipment_categories
set section_ordinal = section_ordinal + 1
where section_ordinal >= 4;

-- ── 5. Novas categorias quarentena ────────────────────────────────────

insert into public.equipment_categories
  (ordinal, section_ordinal, section_name, name, description)
values
  -- Campo e Permanência → seção 1 (Vida na caserna)
  (20, 1, 'Vida na caserna / Pernoite',
   'Campo e Permanência',
   'Itens para atividades de campo e estadia prolongada'),
  -- Material Operacional Básico → NOVA seção 4
  (21, 4, 'Material Operacional Básico e de Instrução',
   'Material Operacional Básico',
   'Materiais básicos de instrução e apoio operacional individual');

-- ── 6. Insere itens quarentena reconstruídos ──────────────────────────

-- ── Pernoite ─────────────────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Pernoite')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Toalha de banho vermelha identificada',  1::numeric, 'un'),
  ('Lençol branco',                           1,          'un'),
  ('Travesseiro',                             1,          'un'),
  ('Fronha branca',                           1,          'un'),
  ('Cobertor',                                1,          'un'),
  ('Protetor solar',                          1,          'un'),
  ('Repelente',                               1,          'un')
) as v(name, qty, unit);

-- ── Higiene Pessoal ───────────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Higiene Pessoal')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
values (
  (select id from public.equipment_categories where name = 'Higiene Pessoal'),
  'Kit higiene pessoal (barba, banho, cabelo e asseio individual)',
  1, 'kit', true, 'todos', 'quarentena'
);

-- ── Entrada e Saída — Masculino ───────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Entrada e Saída — Masculino')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'masculino', 'quarentena'
from cat, (values
  ('Terno preto',                             1::numeric, 'un'),
  ('Calça social preta',                       1,          'un'),
  ('Camisa social branca',                     2,          'un'),
  ('Gravata vertical laranja',                 1,          'un'),
  ('Cinto social preto',                       1,          'un'),
  ('Meia social preta',                        3,          'par'),
  ('Sapato social preto',                      1,          'par')
) as v(name, qty, unit);

-- ── Entrada e Saída — Feminino ────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Entrada e Saída — Feminino')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'feminino', 'quarentena'
from cat, (values
  ('Blazer feminino preto',                             1::numeric, 'un'),
  ('Saia social preta na altura dos joelhos',            1,          'un'),
  ('Camisa social branca',                               2,          'un'),
  ('Fita/laço laranja',                                  1,          'un'),
  ('Meia-calça cor da pele',                             2,          'un'),
  ('Sapato social preto',                                1,          'par'),
  ('Short térmico preto',                                2,          'un')
) as v(name, qty, unit);

-- ── M1 ───────────────────────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'M1')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, v.appl, 'quarentena'
from cat, (values
  ('Camisa de manga vermelha identificada (padrão CFO/ABM)', 2::numeric, 'un',  'todos'::text),
  ('Calça jeans azul escuro engomada e vincada',              2,          'un',  'todos'),
  ('Gorro cáqui CBMAP com numeração',                         1,          'un',  'todos'),
  ('Cinto lona/nylon vermelho com fivela dourada lisa',        1,          'un',  'todos'),
  ('Tênis preto',                                             1,          'par', 'todos'),
  ('Meia branca cano médio sem detalhes',                     6,          'par', 'todos'),
  ('Top preto',                                               2,          'un',  'feminino'),
  ('Short térmico preto (lycra)',                             2,          'un',  'todos')
) as v(name, qty, unit, appl);

-- ── Educação Física (TFM) ─────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Educação Física')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, v.appl, 'quarentena'
from cat, (values
  ('Camiseta/regata branca identificada (padrão CFO/ABM)', 3::numeric, 'un',  'todos'::text),
  ('Short tactel vermelho padrão CFO',                      3,          'un',  'todos'),
  ('Short térmico preto (lycra)',                           3,          'un',  'todos'),
  ('Tênis preto ou tênis de corrida autorizado',            1,          'par', 'todos'),
  ('Meia branca cano médio sem detalhes',                   6,          'par', 'todos'),
  ('Top preto',                                             3,          'un',  'feminino')
) as v(name, qty, unit, appl);

-- ── Meio Líquido / Natação ────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Meio Líquido / Natação')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, v.mand, v.appl, 'quarentena'
from cat, (values
  ('Sunga preta com duas listras brancas laterais',        1::numeric, 'un',  true,  'masculino'::text),
  ('Maiô/macaquinho preto com duas listras brancas laterais', 1,       'un',  true,  'feminino'),
  ('Short térmico preto (lycra)',                           1,          'un',  true,  'todos'),
  ('Touca preta',                                           1,          'un',  false, 'todos'),
  ('Sandália preta de tiras',                               1,          'par', true,  'todos'),
  ('Camisa térmica CBMAP — vermelha com detalhes amarelos e proteção UV', 1, 'un', true, 'todos'),
  ('Toalha vermelha identificada',                          1,          'un',  true,  'todos')
) as v(name, qty, unit, mand, appl);

-- ── Campo e Permanência ───────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Campo e Permanência')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Colchonete / isolante individual',    1::numeric, 'un'),
  ('Talheres (garfo, faca, colher)',       1,          'conjunto'),
  ('Copo / caneca individual',            1,          'un'),
  ('Saco para roupas sujas resistente',   1,          'un')
) as v(name, qty, unit);

-- ── Material Operacional Básico ───────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Material Operacional Básico')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Cantil com capa (~900 ml, preferencialmente preto)',                    1::numeric, 'un'),
  ('Mochila tática Bravo 50 L',                                             1,          'un'),
  ('Bolsa operacional multiuso — cinza/vermelha, brasão EFO, 30 L',        1,          'un'),
  ('Lanterna portátil',                                                      1,          'un'),
  ('Lanterna de cabeça (adaptável ao capacete)',                             1,          'un'),
  ('Apito com cordão preto (padrão simples)',                               1,          'un'),
  ('Capa de chuva discreta',                                                 1,          'un'),
  ('Capacete de salvamento branco com jugular',                              1,          'un'),
  ('Cabo da vida (cabo com alma, 12 mm, cor laranja)',                       1,          'un')
) as v(name, qty, unit);

-- ── Verificação ───────────────────────────────────────────────────────
do $$
declare
  c_cats int; c_quar int; c_ini int; c_post int;
begin
  select count(*) into c_cats from public.equipment_categories;
  select count(*) into c_quar from public.equipment_requirements where phase = 'quarentena';
  select count(*) into c_ini  from public.equipment_requirements where phase = 'inicio';
  select count(*) into c_post from public.equipment_requirements where phase = 'posterior';
  raise notice 'Migração 0018 OK — % categorias, % quarentena / % inicio / % posterior.',
    c_cats, c_quar, c_ini, c_post;
end $$;
