begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims','{}',true);
create function pg_temp.hid(label text) returns uuid language sql immutable as $$select md5('handover-'||label)::uuid$$;
create function pg_temp.ht() returns timestamptz language sql stable as $$select date_trunc('minute',now())-interval '4 hours'$$;
insert into auth.users(id,email) values(pg_temp.hid('coord'),'handover@test.invalid'),(pg_temp.hid('cadet-user'),'handover-cadet@test.invalid');
insert into public.profiles(id,role,full_name,active) values(pg_temp.hid('coord'),'coordenacao','Teste passagem',true);
insert into public.courses(id,code,name,year) values(pg_temp.hid('course'),'HANDOVER-TEST','Teste passagem',2026);
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
select pg_temp.addservice('main',1,pg_temp.ht());
insert into public.internship_shift_uniforms(shift_id,uniform_code,reason,updated_by)
values(pg_temp.hid('main'),'3A','Uniforme original',pg_temp.hid('coord'));
select public.internship_create_evaluation_invite(pg_temp.hid('assignmentmain'),'Oficial Teste','Contato teste');
select lives_ok($$select public.internship_handover_assignment(pg_temp.hid('assignmentmain'),pg_temp.hid('student2'),pg_temp.ht()+interval '2 hours','Passagem motivada')$$,'Divide plantão em períodos individuais');
select is((select planned_minutes from public.internship_shifts where id=pg_temp.hid('main')),120,'Quem sai conserva duas horas previstas');
select is((select sh.planned_minutes from public.internship_shifts sh join public.internship_handovers h on h.incoming_shift_id=sh.id where h.outgoing_assignment_id=pg_temp.hid('assignmentmain')),600,'Substituto recebe somente dez horas restantes');
select is((select count(*)::integer from public.internship_assignments where student_id in(pg_temp.hid('student1'),pg_temp.hid('student2')) and status='prevista'),2,'Ambas as fichas ficam ativas');
select is((select count(*)::integer from public.internship_execution_records),0,'Passagem não homologa automaticamente');
select is((select u.uniform_code from public.internship_shift_uniforms u join public.internship_handovers h on h.incoming_shift_id=u.shift_id),'3A','Uniforme preservado');
select is((select (context->>'ends_at')::timestamptz from public.internship_evaluations where assignment_id=pg_temp.hid('assignmentmain')),pg_temp.ht()+interval '2 hours','Link de avaliação passa a usar término individual');
select is((select sum(planned_minutes)::integer from public.internship_coordination_schedule(pg_temp.hid('program')) where student_id in(pg_temp.hid('student1'),pg_temp.hid('student2'))),720,'Agenda/PDF não duplicam as doze horas');
select lives_ok($$select public.internship_handover_assignment(pg_temp.hid('assignmentmain'),pg_temp.hid('student2'),pg_temp.ht()+interval '2 hours','Passagem motivada')$$,'Reenvio idêntico é idempotente');
select is((select count(*)::integer from public.internship_handovers),1,'Reenvio não duplica participação');
select throws_ok($$select public.internship_handover_assignment(pg_temp.hid('assignmentmain'),pg_temp.hid('student3'),pg_temp.ht()+interval '3 hours','Outra passagem')$$,'23514','Esta participação já teve passagem de serviço. Atualize a escala.','Duas solicitações diferentes não reescrevem a saída');
-- Erros de negócio são conferidos sem depender da mensagem de uma guarda anterior.
create function pg_temp.rejected(statement text) returns boolean language plpgsql as $$begin execute statement; return false; exception when check_violation then return true; end$$;
select ok(pg_temp.rejected($$update public.internship_shifts set ends_at=ends_at+interval '1 hour' where id=pg_temp.hid('main')$$),'Alteração direta não pode ampliar período encerrado');
select ok(pg_temp.rejected($$insert into public.internship_execution_records(assignment_id,validation_status,attendance_status,actual_starts_at,actual_ends_at,entered_by) values(pg_temp.hid('assignmentmain'),'pendente','integral',pg_temp.ht(),pg_temp.ht()+interval '3 hours',pg_temp.hid('coord'))$$),'Ficha não pode invadir o período do substituto');
select pg_temp.addservice('rest',3,pg_temp.ht());
select pg_temp.addservice('previous',4,pg_temp.ht()-interval '14 hours');
select ok(pg_temp.rejected($$select public.internship_handover_assignment(pg_temp.hid('assignmentrest'),pg_temp.hid('student4'),pg_temp.ht()+interval '2 hours','Teste descanso')$$),'Recusa substituto com menos de 24h de descanso');
select is((select planned_minutes from public.internship_shifts where id=pg_temp.hid('rest')),720,'Falha restaura a jornada original');
select is((select count(*)::integer from public.internship_handovers where outgoing_assignment_id=pg_temp.hid('assignmentrest')),0,'Falha não deixa passagem parcial');
select ok(pg_temp.rejected($$select public.internship_handover_assignment(pg_temp.hid('assignmentrest'),pg_temp.hid('student3'),pg_temp.ht()+interval '2 hours','Mesmo cadete')$$),'Recusa o mesmo cadete');
select ok(pg_temp.rejected($$select public.internship_handover_assignment(pg_temp.hid('assignmentrest'),pg_temp.hid('student5'),now()+interval '1 hour','Horário futuro')$$),'Recusa passagem futura');
select ok(pg_temp.rejected($$select public.internship_handover_assignment(pg_temp.hid('assignmentrest'),pg_temp.hid('student5'),pg_temp.ht(),'Início exato')$$),'Recusa período vazio');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.hid('cadet-user'))::text,true);
select throws_ok($$select public.internship_handover_assignment(pg_temp.hid('assignmentrest'),pg_temp.hid('student5'),pg_temp.ht()+interval '2 hours','Sem permissão')$$,'42501','Acesso restrito à administração do estágio.','Cadete comum não administra passagem');
select ok(not has_table_privilege('authenticated','public.internship_handovers','INSERT'),'Cliente não pode criar exceção diretamente');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.hid('coord'))::text,true);
select ok(exists(select 1 from public.audit_logs where entity='internship_handovers'),'Passagem auditada');
-- A referência de descanso do substituto é sua entrada, não o começo do turno original.
select pg_temp.addservice('prior24',5,pg_temp.ht()-interval '34 hours');
select lives_ok($$select public.internship_handover_assignment(pg_temp.hid('assignmentrest'),pg_temp.hid('student5'),pg_temp.ht()+interval '2 hours','Descanso exato')$$,'Aceita 24h exatas antes da entrada individual');
select lives_ok($$select public.internship_handover_assignment((select incoming_assignment_id from public.internship_handovers where outgoing_assignment_id=pg_temp.hid('assignmentrest')),pg_temp.hid('student6'),pg_temp.ht()+interval '3 hours','Segunda passagem')$$,'Permite nova passagem do substituto, sem reabrir o primeiro período');
select is((select sum(sh.planned_minutes)::integer from public.internship_shifts sh join public.internship_assignments a on a.shift_id=sh.id where a.student_id in(pg_temp.hid('student3'),pg_temp.hid('student5'),pg_temp.hid('student6')) and sh.starts_at >= pg_temp.ht()),720,'Duas passagens conservam a duração total');

select pg_temp.addservice('day24',7,pg_temp.ht()-interval '26 hours',1440);
select lives_ok($$select public.internship_handover_assignment(pg_temp.hid('assignmentday24'),pg_temp.hid('student8'),pg_temp.ht()-interval '18 hours','Plantão de 24 horas')$$,'Divide serviço de 24h que cruza a meia-noite');
select is((select planned_minutes from public.internship_shifts where id=pg_temp.hid('day24')),480,'Primeiro período de 8h');
select is((select sh.planned_minutes from public.internship_handovers h join public.internship_shifts sh on sh.id=h.incoming_shift_id where h.outgoing_shift_id=pg_temp.hid('day24')),960,'Segundo período de 16h');

select pg_temp.addservice('limit',9,pg_temp.ht());
select pg_temp.addservice('freq1',10,pg_temp.ht()-interval '142 hours');
select pg_temp.addservice('freq2',10,pg_temp.ht()-interval '106 hours');
select pg_temp.addservice('freq3',10,pg_temp.ht()-interval '70 hours');
select pg_temp.addservice('freq4',10,pg_temp.ht()-interval '34 hours');
select ok(pg_temp.rejected($$select public.internship_handover_assignment(pg_temp.hid('assignmentlimit'),pg_temp.hid('student10'),pg_temp.ht()+interval '2 hours','Teste limite de folgas')$$),'Recusa quarta folga de 24h em 28 dias');
insert into public.internship_instruction_blocks(program_id,starts_at,ends_at,title,source_reference)
values(pg_temp.hid('program'),pg_temp.ht()+interval '2 hours',pg_temp.ht()+interval '3 hours','Instrução teste','Fonte de teste');
select ok(pg_temp.rejected($$select public.internship_handover_assignment(pg_temp.hid('assignmentlimit'),pg_temp.hid('student11'),pg_temp.ht()+interval '2 hours','Teste instrução')$$),'Recusa conflito de instrução no período restante');
delete from public.internship_instruction_blocks where program_id=pg_temp.hid('program');

insert into public.internship_activity_types(id,program_id,code,name,training_axis,default_minutes,requires_operation_plan)
values(pg_temp.hid('gv'),pg_temp.hid('program'),'guarda_vida','Guarda-vidas','salvamento',480,true);
insert into public.internship_sites(id,program_id,site_type,code,name)
values(pg_temp.hid('beach'),pg_temp.hid('program'),'praia','beach','Praia teste');
insert into public.internship_resources(id,site_id,code,display_name,resource_type,regular_team_size)
values(pg_temp.hid('gv-resource'),pg_temp.hid('beach'),'posto','Posto','posto_guarda_vida',3);
insert into public.internship_operation_plans(id,program_id,code,title,status,starts_at,ends_at,authorized_by,authorized_at)
values(pg_temp.hid('plan'),pg_temp.hid('program'),'guarda_vida_test','GV teste','em_definicao',pg_temp.ht(),pg_temp.ht()+interval '8 hours',pg_temp.hid('coord'),now());
insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,operation_plan_id,starts_at,ends_at,status,capacity)
values(pg_temp.hid('gv-shift'),pg_temp.hid('program'),pg_temp.hid('gv'),pg_temp.hid('beach'),pg_temp.hid('gv-resource'),pg_temp.hid('plan'),pg_temp.ht(),pg_temp.ht()+interval '8 hours','rascunho',1);
insert into public.internship_assignments(id,shift_id,student_id) values(pg_temp.hid('gv-assignment'),pg_temp.hid('gv-shift'),pg_temp.hid('student12'));
insert into public.internship_shift_uniforms(shift_id,uniform_code,reason,updated_by) values(pg_temp.hid('gv-shift'),'4D','Uniforme de praia',pg_temp.hid('coord'));
update public.internship_shifts set status='publicado',published_at=now(),published_by=pg_temp.hid('coord') where id=pg_temp.hid('gv-shift');
select lives_ok($$select public.internship_handover_assignment(pg_temp.hid('gv-assignment'),pg_temp.hid('student13'),pg_temp.ht()+interval '2 hours','Passagem na praia')$$,'GV permite passagem com documento ainda pendente');
select is((select u.uniform_code from public.internship_handovers h join public.internship_shift_uniforms u on u.shift_id=h.incoming_shift_id where h.outgoing_assignment_id=pg_temp.hid('gv-assignment')),'4D','GV preserva o uniforme');
insert into public.internship_administrators(student_id,reason) values(pg_temp.hid('student30'),'Administrador de teste');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.hid('cadet-user'))::text,true);
select lives_ok($$select public.internship_handover_assignment(pg_temp.hid('assignmentlimit'),pg_temp.hid('student14'),pg_temp.ht()+interval '2 hours','Gestor delegado')$$,'Administrador delegado do estágio pode registrar passagem');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.hid('coord'))::text,true);
select pg_temp.addservice('template',15,pg_temp.ht(),720,true);
select lives_ok($$select public.internship_handover_assignment(pg_temp.hid('assignmenttemplate'),pg_temp.hid('student16'),pg_temp.ht()+interval '2 hours','Padrão com passagem')$$,'Divide padrão de 12h sem exigir outro padrão para a fração');
select is((select sh.template_id from public.internship_handovers h join public.internship_shifts sh on sh.id=h.incoming_shift_id where h.outgoing_shift_id=pg_temp.hid('template')),pg_temp.hid('templatetemplate'),'Preserva a referência do padrão original');
select lives_ok($$select public.internship_homologate_execution(pg_temp.hid('assignmentmain'),'integral',pg_temp.ht(),pg_temp.ht()+interval '2 hours',120,'Oficial Teste','Ficha do período individual',null,null,null)$$,'Homologa somente o período encerrado do primeiro cadete');
select is((select approved_minutes from public.internship_official_workload where assignment_id=pg_temp.hid('assignmentmain')),120,'Contador oficial recebe duas horas, sem duplicar o plantão');
select * from finish();
rollback;
