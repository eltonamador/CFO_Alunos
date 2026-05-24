-- =====================================================================
-- 0017 — Reorganiza catálogo em 10 seções conforme estrutura oficial
--        "ENXOVAL - CFO COMPLETO - CBMAP_Atualizado_"
-- =====================================================================

-- 1. Adiciona colunas de seção à tabela de categorias
alter table public.equipment_categories
  add column if not exists section_ordinal int not null default 0,
  add column if not exists section_name text not null default '';

create index if not exists idx_categories_section
  on public.equipment_categories(section_ordinal, ordinal);

-- 2. Limpa dados (FK on delete restrict → ordem obrigatória)
delete from public.student_equipment_status;
delete from public.equipment_requirements;
delete from public.equipment_categories;

-- 3. Categorias (19) com seções (10)
insert into public.equipment_categories
  (ordinal, section_ordinal, section_name, name, description)
values
  -- ── Seção 1 ────────────────────────────────────────────────────────
  (1,  1, 'Vida na caserna / Pernoite',              'Pernoite',
          'Itens de dormitório e estadia na caserna'),
  (2,  1, 'Vida na caserna / Pernoite',              'Higiene Pessoal',
          'Material completo para higiene individual'),
  (3,  1, 'Vida na caserna / Pernoite',              'Manutenção do Uniforme',
          'Materiais para conservação do fardamento'),
  (4,  1, 'Vida na caserna / Pernoite',              'Apoio Pessoal / Materiais Diversos',
          'Kit de apoio pessoal e itens gerais'),
  -- ── Seção 2 ────────────────────────────────────────────────────────
  (5,  2, 'Uniformes e Apresentação Pessoal',        'Entrada e Saída — Feminino',
          'Uniforme de apresentação formal — feminino'),
  (6,  2, 'Uniformes e Apresentação Pessoal',        'Entrada e Saída — Masculino',
          'Uniforme de apresentação formal — masculino'),
  (7,  2, 'Uniformes e Apresentação Pessoal',        'M1',
          'Uniforme M1 de serviço interno'),
  (8,  2, 'Uniformes e Apresentação Pessoal',        'Operacional 3º A',
          'Farda operacional CBMAP — 3ª Aula (cáqui)'),
  (9,  2, 'Uniformes e Apresentação Pessoal',        'Operacional 3º G',
          'Farda operacional CBMAP — 3ª Guardas (alaranjado)'),
  (10, 2, 'Uniformes e Apresentação Pessoal',        'Uniforme Histórico',
          'Uniforme de gala histórico CBMAP'),
  -- ── Seção 3 ────────────────────────────────────────────────────────
  (11, 3, 'Treinamento Físico Militar',              'Educação Física',
          'Uniforme de Treinamento Físico Militar'),
  (12, 3, 'Treinamento Físico Militar',              'Meio Líquido / Natação',
          'Instrução em ambiente aquático'),
  -- ── Seção 4 ────────────────────────────────────────────────────────
  (13, 4, 'Material Escolar e Administrativo',       'Material Escolar',
          'Material escolar e administrativo'),
  -- ── Seção 5 ────────────────────────────────────────────────────────
  (14, 5, 'EPI e Instrução Geral',                   'EPI e Instrução Geral',
          'Equipamentos de Proteção Individual e de Instrução'),
  -- ── Seção 6 ────────────────────────────────────────────────────────
  (15, 6, 'Salvamento em Altura',                    'Enxoval Salvamento em Altura — CFO',
          'Material técnico específico de salvamento em altura'),
  -- ── Seção 7 ────────────────────────────────────────────────────────
  (16, 7, 'Salvamento Veicular',                     'Enxoval Salvamento Veicular — CFO',
          'Material para salvamento em acidente veicular'),
  -- ── Seção 8 ────────────────────────────────────────────────────────
  (17, 8, 'Combate a Incêndio',                      'Enxoval Combate a Incêndio — CFO',
          'Material específico para combate a incêndio'),
  -- ── Seção 9 ────────────────────────────────────────────────────────
  (18, 9, 'Armamento e Tiro / Incêndios Florestais', 'Armamento e Tiro / Incêndios Florestais — CFO',
          'Material para instrução de armamento, tiro e prevenção de incêndios florestais'),
  -- ── Seção 10 ───────────────────────────────────────────────────────
  (19, 10,'Itens Complementares',                    'Itens Complementares Obrigatórios',
          'Cobrados posteriormente ao início do curso');

-- =====================================================================
-- 4. Requisitos por categoria
-- =====================================================================

-- ── Pernoite (quarentena / todos) ────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Pernoite')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Toalha de banho vermelha com nome bordado',  1::numeric, 'un'),
  ('Lençol branco',                              2,          'un'),
  ('Travesseiro',                                1,          'un'),
  ('Fronha branca',                              2,          'un'),
  ('Repelente',                                  1,          'un'),
  ('Protetor solar',                             1,          'un'),
  ('Cobertor',                                   1,          'un')
) as v(name, qty, unit);

-- ── Higiene Pessoal (quarentena / todos) ─────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Higiene Pessoal')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Materiais de barba (barbeador, espuma/gel)',         1::numeric, 'kit'),
  ('Materiais de banho (sabonete, esponja)',             1,          'kit'),
  ('Materiais de cabelo (shampoo, condicionador)',       1,          'kit'),
  ('Higiene bucal (escova, pasta dental, fio dental)',   1,          'kit'),
  ('Desodorante',                                        2,          'un')
) as v(name, qty, unit);

-- ── Manutenção do Uniforme (quarentena / todos) ───────────────────────
with cat as (select id from public.equipment_categories where name = 'Manutenção do Uniforme')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Sabão em pó ou em barra',      1::numeric, 'un'),
  ('Escova para lavar roupa',       1,          'un'),
  ('Amaciante',                     1,          'un')
) as v(name, qty, unit);

-- ── Apoio Pessoal / Materiais Diversos (quarentena) ──────────────────
with cat as (select id from public.equipment_categories where name = 'Apoio Pessoal / Materiais Diversos')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Kit de primeiros socorros (Dipirona, Dorflex, pomada, Band-Aid)', 1::numeric, 'kit'),
  ('Protetor solar (uso pessoal)',                                      1,          'un'),
  ('Alimentos não perecíveis (bolachas, barra cereal, chocolate)',      1,          'kit'),
  ('Talheres (garfo, faca, colher)',                                    1,          'jogo'),
  ('Luvas brancas (espadim e fuzil)',                                   2,          'par'),
  ('Simulacro de espadim',                                              1,          'un')
) as v(name, qty, unit);

-- ── Entrada e Saída — Feminino (quarentena / feminino) ────────────────
with cat as (select id from public.equipment_categories where name = 'Entrada e Saída — Feminino')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'feminino', 'quarentena'
from cat, (values
  ('Blazer preto',                                    1::numeric, 'un'),
  ('Saia social preta na altura dos joelhos',          1,          'un'),
  ('Camisa social branca',                             2,          'un'),
  ('Fita de cetim laranja',                            1,          'un'),
  ('Meia-calça cor da pele',                           2,          'par'),
  ('Sapato social preto de salto médio',               1,          'par'),
  ('Short térmico preto',                              1,          'un')
) as v(name, qty, unit);

-- ── Entrada e Saída — Masculino (quarentena / masculino) ─────────────
with cat as (select id from public.equipment_categories where name = 'Entrada e Saída — Masculino')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'masculino', 'quarentena'
from cat, (values
  ('Terno preto',             1::numeric, 'un'),
  ('Calça social preta',      1,          'un'),
  ('Camisa social branca',    2,          'un'),
  ('Gravata laranja',         1,          'un'),
  ('Cinto social preto',      1,          'un'),
  ('Meia social preta',       2,          'par'),
  ('Sapato social preto',     1,          'par')
) as v(name, qty, unit);

-- ── M1 (quarentena) ───────────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'M1')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, v.appl, 'quarentena'
from cat, (values
  ('Camisa vermelha identificada',                       2::numeric, 'un',  'todos'::text),
  ('Calça jeans azul escuro engomada e vincada',         1,          'un',  'todos'),
  ('Gorro cáqui CBMAP com numeração',                    1,          'un',  'todos'),
  ('Cinto vermelho de nylon com fivela dourada lisa',    1,          'un',  'todos'),
  ('Tênis preto',                                        1,          'par', 'todos'),
  ('Meia branca cano médio',                             3,          'par', 'todos'),
  ('Short térmico preto',                                1,          'un',  'todos'),
  ('Top preto',                                          1,          'un',  'feminino')
) as v(name, qty, unit, appl);

-- ── Operacional 3º A (quarentena / todos) ─────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Operacional 3º A')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Gorro cáqui',               1::numeric, 'un'),
  ('Gandola cáqui',             1,          'un'),
  ('Camisa vermelha',           1,          'un'),
  ('Calça operacional cáqui',   1,          'un'),
  ('Cinto e fivela',            1,          'un'),
  ('Meias pretas',              3,          'par'),
  ('Coturnos pretos',           1,          'par'),
  ('Luvas de ombro',            1,          'par')
) as v(name, qty, unit);

-- ── Operacional 3º G (quarentena / todos) ─────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Operacional 3º G')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Gorro alaranjado',               1::numeric, 'un'),
  ('Gandola alaranjada',             1,          'un'),
  ('Camisa vermelha',                1,          'un'),
  ('Calça operacional alaranjada',   1,          'un'),
  ('Cinto e fivela',                 1,          'un'),
  ('Meias pretas',                   3,          'par'),
  ('Coturnos pretos',                1,          'par'),
  ('Luvas de ombro',                 1,          'par')
) as v(name, qty, unit);

-- ── Uniforme Histórico (posterior) ────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Uniforme Histórico')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, v.appl, 'posterior'
from cat, (values
  ('Barretina',         1::numeric, 'un',  'todos'::text),
  ('Túnica',            1,          'un',  'todos'),
  ('Forragê',           1,          'un',  'todos'),
  ('Cinto',             1,          'un',  'todos'),
  ('Talim',             1,          'un',  'todos'),
  ('Espadim',           1,          'un',  'todos'),
  ('Luva branca',       1,          'par', 'todos'),
  ('Calça histórica',   1,          'un',  'masculino'),
  ('Saia histórica',    1,          'un',  'feminino'),
  ('Polaina',           1,          'par', 'todos'),
  ('Sapato',            1,          'par', 'todos')
) as v(name, qty, unit, appl);

-- ── Educação Física (quarentena) ──────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Educação Física')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, v.appl, 'quarentena'
from cat, (values
  ('Camiseta/regata branca identificada',             3::numeric, 'un',  'todos'::text),
  ('Short vermelho em tactel',                        2,          'un',  'todos'),
  ('Short térmico preto',                             2,          'un',  'todos'),
  ('Meias brancas cano médio',                        3,          'par', 'todos'),
  ('Tênis preto ou tênis de corrida autorizado',      1,          'par', 'todos'),
  ('Top preto',                                       1,          'un',  'feminino')
) as v(name, qty, unit, appl);

-- ── Meio Líquido / Natação (quarentena) ───────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Meio Líquido / Natação')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, v.mand, v.appl, 'quarentena'
from cat, (values
  ('Sunga preta',                                  1::numeric, 'un',  true,  'masculino'::text),
  ('Maiô preto tipo macaquinho',                   1,          'un',  true,  'feminino'),
  ('Short térmico preto',                          1,          'un',  true,  'todos'),
  ('Touca preta',                                  1,          'un',  false, 'masculino'),
  ('Sandália preta de tiras',                      1,          'par', true,  'todos'),
  ('Camisa térmica CBMAP com proteção UV',         1,          'un',  true,  'todos')
) as v(name, qty, unit, mand, appl);

-- ── Material Escolar (quarentena / todos) ─────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Material Escolar')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Caneta esferográfica',                       4::numeric, 'un'),
  ('Lápis / lapiseira',                          2,          'un'),
  ('Borracha',                                   2,          'un'),
  ('Caderno',                                    2,          'un'),
  ('Bloco de anotações normal',                  2,          'un'),
  ('Bloco e caneta impermeáveis',                1,          'jogo'),
  ('Prancheta impermeável',                      1,          'un'),
  ('Calculadora científica',                     1,          'un'),
  ('Notebook',                                   1,          'un'),
  ('Mochila preta de 30 a 40 L',                1,          'un'),
  ('Bolsa preta discreta',                       1,          'un')
) as v(name, qty, unit);

-- ── EPI e Instrução Geral (quarentena / todos) ────────────────────────
with cat as (select id from public.equipment_categories where name = 'EPI e Instrução Geral')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Capacete de salvamento branco com jugular e certificação',  1::numeric, 'un'),
  ('Luva de vaqueta/raspa para rapel',                          1,          'par'),
  ('Balaclava para incêndio',                                   1,          'un'),
  ('Apito com cordão preto',                                    1,          'un'),
  ('Óculos de proteção',                                        1,          'un'),
  ('Cabo com alma de 11 mm e 6 m — cor laranja',               1,          'un'),
  ('Lanterna de cabeça',                                        1,          'un'),
  ('Freio de resgate BIG 8',                                    2,          'un'),
  ('Mosquetão certificado (UIAA/CE/EN)',                        3,          'un'),
  ('Par de cordeletes/retinidas de 6 mm × 2 m',               1,          'par'),
  ('Cordelete de 6 a 8 mm × 8 m',                             1,          'un'),
  ('Anel de fita',                                              2,          'un'),
  ('Nadadeiras pretas de pala curta',                           1,          'par'),
  ('Cinto NA vermelho',                                         1,          'un'),
  ('Cantil preto de 900 ml',                                   1,          'un'),
  ('Máscara de mergulho preta',                                 1,          'un'),
  ('Snorkel',                                                   1,          'un')
) as v(name, qty, unit);

-- ── Enxoval Salvamento em Altura — CFO (inicio / todos) ───────────────
with cat as (select id from public.equipment_categories where name = 'Enxoval Salvamento em Altura — CFO')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'inicio'
from cat, (values
  ('Capacete branco',                                                    1::numeric, 'un'),
  ('Cinto de resgate com mínimo de 5 pontos de ancoragem',               1,          'un'),
  ('Corda semi-estática 11 mm — cabo da vida — cor laranja',             7,          'm'),
  ('Corda dinâmica 10 mm — alto-seguros — cor laranja',                  3,          'm'),
  ('Mosquetão/conector metálico automático tipo HMS',                    10,          'un'),
  ('Polia de placa fixa pequena',                                         3,          'un'),
  ('Polia de placa oscilante dupla pequena',                              2,          'un'),
  ('Anel de fita 60 cm',                                                  1,          'un'),
  ('Anel de fita 80 cm',                                                  1,          'un'),
  ('Anel de fita 100 cm',                                                 1,          'un'),
  ('Anel de fita 150 cm',                                                 1,          'un'),
  ('Luva tipo PU',                                                         1,          'par'),
  ('Luva para rapel com palmar reforçado em couro',                       1,          'par'),
  ('Óculos de proteção com viseira preta',                                1,          'un'),
  ('Ascensor ventral',                                                     1,          'un'),
  ('Ascensor de punho',                                                    1,          'un'),
  ('Cordim de 7 mm — cor laranja',                                        5,          'm'),
  ('Descensor/freio oito de resgate Big 8 em duralumínio',               1,          'un'),
  ('Bolsas/mochilas obrigatórias (conforme modelo)',                      1,          'jogo')
) as v(name, qty, unit);

-- ── Enxoval Salvamento Veicular — CFO (inicio) ────────────────────────
with cat as (select id from public.equipment_categories where name = 'Enxoval Salvamento Veicular — CFO')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, v.mand, 'todos', 'inicio'
from cat, (values
  ('Roupa de aproximação',                                       1::numeric, 'conjunto', true),
  ('Bota com biqueira de aço ou coturno',                        1,          'par',      true),
  ('Capacete de salvamento (preferencialmente com viseira)',      1,          'un',       true),
  ('Luva de salvamento anti-impacto',                            1,          'par',      true),
  ('Óculos de proteção',                                         1,          'un',       true),
  ('Lanterna para capacete',                                     1,          'un',       true),
  ('Máscara N95 ou PFF2',                                        2,          'un',       true),
  ('Uniforme Operacional 3º A cáqui',                            1,          'conjunto', true),
  ('Cortador de cinto e quebrador de vidro',                     1,          'un',       true),
  ('Cabo da vida alaranjado',                                     6,          'm',        true),
  ('Protetor auricular',                                          1,          'un',       true),
  ('Pincel permanente para identificação',                        1,          'un',       true),
  ('Prancheta',                                                   1,          'un',       true),
  ('Calça ou short térmico',                                      1,          'un',       false),
  ('Meião preto',                                                 1,          'par',      false),
  ('Mochila de hidratação 1,5 L ou cantil',                      1,          'un',       false),
  ('Bandana tubular',                                             1,          'un',       false),
  ('Manguito ou camisa de neoprene preta',                        1,          'par',      false)
) as v(name, qty, unit, mand);

-- ── Enxoval Combate a Incêndio — CFO (inicio / todos) ────────────────
with cat as (select id from public.equipment_categories where name = 'Enxoval Combate a Incêndio — CFO')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'inicio'
from cat, (values
  ('Balaclava preta de incêndio estrutural',  1::numeric, 'un'),
  ('Luvas de incêndio',                        1,          'par'),
  ('Fita tubular',                             4,          'm'),
  ('Calça térmica',                            1,          'un'),
  ('Joelheiras',                               1,          'par')
) as v(name, qty, unit);

-- ── Armamento e Tiro / Incêndios Florestais — CFO (inicio / todos) ───
with cat as (select id from public.equipment_categories where name = 'Armamento e Tiro / Incêndios Florestais — CFO')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'inicio'
from cat, (values
  ('Protetor auricular',                                                              1::numeric, 'un'),
  ('Facão de 14 polegadas',                                                           1,          'un'),
  ('Lima chata',                                                                      1,          'un'),
  ('Coldre para pistola com dupla retenção, fita estabilizadora e porta-carregador duplo', 1,     'un')
) as v(name, qty, unit);

-- ── Itens Complementares Obrigatórios (posterior / todos) ─────────────
with cat as (select id from public.equipment_categories where name = 'Itens Complementares Obrigatórios')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'posterior'
from cat, (values
  ('Gorro com aba tipo australiano e identificação numérica', 1::numeric, 'un'),
  ('Macacão Tyvek',                                           1,          'un'),
  ('Máscara de pó com filtro',                                1,          'un'),
  ('Luvas de silicone para limpeza',                          1,          'par'),
  ('Óculos de proteção',                                      1,          'un'),
  ('Mochila de selva',                                        1,          'un')
) as v(name, qty, unit);

-- ── Verificação ───────────────────────────────────────────────────────
do $$
declare
  c_cats int; c_reqs int; c_quar int; c_ini int; c_post int;
begin
  select count(*) into c_cats from public.equipment_categories;
  select count(*) into c_reqs from public.equipment_requirements;
  select count(*) into c_quar from public.equipment_requirements where phase = 'quarentena';
  select count(*) into c_ini  from public.equipment_requirements where phase = 'inicio';
  select count(*) into c_post from public.equipment_requirements where phase = 'posterior';
  raise notice 'Migração 0017 OK — % categorias (10 seções), % itens: % quarentena / % inicio / % posterior.',
    c_cats, c_reqs, c_quar, c_ini, c_post;
end $$;
