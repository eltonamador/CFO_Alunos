-- Fixtures fictícias, revertidas integralmente. Executar no banco de teste.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
create function pg_temp.ex_id(label text) returns uuid language sql immutable as $$ select md5('cfo-experience-test-' || label)::uuid $$;
create function pg_temp.ex_try(actor text, command text) returns text language plpgsql as $$
begin
 perform set_config('request.jwt.claims',json_build_object('sub',pg_temp.ex_id(actor))::text,true);
 set local role authenticated; execute command; reset role; return 'ok';
exception when others then reset role; return sqlstate; end $$;
create function pg_temp.ex_count(actor text, command text) returns integer language plpgsql as $$
declare value integer; begin
 perform set_config('request.jwt.claims',json_build_object('sub',pg_temp.ex_id(actor))::text,true);
 set local role authenticated; execute command into value; reset role; return value;
end $$;
insert into auth.users(id,email) select pg_temp.ex_id(label), label || '@experience.invalid'
from unnest(array['coord','secretaria','instrutor','aluno','outro','inativo']) label;
insert into public.profiles(id,role,full_name,active) select pg_temp.ex_id(label),
 case when label in ('aluno','outro') then 'aluno' when label in ('inativo','coord') then 'coordenacao' else label end,
 'Conta fictícia ' || label, label <> 'inativo'
from unnest(array['coord','secretaria','instrutor','aluno','outro','inativo']) label;
insert into public.courses(id,code,name,year) values(pg_temp.ex_id('course'),'EXPERIENCE-TEST','Curso teste',2099);
insert into public.classes(id,course_id,name) values(pg_temp.ex_id('class'),pg_temp.ex_id('course'),'Turma teste'),(pg_temp.ex_id('other-class'),pg_temp.ex_id('course'),'Outra turma teste');
insert into public.students(id,class_id,student_number,war_name,full_name) values
 (pg_temp.ex_id('student'),pg_temp.ex_id('class'),1,'TESTE','Cadete teste'),
 (pg_temp.ex_id('other-student'),pg_temp.ex_id('other-class'),1,'OUTRO','Outro cadete');
update public.profiles set student_id=pg_temp.ex_id('student') where id=pg_temp.ex_id('aluno');
update public.profiles set student_id=pg_temp.ex_id('other-student') where id=pg_temp.ex_id('outro');
insert into public.cfo_coordination_members(id,full_name,military_rank,registration,function_name,designation_ref,effective_from,service_alias,profile_id,display_order)
 values(pg_temp.ex_id('member'),'Oficial fictício','CAP','999999999','Coordenação','TESTE','2099-01-01','CAP TESTE',pg_temp.ex_id('coord'),99);
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.ex_id('coord'))::text,true);
select public.schedule_register_document(pg_temp.ex_id('class'),(select id from public.schedule_types where code='aluno_dia'),
 'experience-test.pdf',1024,repeat('e',64),'2099-09-01','2099-09-30',null);
insert into storage.objects(bucket_id,name) select 'schedule-pdfs',storage_path from public.schedule_documents where checksum_sha256=repeat('e',64);
create function pg_temp.ex_rows() returns jsonb language sql as $$ select jsonb_build_array(
 jsonb_build_object('kind','cadet','studentId',pg_temp.ex_id('student'),'person','TESTE','date','2099-09-20','dutyFunction','Apoio 1','shift','1º turno'),
 jsonb_build_object('kind','officer','profileId',pg_temp.ex_id('coord'),'person','CAP TESTE','date','2099-09-20','dutyFunction','ODA','shift','manha','startsAt','07:00','endsAt','13:00')) $$;
select ok(not has_function_privilege('anon','public.schedule_calendar(date,date)','execute'),'anon não acessa calendário');
select ok(not has_function_privilege('authenticated','public.schedule_live_roster(date,date)','execute'),'leitor não acessa identidades internas');
select ok(not has_function_privilege('authenticated','public.schedule_reserve_reminder(uuid,date,text,text,text)','execute'),'leitor não reserva envios');
select is(pg_temp.ex_try('aluno',$q$ select public.schedule_publish_reviewed_import((select id from public.schedule_documents where checksum_sha256=repeat('e',64)),pg_temp.ex_rows()) $q$),'42501','aluno não publica importação');
select is(pg_temp.ex_try('coord',$q$ select public.schedule_publish_reviewed_import((select id from public.schedule_documents where checksum_sha256=repeat('e',64)),jsonb_set(pg_temp.ex_rows(),'{0,studentId}',to_jsonb(pg_temp.ex_id('other-student')::text))) $q$),'23514','importação bloqueia cadete de outra turma');
select is((select publication_status from public.schedule_documents where checksum_sha256=repeat('e',64)),'reserved','erro mantém publicação reservada sem trocar a escala vigente');
select is(pg_temp.ex_try('coord',$q$ select public.schedule_publish_reviewed_import((select id from public.schedule_documents where checksum_sha256=repeat('e',64)),pg_temp.ex_rows() || pg_temp.ex_rows()) $q$),'23514','servidor rejeita linhas repetidas');
select is(pg_temp.ex_try('coord',$q$ select public.schedule_publish_reviewed_import((select id from public.schedule_documents where checksum_sha256=repeat('e',64)),pg_temp.ex_rows()) $q$),'ok','coordenação publica documento e tabela juntos');
select is(pg_temp.ex_try('coord',$q$ select public.schedule_publish_reviewed_import((select id from public.schedule_documents where checksum_sha256=repeat('e',64)),pg_temp.ex_rows()) $q$),'ok','retry da publicação é idempotente');
select is((select count(*)::int from public.schedule_assignments where document_id=(select id from public.schedule_documents where checksum_sha256=repeat('e',64))),1,'retry não duplica cadete');
select is(pg_temp.ex_count('aluno',$q$ select count(*) from public.schedule_calendar('2099-09-01','2099-09-30') $q$),2,'cadete vê equipe no mês, incluindo oficial');
select is(pg_temp.ex_count('aluno',$q$ select count(*) from public.schedule_calendar('2099-09-01','2099-09-30') where mine $q$),1,'minhas inclui só o próprio cadete');
select is(pg_temp.ex_count('coord',$q$ select count(*) from public.schedule_calendar('2099-09-01','2099-09-30') where mine $q$),1,'oficial identificado tem sua própria escala');
select is(pg_temp.ex_count('secretaria',$q$ select count(*) from public.schedule_calendar('2099-09-01','2099-09-30') $q$),2,'secretaria vê a equipe');
select is(pg_temp.ex_count('instrutor',$q$ select count(*) from public.schedule_calendar('2099-09-01','2099-09-30') $q$),2,'instrutor vê a equipe');
select is(pg_temp.ex_count('outro',$q$ select count(*) from public.schedule_calendar('2099-09-01','2099-09-30') $q$),0,'cadete de outra turma não vê a equipe');
select is(pg_temp.ex_try('inativo',$q$ select public.schedule_calendar('2099-09-01','2099-09-30') $q$),'42501','conta inativa bloqueada');
select is(pg_temp.ex_try('coord',$q$ select public.schedule_calendar('2099-01-01','2099-12-31') $q$),'23514','intervalo excessivo bloqueado');
select is((select count(*)::int from public.schedule_reserve_reminder(pg_temp.ex_id('aluno'),'2099-09-20','evening','web_push',repeat('f',64))),1,'primeiro envio obtém reserva');
select is((select count(*)::int from public.schedule_reserve_reminder(pg_temp.ex_id('aluno'),'2099-09-20','evening','web_push',repeat('f',64))),0,'reserva concorrente não repete envio');
update public.schedule_reminder_deliveries set status='failed' where profile_id=pg_temp.ex_id('aluno');
select is((select count(*)::int from public.schedule_reserve_reminder(pg_temp.ex_id('aluno'),'2099-09-20','evening','web_push',repeat('f',64))),1,'falha transitória permite retry');
update public.schedule_reminder_deliveries set status='sent' where profile_id=pg_temp.ex_id('aluno');
select is((select count(*)::int from public.schedule_reserve_reminder(pg_temp.ex_id('aluno'),'2099-09-20','evening','web_push',repeat('f',64))),0,'envio concluído não se repete');
select is(pg_temp.ex_try('coord',$q$ select public.schedule_cancel_assignment((select id from public.schedule_assignments where student_id=pg_temp.ex_id('student')),'Cancelamento de teste') $q$),'ok','cancelamento registrado');
select is(pg_temp.ex_count('aluno',$q$ select count(*) from public.schedule_calendar('2099-09-01','2099-09-30') $q$),1,'cancelado sai do calendário');
select is((select count(*)::int from public.schedule_live_roster('2099-09-20','2099-09-20') where kind='cadet'),0,'cancelado não gera lembrete');
select * from public.schedule_claim_document_notification((select id from public.schedule_documents where checksum_sha256=repeat('e',64)));
select is((select status from public.schedule_notification_events where student_id=pg_temp.ex_id('student') and event_type='assignment_published'),'cancelled','fila não envia publicação já cancelada');
select * from finish();
rollback;
