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
select ok((select relrowsecurity from pg_class where oid='public.internship_weekly_publications'::regclass),'RLS semanal ativa');
select ok(not has_table_privilege('authenticated','public.internship_weekly_publications','insert'),'Registro de publicação só pode ser escrito pela função');
select ok(not has_function_privilege('anon','public.internship_publish_week(uuid,date,uuid,jsonb)','execute'),'Anônimo não publica');
select is(pg_temp.callweek('aluno','denied','2026-10-05',jsonb_build_array(pg_temp.line('2026-10-05',1))),'42501','Cadete não publica semana');
select is(pg_temp.callweek('coord','fail','2026-10-05',jsonb_build_array(pg_temp.line('2026-10-05',1),pg_temp.line('2026-10-06',1))),'23514','Conflito entre plantões da própria semana impede lote');
select is((select count(*)::integer from public.internship_shifts where program_id=pg_temp.wid('program')),0,'Falha na segunda vaga desfaz primeira vaga');
select is((select count(*)::integer from public.internship_weekly_publications where program_id=pg_temp.wid('program')),0,'Falha não grava recibo');
select is(pg_temp.callweek('coord','success','2026-10-05',jsonb_build_array(pg_temp.line('2026-10-05',1),pg_temp.line('2026-10-06',2))),'ok','Publica lote válido');
select is(pg_temp.callweek('coord','success','2026-10-05',jsonb_build_array(pg_temp.line('2026-10-05',1),pg_temp.line('2026-10-06',2))),'ok','Repetição do mesmo envio é segura');
select is((select count(*)::integer from public.internship_shifts where program_id=pg_temp.wid('program')),2,'Repetição não duplica plantões');
select is(pg_temp.callweek('coord','success','2026-10-05',jsonb_build_array(pg_temp.line('2026-10-05',3))),'23514','Mesmo identificador não aceita outro conteúdo');
select is(pg_temp.callweek('coord','outside','2026-10-05',jsonb_build_array(pg_temp.line('2026-10-12',3))),'23514','Não publica data fora da semana');
select is(pg_temp.callweek('coord','not-monday','2026-10-06',jsonb_build_array(pg_temp.line('2026-10-06',3))),'23514','Início exige segunda-feira');
select is(pg_temp.callweek('coord','duplicate','2026-10-12',jsonb_build_array(pg_temp.line('2026-10-12',1),pg_temp.line('2026-10-12',2))),'23514','Rejeita serviço duplicado no lote');
create function pg_temp.beaches(day text,duplicate boolean default false) returns jsonb language sql as $$select jsonb_agg(jsonb_build_object('date',day,'templateCode','GUARDA-VIDA','siteId',pg_temp.wid('beach'||n),'studentId',pg_temp.wid('student'||case when duplicate then 1 else n end),'supervisorName','Oficial praia','documentReference','OS TESTE 001')) from generate_series(1,5)n$$;
select is(pg_temp.callweek('coord','beach','2026-10-05',pg_temp.beaches('2026-10-10')),'ok','Publica cinco praias numa única semana');
select is((select count(*)::integer from public.internship_shifts where program_id=pg_temp.wid('program')),7,'Semana possui duas vagas GBM e cinco praias');
select is(pg_temp.callweek('coord','mixed-failure','2026-10-12',jsonb_build_array(pg_temp.line('2026-10-12',6))||pg_temp.beaches('2026-10-17',true)),'23514','Cinco praias não aceitam cadete repetido');
select is((select count(*)::integer from public.internship_shifts where program_id=pg_temp.wid('program')),7,'Falha nas praias também desfaz GBM do mesmo lote');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('aluno'))::text,true);
set local role authenticated;
select is((select count(*)::integer from public.internship_weekly_publications),0,'Cadete não vê o recibo administrativo da semana');
reset role;
select * from finish();
rollback;
