-- Testes transacionais: nenhum dado fictício permanece no banco.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims', '{}', true);

create function pg_temp.it_id(label text) returns uuid language sql immutable
as $$ select md5('internship-test-' || label)::uuid $$;

create function pg_temp.it_try(p_actor text, p_cmd text) returns text
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.it_id(p_actor))::text, true);
  set local role authenticated;
  execute p_cmd;
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  return 'ok';
exception when others then
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  return sqlstate;
end $$;

create function pg_temp.it_count(p_actor text, p_query text) returns integer
language plpgsql as $$
declare v_count integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.it_id(p_actor))::text, true);
  set local role authenticated;
  execute p_query into v_count;
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  return v_count;
end $$;

insert into auth.users(id, email)
select pg_temp.it_id(label), label || '@internship-test.invalid'
from unnest(array['coord','secretaria','instrutor','inativo','aluno1','aluno2']) label;
insert into public.profiles(id,role,full_name,active) values
  (pg_temp.it_id('coord'),'coordenacao','Coordenação de teste',true),
  (pg_temp.it_id('secretaria'),'secretaria','Secretaria de teste',true),
  (pg_temp.it_id('instrutor'),'instrutor','Instrutor de teste',true),
  (pg_temp.it_id('inativo'),'coordenacao','Coordenação inativa',false),
  (pg_temp.it_id('aluno1'),'aluno','Cadete de teste 1',true),
  (pg_temp.it_id('aluno2'),'aluno','Cadete de teste 2',true);
insert into public.courses(id,code,name,year)
values (pg_temp.it_id('course'),'INTERNSHIP-TEST','Curso de teste',2099);
insert into public.classes(id,course_id,name)
values (pg_temp.it_id('class'),pg_temp.it_id('course'),'Turma de teste');
insert into public.students(id,class_id,student_number,war_name,full_name,pelotao) values
  (pg_temp.it_id('student1'),pg_temp.it_id('class'),1,'CADETE A','Cadete de teste A','CFO I'),
  (pg_temp.it_id('student2'),pg_temp.it_id('class'),2,'CADETE B','Cadete de teste B','CFO I');
update public.profiles set student_id = pg_temp.it_id('student1') where id = pg_temp.it_id('aluno1');
update public.profiles set student_id = pg_temp.it_id('student2') where id = pg_temp.it_id('aluno2');

select is(pg_temp.it_try('coord', $q$
  insert into public.internship_programs(id,class_id,course_phase,name,starts_on,ends_on,
    required_minutes,target_minutes,status,created_by,published_by,published_at)
  values (pg_temp.it_id('program'),pg_temp.it_id('class'),'CFO I','Estágio de teste',
    '2026-09-01','2026-12-31',15000,15120,'publicado',pg_temp.it_id('coord'),
    pg_temp.it_id('coord'),now())
$q$), 'ok', 'Coordenação cria programa');
select is(pg_temp.it_try('secretaria', $q$
  insert into public.internship_programs(class_id,course_phase,name,starts_on,ends_on,
    required_minutes,target_minutes)
  values (pg_temp.it_id('class'),'CFO II','Estágio negado','2026-09-01','2026-12-31',15000,15120)
$q$), '42501', 'Secretaria não cria programa');

insert into public.internship_activity_types(id,program_id,code,name,training_axis,default_minutes)
values (pg_temp.it_id('activity'),pg_temp.it_id('program'),'usb','USB','aph',720);
insert into public.internship_sites(id,program_id,site_type,code,name,gbm_number)
values (pg_temp.it_id('site'),pg_temp.it_id('program'),'gbm','gbm1','1º GBM',1);
insert into public.internship_resources(id,site_id,code,display_name,resource_type)
values (pg_temp.it_id('resource'),pg_temp.it_id('site'),'usb1','USB 1','usb');
insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,
  starts_at,ends_at,capacity,status,planned_supervisor_name,created_by,published_by,published_at)
values (pg_temp.it_id('shift'),pg_temp.it_id('program'),pg_temp.it_id('activity'),
  pg_temp.it_id('site'),pg_temp.it_id('resource'),'2026-09-10 08:00-03',
  '2026-09-10 20:00-03',1,'publicado','Oficial de teste',pg_temp.it_id('coord'),
  pg_temp.it_id('coord'),now());

select is(pg_temp.it_try('coord', $q$
  insert into public.internship_assignments(id,shift_id,student_id,created_by)
  values (pg_temp.it_id('assignment'),pg_temp.it_id('shift'),pg_temp.it_id('student1'),
    pg_temp.it_id('coord'))
$q$), 'ok', 'Coordenação atribui cadete');

create function pg_temp.ev_call(actor text, query text) returns jsonb language plpgsql as $$
declare result jsonb;
begin
 perform set_config('request.jwt.claims',case when actor='anon' then '{}' else json_build_object('sub',pg_temp.it_id(actor))::text end,true);
 if actor='anon' then set local role anon; else set local role authenticated; end if;
 execute query into result;
 reset role;
 perform set_config('request.jwt.claims','{}',true);
 return result;
end$$;
create function pg_temp.ev_try(actor text, query text) returns text language plpgsql as $$
begin
 perform pg_temp.ev_call(actor,query); return 'ok';
exception when others then reset role; perform set_config('request.jwt.claims','{}',true); return sqlstate;
end$$;
create function pg_temp.ratings() returns jsonb language sql as $$
 select '{"pontualidade":"esperado","seguranca":"nao_observado","tecnica":"esperado","equipe":"acima","postura":"esperado","aprendizagem":"esperado"}'::jsonb;
$$;
create function pg_temp.invite() returns jsonb language sql as $$ select current_setting('test.invite')::jsonb $$;
create function pg_temp.submit_sql(r jsonb default pg_temp.ratings(), guidance text default '', incident boolean default false, note text default '', confirmed boolean default true) returns text language sql as $$
 select format('select to_jsonb(public.internship_submit_evaluation(%L,%L,%L,%L::jsonb,%L,%L,%L,%L))',pg_temp.invite()->>'token','Cap. Teste','1º GBM',r,guidance,incident,note,confirmed);
$$;
select ok((select relrowsecurity from pg_class where oid='public.internship_evaluations'::regclass),'RLS ativa');
select ok(not has_table_privilege('anon','public.internship_evaluations','select'),'Anônimo não consulta avaliações');
select ok(not has_table_privilege('authenticated','public.internship_evaluations','update'),'Respostas não podem ser sobrescritas diretamente');
select ok(not has_function_privilege('anon','public.internship_evaluation_context(uuid)','execute'),'Contexto interno protegido');
select is(pg_temp.ev_try('aluno1',$q$select public.internship_create_evaluation_invite(pg_temp.it_id('assignment'),'Cap. Teste','teste@invalid.local')$q$),'42501','Cadete comum não gera convites');
select is(pg_temp.ev_try('aluno2',$q$select public.internship_create_cadet_evaluation_invite(pg_temp.it_id('assignment'),'Cap. Teste','contato conferido')$q$),'42501','Outro cadete não convida oficial de plantão alheio');
select is(pg_temp.ev_try('secretaria',$q$select public.internship_create_cadet_evaluation_invite(pg_temp.it_id('assignment'),'Cap. Teste','contato conferido')$q$),'42501','Perfil não cadete não gera convite do aluno');
do $$begin perform set_config('test.cadet_invite',pg_temp.ev_call('aluno1',$q$select public.internship_create_cadet_evaluation_invite(pg_temp.it_id('assignment'),'Cap. Teste','WhatsApp conferido')$q$)::text,true);end$$;
select is(length(current_setting('test.cadet_invite')::jsonb->>'token'),64,'Cadete recebe link seguro para o oficial');
select is((pg_temp.ev_call('aluno1','select public.internship_my_evaluation_invites()')->0)->>'status','aguardando','Cadete acompanha apenas o estado do convite');
select ok(not ((pg_temp.ev_call('aluno1','select public.internship_my_evaluation_invites()')->0) ? 'token'),'Token não é listado novamente após emissão');
select is(pg_temp.ev_call('aluno2','select public.internship_my_evaluation_invites()'),'[]'::jsonb,'Outro cadete não consulta o convite');
select is(pg_temp.ev_try('inativo',$q$select public.internship_create_evaluation_invite(pg_temp.it_id('assignment'),'Cap. Teste','teste@invalid.local')$q$),'42501','Gestor inativo não gera convite');
do $$begin perform set_config('test.invite',pg_temp.ev_call('coord',$q$select public.internship_create_evaluation_invite(pg_temp.it_id('assignment'),'Cap. Teste','teste@invalid.local')$q$)::text,true);end$$;
select is(pg_temp.ev_call('anon',format('select public.internship_read_evaluation_invite(%L)',current_setting('test.cadet_invite')::jsonb->>'token')),null::jsonb,'Convite substituído pela Coordenação deixa de valer');
select is(length(pg_temp.invite()->>'token'),64,'Convite possui token aleatório de 256 bits');
select ok((select token_hash<>pg_temp.invite()->>'token' from public.internship_evaluations where id=(pg_temp.invite()->>'id')::uuid),'Token não armazenado em texto');
select is(pg_temp.ev_call('anon',$q$select public.internship_read_evaluation_invite('invalido')$q$),null::jsonb,'Link inválido não revela dados');
select ok(pg_temp.ev_call('anon',format('select public.internship_read_evaluation_invite(%L)',pg_temp.invite()->>'token'))->>'recipient_name'='Cap. Teste','Oficial acessa o convite sem conta');
select ok(not (pg_temp.ev_call('anon',format('select public.internship_read_evaluation_invite(%L)',pg_temp.invite()->>'token')) ?| array['recipient_contact','student_id','ratings','review_note']),'Resposta pública contém apenas dados mínimos');
select is(pg_temp.it_count('aluno1','select count(*) from public.internship_evaluations'),0,'Cadete não vê convites e notas privadas');
select is(pg_temp.ev_try('anon',pg_temp.submit_sql(pg_temp.ratings()-'pontualidade')),'23514','Seis critérios obrigatórios');
select is(pg_temp.ev_try('anon',pg_temp.submit_sql(pg_temp.ratings()||'{"seguranca":null}')),'23514','Resposta nula rejeitada');
select is(pg_temp.ev_try('anon',pg_temp.submit_sql(pg_temp.ratings()||'{"tecnica":"ruim"}')),'23514','Resposta fora das quatro opções rejeitada');
select is(pg_temp.ev_try('anon',pg_temp.submit_sql(pg_temp.ratings()||'{"tecnica":"reforco"}')),'23514','Reforço exige orientação');
select is(pg_temp.ev_try('anon',pg_temp.submit_sql(pg_temp.ratings(),'',true,'')),'23514','Situação relevante exige descrição');
select is(pg_temp.ev_try('anon',pg_temp.submit_sql(pg_temp.ratings(),'',false,'',false)),'23514','Confirmação de acompanhamento obrigatória');
select is(pg_temp.ev_try('anon',pg_temp.submit_sql(pg_temp.ratings()||'{"tecnica":"reforco"}','Revisar organização dos materiais.',true,'Orientado sobre a conferência.')),'ok','Oficial envia a avaliação');
select is(pg_temp.ev_try('anon',pg_temp.submit_sql()),'23514','Link não permite sobrescrever resposta');
select is(pg_temp.ev_call('anon',format('select public.internship_read_evaluation_invite(%L)',pg_temp.invite()->>'token')),'{"status":"respondida"}'::jsonb,'Link usado mostra recibo sem revelar respostas');
select is(pg_temp.ev_call('aluno1','select public.internship_my_evaluations()'),'[]'::jsonb,'Resposta aguarda revisão antes de ser exibida ao cadete');
select is(pg_temp.ev_try('coord',format('select to_jsonb(public.internship_review_evaluation(%L,%L,%L,false))',pg_temp.invite()->>'id','liberada','')),'23514','Liberação exige conferência de identidade');
select is(pg_temp.ev_try('coord',format('select to_jsonb(public.internship_review_evaluation(%L,%L,%L,false))',pg_temp.invite()->>'id','devolvida','')),'23514','Devolução exige motivo');
select is(pg_temp.ev_try('coord',format('select to_jsonb(public.internship_review_evaluation(%L,%L,%L,true))',pg_temp.invite()->>'id','liberada','Nota administrativa privada')),'ok','Gestor libera avaliação');
select is(jsonb_array_length(pg_temp.ev_call('aluno1','select public.internship_my_evaluations()')),1,'Cadete vê a própria avaliação liberada');
select ok(not ((pg_temp.ev_call('aluno1','select public.internship_my_evaluations()')->0) ?| array['review_note','recipient_contact','incident_note','token_hash']),'Cadete não recebe notas administrativas nem dados de contato');
select is(pg_temp.ev_call('aluno2','select public.internship_my_evaluations()'),'[]'::jsonb,'Outro cadete não acessa avaliação alheia');
select is((select count(*)::integer from public.internship_execution_records where assignment_id=pg_temp.it_id('assignment')),0,'Avaliação não cria ficha de horas nem homologa carga');
select ok(exists(select 1 from public.audit_logs where entity='internship_evaluations'),'Avaliações deixam trilha de auditoria');
-- Renew, expire and cancel invitations.
do $$begin perform set_config('test.old_token',pg_temp.invite()->>'token',true); perform set_config('test.invite',pg_temp.ev_call('coord',$q$select public.internship_create_evaluation_invite(pg_temp.it_id('assignment'),'Cap. Outro','contato conferido')$q$)::text,true);end$$;
do $$begin perform set_config('test.pending_token',pg_temp.invite()->>'token',true); perform set_config('test.invite',pg_temp.ev_call('coord',$q$select public.internship_create_evaluation_invite(pg_temp.it_id('assignment'),'Cap. Outro','contato conferido')$q$)::text,true);end$$;
select is(pg_temp.ev_call('anon',format('select public.internship_read_evaluation_invite(%L)',current_setting('test.pending_token'))),null::jsonb,'Substituição cancela convite anterior pendente');
update public.internship_evaluations set expires_at=now()-interval '1 minute' where id=(pg_temp.invite()->>'id')::uuid;
select is(pg_temp.ev_call('anon',format('select public.internship_read_evaluation_invite(%L)',pg_temp.invite()->>'token')),null::jsonb,'Convite expirado não abre');
select is(pg_temp.ev_try('anon',pg_temp.submit_sql()),'23514','Convite expirado não envia');
do $$begin perform set_config('test.invite',pg_temp.ev_call('coord',$q$select public.internship_create_evaluation_invite(pg_temp.it_id('assignment'),'Cap. Outro','contato conferido')$q$)::text,true);end$$;
select is(pg_temp.ev_try('coord',format('select to_jsonb(public.internship_revoke_evaluation_invite(%L))',pg_temp.invite()->>'id')),'ok','Gestor cancela link');
select is(pg_temp.ev_call('anon',format('select public.internship_read_evaluation_invite(%L)',pg_temp.invite()->>'token')),null::jsonb,'Convite revogado não abre');
select is(pg_temp.ev_try('coord',$q$select to_jsonb(public.internship_record_paper_evaluation(pg_temp.it_id('assignment'),'Cap. Papel','1º GBM',pg_temp.ratings(),'',false,'','Ficha 001'))$q$),'ok','Ficha em papel usa os mesmos critérios');
select is((select count(*)::integer from public.internship_evaluations where assignment_id=pg_temp.it_id('assignment') and source='papel' and status='respondida'),1,'Ficha em papel também aguarda revisão');
select is(public.internship_evaluation_ready_at('{"starts_at":"2026-09-27T08:00:00-03:00","ends_at":"2026-09-27T20:00:00-03:00"}'::jsonb),
 '2026-09-27 14:00-03'::timestamptz,'Plantão de 12 horas libera avaliação após 6 horas');
select is(public.internship_evaluation_ready_at('{"starts_at":"2026-09-27T08:00:00-03:00","ends_at":"2026-09-28T08:00:00-03:00"}'::jsonb),
 '2026-09-27 20:00-03'::timestamptz,'Plantão de 24 horas libera avaliação após 12 horas');
-- Plantão em andamento: metade cumprida, fim ainda futuro.
insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,starts_at,ends_at,capacity,status,created_by,published_by,published_at)
values(pg_temp.it_id('midpoint_shift'),pg_temp.it_id('program'),pg_temp.it_id('activity'),pg_temp.it_id('site'),pg_temp.it_id('resource'),now()-interval '7 hours',now()+interval '5 hours',1,'publicado',pg_temp.it_id('coord'),pg_temp.it_id('coord'),now());
insert into public.internship_assignments(id,shift_id,student_id,created_by)
values(pg_temp.it_id('midpoint_assignment'),pg_temp.it_id('midpoint_shift'),pg_temp.it_id('student2'),pg_temp.it_id('coord'));
do $$begin perform set_config('test.invite',pg_temp.ev_call('coord',$q$select public.internship_create_evaluation_invite(pg_temp.it_id('midpoint_assignment'),'Cap. Meio','contato conferido')$q$)::text,true);end$$;
select is(pg_temp.ev_call('anon',format('select public.internship_read_evaluation_invite(%L)',pg_temp.invite()->>'token'))->>'can_submit','true','Oficial pode responder após metade, antes do fim');
select is(pg_temp.ev_try('anon',pg_temp.submit_sql()),'ok','Banco aceita avaliação após metade do plantão');
-- Future shift: invitation allowed, submission blocked.
insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,starts_at,ends_at,capacity,status,created_by,published_by,published_at)
values(pg_temp.it_id('future_shift'),pg_temp.it_id('program'),pg_temp.it_id('activity'),pg_temp.it_id('site'),pg_temp.it_id('resource'),'2026-12-19 08:00-03','2026-12-19 20:00-03',1,'publicado',pg_temp.it_id('coord'),pg_temp.it_id('coord'),now());
insert into public.internship_assignments(id,shift_id,student_id,created_by) values(pg_temp.it_id('future_assignment'),pg_temp.it_id('future_shift'),pg_temp.it_id('student1'),pg_temp.it_id('coord'));
do $$begin perform set_config('test.invite',pg_temp.ev_call('coord',$q$select public.internship_create_evaluation_invite(pg_temp.it_id('future_assignment'),'Cap. Futuro','contato conferido')$q$)::text,true);end$$;
select is(pg_temp.ev_call('anon',format('select public.internship_read_evaluation_invite(%L)',pg_temp.invite()->>'token'))->>'can_submit','false','Formulário avisa para aguardar metade do plantão');
select is(pg_temp.ev_try('anon',pg_temp.submit_sql()),'23514','Banco bloqueia avaliação antes da metade do plantão');
select is(pg_temp.it_try('coord',$q$select public.internship_cancel_assignment(pg_temp.it_id('future_assignment'),'Cancelamento teste')$q$),'ok','Gestor cancela participação');
select is(pg_temp.ev_call('anon',format('select public.internship_read_evaluation_invite(%L)',pg_temp.invite()->>'token')),null::jsonb,'Participação cancelada invalida link');
-- O número só entra na agenda após a confirmação e a liberação da avaliação.
select ok((select relrowsecurity from pg_class where oid='public.internship_verified_officer_contacts'::regclass),'RLS ativa nos contatos de oficiais');
select ok(not has_table_privilege('authenticated','public.internship_verified_officer_contacts','insert'),'Contato de oficial não pode ser inserido diretamente');
select is((select count(*)::integer from public.internship_verified_officer_contacts),0,'Convite sem confirmação não cria contato de oficial');
select is(pg_temp.it_count('aluno1','select count(*) from public.internship_verified_officer_contacts'),0,'Cadete não consulta contatos de oficiais');
update public.internship_evaluations set whatsapp_targets = array['5596999999999']
  where assignment_id = pg_temp.it_id('midpoint_assignment') and status = 'respondida';
select is(pg_temp.ev_try('secretaria',format(
  'select to_jsonb(public.internship_review_evaluation_with_whatsapp(%L,%L,%L,true,%L))',
  (select id from public.internship_evaluations where assignment_id = pg_temp.it_id('midpoint_assignment')),
  'liberada','','5596991111111')),'42501','Secretaria não confirma número do oficial');
select is(pg_temp.ev_try('coord',format(
  'select to_jsonb(public.internship_review_evaluation_with_whatsapp(%L,%L,%L,true,%L))',
  (select id from public.internship_evaluations where assignment_id = pg_temp.it_id('midpoint_assignment')),
  'liberada','','5596991111111')),'ok','Gestor libera avaliação após conferir remetente');
select is((select phone from public.internship_verified_officer_contacts where officer_name = 'Cap. Teste'),
  '5596991111111','Número conferido fica associado ao nome do oficial');
select is((select count(*)::integer from public.internship_verified_officer_contacts),1,'Liberação cria um contato confirmado');
select is(pg_temp.it_count('secretaria','select count(*) from public.internship_verified_officer_contacts'),0,'Secretaria não consulta contatos de oficiais');
select ok(exists(select 1 from public.audit_logs where entity = 'internship_verified_officer_contacts'),'Contato de oficial tem auditoria');
select * from finish();
rollback;
