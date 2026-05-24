-- =====================================================================
-- 0016 — Reestrutura catálogo de equipamentos conforme PDF
--        "ENXOVAL - CFO COMPLETO - CBMAP_Atualizado_"
-- =====================================================================
-- Ordem das categorias segue exatamente as seções do PDF:
--   3.1 Pernoite
--   3.2 Higiene Pessoal
--   3.3.1 Uniformes — Terno (Entrada e Saída)
--   3.3.2 Uniformes — M1
--   3.3.3 Uniformes — TFM / Educação Física
--   3.4   Uniformes — Meio Líquido
--   3.4.1 Uniformes — Operacional
--   4     EPI e Equipamentos de Instrução
--   5     Material Escolar
--   6     Manutenção do Uniforme
--   7     Materiais Diversos
--   8     Identificações
--         Itens Complementares Obrigatórios (cobrados posteriormente)
--         Enxoval Salvamento em Altura – CFO
--         Uniforme Histórico
-- =====================================================================

-- 1) Limpa status de alunos (FK on delete restrict impede apagar requirements)
delete from public.student_equipment_status;

-- 2) Limpa itens e categorias antigas
delete from public.equipment_requirements;
delete from public.equipment_categories;

-- 3) Recria categorias conforme PDF
insert into public.equipment_categories (ordinal, name, description) values
  (1,  'Pernoite',                                    'Seção 3.1 – Itens de dormitório e estadia'),
  (2,  'Higiene Pessoal',                             'Seção 3.2 – Material completo para higiene'),
  (3,  'Uniformes — Terno (Entrada e Saída)',          'Seção 3.3.1 – Uniforme de apresentação formal'),
  (4,  'Uniformes — M1',                              'Seção 3.3.2 – Uniforme M1 de serviço'),
  (5,  'Uniformes — TFM / Educação Física',           'Seção 3.3.3 – Uniforme de Treinamento Físico Militar'),
  (6,  'Uniformes — Meio Líquido',                    'Seção 3.4 – Instrução em ambiente aquático'),
  (7,  'Uniformes — Operacional',                     'Seção 3.4.1 – Farda operacional CBMAP (3ª A / 3ª G)'),
  (8,  'EPI e Equipamentos de Instrução',             'Seção 4 – Equipamentos de Proteção Individual e de Instrução'),
  (9,  'Material Escolar',                            'Seção 5 – Material escolar e administrativo'),
  (10, 'Manutenção do Uniforme',                      'Seção 6 – Materiais para conservação do fardamento'),
  (11, 'Materiais Diversos',                          'Seção 7 – Itens de apoio geral'),
  (12, 'Identificações',                              'Seção 8 – Identificações e peculiaridades'),
  (13, 'Itens Complementares Obrigatórios',           'Cobrados posteriormente ao início do curso'),
  (14, 'Enxoval Salvamento em Altura — CFO',          'Material técnico específico de salvamento em altura'),
  (15, 'Uniforme Histórico',                          'Uniforme de gala histórico CBMAP');

-- =====================================================================
-- 4) Itens por categoria
--    Todas as seções 3 a 8 = phase 'quarentena' (necessários de imediato)
--    Itens Complementares = phase 'posterior'
--    Salvamento em Altura = phase 'inicio'
--    Uniforme Histórico   = phase 'posterior'
-- =====================================================================

-- ── 3.1 PERNOITE ────────────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Pernoite')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Toalha de banho vermelha',        1::numeric, 'un'),
  ('Lençol de cama branco',           2,          'un'),
  ('Travesseiro',                     1,          'un'),
  ('Fronha branca',                   2,          'un'),
  ('Cobertor',                        1,          'un'),
  ('Repelente',                       1,          'un'),
  ('Protetor solar',                  1,          'un')
) as v(name, qty, unit);

-- ── 3.2 HIGIENE PESSOAL ─────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Higiene Pessoal')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Shampoo e condicionador',         1::numeric, 'un'),
  ('Sabonete',                        2,          'un'),
  ('Creme dental',                    1,          'un'),
  ('Escova dental',                   2,          'un'),
  ('Fio dental',                      1,          'un'),
  ('Desodorante',                     2,          'un'),
  ('Aparelho de barbear / barbeador', 1,          'un'),
  ('Talco ou pó corporal',            1,          'un')
) as v(name, qty, unit);

-- ── 3.3.1 UNIFORMES — TERNO (ENTRADA E SAÍDA) ───────────────────────
with cat as (select id from public.equipment_categories where name = 'Uniformes — Terno (Entrada e Saída)')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, v.appl, 'quarentena'
from cat, (values
  ('Terno preto',                     1::numeric, 'un',  'masculino'),
  ('Blazer feminino preto',           1,          'un',  'feminino'),
  ('Camisa social branca',            2,          'un',  'todos'),
  ('Gravata laranja',                 1,          'un',  'masculino'),
  ('Fita laranja',                    1,          'un',  'feminino'),
  ('Cinto social preto',              1,          'un',  'todos'),
  ('Meia social preta',               2,          'par', 'todos'),
  ('Sapato social preto',             1,          'par', 'todos')
) as v(name, qty, unit, appl);

-- ── 3.3.2 UNIFORMES — M1 ─────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Uniformes — M1')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, v.appl, 'quarentena'
from cat, (values
  ('Gorro cáqui',                     1::numeric, 'un',  'todos'),
  ('Camisa vermelha manga longa',      2,          'un',  'todos'),
  ('Calça jeans azul',                1,          'un',  'todos'),
  ('Cinto vermelho fivela dourada',   1,          'un',  'todos'),
  ('Tênis preto',                     1,          'par', 'todos'),
  ('Meia branca',                     3,          'par', 'todos'),
  ('Top preto',                       1,          'un',  'feminino')
) as v(name, qty, unit, appl);

-- ── 3.3.3 UNIFORMES — TFM / EDUCAÇÃO FÍSICA ─────────────────────────
with cat as (select id from public.equipment_categories where name = 'Uniformes — TFM / Educação Física')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, v.appl, 'quarentena'
from cat, (values
  ('Camiseta branca identificada',    3::numeric, 'un',  'masculino'),
  ('Regata branca identificada',      3,          'un',  'feminino'),
  ('Short tactel vermelho',           2,          'un',  'todos'),
  ('Short térmico preto',             2,          'un',  'todos'),
  ('Tênis preto',                     1,          'par', 'todos'),
  ('Meia branca',                     3,          'par', 'todos')
) as v(name, qty, unit, appl);

-- ── 3.4 UNIFORMES — MEIO LÍQUIDO ────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Uniformes — Meio Líquido')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, v.appl, 'quarentena'
from cat, (values
  ('Sunga preta com listras brancas', 1::numeric, 'un',  'masculino'),
  ('Maiô preto',                      1,          'un',  'feminino'),
  ('Short térmico preto',             1,          'un',  'todos'),
  ('Touca de banho preta',            1,          'un',  'todos'),
  ('Sandália preta com tiras',        1,          'par', 'todos'),
  ('Camisa térmica CBMAP',            1,          'un',  'todos'),
  ('Máscara de mergulho preta',       1,          'un',  'todos'),
  ('Snorkel',                         1,          'un',  'todos')
) as v(name, qty, unit, appl);

-- ── 3.4.1 UNIFORMES — OPERACIONAL ───────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Uniformes — Operacional')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Gorro cáqui',                     1::numeric, 'un'),
  ('Gandola operacional laranja',      1,          'un'),
  ('Camisa de malha vermelha',        1,          'un'),
  ('Calça operacional laranja',       1,          'un'),
  ('Cinto preto com fivela',          1,          'un'),
  ('Meias pretas',                    3,          'par'),
  ('Coturnos pretos',                 1,          'par'),
  ('Luvas operacionais de ombro',     1,          'par')
) as v(name, qty, unit);

-- ── 4. EPI E EQUIPAMENTOS DE INSTRUÇÃO ──────────────────────────────
with cat as (select id from public.equipment_categories where name = 'EPI e Equipamentos de Instrução')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Capacete de salvamento branco com jugular (CA/CE)', 1::numeric, 'un'),
  ('Luva de vaqueta/raspa couro para rapel',            1,          'par'),
  ('Balaclava de incêndio',                             1,          'un'),
  ('Apito com cordão preto (FOX 40)',                   1,          'un'),
  ('Óculos de proteção individual',                     1,          'un'),
  ('Cabo de alma 11 mm × 6 m laranja',                 1,          'un'),
  ('Lanterna de cabeça adaptável a capacete',           1,          'un'),
  ('Freio resgate BIG 8',                               2,          'un'),
  ('Mosquetão (UIAA/CE/EN)',                            3,          'un'),
  ('Cordeletes/etrinidas 6 mm, 2 m',                   1,          'par'),
  ('Cordeletes 6–8 mm, 8 m',                           1,          'un'),
  ('Anel de fita 0,80 m',                              1,          'un'),
  ('Anel de fita 1 m',                                 1,          'un'),
  ('Par de nadadeiras pala curta preta',                1,          'par'),
  ('Cinto NA vermelho',                                 1,          'un'),
  ('Cantil 900 ml preta',                              1,          'un'),
  ('Máscara de mergulho preta',                         1,          'un'),
  ('Snorkel marca cobra',                               1,          'un')
) as v(name, qty, unit);

-- ── 5. MATERIAL ESCOLAR ──────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Material Escolar')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Caneta esferográfica',                          4::numeric, 'un'),
  ('Lápis / lapiseira',                             2,          'un'),
  ('Borracha',                                      2,          'un'),
  ('Caderno',                                       2,          'un'),
  ('Bloco de anotações comum',                      2,          'un'),
  ('Bloco de anotações impermeável + caneta impermeável', 1,    'un'),
  ('Prancheta impermeável',                         1,          'un'),
  ('Calculadora científica',                        1,          'un'),
  ('Notebook',                                      1,          'un'),
  ('Mochila 30–40 L discreta preta',               1,          'un'),
  ('Bolsa discreta preta',                          1,          'un')
) as v(name, qty, unit);

-- ── 6. MANUTENÇÃO DO UNIFORME ────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Manutenção do Uniforme')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Sabão em pó ou em pedra',     1::numeric, 'un'),
  ('Escova para lavar roupa',     1,          'un'),
  ('Amaciante',                   1,          'un')
) as v(name, qty, unit);

-- ── 7. MATERIAIS DIVERSOS ────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Materiais Diversos')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Kit primeiros socorros (Dipirona, Dorflex, pomada, Band-Aid)', 1::numeric, 'kit'),
  ('Protetor solar',                                               1,          'un'),
  ('Alimentos não perecíveis (bolachas, barra cereal, chocolate)', 1,          'kit'),
  ('Talheres (garfo, faca, colher)',                               1,          'jogo'),
  ('Luvas brancas (espadim e fuzil)',                              2,          'par'),
  ('Simulacro de espadim',                                         1,          'un')
) as v(name, qty, unit);

-- ── 8. IDENTIFICAÇÕES ────────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Identificações')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'quarentena'
from cat, (values
  ('Camisa de malha manga vermelha identificada (CAD + nome de guerra)', 2::numeric, 'un'),
  ('Distintivo CBMAP para uniformes',                                    1,          'jogo')
) as v(name, qty, unit);

-- ── ITENS COMPLEMENTARES OBRIGATÓRIOS (cobrados posteriormente) ──────
with cat as (select id from public.equipment_categories where name = 'Itens Complementares Obrigatórios')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'posterior'
from cat, (values
  ('Gorro aba australiano',               1::numeric, 'un'),
  ('Macacão tyvek',                       1,          'un'),
  ('Máscara de pó com filtro',            1,          'un'),
  ('Luvas de silicone para limpeza',      1,          'par'),
  ('Óculos de proteção (adicional)',      1,          'un'),
  ('Mochila de selva',                    1,          'un')
) as v(name, qty, unit);

-- ── ENXOVAL SALVAMENTO EM ALTURA — CFO ──────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Enxoval Salvamento em Altura — CFO')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, 'todos', 'inicio'
from cat, (values
  ('Capacete de salvamento branco',         1::numeric, 'un'),
  ('Cinto de resgate',                      1,          'un'),
  ('Corda estática 11 mm × 30 m laranja',  1,          'un'),
  ('Cadeirinha de rapel',                   1,          'un'),
  ('Mosquetão com trava (adicional)',       2,          'un'),
  ('Dispositivo de descida',               1,          'un'),
  ('Fita de ancoragem',                    2,          'un')
) as v(name, qty, unit);

-- ── UNIFORME HISTÓRICO ───────────────────────────────────────────────
with cat as (select id from public.equipment_categories where name = 'Uniforme Histórico')
insert into public.equipment_requirements
  (category_id, name, quantity, unit, mandatory, applicability, phase)
select cat.id, v.name, v.qty, v.unit, true, v.appl, 'posterior'
from cat, (values
  ('Barretina',       1::numeric, 'un',  'todos'),
  ('Forragê',         1,          'un',  'todos'),
  ('Túnica',          1,          'un',  'todos'),
  ('Cinto histórico', 1,          'un',  'todos'),
  ('Talin',           1,          'un',  'todos'),
  ('Espadim',         1,          'un',  'todos'),
  ('Calça histórica', 1,          'un',  'masculino'),
  ('Saia histórica',  1,          'un',  'feminino'),
  ('Luva branca',     1,          'par', 'todos'),
  ('Polaina',         1,          'par', 'todos'),
  ('Sapato histórico',1,          'par', 'todos')
) as v(name, qty, unit, appl);

-- ── Mensagem de verificação ──────────────────────────────────────────
do $$
declare
  c_cats int;
  c_reqs int;
  c_quar int;
begin
  select count(*) into c_cats from public.equipment_categories;
  select count(*) into c_reqs from public.equipment_requirements;
  select count(*) into c_quar from public.equipment_requirements where phase = 'quarentena';
  raise notice 'Migração 0016 concluída: % categorias, % itens totais (% quarentena).', c_cats, c_reqs, c_quar;
end $$;
