begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims','{}',true);
create function pg_temp.wid(label text) returns uuid language sql immutable as $$select md5('weekly-test-'||label)::uuid$$;
insert into auth.users(id,email) values(pg_temp.wid('coord'),'weekly-coord@test.invalid'),(pg_temp.wid('aluno'),'weekly-aluno@test.invalid');
insert into public.profiles(id,role,full_name,active) values(pg_temp.wid('coord'),'coordenacao','Teste semanal',true),(pg_temp.wid('aluno'),'aluno','Cadete semanal',true);
insert into public.courses(id,code,name,year) values(pg_temp.wid('course'),'WEEKLY-TEST','Curso semanal',2099);
insert into public.classes(id,course_id,name) values(pg_temp.wid('class'),pg_temp.wid('course'),'Turma semanal');
insert into public.students(id,class_id,student_number,war_name,full_name,pelotao)
select pg_temp.wid('student'||n),pg_temp.wid('class'),n,'TESTE '||n,'Cadete teste '||n,'CFO I' from generate_series(1,10)n;
insert into public.internship_programs(id,class_id,course_phase,name,starts_on,ends_on,required_minutes,target_minutes,status,published_by,published_at)
values(pg_temp.wid('program'),pg_temp.wid('class'),'CFO I','Programa semanal','2026-01-01','2026-11-30',15000,15120,'publicado',pg_temp.wid('coord'),now());
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
update public.profiles set student_id=pg_temp.wid('student1') where id=pg_temp.wid('aluno');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('aluno'))::text,true);
set local role authenticated;
select ok(not public.internship_can_manage(),'Cadete comum não administra estágio');
select throws_ok(format('select * from public.internship_planning_cadets(%L)',pg_temp.wid('program')),'42501','Acesso restrito à administração do estágio.','Lista de planejamento é restrita');
reset role;
select set_config('request.jwt.claims','{}',true);
insert into public.internship_administrators(student_id,reason) values(pg_temp.wid('student1'),'Delegação de teste');
insert into public.duty_impediments(student_id,impediment_type,starts_on,ends_on,reason)
values(pg_temp.wid('student2'),'restricao_medica','2026-09-01','2026-09-02','DETALHE PRIVADO DE TESTE');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('aluno'))::text,true);
set local role authenticated;
select ok(public.internship_can_manage(),'Cadete delegado administra estágio');
select ok(public.internship_has_role(array['coordenacao']),'Portas existentes do estágio aceitam delegado');
select is(public.current_role(),'aluno','Papel global continua aluno');
select ok(not public.is_coord(),'Delegação não concede papel global de coordenação');
select is((select count(*)::integer from public.internship_planning_cadets(pg_temp.wid('program'))),10,'Planejamento vê lista operacional da turma');
select is((select count(*)::integer from public.students where id=pg_temp.wid('student2')),0,'Delegado não lê cadastro civil de outro cadete');
select is((select count(*)::integer from public.duty_impediments where student_id=pg_temp.wid('student2')),0,'Delegado não lê detalhe de restrição de outro cadete');
select is((select count(*)::integer from public.internship_planning_constraints(pg_temp.wid('program'))),1,'Planejamento recebe período bloqueado');
select ok((select not(to_jsonb(c) ? 'reason') from public.internship_planning_constraints(pg_temp.wid('program')) c limit 1),'Consulta mínima não expõe motivo privado');
select throws_ok(format('insert into public.internship_administrators(student_id,reason) values(%L,''Tentativa de conceder acesso'')',pg_temp.wid('student2')),'42501',null,'Delegado não concede permissão a outros cadetes');
select is((select count(*)::integer from public.internship_programs where id=pg_temp.wid('program')),1,'Delegado lê programa administrativo');
reset role;
select set_config('request.jwt.claims','{}',true);
select is(pg_temp.callweek('aluno','delegated-week','2026-09-07',jsonb_build_array(pg_temp.line('2026-09-07',2))),'ok','Delegado publica semana para outro cadete');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('aluno'))::text,true);
set local role authenticated;
select lives_ok(format($q$select public.internship_homologate_execution(%L,'integral','2026-09-07 18:00-03','2026-09-08 06:00-03',720,'Oficial teste','Ficha teste',null,null,null)$q$,(select a.id from public.internship_assignments a join public.internship_shifts s on s.id=a.shift_id where s.program_id=pg_temp.wid('program') limit 1)),'Delegado homologa carga de outro cadete');
select is((select count(*)::integer from public.internship_coordination_workload(pg_temp.wid('program'))),10,'Delegado acessa relatório consolidado');
select is((select count(*)::integer from public.internship_coordination_schedule(pg_temp.wid('program'))),1,'Delegado acessa agenda detalhada');
reset role;
select set_config('request.jwt.claims','{}',true);
select ok(exists(select 1 from public.audit_logs where entity='internship_administrators' and after_data->>'student_id'=pg_temp.wid('student1')::text),'Concessão de permissão gera auditoria');
update public.profiles set active=false where id=pg_temp.wid('aluno');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('aluno'))::text,true);
select ok(not public.internship_can_manage(),'Conta inativa perde acesso imediatamente');
select set_config('request.jwt.claims','{}',true);
update public.profiles set active=true where id=pg_temp.wid('aluno');
update public.internship_administrators set active=false where student_id=pg_temp.wid('student1');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('aluno'))::text,true);
select ok(not public.internship_can_manage(),'Revogação remove acesso imediatamente');
select set_config('request.jwt.claims','{}',true);
select is(pg_temp.callweek('aluno','revoked','2026-10-05',jsonb_build_array(pg_temp.line('2026-10-05',2))),'42501','RPC impede publicação após revogação');
select * from finish();
rollback;
