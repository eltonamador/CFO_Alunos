begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims','{}',true);
-- Também executável em uma cópia apenas do esquema, sem o catálogo do seed.
insert into public.duty_roles(code,name,sort_order)
values('aluno_dia','Aluno de Dia',1),('apoio_1','Apoio 1',2)
on conflict(code) do nothing;
create function pg_temp.rid(label text) returns uuid language sql immutable as $$select md5('rest-frequency-'||label)::uuid$$;
insert into auth.users(id,email) values(pg_temp.rid('coord'),'rest-frequency@test.invalid');
insert into public.profiles(id,role,full_name,active) values(pg_temp.rid('coord'),'coordenacao','Teste descanso',true);
insert into public.courses(id,code,name,year) values(pg_temp.rid('course'),'REST-TEST','Teste descanso',2026);
insert into public.classes(id,course_id,name) values(pg_temp.rid('class'),pg_temp.rid('course'),'Turma descanso');
insert into public.students(id,class_id,student_number,war_name,full_name,pelotao)
select pg_temp.rid('student'||n),pg_temp.rid('class'),n,'TESTE '||n,'Cadete teste '||n,'CFO I' from generate_series(1,6)n;
insert into public.internship_programs(id,class_id,course_phase,name,starts_on,ends_on,required_minutes,target_minutes,status,published_by,published_at)
values(pg_temp.rid('program'),pg_temp.rid('class'),'CFO I','Programa descanso','2026-10-01','2026-11-30',15000,15120,'publicado',pg_temp.rid('coord'),now());
insert into public.internship_activity_types(id,program_id,code,name,training_axis,default_minutes,requires_operation_plan)
values(pg_temp.rid('usb'),pg_temp.rid('program'),'usb','USB','aph',720,false);
insert into public.internship_sites(id,program_id,site_type,code,name,gbm_number)
values(pg_temp.rid('gbm'),pg_temp.rid('program'),'gbm','gbm1','GBM teste',1);
insert into public.internship_resources(id,site_id,code,display_name,resource_type)
values(pg_temp.rid('resource'),pg_temp.rid('gbm'),'usb','USB','usb');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.rid('coord'))::text,true);
create function pg_temp.addstage(student integer,label text,starts timestamptz) returns uuid language plpgsql as $$
declare sid uuid := pg_temp.rid(label);
begin
 insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,starts_at,ends_at,status,capacity,created_by)
 values(sid,pg_temp.rid('program'),pg_temp.rid('usb'),pg_temp.rid('gbm'),pg_temp.rid('resource'),starts,starts+interval '12 hours','rascunho',1,pg_temp.rid('coord'));
 insert into public.internship_assignments(shift_id,student_id,assignment_source,created_by)
 values(sid,pg_temp.rid('student'||student),'manual',pg_temp.rid('coord'));
 update public.internship_shifts set status='publicado',published_by=pg_temp.rid('coord'),published_at=now() where id=sid;
 return sid;
end$$;
select lives_ok($$select pg_temp.addstage(1,'s1','2026-10-05 06:00-03')$$,'Primeiro serviço');
select lives_ok($$select pg_temp.addstage(1,'s2','2026-10-06 18:00-03')$$,'Primeiro intervalo de 24h permitido');
select lives_ok($$select pg_temp.addstage(1,'s3','2026-10-08 06:00-03')$$,'Segundo intervalo de 24h permitido');
select lives_ok($$select pg_temp.addstage(1,'s4','2026-10-09 18:00-03')$$,'Terceiro intervalo de 24h permitido');
select throws_ok($$select pg_temp.addstage(1,'s5','2026-10-11 06:00-03')$$,'23514',
 'Limite de três descansos de 24 horas em 28 dias excedido. Escolha outro cadete ou amplie o intervalo.','Publicação recusa a quarta ocorrência');
select is((select count(*)::integer from public.internship_shifts where id=pg_temp.rid('s5')),0,'Publicação recusada reverte o plantão inteiro');
select lives_ok($$select pg_temp.addstage(2,'replacement','2026-10-11 06:00-03')$$,'Outro cadete permanece apto');
select throws_ok(format('select public.internship_substitute_assignment(%L,%L,%L)',
 (select id from public.internship_assignments where shift_id=pg_temp.rid('replacement')),pg_temp.rid('student1'),'Teste substituição'),
 '23514','Limite de três descansos de 24 horas em 28 dias excedido. Escolha outro cadete ou amplie o intervalo.','Substituição também respeita limite');
select is((select student_id from public.internship_assignments where shift_id=pg_temp.rid('replacement') and status='prevista'),pg_temp.rid('student2'),'Troca recusada preserva cadete original');
select throws_ok(format('select public.permanence_publish(%L,%L,%L,%L,%L,array[%L::uuid,%L::uuid])',
 pg_temp.rid('program'),'2026-10-11 06:00-03','2026-10-11 18:00-03','ABM','3A',pg_temp.rid('student1'),pg_temp.rid('student3')),
 '23514','Limite de três descansos de 24 horas em 28 dias excedido. Escolha outro cadete ou amplie o intervalo.','Permanência não contorna descanso acumulado no estágio');
select lives_ok($$select pg_temp.addstage(1,'later','2026-11-11 06:00-03')$$,'Histórico fora da janela não impede novo serviço');
select lives_ok($$select pg_temp.addstage(1,'later2','2026-11-12 18:00-03')$$,'Janela renovada permite nova ocorrência');

select lives_ok($$select pg_temp.addstage(4,'f1','2026-10-19 06:00-03')$$,'Prepara serviço inicial do cenário futuro');
select lives_ok($$select pg_temp.addstage(4,'f2','2026-10-20 18:00-03')$$,'Prepara primeira ocorrência futura');
select lives_ok($$select pg_temp.addstage(4,'f3','2026-10-22 06:00-03')$$,'Prepara segunda ocorrência futura');
select lives_ok($$select pg_temp.addstage(4,'f5','2026-10-25 06:00-03')$$,'Reserva o serviço posterior sem nova ocorrência');
select throws_ok($$select pg_temp.addstage(4,'f4','2026-10-23 18:00-03')$$,'23514',
 'Limite de três descansos de 24 horas em 28 dias excedido. Escolha outro cadete ou amplie o intervalo.','Inserção no meio confere também a quarta ocorrência posterior');
select ok(not has_function_privilege('authenticated','public.internship_assert_rest_frequency(uuid,timestamptz,timestamptz)','EXECUTE'),'Validação interna não fica exposta para chamada pelo cliente');
select * from finish();
rollback;
