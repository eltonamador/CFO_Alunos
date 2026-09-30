begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims','{}',true);
create function pg_temp.hid(label text) returns uuid language sql immutable as $$select md5('instruction-'||label)::uuid$$;
create function pg_temp.ht() returns timestamptz language sql stable as $$select date_trunc('minute',now())-interval '4 hours'$$;
insert into auth.users(id,email) values(pg_temp.hid('coord'),'instruction@test.invalid'),(pg_temp.hid('cadet-user'),'instruction-cadet@test.invalid');
insert into public.profiles(id,role,full_name,active) values(pg_temp.hid('coord'),'coordenacao','Teste passagem',true);
insert into public.courses(id,code,name,year) values(pg_temp.hid('course'),'INSTRUCTION-TEST','Teste passagem',2026);
insert into public.classes(id,course_id,name) values(pg_temp.hid('class'),pg_temp.hid('course'),'Teste passagem');
insert into public.students(id,class_id,student_number,war_name,full_name,pelotao)
select pg_temp.hid('student'||n),pg_temp.hid('class'),n,'TESTE '||n,'Cadete teste '||n,'CFO I' from generate_series(1,30)n;
insert into public.profiles(id,role,full_name,active,student_id) values(pg_temp.hid('cadet-user'),'aluno','Cadete',true,pg_temp.hid('student30'));
insert into public.internship_programs(id,class_id,course_phase,name,starts_on,ends_on,required_minutes,target_minutes,status,published_by,published_at)
values(pg_temp.hid('program'),pg_temp.hid('class'),'CFO I','Passagem',(now()-interval '1 year')::date,(now()+interval '1 year')::date,15000,15120,'publicado',pg_temp.hid('coord'),now());
insert into public.internship_activity_types(id,program_id,code,name,training_axis,default_minutes,requires_operation_plan)
values(pg_temp.hid('usb'),pg_temp.hid('program'),'usb','USB','aph',720,false);
insert into public.internship_sites(id,program_id,site_type,code,name,gbm_number)
values(pg_temp.hid('gbm'),pg_temp.hid('program'),'gbm','gbm1','GBM teste',1);
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.hid('coord'))::text,true);
create function pg_temp.addservice(label text,student integer,starts timestamptz,minutes integer default 720,templated boolean default false) returns uuid language plpgsql as $$
begin
 insert into public.internship_resources(id,site_id,code,display_name,resource_type)
 values(pg_temp.hid('resource'||label),pg_temp.hid('gbm'),label,'USB','usb');
 if templated then
   insert into public.internship_shift_templates(id,program_id,activity_type_id,code,name,start_weekdays,journey_minutes,includes_travel,obm_arrival_time,obm_departure_time,end_day_offset)
   values(pg_temp.hid('template'||label),pg_temp.hid('program'),pg_temp.hid('usb'),'TEST-'||upper(label),'Padrão teste',array[extract(isodow from starts at time zone 'America/Belem')::integer],minutes,false,
     (starts at time zone 'America/Belem')::time,((starts+minutes*interval '1 minute') at time zone 'America/Belem')::time,
     ((starts+minutes*interval '1 minute') at time zone 'America/Belem')::date-(starts at time zone 'America/Belem')::date);
 end if;
 insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,template_id,starts_at,ends_at,status,capacity,created_by)
 values(pg_temp.hid(label),pg_temp.hid('program'),pg_temp.hid('usb'),pg_temp.hid('gbm'),pg_temp.hid('resource'||label),case when templated then pg_temp.hid('template'||label) end,starts,starts+minutes*interval '1 minute','rascunho',1,pg_temp.hid('coord'));
 insert into public.internship_assignments(id,shift_id,student_id,assignment_source,created_by)
 values(pg_temp.hid('assignment'||label),pg_temp.hid(label),pg_temp.hid('student'||student),'manual',pg_temp.hid('coord'));
 update public.internship_shifts set status='publicado',published_by=pg_temp.hid('coord'),published_at=now() where id=pg_temp.hid(label);
 return pg_temp.hid('assignment'||label);
end$$;

select pg_temp.addservice('main',1,pg_temp.ht()+interval '2 days');
insert into public.duty_roles(code,name,sort_order,active) values('aluno_dia','Aluno de Dia',1,true),('apoio_1','Apoio 1',5,true) on conflict(code) do update set active=true;
select public.permanence_publish(pg_temp.hid('program'),pg_temp.ht()+interval '2 days',pg_temp.ht()+interval '2 days 12 hours','ABM','3A',array[pg_temp.hid('student20'),pg_temp.hid('student21')]);
select lives_ok($$select public.internship_save_instruction(pg_temp.hid('program'),'APH teste',pg_temp.ht()+interval '2 days 2 hours',pg_temp.ht()+interval '2 days 4 hours')$$,'Coordenação cadastra instrução sem documento obrigatório');
create function pg_temp.blockid() returns uuid language sql stable as $$select id from public.internship_instruction_blocks where program_id=pg_temp.hid('program')$$;
create function pg_temp.stamp() returns timestamptz language sql stable as $$select updated_at from public.internship_instruction_blocks where id=pg_temp.blockid()$$;
select is((select count(*)::integer from public.internship_instruction_conflicts(pg_temp.hid('program')) where service_kind='gbm'),1,'Aponta serviço GBM previamente publicado');
select is((select count(*)::integer from public.internship_instruction_conflicts(pg_temp.hid('program')) where service_kind='permanencia'),2,'Sinaliza dois cadetes em sobreaviso na permanência');
create function pg_temp.dutyid() returns uuid language sql stable as $$select assignment_id from public.internship_review_instruction_conflicts(pg_temp.hid('program')) where service_kind='permanencia' limit 1$$;
create function pg_temp.dutyctx() returns jsonb language sql stable as $$select review_context from public.internship_review_instruction_conflicts(pg_temp.hid('program')) where assignment_id=pg_temp.dutyid()$$;
select lives_ok($$select public.internship_confirm_instruction_standby(pg_temp.blockid(),pg_temp.dutyid(),pg_temp.dutyctx(),true)$$,'Confirma sobreaviso por cadete na ABM');
select is((select count(*)::integer from public.internship_review_instruction_conflicts(pg_temp.hid('program')) where standby_confirmed),1,'Confirma só o cadete selecionado');
select throws_ok($$select public.internship_confirm_instruction_standby(pg_temp.blockid(),pg_temp.dutyid(),'{}',true)$$,'40001','A instrução ou permanência mudou. Atualize a página.','Recusa confirmação com contexto desatualizado');
select lives_ok($$select public.internship_confirm_instruction_standby(pg_temp.blockid(),pg_temp.dutyid(),pg_temp.dutyctx(),false)$$,'Permite retirar confirmação');
select is((select count(*)::integer from public.internship_review_instruction_conflicts(pg_temp.hid('program')) where standby_confirmed),0,'Aviso reaparece ao retirar confirmação');
select public.internship_confirm_instruction_standby(pg_temp.blockid(),pg_temp.dutyid(),pg_temp.dutyctx(),true);
select public.internship_save_instruction(pg_temp.hid('program'),'APH título corrigido',pg_temp.ht()+interval '2 days 2 hours',pg_temp.ht()+interval '2 days 4 hours','',pg_temp.blockid(),pg_temp.stamp());
select is((select count(*)::integer from public.internship_review_instruction_conflicts(pg_temp.hid('program')) where standby_confirmed),0,'Mudança da instrução exige nova confirmação de sobreaviso');
select is((select student_id from public.internship_assignments where id=pg_temp.hid('assignmentmain')),pg_temp.hid('student1'),'Instrução não remaneja cadete automaticamente');
select throws_ok($$select pg_temp.addservice('conflict',2,pg_temp.ht()+interval '2 days')$$,'23514','Conflito com instrução obrigatória do QTS.','Banco bloqueia novas publicações no horário da instrução');
select throws_ok($$select public.internship_save_instruction(pg_temp.hid('program'),'APH editada',pg_temp.ht()+interval '2 days',pg_temp.ht()+interval '2 days 1 hour','',pg_temp.blockid(),now()-interval '1 minute')$$,'40001','A instrução mudou. Atualize a página antes de salvar.','Edição desatualizada recusada');
select lives_ok($$select public.internship_save_instruction(pg_temp.hid('program'),'APH editada',pg_temp.ht()+interval '2 days 12 hours',pg_temp.ht()+interval '2 days 13 hours','',pg_temp.blockid(),pg_temp.stamp())$$,'Permite alterar horário');
select is((select count(*)::integer from public.internship_instruction_conflicts(pg_temp.hid('program'))),0,'Limite exato no término não é sobreposição; remove alertas antigos');
select lives_ok($$select public.internship_save_instruction(pg_temp.hid('program'),'APH editada',pg_temp.ht()+interval '2 days 2 hours',pg_temp.ht()+interval '2 days 4 hours','',pg_temp.blockid(),pg_temp.stamp(),false)$$,'Desativa sem apagar histórico');
select is((select count(*)::integer from public.internship_instruction_conflicts(pg_temp.hid('program'))),0,'Instrução desativada não bloqueia');
select ok(exists(select 1 from public.audit_logs where entity='internship_instruction_blocks' and entity_id=pg_temp.blockid() and action='update'),'Mudanças auditadas');
select throws_ok($$select public.internship_save_instruction(pg_temp.hid('program'),'APH inválida',pg_temp.ht(),pg_temp.ht()-interval '1 hour')$$,'23514','Revise título, horários e período da instrução.','Recusa término anterior ao início');
select ok(not has_table_privilege('authenticated','public.internship_instruction_blocks','UPDATE'),'Edição direta não contorna validações');
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.hid('cadet-user'))::text,true);
select throws_ok($$select public.internship_save_instruction(pg_temp.hid('program'),'Sem acesso',pg_temp.ht(),pg_temp.ht()+interval '1 hour')$$,'42501','Acesso restrito.','Cadete comum não cadastra instrução');
select throws_ok($$select public.internship_instruction_conflicts(pg_temp.hid('program'))$$,'42501','Acesso restrito.','Cadete comum não consulta quadro administrativo');
reset role;
insert into public.internship_administrators(student_id,reason) values(pg_temp.hid('student30'),'Administrador de teste');
set local role authenticated;
select lives_ok($$select public.internship_save_instruction(pg_temp.hid('program'),'Gestor delegado',pg_temp.ht(),pg_temp.ht()+interval '1 hour')$$,'Gestor delegado como Ian pode cadastrar instrução');
reset role;
select * from finish();
rollback;
