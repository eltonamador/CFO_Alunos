-- =====================================================================
-- Acompanhamento do Cadete — testes de RLS e do fluxo do FO−
--
-- Roda com: pnpm exec supabase test db
--
-- O que estes testes protegem: as regras que NAO aparecem no typecheck
-- nem nos testes de dominio — isolamento por RLS, a impossibilidade de o
-- cadete alterar o proprio FO e a idempotencia da expiracao de prazo.
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- ---------------------------------------------------------------------
-- Helpers: executam a consulta como um usuario autenticado especifico,
-- para que a RLS realmente valha (o papel `postgres` a ignora).
-- ---------------------------------------------------------------------
create function pg_temp.count_as(p_uid uuid, p_query text) returns int
language plpgsql as $$
declare v int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
  set local role authenticated;
  execute p_query into v;
  reset role;
  return v;
end $$;

create function pg_temp.text_as(p_uid uuid, p_query text) returns text
language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
  set local role authenticated;
  execute p_query into v;
  reset role;
  return v;
end $$;

create function pg_temp.exec_as(p_uid uuid, p_cmd text) returns int
language plpgsql as $$
declare n int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
  set local role authenticated;
  execute p_cmd;
  get diagnostics n = row_count;
  reset role;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 1. Estrutura
-- ---------------------------------------------------------------------
select has_table('public', 'follow_up_records', 'tabela de registros existe');
select has_table('public', 'follow_up_manifestations', 'tabela de manifestacoes existe');
select has_table('public', 'follow_up_decisions', 'tabela de decisoes existe');
select has_table('public', 'follow_up_punishments', 'tabela de punicoes existe');
select has_table('public', 'follow_up_attachments', 'tabela de anexos existe');
select has_table('public', 'follow_up_events', 'tabela de eventos existe');
select has_table('public', 'fo_reasons', 'catalogo de motivos existe');
select has_table('public', 'punishment_options', 'catalogo de punicoes existe');
select has_view('public', 'v_fo_reason_stats', 'view de estatisticas existe');

select is(
  (select count(*)::int from pg_tables
    where schemaname = 'public'
      and tablename in ('fo_reasons','punishment_options','follow_up_records',
                        'follow_up_manifestations','follow_up_decisions',
                        'follow_up_punishments','follow_up_attachments','follow_up_events')
      and rowsecurity),
  8, 'RLS habilitada nas 8 tabelas do modulo');

select is(
  (select count(*)::int from storage.buckets where id = 'followup-attachments'),
  1, 'bucket privado de anexos existe');

-- ---------------------------------------------------------------------
-- 2. Normalizacao dos motivos (espelha normalizeLabel no TypeScript)
-- ---------------------------------------------------------------------
select is(public.normalize_label('  Coturno   SUJO. '), 'coturno sujo',
          'normalize_label ignora caixa, pontuacao e espaco extra');
select is(public.normalize_label('Atenção à formatura!'), 'atencao a formatura',
          'normalize_label remove acentos');
select is(public.normalize_label('Uniforme fora do padrão'), public.normalize_label('uniforme  fora do padrao'),
          'escritas equivalentes geram a mesma chave');
select isnt(public.normalize_label('Coturno sujo'), public.normalize_label('Coturno fora do padrao'),
          'motivos diferentes continuam diferentes');

-- ---------------------------------------------------------------------
-- 3. Fixtures: uma Coordenacao e dois cadetes
-- ---------------------------------------------------------------------
-- Limpa residuo de execucoes anteriores para que o teste nao dependa de um
-- banco recem-resetado (tudo abaixo e desfeito pelo rollback do final).
delete from public.follow_up_records
 where id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002')
    or origin_record_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002');
-- A limpeza dos registros acima dispara a auditoria, que referencia o autor:
-- remova os logs antes dos usuarios.
delete from public.audit_logs where actor_id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333');
delete from public.profiles where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333');
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','coord@test.local','x',now(),now(),now()),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','cadete@test.local','x',now(),now(),now()),
  ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','outro@test.local','x',now(),now(),now());

insert into public.profiles (id, role, full_name, student_id)
values
  ('11111111-1111-1111-1111-111111111111','coordenacao','Coordenacao de Teste', null),
  ('22222222-2222-2222-2222-222222222222','aluno','Cadete de Teste',
    (select id from public.students order by student_number limit 1)),
  ('33333333-3333-3333-3333-333333333333','aluno','Outro Cadete',
    (select id from public.students order by student_number offset 1 limit 1));

insert into public.fo_reasons (kind, label, normalized_label)
values ('fo_negativo','Coturno sujo', public.normalize_label('Coturno sujo'))
on conflict (kind, normalized_label) do nothing;

-- Os contadores sao acumulativos: o teste afere a VARIACAO, nao o total.
create temp table t_reason_before on commit drop as
select usage_count from public.fo_reasons
 where kind='fo_negativo' and normalized_label = public.normalize_label('Coturno sujo');

-- ---------------------------------------------------------------------
-- 4. Coordenacao registra o FO- sob RLS
-- ---------------------------------------------------------------------
select is(
  pg_temp.exec_as('11111111-1111-1111-1111-111111111111', $q$
    insert into public.follow_up_records
      (id, student_id, type, reason_id, reason_text, status,
       requires_manifestation, deadline_at, created_by, created_by_name)
    select 'aaaaaaaa-0000-0000-0000-000000000001',
           (select student_id from public.profiles where id='22222222-2222-2222-2222-222222222222'),
           'fo_negativo',
           (select id from public.fo_reasons
             where kind='fo_negativo' and normalized_label=public.normalize_label('Coturno sujo')),
           'Coturno sujo','aguardando_manifestacao', true, now() + interval '24 hours',
           '11111111-1111-1111-1111-111111111111','Coordenacao de Teste'
  $q$),
  1, 'Coordenacao consegue registrar um FO-');

select is(
  (select usage_count from public.fo_reasons
    where kind='fo_negativo' and normalized_label=public.normalize_label('Coturno sujo'))
  - (select usage_count from t_reason_before),
  1, 'contador de uso do motivo sobe por trigger');

-- ---------------------------------------------------------------------
-- 5. Isolamento entre cadetes
-- ---------------------------------------------------------------------
select is(
  pg_temp.count_as('22222222-2222-2222-2222-222222222222',
                   'select count(*) from public.follow_up_records'),
  1, 'o cadete enxerga o proprio FO');

select is(
  pg_temp.count_as('33333333-3333-3333-3333-333333333333',
                   'select count(*) from public.follow_up_records'),
  0, 'outro cadete NAO enxerga o FO alheio');

-- ---------------------------------------------------------------------
-- 6. Manifestacao e integridade do fato registrado
-- ---------------------------------------------------------------------
select isnt(
  pg_temp.text_as('22222222-2222-2222-2222-222222222222', $q$
    select public.submit_follow_up_manifestation(
      'aaaaaaaa-0000-0000-0000-000000000001',
      'Estava em servico externo e nao tive como higienizar o coturno.')::text
  $q$),
  null, 'cadete registra a propria manifestacao');

select is(
  (select status from public.follow_up_records where id='aaaaaaaa-0000-0000-0000-000000000001'),
  'aguardando_analise', 'FO vai para analise apos a manifestacao');

select is(
  pg_temp.exec_as('22222222-2222-2222-2222-222222222222', $q$
    update public.follow_up_records set reason_text = 'ADULTERADO'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001'
  $q$),
  0, 'cadete nao consegue alterar o proprio FO');

select is(
  (select reason_text from public.follow_up_records where id='aaaaaaaa-0000-0000-0000-000000000001'),
  'Coturno sujo', 'o fato registrado permanece intacto');

-- ---------------------------------------------------------------------
-- 7. Expiracao do prazo de 24 horas
-- ---------------------------------------------------------------------
insert into public.follow_up_records
  (id, student_id, type, reason_text, status, requires_manifestation, deadline_at, created_by_name)
select 'aaaaaaaa-0000-0000-0000-000000000002',
       (select student_id from public.profiles where id='22222222-2222-2222-2222-222222222222'),
       'fo_negativo','Falar em forma','aguardando_manifestacao', true,
       now() - interval '1 hour','Coordenacao de Teste';

select is(public.expire_follow_up_deadlines(), 1, 'primeira varredura expira o FO vencido');
select is(public.expire_follow_up_deadlines(), 0, 'segunda varredura nao reprocessa');
select is(public.expire_follow_up_deadlines(), 0, 'terceira varredura tambem nao');

select is(
  (select status from public.follow_up_records where id='aaaaaaaa-0000-0000-0000-000000000002'),
  'prazo_expirado', 'FO vencido fica como prazo expirado');

select is(
  (select count(*)::int from public.follow_up_records
    where origin_record_id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  1, 'exatamente um FO- derivado e gerado');

select is(
  (select requires_manifestation from public.follow_up_records
    where origin_record_id='aaaaaaaa-0000-0000-0000-000000000002'),
  false, 'o FO- derivado nao abre novo prazo — nao ha ciclo automatico');

select is(
  (select status from public.follow_up_records
    where origin_record_id='aaaaaaaa-0000-0000-0000-000000000002'),
  'aguardando_analise', 'o FO- derivado vai direto para analise');

-- ---------------------------------------------------------------------
-- 8. Decisao e punicao
-- ---------------------------------------------------------------------
insert into public.follow_up_decisions (record_id, outcome, decided_by_name)
values ('aaaaaaaa-0000-0000-0000-000000000001','indeferido','Coordenacao de Teste');

insert into public.punishment_options (label, normalized_label)
values ('Servico extra', public.normalize_label('Servico extra'))
on conflict (normalized_label) do nothing;

create temp table t_punishment_before on commit drop as
select usage_count from public.punishment_options
 where normalized_label = public.normalize_label('Servico extra');

insert into public.follow_up_punishments (record_id, punishment_option_id, punishment_text)
select 'aaaaaaaa-0000-0000-0000-000000000001',
       (select id from public.punishment_options
         where normalized_label = public.normalize_label('Servico extra')),
       'Servico extra';

select is(
  (select usage_count from public.punishment_options
    where normalized_label = public.normalize_label('Servico extra'))
  - (select usage_count from t_punishment_before),
  1, 'contador de uso da punicao sobe por trigger');

select is(
  pg_temp.count_as('22222222-2222-2222-2222-222222222222',
                   'select count(*) from public.follow_up_decisions'),
  1, 'cadete enxerga a decisao do proprio FO');

select is(
  pg_temp.count_as('22222222-2222-2222-2222-222222222222',
                   'select count(*) from public.follow_up_punishments'),
  1, 'cadete enxerga a propria punicao');

select is(
  pg_temp.count_as('33333333-3333-3333-3333-333333333333',
                   'select count(*) from public.follow_up_decisions'),
  0, 'outro cadete NAO enxerga a decisao alheia');

-- ---------------------------------------------------------------------
-- 9. Rastros para medicao e auditoria
-- ---------------------------------------------------------------------
select cmp_ok(
  (select total_records::int from public.v_fo_reason_stats
    where kind='fo_negativo' and label='Coturno sujo'),
  '>=', 1, 'estatisticas contabilizam o motivo utilizado');

select cmp_ok(
  (select distinct_students::int from public.v_fo_reason_stats
    where kind='fo_negativo' and label='Coturno sujo'),
  '>=', 1, 'estatisticas contabilizam os cadetes envolvidos');

select cmp_ok(
  (select count(*)::int from public.follow_up_events
    where record_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  '>=', 1, 'linha do tempo do registro e alimentada');

select cmp_ok(
  (select count(*)::int from public.audit_logs where entity like 'follow_up%'),
  '>=', 1, 'auditoria institucional registra o modulo');

-- ---------------------------------------------------------------------
-- 10. A view de estatisticas nao pode vazar pela API
--     (views ignoram RLS; o acesso e revogado na 0034)
-- ---------------------------------------------------------------------
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_name = 'v_fo_reason_stats'
      and grantee in ('anon','authenticated')
      and privilege_type = 'SELECT'),
  0, 'view de estatisticas nao e legivel por anon nem authenticated');

select * from finish();
rollback;
