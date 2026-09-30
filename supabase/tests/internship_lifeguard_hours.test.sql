begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims','{}',true);
create function pg_temp.wid(label text) returns uuid language sql immutable as $$select md5('gv-hours-test-'||label)::uuid$$;
insert into auth.users(id,email) values(pg_temp.wid('coord'),'gv-hours-coord@test.invalid'),(pg_temp.wid('aluno'),'gv-hours-aluno@test.invalid');
insert into public.profiles(id,role,full_name,active) values(pg_temp.wid('coord'),'coordenacao','Teste semanal',true),(pg_temp.wid('aluno'),'aluno','Cadete semanal',true);
insert into public.courses(id,code,name,year) values(pg_temp.wid('course'),'GV-HOURS-TEST','Curso semanal',2099);
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

select is(pg_temp.callweek('coord','prior','2026-10-05',jsonb_build_array(pg_temp.line('2026-10-09',1))),'ok','Serviço anterior do cadete para teste de descanso');
select is(pg_temp.callweek('coord','gv','2026-10-05',pg_temp.beaches('2026-10-11')),'ok','Publica cinco postos sem documento');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('coord'))::text,true);
create function pg_temp.ids() returns uuid[] language sql stable as $$select array_agg(a.id order by a.id) from public.internship_assignments a join public.internship_shifts s on s.id=a.shift_id join public.internship_activity_types t on t.id=s.activity_type_id where s.program_id=pg_temp.wid('program') and t.code='guarda_vida' and s.status='publicado' and a.status='prevista'$$;
create function pg_temp.resched(first_hour integer,last_hour integer) returns integer language sql as $$select public.internship_reschedule_lifeguard_day(pg_temp.wid('program'),'2026-10-11',make_timestamptz(2026,10,11,first_hour,0,0,'America/Belem'),make_timestamptz(2026,10,11,last_hour,0,0,'America/Belem'),pg_temp.ids(),(select min(starts_at) from public.internship_shifts where id in(select shift_id from public.internship_assignments where id=any(pg_temp.ids()))),(select max(ends_at) from public.internship_shifts where id in(select shift_id from public.internship_assignments where id=any(pg_temp.ids()))),'Ajuste de horário para instrução')$$;
create temporary table original_ids as select unnest(pg_temp.ids()) id;
select (public.internship_create_evaluation_invite((select id from original_ids limit 1),'Oficial Teste','Contato teste')->>'id') is not null as invite_created;
-- Simula legado já autorizado especificamente por plantão, sem documento nem authorized_by no plano.
insert into public.internship_lifeguard_early_publications(shift_id,program_id,starts_at,ends_at,decision_reference)
select sh.id,sh.program_id,sh.starts_at,sh.ends_at,'Publicação legada para teste de ajuste' from public.internship_shifts sh where id in(select shift_id from public.internship_assignments where id=any(pg_temp.ids()));
update public.internship_operation_plans set authorized_by=null,authorized_at=null where program_id=pg_temp.wid('program') and code='guarda_vida_20261011';
select is(pg_temp.resched(14,18),5,'Ajusta os cinco postos atomicamente sem exigir documento');
select is((select sum(planned_minutes)::integer from public.internship_shifts where id in(select shift_id from public.internship_assignments where id=any(pg_temp.ids()))),1200,'Nova carga prevista de quatro horas por cadete');
select is((select count(*)::integer from public.internship_assignments where id in(select id from original_ids) and status='substituida'),5,'Histórico dos cinco registros anteriores preservado');
select is((select count(*)::integer from public.internship_shift_uniforms u join public.internship_assignments a on a.shift_id=u.shift_id where a.id=any(pg_temp.ids()) and u.uniform_code='4D'),5,'Preserva os cinco uniformes aquáticos');
select is((select count(*)::integer from public.internship_assignments a join public.internship_assignments prev on prev.id=a.replaces_assignment_id where a.id=any(pg_temp.ids()) and prev.student_id=a.student_id),5,'Mantém os mesmos cadetes e vínculos de remanejamento');
select is((select status from public.internship_evaluations where assignment_id in(select id from original_ids)),'revogada','Revoga convite antigo que usava os horários anteriores');
select is(pg_temp.resched(14,18),0,'Mesmos horários não criam remanejamento fictício');
select throws_ok($$select pg_temp.resched(5,13)$$,'23514',null,'Recusa menos de 24h após GBM');
select is((select count(*)::integer from public.internship_lifeguard_time_changes),1,'Falha desfaz retificação, plano, cancelamentos e novos registros');
select is((select starts_at from public.internship_lifeguard_windows where program_id=pg_temp.wid('program') and shift_date='2026-10-11'),'2026-10-11 14:00-03'::timestamptz,'Falha mantém janela anterior');
select throws_ok($$select public.internship_reschedule_lifeguard_day(pg_temp.wid('program'),'2026-10-11','2026-10-11 15:00-03','2026-10-11 18:00-03',(select array_agg(id) from original_ids),'2026-10-11 10:00-03','2026-10-11 18:00-03','Pedido obsoleto')$$,'40001','A escala mudou. Atualize a página antes de ajustar os horários.','Recusa formulário anterior a remanejamento');
select public.internship_save_instruction(pg_temp.wid('program'),'APH domingo','2026-10-11 12:00-03','2026-10-11 13:00-03');
select throws_ok($$select pg_temp.resched(11,17)$$,'23514','Conflito com instrução obrigatória do QTS.','Recusa choque com instrução');
select lives_ok($$select public.internship_formalize_published_lifeguard_plan(pg_temp.wid('program'),'2026-10-11','ORDEM TESTE','Oficial Teste')$$,'Plano remanejado pode receber documento depois');
select is(pg_temp.resched(15,18),5,'Plano autorizado também permite ajuste controlado');
select is((select document_reference from public.internship_operation_plans where program_id=pg_temp.wid('program') and code='guarda_vida_20261011'),'ORDEM TESTE','Documento preservado');
select throws_ok($$update public.internship_operation_plans set starts_at='2026-10-11 16:00-03' where program_id=pg_temp.wid('program') and code='guarda_vida_20261011'$$,'23514','Plano autorizado preserva documento, supervisor e horário.','Cliente não usa registro anterior para outro ajuste arbitrário');
select ok(not has_table_privilege('authenticated','public.internship_lifeguard_time_changes','INSERT'),'Exceção de revisão não pode ser inserida pelo cliente');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('aluno'))::text,true);
select throws_ok($$select pg_temp.resched(14,18)$$,'42501','Acesso restrito.','Cadete comum não altera GV');
update public.profiles set student_id=pg_temp.wid('student10') where id=pg_temp.wid('aluno');
insert into public.internship_administrators(student_id,reason) values(pg_temp.wid('student10'),'Gestão delegada de teste');
select lives_ok($$select pg_temp.resched(14,18)$$,'Gestor delegado pode ajustar GV');
select * from finish();rollback;
