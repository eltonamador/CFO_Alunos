begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims','{}',true);
-- Também executável em uma cópia apenas do esquema, sem o catálogo do seed.
insert into public.duty_roles(code,name,sort_order)
values('aluno_dia','Aluno de Dia',1),('apoio_1','Apoio 1',2)
on conflict(code) do nothing;
create function pg_temp.wid(label text) returns uuid language sql immutable as $$select md5('weekly-window-'||label)::uuid$$;
insert into auth.users(id,email) values(pg_temp.wid('coord'),'weekly-window@test.invalid');
insert into public.profiles(id,role,full_name,active) values(pg_temp.wid('coord'),'coordenacao','Teste guarda',true);
insert into public.courses(id,code,name,year) values(pg_temp.wid('course'),'WINDOW-TEST','Teste guarda',2026);
insert into public.classes(id,course_id,name) values(pg_temp.wid('class'),pg_temp.wid('course'),'Turma guarda');
insert into public.students(id,class_id,student_number,war_name,full_name,pelotao)
select pg_temp.wid('student'||n),pg_temp.wid('class'),n,'TESTE '||n,'Cadete teste '||n,'CFO I' from generate_series(1,6)n;
insert into public.internship_programs(id,class_id,course_phase,name,starts_on,ends_on,required_minutes,target_minutes,status,published_by,published_at)
values(pg_temp.wid('program'),pg_temp.wid('class'),'CFO I','Programa guarda','2026-10-01','2026-11-30',15000,15120,'publicado',pg_temp.wid('coord'),now());
insert into public.internship_activity_types(id,program_id,code,name,training_axis,default_minutes,requires_operation_plan)
values(pg_temp.wid('usb'),pg_temp.wid('program'),'usb','USB','aph',720,false);
insert into public.internship_sites(id,program_id,site_type,code,name,gbm_number)
values(pg_temp.wid('gbm'),pg_temp.wid('program'),'gbm','gbm1','GBM teste',1);
insert into public.internship_resources(id,site_id,code,display_name,resource_type)
values(pg_temp.wid('resource'),pg_temp.wid('gbm'),'usb','USB','usb');
-- Guarda do sábado do cadete 1: sexta 18h a sábado 19h.
insert into public.internship_student_blackouts(program_id,student_id,starts_on,ends_on,blocked_weekdays,window_start_dow,window_start,window_minutes,reason)
values(pg_temp.wid('program'),pg_temp.wid('student1'),'2026-10-01','2028-12-31','{}',5,'18:00',1500,'Guarda do sábado (teste)');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.wid('coord'))::text,true);
create function pg_temp.addstage(student integer,label text,starts timestamptz) returns uuid language plpgsql as $$
declare sid uuid := pg_temp.wid(label);
begin
 insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,starts_at,ends_at,status,capacity,created_by)
 values(sid,pg_temp.wid('program'),pg_temp.wid('usb'),pg_temp.wid('gbm'),pg_temp.wid('resource'),starts,starts+interval '12 hours','rascunho',1,pg_temp.wid('coord'));
 insert into public.internship_assignments(shift_id,student_id,assignment_source,created_by)
 values(sid,pg_temp.wid('student'||student),'manual',pg_temp.wid('coord'));
 update public.internship_shifts set status='publicado',published_by=pg_temp.wid('coord'),published_at=now() where id=sid;
 return sid;
end$$;

select throws_ok($$select pg_temp.addstage(1,'friday-night','2026-10-09 18:00-03')$$,'23514',
 'Cadete indisponível por restrição operacional cadastrada.','Estágio de sexta à noite é recusado');
select throws_ok($$select pg_temp.addstage(1,'saturday-day','2026-10-17 07:45-03')$$,'23514',
 'Cadete indisponível por restrição operacional cadastrada.','Estágio diurno de sábado é recusado');
select lives_ok($$select pg_temp.addstage(1,'thursday-night','2026-10-01 18:00-03')$$,'Quinta 18h a sexta 06h continua permitido');
select lives_ok($$select pg_temp.addstage(1,'saturday-night','2026-10-24 19:45-03')$$,'Sábado depois das 19h continua permitido');
select lives_ok($$select pg_temp.addstage(2,'other-friday','2026-10-02 18:00-03')$$,'Outros cadetes seguem disponíveis na sexta à noite');
select lives_ok($$select pg_temp.addstage(3,'substitution','2026-10-16 18:00-03')$$,'Prepara plantão de sexta de outro cadete');
select throws_ok(format('select public.internship_substitute_assignment(%L,%L,%L)',
 (select id from public.internship_assignments where shift_id=pg_temp.wid('substitution')),pg_temp.wid('student1'),'Teste guarda do sábado'),
 '23514','Cadete indisponível por restrição operacional cadastrada.','Substituição também respeita a guarda');
select is((select student_id from public.internship_assignments where shift_id=pg_temp.wid('substitution') and status='prevista'),
 pg_temp.wid('student3'),'Troca recusada preserva o cadete original');

select throws_ok(format('select public.permanence_publish(%L,%L,%L,%L,%L,array[%L::uuid,%L::uuid])',
 pg_temp.wid('program'),'2026-10-31 06:00-03','2026-10-31 18:00-03','ABM','3A',pg_temp.wid('student1'),pg_temp.wid('student4')),
 '23514','Cadete indisponível por restrição operacional cadastrada.','Permanência de sábado é recusada');
select lives_ok(format('select public.permanence_publish(%L,%L,%L,%L,%L,array[%L::uuid,%L::uuid])',
 pg_temp.wid('program'),'2026-11-01 06:00-03','2026-11-01 18:00-03','ABM','3A',pg_temp.wid('student1'),pg_temp.wid('student4')),
 'Permanência de domingo é permitida');
insert into public.duty_rosters(id,class_id,period_start,period_end,status,generated_by,generated_at)
values(pg_temp.wid('roster'),pg_temp.wid('class'),'2026-11-07','2026-11-07','rascunho',pg_temp.wid('coord'),now());
select throws_ok(format($$insert into public.duty_assignments(roster_id,class_id,duty_date,role_id,student_id,status,assignment_source,manual_reason,created_by)
 values(%L,%L,'2026-11-07',(select id from public.duty_roles where code='aluno_dia'),%L,'prevista','manual','Teste guarda',%L)$$,
 pg_temp.wid('roster'),pg_temp.wid('class'),pg_temp.wid('student1'),pg_temp.wid('coord')),
 '23514','Cadete indisponível por restrição operacional cadastrada.','Escala de serviço de sábado sem horário ocupa o dia e é recusada');
select ok(not has_function_privilege('authenticated','public.student_weekly_window_conflict(uuid,uuid,timestamptz,timestamptz)','EXECUTE'),
 'Verificação interna não fica exposta ao cliente');
select * from finish();
rollback;
