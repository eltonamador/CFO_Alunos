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
values(pg_temp.wid('program'),pg_temp.wid('class'),'CFO I','Programa semanal',current_date-10,current_date+30,15000,15120,'publicado',pg_temp.wid('coord'),now());
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

-- A single test resource has enough slots for isolated cadet-location scenarios.
update public.internship_resources set capacity_per_shift=10 where site_id=pg_temp.wid('gbm');
insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,starts_at,ends_at,capacity,status,published_by,published_at)
select pg_temp.wid('today'),pg_temp.wid('program'),pg_temp.wid('usb'),pg_temp.wid('gbm'),id,
 now()-interval '1 hour',now()+interval '11 hours',10,'publicado',pg_temp.wid('coord'),now()
from public.internship_resources where site_id=pg_temp.wid('gbm') and code='usb';
insert into public.internship_assignments(id,shift_id,student_id,assignment_source)
select pg_temp.wid('assignment'||n),pg_temp.wid('today'),pg_temp.wid('student'||n),'manual' from generate_series(1,5)n;
update public.profiles set student_id=pg_temp.wid('student1') where id=pg_temp.wid('aluno');
create function pg_temp.point_for(n integer,kind text,lat double precision,accuracy double precision) returns text language plpgsql as $$begin
 update public.profiles set student_id=pg_temp.wid('student'||n) where id=pg_temp.wid('aluno');
 perform set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('aluno'))::text,true);set local role authenticated;
 perform public.internship_record_point(pg_temp.wid('assignment'||n),kind,lat,-51.0,accuracy,'Oficial teste');
 reset role;perform set_config('request.jwt.claims','{}',true);return 'ok';
 exception when others then reset role;perform set_config('request.jwt.claims','{}',true);return sqlstate;end$$;
select ok(not has_table_privilege('authenticated','public.internship_attendance_points','insert'),'Ponto só pode ser gravado pela função com horário do servidor');
select ok(not has_table_privilege('authenticated','public.internship_attendance_points','update'),'Cadete não reescreve ponto');
select ok(not has_function_privilege('anon','public.internship_record_point(uuid,text,double precision,double precision,double precision,text)','execute'),'Anônimo não registra ponto');
select is(pg_temp.point_for(1,'saida',0.0,10.0),'23514','Saída exige entrada anterior');
select is(pg_temp.point_for(1,'entrada',0.0,10.0),'ok','Entrada registrada sem geocerca configurada');
select is((select location_status from public.internship_attendance_points where assignment_id=pg_temp.wid('assignment1')),'sem_configuracao','Não inventa validação geográfica sem coordenadas do GBM');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('coord'))::text,true);set local role authenticated;
insert into public.internship_site_locations(site_id,latitude,longitude,radius_m,updated_by)
values(pg_temp.wid('gbm'),0.0,-51.0,200,pg_temp.wid('coord'));
reset role;select set_config('request.jwt.claims','{}',true);
select is(pg_temp.point_for(2,'entrada',0.0,10.0),'ok','Cadete registra entrada dentro do raio');
select is((select location_status from public.internship_attendance_points where assignment_id=pg_temp.wid('assignment2')),'dentro','Distância zero está dentro do raio');
select is(pg_temp.point_for(3,'entrada',0.01,10.0),'ok','Ponto fora do raio é registrado para análise, sem bloqueio automático');
select is((select location_status from public.internship_attendance_points where assignment_id=pg_temp.wid('assignment3')),'fora','Posição a aproximadamente 1 km fica sinalizada');
select is(pg_temp.point_for(4,'entrada',0.0,500.0),'ok','Baixa precisão mantém evidência');
select is((select location_status from public.internship_attendance_points where assignment_id=pg_temp.wid('assignment4')),'impreciso','GPS impreciso exige conferência');
select is(pg_temp.point_for(2,'entrada',0.0,10.0),'ok','Repetição de entrada é idempotente');
select is((select count(*)::integer from public.internship_attendance_points where assignment_id=pg_temp.wid('assignment2')),1,'Repetição não duplica ponto');
select is(pg_temp.point_for(2,'saida',0.0,10.0),'23514','Saída imediata durante o plantão é bloqueada');
update public.internship_shifts set ends_at=now()+interval '30 minutes' where id=pg_temp.wid('today');
select is(pg_temp.point_for(2,'saida',0.0,10.0),'23514','Mesmo perto do fim, saída imediata é bloqueada');
update public.internship_attendance_points set recorded_at=now()-interval '31 minutes' where assignment_id=pg_temp.wid('assignment2') and point_type='entrada';
select is(pg_temp.point_for(2,'saida',0.0,10.0),'ok','Saída liberada perto do fim e após intervalo mínimo');
select ok((select recorded_at=now() from public.internship_attendance_points where assignment_id=pg_temp.wid('assignment2') and point_type='saida'),'Horário da saída é o timestamp do servidor');
select is((select count(*)::integer from public.internship_execution_records where assignment_id=pg_temp.wid('assignment2')),0,'Ponto não homologa nem cria carga realizada automaticamente');
select is(pg_temp.point_for(5,'entrada',91.0,10.0),'23514','Latitude inválida é rejeitada');
create function pg_temp.early_for(n integer, reason text) returns text language plpgsql as $$begin
 update public.profiles set student_id=pg_temp.wid('student'||n) where id=pg_temp.wid('aluno');
 perform set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('aluno'))::text,true);set local role authenticated;
 perform public.internship_record_point_with_reason(pg_temp.wid('assignment'||n),'saida',0.0,-51.0,10.0,'Oficial teste',reason);
 reset role;perform set_config('request.jwt.claims','{}',true);return 'ok';
 exception when others then reset role;perform set_config('request.jwt.claims','{}',true);return sqlstate;end$$;
update public.internship_shifts set ends_at=now()+interval '11 hours' where id=pg_temp.wid('today');
select ok(not has_function_privilege('anon','public.internship_record_point_with_reason(uuid,text,double precision,double precision,double precision,text,text)','execute'),'Anônimo não registra saída antecipada');
select is(pg_temp.early_for(3,'Instrução na ABM por orientação da Coordenação'),'23514','Saída antecipada antes de 30 minutos é bloqueada');
update public.internship_attendance_points set recorded_at=now()-interval '31 minutes' where assignment_id=pg_temp.wid('assignment3') and point_type='entrada';
select is(pg_temp.early_for(3,'Instrução na ABM por orientação da Coordenação'),'ok','Cadete registra saída antecipada real para instrução');
select is((select count(*)::integer from public.internship_cadet_reports where assignment_id=pg_temp.wid('assignment3') and report_type='saida_antecipada'),1,'Saída antecipada grava relato junto ao ponto');
select is((select count(*)::integer from public.internship_execution_records where assignment_id=pg_temp.wid('assignment3')),0,'Saída antecipada não homologa horas automaticamente');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('coord'))::text,true);set local role authenticated;
select throws_ok($test$
 insert into public.internship_execution_records(
  assignment_id,validation_status,attendance_status,actual_starts_at,actual_ends_at,
  approved_minutes,supervisor_name,paper_reference,entered_by,validated_by,validated_at
 ) select pg_temp.wid('assignment3'),'homologado','parcial',starts_at,now(),60,
  'Oficial teste','Avaliação teste',pg_temp.wid('coord'),pg_temp.wid('coord'),now()
 from public.internship_shifts where id=pg_temp.wid('today')
$test$,'23514','Saída antecipada exige justificativa da Coordenação para homologar a carga.','Homologação após saída antecipada exige decisão fundamentada');
reset role;select set_config('request.jwt.claims','{}',true);
insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,starts_at,ends_at,capacity,status,published_by,published_at)
select pg_temp.wid('beach_today'),pg_temp.wid('program'),pg_temp.wid('beach'),pg_temp.wid('beach1'),id,
 now()-interval '1 hour',now()+interval '7 hours',1,'publicado',pg_temp.wid('coord'),now()
from public.internship_resources where site_id=pg_temp.wid('beach1') and code='posto';
insert into public.internship_assignments(id,shift_id,student_id,assignment_source)
values(pg_temp.wid('beach_assignment'),pg_temp.wid('beach_today'),pg_temp.wid('student6'),'manual');
update public.profiles set student_id=pg_temp.wid('student6') where id=pg_temp.wid('aluno');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('aluno'))::text,true);set local role authenticated;
select is((select public.internship_record_point(pg_temp.wid('beach_assignment'),'entrada',0.5,-51.5,30,'Oficial teste') is not null),true,'Cadete registra GPS no posto móvel de praia');
reset role;select set_config('request.jwt.claims','{}',true);
select is((select location_status from public.internship_attendance_points where assignment_id=pg_temp.wid('beach_assignment')),'praia_livre','Praia guarda posição real sem raio fixo');
select is((select site_radius_m from public.internship_attendance_points where assignment_id=pg_temp.wid('beach_assignment')),null::integer,'Ponto de praia não recebe raio presumido');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('coord'))::text,true);set local role authenticated;
select throws_ok(format('insert into public.internship_site_locations(site_id,latitude,longitude,radius_m,updated_by) values(%L,0,-51,200,%L)',pg_temp.wid('beach1'),pg_temp.wid('coord')),'23514','Raio fixo de GPS permitido apenas nos GBMs.','Gestor não fixa raio na praia');
reset role;select set_config('request.jwt.claims','{}',true);
update public.profiles set student_id=pg_temp.wid('student5') where id=pg_temp.wid('aluno');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('aluno'))::text,true);set local role authenticated;
select throws_ok(format('select public.internship_record_point(%L,''entrada'',0.0,-51.0,10.0,null)',pg_temp.wid('assignment1')),'42501','O ponto deve pertencer ao cadete autenticado.','Cadete não registra ponto de outro');
select is((select count(*)::integer from public.internship_attendance_points),0,'Cadete não lê localização de colegas');
select throws_ok(format('insert into public.internship_site_locations(site_id,latitude,longitude,radius_m,updated_by) values(%L,0,-51,200,%L)',pg_temp.wid('beach1'),pg_temp.wid('aluno')),'42501',null,'Cadete não configura local');
reset role;select set_config('request.jwt.claims','{}',true);
-- Unnamed supervisor is valid when planning.
select is(pg_temp.callweek('coord','unnamed-week','2026-10-05',jsonb_build_array(pg_temp.line('2026-10-05',6)||jsonb_build_object('supervisorName',''))),'ok','Semana publica sem nome antecipado do supervisor');
select is((select planned_supervisor_name from public.internship_shifts where program_id=pg_temp.wid('program') and starts_at > now() and id<>pg_temp.wid('today')),null::text,'Supervisor pendente fica nulo, sem nome inventado');
select * from finish();rollback;
