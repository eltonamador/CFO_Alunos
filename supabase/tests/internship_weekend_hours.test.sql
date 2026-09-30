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
insert into public.internship_shift_templates(program_id,activity_type_id,code,name,start_weekdays,journey_minutes,abm_departure_time,obm_arrival_time,obm_departure_time,abm_return_time,end_day_offset)
values(pg_temp.wid('program'),pg_temp.wid('usb'),'SAB-USB-D12','USB antiga',array[6],720,'06:00','06:30','17:30','18:00',0);
select is(pg_temp.callweek('coord','old-week','2026-10-05',jsonb_build_array(pg_temp.line('2026-10-10',1)||jsonb_build_object('templateCode','SAB-USB-D12'))),'ok','Cria plantão histórico com regra antiga');
create temp table old_weekend_snapshot as select * from public.internship_shifts where program_id=pg_temp.wid('program');
grant select on old_weekend_snapshot to authenticated;
update public.internship_shift_templates set active=false where program_id=pg_temp.wid('program') and code='SAB-USB-D12';
insert into public.internship_activity_types(id,program_id,code,name,training_axis,default_minutes,requires_operation_plan)
values(pg_temp.wid('ar'),pg_temp.wid('program'),'ar','AR','salvamento',1440,false);
insert into public.internship_resources(site_id,code,display_name,resource_type) values(pg_temp.wid('gbm'),'ar','AR','ar');
insert into public.internship_shift_templates(program_id,activity_type_id,code,name,start_weekdays,journey_minutes,abm_departure_time,obm_arrival_time,obm_departure_time,abm_return_time,end_day_offset,revision,includes_travel)
select pg_temp.wid('program'),pg_temp.wid(activity),code,code,array[dow],minutes,null,start_time,end_time,null,offset_day,2,false
from (values
 ('SAB-USB-D12','usb',6,720,time '07:45',time '19:45',0),
 ('SAB-USB-N12','usb',6,720,time '19:45',time '07:45',1),
 ('DOM-USB-D12','usb',7,720,time '07:45',time '19:45',0),
 ('DOM-USB-N12','usb',7,720,time '19:45',time '07:45',1),
 ('SAB-AR-24','ar',6,1440,time '07:45',time '07:45',1),
 ('DOM-AR-24','ar',7,1440,time '07:45',time '07:45',1)
) x(code,activity,dow,minutes,start_time,end_time,offset_day);
select is((select count(*)::integer from old_weekend_snapshot old join public.internship_shifts sh on sh.id=old.id where to_jsonb(old)=to_jsonb(sh)),1,'Nova revisão preserva integralmente o plantão histórico');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('coord'))::text,true);
set local role authenticated;
select lives_ok(format('select public.internship_cancel_assignment(%L,%L)',(select a.id from public.internship_assignments a join old_weekend_snapshot sh on sh.id=a.shift_id),'Ajuste de planejamento'),'Plantão com padrão desativado continua podendo ser cancelado');
reset role;
select set_config('request.jwt.claims','{}',true);
select is(pg_temp.callweek('coord','new-week','2026-10-12',jsonb_build_array(
 pg_temp.line('2026-10-12',1),
 pg_temp.line('2026-10-17',2)||jsonb_build_object('templateCode','SAB-USB-D12'),
 pg_temp.line('2026-10-17',3)||jsonb_build_object('templateCode','SAB-USB-N12'),
 pg_temp.line('2026-10-18',4)||jsonb_build_object('templateCode','DOM-USB-D12'),
 pg_temp.line('2026-10-18',5)||jsonb_build_object('templateCode','DOM-USB-N12'),
 pg_temp.line('2026-10-17',6)||jsonb_build_object('templateCode','SAB-AR-24'),
 pg_temp.line('2026-10-18',7)||jsonb_build_object('templateCode','DOM-AR-24')
)),'ok','Publicação semanal aceita novos horários e preserva dia útil');
select is((select count(*)::integer from public.internship_shifts sh join public.internship_shift_templates t on t.id=sh.template_id
 where sh.program_id=pg_temp.wid('program') and sh.status='publicado' and not t.includes_travel
 and (sh.starts_at at time zone 'America/Belem')::time=t.obm_arrival_time
 and (sh.ends_at at time zone 'America/Belem')::time=t.obm_departure_time
 and sh.planned_minutes=t.journey_minutes),6,'Seis padrões de fim de semana contam somente 12h/24h na OBM');
select is((select (sh.ends_at at time zone 'America/Belem')::text from public.internship_shifts sh join public.internship_shift_templates t on t.id=sh.template_id where sh.program_id=pg_temp.wid('program') and t.code='DOM-USB-N12'),'2026-10-19 07:45:00','USB noturna de domingo termina na segunda às 07h45');
select is((select (sh.starts_at at time zone 'America/Belem')::time from public.internship_shifts sh join public.internship_shift_templates t on t.id=sh.template_id where sh.program_id=pg_temp.wid('program') and t.code='DU-USB-12'),time '18:00','Dia útil continua contando desde a saída ABM às 18h');
select is((select (sh.ends_at at time zone 'America/Belem')::time from public.internship_shifts sh join public.internship_shift_templates t on t.id=sh.template_id where sh.program_id=pg_temp.wid('program') and t.code='DU-USB-12'),time '06:00','Dia útil continua até retorno ABM às 06h');
select is((select sum(planned_minutes)::integer from public.internship_shifts where program_id=pg_temp.wid('program') and status='publicado'),6480,'Carga semanal soma 108h sem acrescentar deslocamento aos fins de semana');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('coord'))::text,true);
set local role authenticated;
select is((select count(*)::integer from public.internship_coordination_schedule(pg_temp.wid('program')) where abm_departure_time is null and planned_minutes in (720,1440)),6,'Relatório distingue seis plantões sem deslocamento');
reset role;
select * from finish();
rollback;
