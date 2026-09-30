begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims','{}',true);
create function pg_temp.wid(label text) returns uuid language sql immutable as $$select md5('gv-optional-test-'||label)::uuid$$;
insert into auth.users(id,email) values(pg_temp.wid('coord'),'gv-optional-coord@test.invalid'),(pg_temp.wid('aluno'),'gv-optional-aluno@test.invalid');
insert into public.profiles(id,role,full_name,active) values(pg_temp.wid('coord'),'coordenacao','Teste semanal',true),(pg_temp.wid('aluno'),'aluno','Cadete semanal',true);
insert into public.courses(id,code,name,year) values(pg_temp.wid('course'),'GV-OPTIONAL-TEST','Curso semanal',2099);
insert into public.classes(id,course_id,name) values(pg_temp.wid('class'),pg_temp.wid('course'),'Turma semanal');
insert into public.students(id,class_id,student_number,war_name,full_name,pelotao)
select pg_temp.wid('student'||n),pg_temp.wid('class'),n,'TESTE '||n,'Cadete teste '||n,'CFO I' from generate_series(1,10)n;
insert into public.internship_programs(id,class_id,course_phase,name,starts_on,ends_on,required_minutes,target_minutes,status,published_by,published_at)
values(pg_temp.wid('program'),pg_temp.wid('class'),'CFO I','Programa semanal','2026-10-01','2026-11-30',15000,15120,'publicado',pg_temp.wid('coord'),now());
insert into public.internship_activity_types(id,program_id,code,name,training_axis,default_minutes,requires_operation_plan)
values(pg_temp.wid('usb'),pg_temp.wid('program'),'usb','USB','aph',720,false),(pg_temp.wid('beach'),pg_temp.wid('program'),'guarda_vida','Guarda-vida','integrado',480,true);
insert into public.internship_sites(id,program_id,site_type,code,name,gbm_number) values(pg_temp.wid('gbm'),pg_temp.wid('program'),'gbm','gbm1','GBM teste',1);
insert into public.internship_resources(site_id,code,display_name,resource_type) values(pg_temp.wid('gbm'),'usb','USB','usb');
insert into public.internship_shift_templates(program_id,activity_type_id,code,name,start_weekdays,journey_minutes,abm_departure_time,obm_arrival_time,obm_departure_time,abm_return_time,end_day_offset)
values(pg_temp.wid('program'),pg_temp.wid('usb'),'DU-USB-12','USB semanal',array[1,2,3,4,5],720,'18:00','18:30','05:30','06:00',1);
insert into public.internship_sites(id,program_id,site_type,code,name)
select pg_temp.wid('beach'||n),pg_temp.wid('program'),'praia','praia_'||n,'Praia '||n from generate_series(1,5)n;
insert into public.internship_resources(site_id,code,display_name,resource_type,regular_team_size,capacity_per_shift)
select pg_temp.wid('beach'||n),'posto','Posto '||n,'posto_guarda_vida',3,1 from generate_series(1,5)n;
create function pg_temp.line(day text,n integer) returns jsonb language sql as $$select jsonb_build_object('date',day,'templateCode','DU-USB-12','siteId',pg_temp.wid('gbm'),'studentId',pg_temp.wid('student'||n),'supervisorName','Oficial teste')$$;
create function pg_temp.callweek(actor text,request text,week date,lines jsonb) returns text language plpgsql as $$begin
 perform set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid(actor))::text,true);
 set local role authenticated;
 perform public.internship_publish_week(pg_temp.wid('program'),week,pg_temp.wid(request),lines);
 reset role;perform set_config('request.jwt.claims','{}',true);return 'ok';
 exception when others then reset role;perform set_config('request.jwt.claims','{}',true);return sqlstate;end$$;
create function pg_temp.beaches(day text) returns jsonb language sql as $$select jsonb_agg(jsonb_build_object('date',day,'templateCode','GUARDA-VIDA','siteId',pg_temp.wid('beach'||n),'studentId',pg_temp.wid('student'||n),'supervisorName','','documentReference','','uniformCode','4D')) from generate_series(1,5)n$$;
select is(pg_temp.callweek('aluno','denied','2026-10-05',pg_temp.beaches('2026-10-10')),'42501','Aluno comum não publica GV sem documento');
select is(pg_temp.callweek('coord','gbm-friday','2026-10-05',jsonb_build_array(pg_temp.line('2026-10-09',1))),'ok','Publica GBM de sexta que termina sábado 06h');
select is(pg_temp.callweek('coord','gv-no-rest','2026-10-05',pg_temp.beaches('2026-10-10')),'23514','GV sábado bloqueia descanso de apenas quatro horas após GBM');
select is((select count(*)::int from public.internship_shifts where program_id=pg_temp.wid('program')),1,'Falha de descanso desfaz cinco postos, sem escala parcial');
select is(pg_temp.callweek('coord','gv-sunday','2026-10-05',pg_temp.beaches('2026-10-11')),'ok','Publica cinco GV sem documento e sem supervisor com 28h de descanso');
select is((select count(*)::int from public.internship_shifts where program_id=pg_temp.wid('program') and activity_type_id=pg_temp.wid('beach') and status='publicado'),5,'Cinco postos publicados e visíveis');
select ok((select document_reference is null and officer_name is null and status='em_definicao' and authorized_by=pg_temp.wid('coord') and authorized_at is not null from public.internship_operation_plans where program_id=pg_temp.wid('program') and code='guarda_vida_20261011'),'Pendência documental verdadeira e autoria preservadas');
select is(pg_temp.callweek('coord','gv-sunday','2026-10-05',pg_temp.beaches('2026-10-11')),'ok','Reenvio não duplica GV');
create function pg_temp.trycmd(cmd text) returns text language plpgsql as $$begin
 perform set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('coord'))::text,true);set local role authenticated;
 execute cmd;reset role;perform set_config('request.jwt.claims','{}',true);return 'ok';
 exception when others then reset role;perform set_config('request.jwt.claims','{}',true);return sqlstate;end$$;
select is(pg_temp.trycmd($q$select public.internship_schedule_gbm_shift(pg_temp.wid('program'),'usb',pg_temp.wid('gbm'),(select id from public.internship_resources where site_id=pg_temp.wid('gbm')),'2026-10-11 19:45-03','2026-10-12 07:45-03',pg_temp.wid('student1'),'Oficial teste',null)$q$),'23514','GBM depois do GV também bloqueia menos de 24h');
select is(pg_temp.callweek('coord','gbm-exact-rest','2026-10-12',jsonb_build_array(pg_temp.line('2026-10-12',1))),'ok','Exatamente 24h após GV permite GBM');
select is(pg_temp.trycmd($q$select public.permanence_publish(pg_temp.wid('program'),'2026-10-17 06:00-03','2026-10-17 18:00-03','ABM','3A',array[pg_temp.wid('student1'),pg_temp.wid('student6')])$q$),'ok','Publica permanência para conferir cruzamento');
select is(pg_temp.callweek('coord','gv-permanence','2026-10-12',pg_temp.beaches('2026-10-18')),'23514','Permanência anterior bloqueia GV com 16h de descanso');
select is(pg_temp.trycmd($q$select public.permanence_cancel((select id from public.duty_rosters where class_id=pg_temp.wid('class') and status='publicada'),'Suspensão de teste da permanência')$q$),'ok','Cancela somente permanência fictícia');
select is(pg_temp.callweek('coord','gv-permanence','2026-10-12',pg_temp.beaches('2026-10-18')),'ok','Após liberação da permanência GV pode ocupar os cadetes');
select ok((select count(*)>0 from public.audit_logs where entity='internship_operation_plans' and entity_id in(select id from public.internship_operation_plans where program_id=pg_temp.wid('program'))),'Publicação mantém auditoria');

update public.profiles set student_id=pg_temp.wid('student10') where id=pg_temp.wid('aluno');
insert into public.internship_administrators(student_id,reason) values(pg_temp.wid('student10'),'Delegação de teste para gestão do estágio');
select is(pg_temp.callweek('aluno','gv-delegated','2026-10-19',pg_temp.beaches('2026-10-25')),'ok','Administrador delegado publica GV sem documento');
insert into public.internship_operation_plans(id,program_id,code,title,status,starts_at,ends_at,created_by)
values(pg_temp.wid('draft-plan'),pg_temp.wid('program'),'guarda_vida_20261031','GV preparado','reserva','2026-10-31 10:00-03','2026-10-31 18:00-03',pg_temp.wid('coord'));
insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,operation_plan_id,starts_at,ends_at,capacity,status,created_by)
select pg_temp.wid('draft-shift'||n),pg_temp.wid('program'),pg_temp.wid('beach'),pg_temp.wid('beach'||n),r.id,pg_temp.wid('draft-plan'),'2026-10-31 10:00-03','2026-10-31 18:00-03',1,'rascunho',pg_temp.wid('coord') from generate_series(1,5)n join public.internship_resources r on r.site_id=pg_temp.wid('beach'||n);
insert into public.internship_assignments(shift_id,student_id,created_by)
select pg_temp.wid('draft-shift'||n),pg_temp.wid('student'||n),pg_temp.wid('coord') from generate_series(1,5)n;
select is(pg_temp.trycmd($q$select public.internship_finalize_lifeguard_draft(pg_temp.wid('program'),'2026-10-31','','Oficial teste')$q$),'ok','Publica rascunho sem documento, com supervisor opcional identificado');
select is((select count(*)::int from public.internship_shifts where operation_plan_id=pg_temp.wid('draft-plan') and status='publicado'),5,'Rascunho publica os cinco postos');
select is(pg_temp.trycmd($q$select public.internship_formalize_published_lifeguard_plan(pg_temp.wid('program'),'2026-10-31','OS TESTE 001','Oficial teste')$q$),'ok','Documento pode ser complementado depois, mesmo com supervisor já informado');
select ok((select status='autorizado' and document_reference='OS TESTE 001' from public.internship_operation_plans where id=pg_temp.wid('draft-plan')),'Documento real preservado após complementação');

select is(pg_temp.trycmd($q$select public.internship_cancel_assignment(a.id,'Cancelar escala fictícia para recriar') from public.internship_assignments a join public.internship_shifts s on s.id=a.shift_id where s.operation_plan_id=pg_temp.wid('draft-plan') and a.status='prevista'$q$),'ok','Cancela cinco participações fictícias mantendo plano');
select is(pg_temp.callweek('coord','gbm-before-recreate','2026-10-26',jsonb_build_array(pg_temp.line('2026-10-30',1))),'ok','Prepara conflito de descanso após limpeza');
select is(pg_temp.callweek('coord','recreate','2026-10-26',pg_temp.beaches('2026-10-31')),'23514','Recriação também respeita 24h de descanso');
select is((select code from public.internship_operation_plans where id=pg_temp.wid('draft-plan')),'guarda_vida_20261031','Falha de recriação desfaz arquivamento do plano');
select is(pg_temp.trycmd($q$select public.internship_cancel_assignment(a.id,'Remover conflito fictício') from public.internship_assignments a join public.internship_shifts s on s.id=a.shift_id where s.program_id=pg_temp.wid('program') and s.activity_type_id=pg_temp.wid('usb') and s.starts_at='2026-10-30 18:00-03' and a.status='prevista'$q$),'ok','Remove conflito fictício');
select is(pg_temp.callweek('coord','recreate','2026-10-26',pg_temp.beaches('2026-10-31')),'ok','Recria cinco GV após cancelamento com documento vazio');
select ok((select code='guarda_vida_20261031_historico_'||id::text and document_reference='OS TESTE 001' from public.internship_operation_plans where id=pg_temp.wid('draft-plan')),'Plano anterior e documento preservados no histórico');
select is((select count(*)::int from public.internship_shifts where operation_plan_id=pg_temp.wid('draft-plan') and status='cancelado'),5,'Turnos antigos permanecem cancelados');
select is((select count(*)::int from public.internship_shifts s join public.internship_operation_plans p on p.id=s.operation_plan_id where p.program_id=pg_temp.wid('program') and p.code='guarda_vida_20261031' and s.status='publicado'),5,'Somente cinco novos turnos vigentes');
select is(pg_temp.callweek('coord','duplicate-recreate','2026-10-26',pg_temp.beaches('2026-10-31')),'23514','Não recria nem arquiva escala ainda vigente');

select * from finish();
rollback;
