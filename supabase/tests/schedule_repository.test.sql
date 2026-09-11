-- Fixtures artificiais; tudo revertido ao final. Executar somente em teste.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims', '{}', true);

create function pg_temp.sc_id(label text) returns uuid language sql immutable
as $$ select md5('schedule-repository-test-' || label)::uuid $$;

create function pg_temp.sc_try(p_actor text, p_cmd text) returns text
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.sc_id(p_actor))::text, true);
  set local role authenticated;
  execute p_cmd;
  reset role;
  return 'ok';
exception when others then
  reset role;
  return sqlstate;
end $$;

create function pg_temp.sc_service_try(p_cmd text) returns text
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{}', true);
  set local role service_role;
  execute p_cmd;
  reset role;
  return 'ok';
exception when others then
  reset role;
  return sqlstate;
end $$;

create function pg_temp.sc_count(p_actor text, p_query text) returns int
language plpgsql as $$
declare v int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.sc_id(p_actor))::text, true);
  set local role authenticated;
  execute p_query into v;
  reset role;
  return v;
end $$;

select is((select count(*)::int from pg_tables where schemaname = 'public'
  and tablename like 'schedule_%' and rowsecurity), 7, 'RLS habilitada nas sete tabelas');
select is((select count(*)::int from public.schedule_types), 4, 'quatro tipos iniciais cadastrados');
select ok(not has_table_privilege('anon','public.schedule_documents','select'), 'anon sem acesso aos documentos');
select ok(not has_table_privilege('authenticated','public.schedule_documents','insert'), 'documento não entra por REST direto');
select ok(not has_table_privilege('authenticated','public.schedule_assignments','update'), 'designação não é corrigida por REST direto');
select ok(not has_table_privilege('authenticated','public.schedule_audit_events','insert'), 'auditoria sem INSERT externo');
select ok(not has_function_privilege('anon','public.schedule_register_document(uuid,uuid,text,bigint,text,date,date,uuid)','execute'), 'anon sem RPC de publicação');
select ok(not has_function_privilege('authenticated','public.schedule_publish_auto_candidate(uuid)','execute'), 'publicação automática é exclusiva do backend');

insert into auth.users(id, email)
select pg_temp.sc_id(label), label || '@schedule-test.invalid'
from unnest(array['coord','secretaria','instrutor','inativo','aluno1','aluno2','aluno3']) label;
insert into public.profiles(id, role, full_name, active) values
  (pg_temp.sc_id('coord'),'coordenacao','Coordenação fictícia',true),
  (pg_temp.sc_id('secretaria'),'secretaria','Secretaria fictícia',true),
  (pg_temp.sc_id('instrutor'),'instrutor','Instrutor fictício',true),
  (pg_temp.sc_id('inativo'),'coordenacao','Coordenação inativa',false),
  (pg_temp.sc_id('aluno1'),'aluno','Aluno fictício 1',true),
  (pg_temp.sc_id('aluno2'),'aluno','Aluno fictício 2',true),
  (pg_temp.sc_id('aluno3'),'aluno','Aluno fictício 3',true);
insert into public.courses(id, code, name, year) values
  (pg_temp.sc_id('course'),'SCHEDULE-TEST','Curso fictício',2099);
insert into public.classes(id, course_id, name) values
  (pg_temp.sc_id('class'),pg_temp.sc_id('course'),'Turma fictícia'),
  (pg_temp.sc_id('other-class'),pg_temp.sc_id('course'),'Outra turma');
insert into public.students(id, class_id, student_number, war_name, full_name) values
  (pg_temp.sc_id('student1'),pg_temp.sc_id('class'),1,'TESTE UM','Cadete fictício um'),
  (pg_temp.sc_id('student2'),pg_temp.sc_id('class'),2,'TESTE DOIS','Cadete fictício dois'),
  (pg_temp.sc_id('student3'),pg_temp.sc_id('other-class'),1,'TESTE TRÊS','Cadete de outra turma');
update public.profiles set student_id = pg_temp.sc_id('student1') where id = pg_temp.sc_id('aluno1');
update public.profiles set student_id = pg_temp.sc_id('student2') where id = pg_temp.sc_id('aluno2');
update public.profiles set student_id = pg_temp.sc_id('student3') where id = pg_temp.sc_id('aluno3');

select is(pg_temp.sc_try('coord', $q$
  insert into public.schedule_types(code,name) values ('teste_extra','Escala fictícia adicional')
$q$), 'ok', 'coordenação cadastra tipo dinâmico');
select is(pg_temp.sc_try('secretaria', $q$
  insert into public.schedule_types(code,name) values ('negado','Escala negada')
$q$), '42501', 'secretaria não cadastra tipo');
select is(pg_temp.sc_count('instrutor','select count(*) from public.schedule_types'), 5, 'instrutor consulta catálogo');
select is(pg_temp.sc_count('secretaria','select count(*) from public.schedule_types'), 0, 'secretaria não acessa módulo inicial');

select is(pg_temp.sc_try('coord', $q$
  select public.schedule_register_document(
    pg_temp.sc_id('class'),
    (select id from public.schedule_types where code='aluno_dia'),
    'escala-setembro.pdf', 1024,
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    date '2099-09-01', date '2099-09-30', null)
$q$), 'ok', 'coordenação registra PDF e reserva caminho');

select ok((select storage_path = class_id::text || '/' || id::text || '/escala-setembro.pdf'
  from public.schedule_documents where checksum_sha256 = repeat('a',64)), 'caminho deriva de turma e documento');
select is((select publication_status from public.schedule_documents where checksum_sha256=repeat('a',64)),
  'reserved', 'documento permanece reservado antes do upload');
select is(pg_temp.sc_count('instrutor','select count(*) from public.schedule_documents'), 0, 'instrutor não vê reserva sem arquivo');
select is(pg_temp.sc_count('aluno1','select count(*) from public.schedule_documents'), 0, 'cadete não vê reserva sem arquivo');
select is(pg_temp.sc_count('aluno3','select count(*) from public.schedule_documents'), 0, 'cadete de outra turma não vê PDF');
select is(pg_temp.sc_count('secretaria','select count(*) from public.schedule_documents'), 0, 'secretaria não vê PDF');
select is(pg_temp.sc_count('inativo','select count(*) from public.schedule_documents'), 0, 'perfil inativo não vê PDF');
select is(pg_temp.sc_try('coord', $q$
  select public.schedule_finalize_document(
    (select id from public.schedule_documents where checksum_sha256=repeat('a',64)))
$q$), '23514', 'publicação sem objeto no Storage é rejeitada');
select is(pg_temp.sc_service_try($q$
  insert into storage.objects(bucket_id,name)
  select 'schedule-pdfs',storage_path from public.schedule_documents where checksum_sha256=repeat('a',64)
$q$), 'ok', 'serviço grava objeto simulado no Storage');
select is(pg_temp.sc_count('aluno1', $$select count(*) from storage.objects where bucket_id='schedule-pdfs'$$),
  0, 'cadete não acessa objeto antes da publicação');
select is(pg_temp.sc_try('coord', $q$
  select public.schedule_finalize_document(
    (select id from public.schedule_documents where checksum_sha256=repeat('a',64)))
$q$), 'ok', 'coordenação confirma publicação depois do upload');
select is(pg_temp.sc_count('instrutor','select count(*) from public.schedule_documents'), 1, 'instrutor vê PDF publicado');
select is(pg_temp.sc_count('aluno1','select count(*) from public.schedule_documents'), 1, 'cadete da turma vê PDF publicado');
select is(pg_temp.sc_count('instrutor', $$select count(*) from storage.objects where bucket_id='schedule-pdfs'$$),
  1, 'instrutor lê objeto publicado');
select is(pg_temp.sc_count('aluno1', $$select count(*) from storage.objects where bucket_id='schedule-pdfs'$$),
  1, 'cadete da turma lê objeto publicado');
select is(pg_temp.sc_count('secretaria', $$select count(*) from storage.objects where bucket_id='schedule-pdfs'$$),
  0, 'secretaria não lê objeto publicado');
select is(pg_temp.sc_try('coord', $q$
  select public.schedule_register_document(
    pg_temp.sc_id('class'), (select id from public.schedule_types where code='aluno_dia'),
    '../invalido.pdf', 10, repeat('b',64), null, null, null)
$q$), '23514', 'nome inseguro é rejeitado');
select is(pg_temp.sc_try('coord', $q$
  select public.schedule_register_document(
    pg_temp.sc_id('class'), (select id from public.schedule_types where code='oficial_dia'),
    'falha-controlada.pdf', 10, repeat('f',64), null, null, null)
$q$), 'ok', 'falha de upload começa por uma reserva auditada');
select is(pg_temp.sc_try('coord', $q$
  select public.schedule_fail_upload(
    (select id from public.schedule_documents where checksum_sha256=repeat('f',64)),
    'Falha fictícia do Storage')
$q$), 'ok', 'coordenação registra falha da reserva');
select is((select publication_status from public.schedule_documents where checksum_sha256=repeat('f',64)),
  'upload_failed', 'falha não se transforma em publicação');
select is(pg_temp.sc_count('aluno1', $$select count(*) from public.schedule_documents where checksum_sha256=repeat('f',64)$$),
  0, 'cadete não vê upload com falha');

select is(pg_temp.sc_try('coord', $q$
  select public.schedule_request_reprocess(
    (select id from public.schedule_documents where checksum_sha256=repeat('a',64)), 'auto')
$q$), 'ok', 'coordenação solicita processamento');
select is((select processing_status from public.schedule_documents where checksum_sha256=repeat('a',64)),
  'processing', 'documento fica em processamento');
select is((select attempt from public.schedule_processing_runs limit 1), 1, 'primeira tentativa é numerada');
select is(pg_temp.sc_count('aluno1','select count(*) from public.schedule_processing_runs'), 0, 'cadete não vê execução interna');

select is(pg_temp.sc_service_try($q$
  insert into public.schedule_candidates(
    id,run_id,document_id,sequence,raw_name,duty_date,duty_function,original_line,match_status,confidence,candidate_student_ids)
  select pg_temp.sc_id('candidate'),r.id,r.document_id,1,'TESTE UM',date '2099-09-10','Aluno de Dia',
    '10 TESTE UM - Aluno de Dia','needs_review',0.7400,array[pg_temp.sc_id('student1')]
  from public.schedule_processing_runs r limit 1
$q$), 'ok', 'serviço grava candidato rastreável');
select is(pg_temp.sc_count('instrutor','select count(*) from public.schedule_candidates'), 0, 'instrutor não vê dados internos do parser');
select is(pg_temp.sc_try('coord', $q$
  select public.schedule_confirm_candidate(pg_temp.sc_id('candidate'),pg_temp.sc_id('student3'),'Outra turma indevida')
$q$), '23514', 'confirmação rejeita cadete de outra turma');
select is(pg_temp.sc_try('coord', $q$
  select public.schedule_confirm_candidate(pg_temp.sc_id('candidate'),pg_temp.sc_id('student1'),'Conferência manual fictícia')
$q$), 'ok', 'coordenação confirma vínculo ambíguo');
select is((select match_status from public.schedule_candidates where id=pg_temp.sc_id('candidate')),
  'manually_confirmed', 'candidato conserva resolução manual');
select is((select count(*)::int from public.schedule_notification_events), 1, 'publicação cria notificação na mesma transação');
select is(pg_temp.sc_count('aluno1','select count(*) from public.schedule_assignments'), 1, 'cadete vê sua designação');
select is(pg_temp.sc_count('aluno2','select count(*) from public.schedule_assignments'), 0, 'cadete não vê designação alheia');
select is(pg_temp.sc_count('instrutor','select count(*) from public.schedule_assignments'), 0, 'instrutor acessa PDF sem alerta pessoal');

select is(pg_temp.sc_service_try($q$
  insert into public.schedule_candidates(
    id,run_id,document_id,sequence,raw_name,duty_date,duty_function,original_line,
    match_status,confidence,candidate_student_ids,matched_student_id)
  select pg_temp.sc_id('auto-candidate'),r.id,r.document_id,2,'TESTE DOIS',date '2099-09-12',
    'Aluno de Dia','12 TESTE DOIS - Aluno de Dia','auto_confirmed',0.9900,
    array[pg_temp.sc_id('student2')],pg_temp.sc_id('student2')
  from public.schedule_processing_runs r limit 1;
  select public.schedule_publish_auto_candidate(pg_temp.sc_id('auto-candidate'))
$q$), 'ok', 'backend publica vínculo inequívoco e notificação atomicamente');
select is((select count(*)::int from public.schedule_notification_events), 2, 'publicação automática também alimenta outbox');

select is(pg_temp.sc_try('coord', $q$
  select public.schedule_correct_assignment(
    (select id from public.schedule_assignments where candidate_id=pg_temp.sc_id('candidate') and status='published'),
    pg_temp.sc_id('student2'),date '2099-09-11','Aluno de Dia','Correção de destinatário fictícia')
$q$), 'ok', 'correção cria nova versão da designação');
select is((select count(*)::int from public.schedule_assignments), 3, 'histórico conserva versões manuais e automáticas');
select is((select count(*)::int from public.schedule_notification_events), 4, 'correção avisa destinatários anterior e atual');
select is(pg_temp.sc_count('aluno2','select count(*) from public.schedule_assignments'), 2, 'novo destinatário vê suas designações');
select is(pg_temp.sc_try('coord', $q$
  select public.schedule_register_document(
    pg_temp.sc_id('class'), (select id from public.schedule_types where code='aluno_dia'),
    'escala-substituta.pdf', 2048, repeat('d',64), date '2099-10-01', date '2099-10-31',
    (select id from public.schedule_documents where checksum_sha256=repeat('a',64)))
$q$), 'ok', 'coordenação reserva versão substituta');
select isnt((select processing_status from public.schedule_documents where checksum_sha256=repeat('a',64)),
  'superseded', 'versão anterior continua vigente antes do upload');
select is(pg_temp.sc_service_try($q$
  insert into storage.objects(bucket_id,name)
  select 'schedule-pdfs',storage_path from public.schedule_documents where checksum_sha256=repeat('d',64)
$q$), 'ok', 'Storage recebe a versão substituta');
select is(pg_temp.sc_try('coord', $q$
  select public.schedule_finalize_document(
    (select id from public.schedule_documents where checksum_sha256=repeat('d',64)))
$q$), 'ok', 'versão substituta é publicada');
select is((select processing_status from public.schedule_documents where checksum_sha256=repeat('a',64)),
  'superseded', 'versão anterior só é superada após confirmação');
select is(pg_temp.sc_service_try($q$
  delete from public.schedule_documents where checksum_sha256=repeat('a',64)
$q$), '42501', 'nem serviço apaga documento histórico');
select is(pg_temp.sc_service_try($q$
  update public.schedule_documents set original_filename='alterado.pdf' where checksum_sha256=repeat('a',64)
$q$), '23514', 'metadados publicados não são sobrescritos');
select ok((select count(*) >= 9 from public.schedule_audit_events), 'operações relevantes geram auditoria');
select is(pg_temp.sc_service_try('delete from public.schedule_audit_events'), '42501', 'auditoria é imutável');

select ok(not has_function_privilege('authenticated','public.schedule_claim_processing_run(text)','execute'),
  'claim da fila é exclusivo do backend');
select is(pg_temp.sc_try('coord', $q$
  select public.schedule_request_reprocess(
    (select id from public.schedule_documents where checksum_sha256=repeat('a',64)), 'auto')
$q$), '23514', 'versão superada não aceita novo processamento');
select is(pg_temp.sc_service_try($q$
  select * from public.schedule_claim_processing_run('schedule-parser/test')
$q$), 'ok', 'worker limpa itens da fila referentes a versões superadas');
select is((select status from public.schedule_processing_runs where document_id=(
  select id from public.schedule_documents where checksum_sha256=repeat('a',64))),
  'failed', 'fila obsoleta é encerrada sem processar o PDF');
select is((select error_code from public.schedule_processing_runs where document_id=(
  select id from public.schedule_documents where checksum_sha256=repeat('a',64))),
  'DOCUMENT_SUPERSEDED', 'fila obsoleta conserva a causa do encerramento');

select is(pg_temp.sc_try('coord', $q$
  select public.schedule_request_reprocess(
    (select id from public.schedule_documents where checksum_sha256=repeat('d',64)), 'native_text')
$q$), 'ok', 'coordenação enfileira a versão vigente');
select is(pg_temp.sc_try('coord', $q$
  select public.schedule_request_reprocess(
    (select id from public.schedule_documents where checksum_sha256=repeat('d',64)), 'native_text')
$q$), 'ok', 'pedido repetido é idempotente enquanto ativo');
select is((select count(*)::int from public.schedule_processing_runs r join public.schedule_documents d
  on d.id=r.document_id where d.checksum_sha256=repeat('d',64)), 1,
  'há somente uma execução ativa por documento');
select is(pg_temp.sc_service_try($q$
  select * from public.schedule_claim_processing_run('schedule-parser/test')
$q$), 'ok', 'worker assume a execução vigente');
select is((select status from public.schedule_processing_runs r join public.schedule_documents d
  on d.id=r.document_id where d.checksum_sha256=repeat('d',64)),
  'running', 'claim marca a execução como running');
select is((select parser_revision from public.schedule_processing_runs r join public.schedule_documents d
  on d.id=r.document_id where d.checksum_sha256=repeat('d',64)),
  'schedule-parser/test', 'claim registra a revisão efetiva do parser');
select is(pg_temp.sc_service_try($q$
  select public.schedule_complete_processing_run(
    (select r.id from public.schedule_processing_runs r join public.schedule_documents d
      on d.id=r.document_id where d.checksum_sha256=repeat('d',64) and r.status='running'),
    'succeeded',
    '{"candidateCount":1,"extractionMethod":"native_text"}'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'sequence',1,'raw_name','TESTE UM','duty_date','2099-10-10',
      'duty_function','Aluno de Dia','original_line','10/10/2099 TESTE UM',
      'match_status','auto_confirmed','confidence',0.99,
      'match_reasons',jsonb_build_array('nome_exato_unico','data_valida'),
      'candidate_student_ids',jsonb_build_array(pg_temp.sc_id('student1')),
      'matched_student_id',pg_temp.sc_id('student1')
    )),null,null)
$q$), 'ok', 'conclusão persiste candidato e publicação automática atomicamente');
select is((select processing_status from public.schedule_documents where checksum_sha256=repeat('d',64)),
  'processed', 'documento recebe o estado final do parser');
select is((select count(*)::int from public.schedule_assignments a join public.schedule_documents d
  on d.id=a.document_id where d.checksum_sha256=repeat('d',64) and a.status='published'), 1,
  'vínculo inequívoco gera designação vigente');

select * from finish();
rollback;
