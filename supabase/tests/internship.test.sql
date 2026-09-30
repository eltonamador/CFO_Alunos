-- Testes transacionais: nenhum dado fictício permanece no banco.
begin;
-- Isola a configuração inicial mesmo quando o banco local já possui escalas.
-- O rollback ao final restaura integralmente os programas existentes.
truncate public.internship_programs cascade;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims', '{}', true);

create function pg_temp.it_id(label text) returns uuid language sql immutable
as $$ select md5('internship-test-' || label)::uuid $$;

create function pg_temp.it_try(p_actor text, p_cmd text) returns text
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.it_id(p_actor))::text, true);
  set local role authenticated;
  execute p_cmd;
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  return 'ok';
exception when others then
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  return sqlstate;
end $$;

create function pg_temp.it_count(p_actor text, p_query text) returns integer
language plpgsql as $$
declare v_count integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.it_id(p_actor))::text, true);
  set local role authenticated;
  execute p_query into v_count;
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  return v_count;
end $$;

select is((select count(*)::integer from pg_tables
  where schemaname = 'public' and tablename like 'internship_%' and rowsecurity),
  17, 'RLS ativa nas dezessete tabelas do módulo');
select ok(not has_table_privilege('anon','public.internship_execution_records','select'),
  'anon sem acesso a fichas');
select ok(not has_table_privilege('authenticated','public.internship_execution_records','update'),
  'ficha não pode ser sobrescrita');
select ok(not has_table_privilege('authenticated','public.internship_execution_records','delete'),
  'ficha não pode ser excluída');
select ok(not has_function_privilege('authenticated',
  'public.internship_check_assignment(uuid,uuid,uuid,text)','execute'),
  'função interna não é executável pelo navegador');

insert into auth.users(id, email)
select pg_temp.it_id(label), label || '@internship-test.invalid'
from unnest(array['coord','secretaria','instrutor','inativo','aluno1','aluno2']) label;
insert into public.profiles(id,role,full_name,active) values
  (pg_temp.it_id('coord'),'coordenacao','Coordenação de teste',true),
  (pg_temp.it_id('secretaria'),'secretaria','Secretaria de teste',true),
  (pg_temp.it_id('instrutor'),'instrutor','Instrutor de teste',true),
  (pg_temp.it_id('inativo'),'coordenacao','Coordenação inativa',false),
  (pg_temp.it_id('aluno1'),'aluno','Cadete de teste 1',true),
  (pg_temp.it_id('aluno2'),'aluno','Cadete de teste 2',true);
insert into public.courses(id,code,name,year)
values (pg_temp.it_id('course'),'INTERNSHIP-TEST','Curso de teste',2099);
insert into public.classes(id,course_id,name)
values (pg_temp.it_id('class'),pg_temp.it_id('course'),'Turma de teste');
insert into public.students(id,class_id,student_number,war_name,full_name,pelotao) values
  (pg_temp.it_id('student1'),pg_temp.it_id('class'),1,'CADETE A','Cadete de teste A','CFO I'),
  (pg_temp.it_id('student2'),pg_temp.it_id('class'),2,'CADETE B','Cadete de teste B','CFO I');
update public.profiles set student_id = pg_temp.it_id('student1') where id = pg_temp.it_id('aluno1');
update public.profiles set student_id = pg_temp.it_id('student2') where id = pg_temp.it_id('aluno2');

select is(pg_temp.it_try('coord', $q$
  insert into public.internship_programs(id,class_id,course_phase,name,starts_on,ends_on,
    required_minutes,target_minutes,status,created_by,published_by,published_at)
  values (pg_temp.it_id('program'),pg_temp.it_id('class'),'CFO I','Estágio de teste',
    '2026-09-01','2026-12-31',15000,15120,'publicado',pg_temp.it_id('coord'),
    pg_temp.it_id('coord'),now())
$q$), 'ok', 'Coordenação cria programa');
select is(pg_temp.it_try('secretaria', $q$
  insert into public.internship_programs(class_id,course_phase,name,starts_on,ends_on,
    required_minutes,target_minutes)
  values (pg_temp.it_id('class'),'CFO II','Estágio negado','2026-09-01','2026-12-31',15000,15120)
$q$), '42501', 'Secretaria não cria programa');

insert into public.internship_activity_types(id,program_id,code,name,training_axis,default_minutes)
values (pg_temp.it_id('activity'),pg_temp.it_id('program'),'usb','USB','aph',720);
insert into public.internship_sites(id,program_id,site_type,code,name,gbm_number)
values (pg_temp.it_id('site'),pg_temp.it_id('program'),'gbm','gbm1','1º GBM',1);
insert into public.internship_resources(id,site_id,code,display_name,resource_type)
values (pg_temp.it_id('resource'),pg_temp.it_id('site'),'usb1','USB 1','usb');
insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,
  starts_at,ends_at,capacity,status,planned_supervisor_name,created_by,published_by,published_at)
values (pg_temp.it_id('shift'),pg_temp.it_id('program'),pg_temp.it_id('activity'),
  pg_temp.it_id('site'),pg_temp.it_id('resource'),'2026-09-10 08:00-03',
  '2026-09-10 20:00-03',1,'publicado','Oficial de teste',pg_temp.it_id('coord'),
  pg_temp.it_id('coord'),now());

select is(pg_temp.it_try('coord', $q$
  insert into public.internship_assignments(id,shift_id,student_id,created_by)
  values (pg_temp.it_id('assignment'),pg_temp.it_id('shift'),pg_temp.it_id('student1'),
    pg_temp.it_id('coord'))
$q$), 'ok', 'Coordenação atribui cadete');
select is(pg_temp.it_count('aluno1','select count(*) from public.internship_assignments'),
  1, 'Cadete vê sua participação');
select is(pg_temp.it_count('aluno2','select count(*) from public.internship_assignments'),
  0, 'Outro cadete não vê participação alheia');
select is(pg_temp.it_count('instrutor','select count(*) from public.internship_assignments'),
  0, 'Supervisor sem acesso digital');
select is(pg_temp.it_count('inativo','select count(*) from public.internship_assignments'),
  0, 'Perfil inativo não acessa o estágio');
select is(pg_temp.it_try('aluno1', $q$
  insert into public.internship_assignments(shift_id,student_id)
  values (pg_temp.it_id('shift'),pg_temp.it_id('student2'))
$q$), '42501', 'Cadete não altera escala');

select is(pg_temp.it_try('coord', $q$
  insert into public.internship_assignments(shift_id,student_id,created_by)
  values (pg_temp.it_id('shift'),pg_temp.it_id('student2'),pg_temp.it_id('coord'))
$q$), '23514', 'Capacidade da vaga adicional é respeitada');

select is(pg_temp.it_try('aluno1', $q$
  insert into public.internship_cadet_reports(assignment_id,student_id,report_type,reported_by)
  values (pg_temp.it_id('assignment'),pg_temp.it_id('student1'),'presenca',pg_temp.it_id('aluno1'))
$q$), 'ok', 'Cadete confirma presença própria');
select is(pg_temp.it_try('aluno1', $q$
  insert into public.internship_cadet_reports(assignment_id,student_id,report_type,
    reported_exit_at,reason,reported_by,reported_at)
  values (pg_temp.it_id('assignment'),pg_temp.it_id('student1'),'saida_antecipada',
    '2026-09-10 15:00-03','Saída comunicada',pg_temp.it_id('aluno1'),'2000-01-01')
$q$), 'ok', 'Cadete comunica saída antecipada');
select ok((select reported_at > timestamptz '2026-09-01'
  from public.internship_cadet_reports where report_type = 'saida_antecipada'),
  'Carimbo do relato é gerado pelo banco');
select is(pg_temp.it_try('aluno1', $q$
  insert into public.internship_cadet_reports(assignment_id,student_id,report_type,reported_by)
  values (pg_temp.it_id('assignment'),pg_temp.it_id('student1'),'presenca',pg_temp.it_id('aluno1'))
$q$), '23505', 'Presença não pode ser confirmada duas vezes');
select is(pg_temp.it_try('aluno1', $q$
  insert into public.internship_cadet_reports(assignment_id,student_id,report_type,
    reported_exit_at,reason,reported_by)
  values (pg_temp.it_id('assignment'),pg_temp.it_id('student1'),'saida_antecipada',
    '2026-09-09 15:00-03','Horário inválido',pg_temp.it_id('aluno1'))
$q$), '23514', 'Relato de saída fora do plantão é rejeitado');
select is(pg_temp.it_try('aluno2', $q$
  insert into public.internship_cadet_reports(assignment_id,student_id,report_type,reported_by)
  values (pg_temp.it_id('assignment'),pg_temp.it_id('student2'),'presenca',pg_temp.it_id('aluno2'))
$q$), '42501', 'Cadete não confirma presença de outro');

select is(pg_temp.it_try('coord', $q$
  insert into public.internship_execution_records(id,assignment_id,validation_status,
    attendance_status,actual_starts_at,actual_ends_at,supervisor_name,paper_reference,entered_by)
  values (pg_temp.it_id('pending'),pg_temp.it_id('assignment'),'pendente','parcial',
    '2026-09-10 08:00-03','2026-09-10 17:00-03','Oficial de teste','Ficha 001',
    pg_temp.it_id('coord'))
$q$), 'ok', 'Coordenação lança ficha ainda pendente');
select is((select calculated_minutes from public.internship_execution_records
  where id = pg_temp.it_id('pending')), 540, 'Carga realizada calculada pelos horários');
select is((select count(*)::integer from public.internship_official_workload),
  0, 'Lançamento pendente não gera carga oficial');
select is(pg_temp.it_try('coord', $q$
  insert into public.internship_execution_records(assignment_id,revision_of_id,
    validation_status,attendance_status,actual_starts_at,actual_ends_at,
    approved_minutes,supervisor_name,paper_reference,entered_by,validated_by,validated_at)
  values (pg_temp.it_id('assignment'),pg_temp.it_id('pending'),'homologado','parcial',
    '2026-09-10 08:00-03','2026-09-10 17:00-03',720,'Oficial de teste',
    'Ficha 001',pg_temp.it_id('coord'),pg_temp.it_id('coord'),now())
$q$), '23514', 'Diferença sem decisão fundamentada é bloqueada');
select is(pg_temp.it_try('coord', $q$
  insert into public.internship_execution_records(id,assignment_id,revision_of_id,
    validation_status,attendance_status,actual_starts_at,actual_ends_at,
    approved_minutes,supervisor_name,paper_reference,decision_reason,entered_by,
    validated_by,validated_at)
  values (pg_temp.it_id('approved'),pg_temp.it_id('assignment'),pg_temp.it_id('pending'),
    'homologado','parcial','2026-09-10 08:00-03','2026-09-10 17:00-03',720,
    'Oficial de teste','Ficha 001','Saída autorizada pela Coordenação',
    pg_temp.it_id('coord'),pg_temp.it_id('coord'),now())
$q$), 'ok', 'Coordenação decide considerar carga prevista com justificativa');
select is((select sum(approved_minutes)::integer from public.internship_official_workload),
  720, 'Somente minutos homologados somam a carga oficial');
select is((select sum(calculated_minutes)::integer from public.internship_official_workload),
  540, 'Carga realizada permanece distinta da homologada');
select is(pg_temp.it_count('secretaria','select count(*) from public.internship_execution_records'),
  0, 'Secretaria não vê observações internas da ficha');
select is(pg_temp.it_count('aluno1','select count(*) from public.internship_execution_records'),
  0, 'Cadete não vê observações internas da ficha');
select is(pg_temp.it_try('coord', $q$
  insert into public.internship_execution_records(id,assignment_id,revision_of_id,
    validation_status,attendance_status,actual_starts_at,actual_ends_at,
    approved_minutes,supervisor_name,paper_reference,decision_reason,entered_by,
    validated_by,validated_at)
  values (pg_temp.it_id('correction'),pg_temp.it_id('assignment'),pg_temp.it_id('approved'),
    'homologado','parcial','2026-09-10 08:00-03','2026-09-10 17:00-03',540,
    'Oficial de teste','Ficha 001','Correção após revisão da ficha física',
    pg_temp.it_id('coord'),pg_temp.it_id('coord'),now())
$q$), 'ok', 'Correção cria versão imutável');
select is((select sum(approved_minutes)::integer from public.internship_official_workload),
  540, 'Versão anterior não gera dupla contagem');
select is((select count(*)::integer from public.internship_execution_records),
  3, 'Histórico conserva ficha pendente e duas homologações');
select is(pg_temp.it_count('aluno1',
  'select count(*) from public.internship_my_shifts()'), 1,
  'Consulta do cadete retorna somente seu turno publicado');
select is(pg_temp.it_count('aluno2',
  'select count(*) from public.internship_my_shifts()'), 0,
  'Outro cadete não vê o turno alheio na consulta');
select is(pg_temp.it_count('aluno1',
  'select validated_minutes::integer from public.internship_my_workload()'), 540,
  'Extrato do cadete usa a versão homologada vigente');
select is(pg_temp.it_count('aluno1',
  'select performed_minutes::integer from public.internship_my_workload()'), 540,
  'Extrato do cadete distingue a carga realizada');
select is(pg_temp.it_try('instrutor',
  'select * from public.internship_my_workload()'), '42501',
  'Instrutor não acessa o extrato digital do cadete');
select is(pg_temp.it_try('secretaria', $q$
  select public.internship_homologate_execution(pg_temp.it_id('assignment'),
    'parcial','2026-09-10 08:00-03','2026-09-10 17:00-03',540,
    'Oficial de teste','Ficha 001',null,null,'Correção de teste')
$q$), '42501', 'Secretaria não homologa ficha');
select is(pg_temp.it_try('coord', $q$
  select public.internship_homologate_execution(pg_temp.it_id('assignment'),
    'parcial','2026-09-10 08:00-03','2026-09-10 17:00-03',540,
    'Oficial de teste','Ficha 001',null,null,null)
$q$), '23514', 'Correção sem justificativa é bloqueada');
select is(pg_temp.it_try('coord', $q$
  select public.internship_homologate_execution(pg_temp.it_id('assignment'),
    'parcial','2026-09-10 08:00-03','2026-09-10 16:00-03',480,
    'Oficial de teste','Ficha 001','Saída antecipada',true,
    'Correção após conferência da ficha')
$q$), 'ok', 'Coordenação corrige a ficha com nova versão pelo fluxo oficial');
select is((select sum(approved_minutes)::integer from public.internship_official_workload),
  480, 'Correção por RPC substitui a carga oficial sem dupla contagem');
select is(pg_temp.it_try('secretaria',
  'select * from public.internship_coordination_workload(pg_temp.it_id(''program''))'),
  '42501', 'Resumo consolidado é restrito à Coordenação');
select is(pg_temp.it_count('coord', $q$
  select count(*) from public.internship_coordination_workload(pg_temp.it_id('program'))
$q$), 2, 'Resumo consolidado inclui todos os cadetes ativos da turma');
select is(pg_temp.it_count('coord', $q$
  select planned_minutes::integer from public.internship_coordination_workload(
    pg_temp.it_id('program')) where student_id=pg_temp.it_id('student1')
$q$), 720, 'Resumo calcula a carga prevista do cadete');
select is(pg_temp.it_count('coord', $q$
  select performed_minutes::integer from public.internship_coordination_workload(
    pg_temp.it_id('program')) where student_id=pg_temp.it_id('student1')
$q$), 480, 'Resumo usa a duração real da versão vigente');
select is(pg_temp.it_count('coord', $q$
  select validated_minutes::integer from public.internship_coordination_workload(
    pg_temp.it_id('program')) where student_id=pg_temp.it_id('student1')
$q$), 480, 'Resumo usa somente os minutos homologados vigentes');
select is(pg_temp.it_count('coord', $q$
  select missing_required_minutes::integer from public.internship_coordination_workload(
    pg_temp.it_id('program')) where student_id=pg_temp.it_id('student1')
$q$), 14520, 'Resumo calcula o saldo para o mínimo de 250 horas');
select is(pg_temp.it_count('coord', $q$
  select awaiting_homologation::integer from public.internship_coordination_workload(
    pg_temp.it_id('program')) where student_id=pg_temp.it_id('student1')
$q$), 0, 'Participação homologada não permanece na fila de fichas');

insert into public.internship_resources(id,site_id,code,display_name,resource_type)
values (pg_temp.it_id('resource2'),pg_temp.it_id('site'),'usb2','USB 2','usb');
insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,
  starts_at,ends_at,capacity,status,planned_supervisor_name,created_by,published_by,published_at)
values (pg_temp.it_id('overlap'),pg_temp.it_id('program'),pg_temp.it_id('activity'),
  pg_temp.it_id('site'),pg_temp.it_id('resource2'),'2026-09-10 10:00-03',
  '2026-09-10 18:00-03',1,'publicado','Oficial de teste',pg_temp.it_id('coord'),
  pg_temp.it_id('coord'),now());
select is(pg_temp.it_try('coord', $q$
  insert into public.internship_assignments(shift_id,student_id,created_by)
  values (pg_temp.it_id('overlap'),pg_temp.it_id('student1'),pg_temp.it_id('coord'))
$q$), '23514', 'Sobreposição de turno é bloqueada');

insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,
  starts_at,ends_at,capacity,status,planned_supervisor_name,created_by,published_by,published_at)
values (pg_temp.it_id('nextday'),pg_temp.it_id('program'),pg_temp.it_id('activity'),
  pg_temp.it_id('site'),pg_temp.it_id('resource2'),'2026-09-11 08:00-03',
  '2026-09-11 20:00-03',1,'publicado','Oficial de teste',pg_temp.it_id('coord'),
  pg_temp.it_id('coord'),now());
select is(pg_temp.it_try('coord', $q$
  insert into public.internship_assignments(shift_id,student_id,created_by)
  values (pg_temp.it_id('nextday'),pg_temp.it_id('student1'),pg_temp.it_id('coord'))
$q$), '23514', 'Previsão-base em dias consecutivos é bloqueada');

insert into public.duty_rosters(id,class_id,period_start,period_end,status)
values (pg_temp.it_id('duty-roster'),pg_temp.it_id('class'),'2026-09-12','2026-09-12','publicada');
insert into public.duty_assignments(roster_id,class_id,duty_date,role_id,student_id)
values (pg_temp.it_id('duty-roster'),pg_temp.it_id('class'),'2026-09-12',
  (select id from public.duty_roles where code='aluno_dia'),pg_temp.it_id('student2'));
insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,
  starts_at,ends_at,capacity,status,planned_supervisor_name,created_by,published_by,published_at)
values (pg_temp.it_id('abm-next'),pg_temp.it_id('program'),pg_temp.it_id('activity'),
  pg_temp.it_id('site'),pg_temp.it_id('resource2'),'2026-09-13 08:00-03',
  '2026-09-13 20:00-03',1,'publicado','Oficial de teste',pg_temp.it_id('coord'),
  pg_temp.it_id('coord'),now());
select is(pg_temp.it_try('coord', $q$
  insert into public.internship_assignments(shift_id,student_id,created_by)
  values (pg_temp.it_id('abm-next'),pg_temp.it_id('student2'),pg_temp.it_id('coord'))
$q$), '23514', 'Serviço ABM em D-1 bloqueia estágio');

insert into public.internship_student_blackouts(program_id,student_id,starts_on,
  ends_on,blocked_weekdays,reason,created_by)
values (pg_temp.it_id('program'),pg_temp.it_id('student2'),'2026-09-20',
  '2026-09-22',array[0,1,2,3,4,5,6],'Restrição operacional fictícia',pg_temp.it_id('coord'));
insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,
  starts_at,ends_at,capacity,status,planned_supervisor_name,created_by,published_by,published_at)
values (pg_temp.it_id('blackout'),pg_temp.it_id('program'),pg_temp.it_id('activity'),
  pg_temp.it_id('site'),pg_temp.it_id('resource2'),'2026-09-21 08:00-03',
  '2026-09-21 20:00-03',1,'publicado','Oficial de teste',pg_temp.it_id('coord'),
  pg_temp.it_id('coord'),now());
select is(pg_temp.it_try('coord', $q$
  insert into public.internship_assignments(shift_id,student_id,created_by)
  values (pg_temp.it_id('blackout'),pg_temp.it_id('student2'),pg_temp.it_id('coord'))
$q$), '23514', 'Restrição operacional estruturada bloqueia estágio');

select is(pg_temp.it_try('coord', $q$
  select public.internship_schedule_gbm_shift(pg_temp.it_id('program'),'usb',
    pg_temp.it_id('site'),pg_temp.it_id('resource2'),
    '2026-09-30 08:00-03','2026-09-30 20:00-03',
    pg_temp.it_id('student2'),'Oficial de teste')
$q$), 'ok', 'Coordenação publica plantão GBM com cadete em uma transação');
select is(pg_temp.it_count('aluno2',
  'select count(*) from public.internship_my_shifts()'), 1,
  'Cadete vê novo plantão GBM publicado');
select is(pg_temp.it_try('coord', $q$
  select public.internship_homologate_execution(
    (select a.id from public.internship_assignments a
      join public.internship_shifts sh on sh.id = a.shift_id
      where sh.starts_at = '2026-09-30 08:00-03'),
    'integral','2026-09-30 08:00-03','2026-09-30 20:00-03',720,
    'Oficial de teste','Ficha futura',null,null,null)
$q$), '23514', 'Carga futura não pode ser homologada');
select is(pg_temp.it_try('coord', $q$
  select public.internship_schedule_gbm_shift(pg_temp.it_id('program'),'usb',
    pg_temp.it_id('site'),pg_temp.it_id('resource2'),
    '2026-09-30 20:00-03','2026-10-01 08:00-03',
    pg_temp.it_id('student1'),'Oficial de teste')
$q$), '23514', 'Uma única vaga USB por GBM em dia útil');
select is(pg_temp.it_try('secretaria', $q$
  select public.internship_cancel_assignment(
    (select a.id from public.internship_assignments a
      join public.internship_shifts sh on sh.id = a.shift_id
      where sh.starts_at = '2026-09-30 08:00-03' and a.status = 'prevista'),
    'Cancelamento indevido')
$q$), '42501', 'Secretaria não cancela participação de estágio');
select is(pg_temp.it_try('coord', $q$
  select public.internship_substitute_assignment(
    (select a.id from public.internship_assignments a
      join public.internship_shifts sh on sh.id = a.shift_id
      where sh.starts_at = '2026-09-30 08:00-03' and a.status = 'prevista'),
    pg_temp.it_id('student1'),'Troca operacional de cadete')
$q$), 'ok', 'Coordenação substitui cadete no mesmo turno de forma atômica');
select is((select count(*)::integer from public.internship_assignments a
  join public.internship_shifts sh on sh.id = a.shift_id
  where sh.starts_at = '2026-09-30 08:00-03' and a.status = 'substituida'
    and a.student_id = pg_temp.it_id('student2')), 1,
  'Participação original substituída permanece no histórico');
select is((select count(*)::integer from public.internship_assignments a
  join public.internship_shifts sh on sh.id = a.shift_id
  where sh.starts_at = '2026-09-30 08:00-03' and a.status = 'prevista'
    and a.student_id = pg_temp.it_id('student1')
    and a.assignment_source = 'substituicao'), 1,
  'Novo cadete ocupa a vaga sem reescrever a participação original');
select is(pg_temp.it_try('coord', $q$
  select public.internship_reschedule_gbm_assignment(
    (select a.id from public.internship_assignments a
      join public.internship_shifts sh on sh.id = a.shift_id
      where sh.starts_at = '2026-09-30 08:00-03' and a.status = 'prevista'),
    pg_temp.it_id('resource2'),'2026-10-02 08:00-03','2026-10-02 20:00-03',
    'Oficial de teste','Mudança de data autorizada','remanejamento')
$q$), 'ok', 'Coordenação remaneja participação GBM para novo turno');
select is((select count(*)::integer from public.internship_shifts
  where starts_at = '2026-09-30 08:00-03' and status = 'cancelado'), 1,
  'Turno GBM que ficou sem cadete é cancelado com o remanejamento');
select is((select count(*)::integer from public.internship_assignments a
  join public.internship_shifts sh on sh.id = a.shift_id
  where sh.starts_at = '2026-10-02 08:00-03' and a.status = 'prevista'
    and a.assignment_source = 'remanejamento'
    and a.student_id = pg_temp.it_id('student1')), 1,
  'Novo plantão mantém vínculo de remanejamento e o mesmo cadete');
select is(pg_temp.it_try('coord', $q$
  select public.internship_cancel_assignment(
    (select a.id from public.internship_assignments a
      join public.internship_shifts sh on sh.id = a.shift_id
      where sh.starts_at = '2026-10-02 08:00-03' and a.status = 'prevista'),
    'Plantão desnecessário após revisão')
$q$), 'ok', 'Coordenação cancela participação ainda não executada');
select is((select count(*)::integer from public.internship_shifts
  where starts_at = '2026-10-02 08:00-03' and status = 'cancelado'), 1,
  'Cancelamento da última participação também cancela o turno vazio');
select is(pg_temp.it_try('coord', $q$
  select public.internship_reschedule_gbm_assignment(
    pg_temp.it_id('assignment'),pg_temp.it_id('resource2'),
    '2026-10-04 08:00-03','2026-10-04 20:00-03','Oficial de teste',
    'Reposição de quatro horas não homologadas','reposicao')
$q$), 'ok', 'Coordenação cria reposição ligada à execução parcial');
select is((select count(*)::integer from public.internship_assignments a
  join public.internship_shifts sh on sh.id = a.shift_id
  where sh.starts_at = '2026-10-04 08:00-03' and a.status = 'prevista'
    and a.assignment_source = 'reposicao'
    and a.replaces_assignment_id = pg_temp.it_id('assignment')), 1,
  'Reposição preserva o vínculo com a participação de carga parcial');
select is(pg_temp.it_count('coord', $q$
  select planned_minutes::integer from public.internship_coordination_workload(
    pg_temp.it_id('program')) where student_id=pg_temp.it_id('student1')
$q$), 1440, 'Quadro consolidado inclui o novo plantão de reposição na carga prevista');
select is(pg_temp.it_count('coord', $q$
  select validated_minutes::integer from public.internship_coordination_workload(
    pg_temp.it_id('program')) where student_id=pg_temp.it_id('student1')
$q$), 480, 'Reposição prevista não altera a carga homologada existente');
select is(pg_temp.it_try('secretaria',
  'select * from public.internship_coordination_schedule(pg_temp.it_id(''program''))'),
  '42501', 'Agenda detalhada é restrita à Coordenação');
select is(pg_temp.it_count('coord', $q$
  select count(*) from public.internship_coordination_schedule(pg_temp.it_id('program'))
    where shift_status = 'cancelado' and assignment_status in ('cancelada','substituida')
$q$), 3, 'Agenda conserva cancelamentos e remanejamentos no histórico');
select is(pg_temp.it_count('coord', $q$
  select count(*) from public.internship_coordination_schedule(pg_temp.it_id('program'))
    where assignment_source = 'reposicao' and shift_status = 'publicado'
$q$), 1, 'Agenda identifica o plantão de reposição ativo');
select is(pg_temp.it_count('coord', $q$
  select approved_minutes from public.internship_coordination_schedule(pg_temp.it_id('program'))
    where assignment_id = pg_temp.it_id('assignment')
$q$), 480, 'Agenda utiliza a homologação vigente da participação original');

insert into public.internship_activity_types(id,program_id,code,name,training_axis,
  default_minutes,requires_operation_plan)
values (pg_temp.it_id('activity-special'),pg_temp.it_id('program'),'operacao_especial',
  'Operação especial','integrado',480,true);
insert into public.internship_operation_plans(id,program_id,code,title,status)
values (pg_temp.it_id('plan'),pg_temp.it_id('program'),'RESERVA','Operação de reserva','reserva');
insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,
  operation_plan_id,starts_at,ends_at,capacity,status,planned_supervisor_name,created_by)
values (pg_temp.it_id('reserve-shift'),pg_temp.it_id('program'),pg_temp.it_id('activity-special'),
  pg_temp.it_id('site'),pg_temp.it_id('resource2'),pg_temp.it_id('plan'),
  '2026-09-25 08:00-03','2026-09-25 16:00-03',1,'rascunho','Oficial de teste',
  pg_temp.it_id('coord'));
select is(pg_temp.it_try('coord', $q$
  update public.internship_shifts set status='publicado',published_by=pg_temp.it_id('coord'),
    published_at=now() where id=pg_temp.it_id('reserve-shift')
$q$), '23514', 'Plano em reserva não publica carga prevista');
select is(pg_temp.it_try('coord', $q$
  delete from public.internship_shifts where id=pg_temp.it_id('shift')
$q$), '23514', 'Turno publicado não pode ser apagado');
select is(pg_temp.it_try('coord', $q$
  update public.internship_sites set name='Outro GBM' where id=pg_temp.it_id('site')
$q$), '23514', 'Local usado em turno publicado preserva o nome histórico');

select is(pg_temp.it_try('secretaria',
  'select public.internship_initialize_cfo_2026()'), '42501',
  'Secretaria não configura o programa oficial');
select is(pg_temp.it_try('coord',
  'select public.internship_initialize_cfo_2026()'), 'ok',
  'Coordenação configura o programa oficial sem publicar carga');
select is((select count(*)::integer from public.internship_sites s
  join public.internship_programs p on p.id = s.program_id
  where p.name = 'Estágio Supervisionado CFO 2026.1'), 8,
  'Configuração inicial cria três GBMs e cinco praias confirmadas');
select is((select count(*)::integer from public.internship_resources r
  join public.internship_sites s on s.id = r.site_id
  join public.internship_programs p on p.id = s.program_id
  where p.name = 'Estágio Supervisionado CFO 2026.1'), 11,
  'Configuração inicial cria vagas adicionais de USB, AR e guarda-vida');
select is((select count(*)::integer from public.internship_shift_templates t
  join public.internship_programs p on p.id = t.program_id
  where p.name = 'Estágio Supervisionado CFO 2026.1'), 8,
  'Configuração inicial registra os oito padrões operacionais');
select is((with expected(code,weekdays,minutes,departure,arrival,obm_exit,abm_return,day_offset) as (
    values
      ('DU-USB-12',array[1,2,3,4,5],720,time '18:00',time '18:30',time '05:30',time '06:00',1),
      ('DU-AR-12',array[1,2,3,4,5],720,time '18:00',time '18:30',time '05:30',time '06:00',1),
      ('SAB-USB-D12',array[6],720,null::time,time '07:45',time '19:45',null::time,0),
      ('SAB-USB-N12',array[6],720,null::time,time '19:45',time '07:45',null::time,1),
      ('DOM-USB-D12',array[7],720,null::time,time '07:45',time '19:45',null::time,0),
      ('DOM-USB-N12',array[7],720,null::time,time '19:45',time '07:45',null::time,1),
      ('SAB-AR-24',array[6],1440,null::time,time '07:45',time '07:45',null::time,1),
      ('DOM-AR-24',array[7],1440,null::time,time '07:45',time '07:45',null::time,1)
  ) select count(*)::integer from expected e
  left join public.internship_shift_templates t on t.code=e.code
    and t.start_weekdays=e.weekdays and t.journey_minutes=e.minutes
    and t.abm_departure_time is not distinct from e.departure and t.obm_arrival_time=e.arrival
    and t.obm_departure_time=e.obm_exit and t.abm_return_time is not distinct from e.abm_return
    and t.end_day_offset=e.day_offset
    and t.program_id=(select id from public.internship_programs
      where name='Estágio Supervisionado CFO 2026.1')
  where t.id is null), 0, 'Os oito padrões preservam integralmente a tabela operacional');
select is((select row(t.start_weekdays,t.journey_minutes,t.abm_departure_time,
    t.obm_arrival_time,t.obm_departure_time,t.abm_return_time,t.end_day_offset)::text
  from public.internship_shift_templates t
  join public.internship_programs p on p.id = t.program_id
  where p.name = 'Estágio Supervisionado CFO 2026.1' and t.code = 'DU-USB-12'),
  row(array[1,2,3,4,5],720,time '18:00',time '18:30',time '05:30',time '06:00',1)::text,
  'Padrão DU-USB-12 preserva dias, jornada e marcos ABM/OBM');
select is((select count(*)::integer from public.internship_resources r
  join public.internship_sites s on s.id = r.site_id
  join public.internship_programs p on p.id = s.program_id
  where p.name = 'Estágio Supervisionado CFO 2026.1' and r.resource_type = 'ar'
    and r.display_name = 'Vaga adicional AR'), 3,
  'Os três GBMs usam a nomenclatura operacional AR');
select is((select array_agg(s.name order by s.code) from public.internship_sites s
  join public.internship_programs p on p.id = s.program_id
  where p.name = 'Estágio Supervisionado CFO 2026.1' and s.site_type = 'praia'),
  array['Fazendinha','Santa Inês','Araxá','Cidade Nova','Curiaú']::text[],
  'Os cinco locais oficiais são preservados na ordem dos postos');
select is((select count(*)::integer from public.internship_resources r
  join public.internship_sites s on s.id = r.site_id
  join public.internship_programs p on p.id = s.program_id
  where p.name = 'Estágio Supervisionado CFO 2026.1' and s.site_type = 'praia'
    and r.regular_team_size = 3 and r.capacity_per_shift = 1), 5,
  'Cada local tem três militares regulares e uma vaga adicional de cadete');
select is((select count(*)::integer from public.internship_student_blackouts b
  join public.students s on s.id = b.student_id
  where s.war_name = 'SILVA NUNES' and b.blocked_weekdays = array[5,6]), 1,
  'Restrição de sexta e sábado é estruturada para Silva Nunes');
select is(pg_temp.it_try('coord',
  'select public.internship_initialize_cfo_2026()'), 'ok',
  'Configuração inicial é idempotente');
select is((select count(*)::integer from public.internship_programs
  where name = 'Estágio Supervisionado CFO 2026.1'), 1,
  'Segunda inicialização não duplica o programa');
select is((select count(*)::integer from public.internship_shifts sh
  join public.internship_programs p on p.id = sh.program_id
  where p.name = 'Estágio Supervisionado CFO 2026.1'), 0,
  'Inicialização não inventa plantões nem carga prevista');
select is(pg_temp.it_try('secretaria', $q$
  select public.internship_configure_cfo_2026_beaches(
    array['Fazendinha','Santa Inês','Araxá','Cidade Nova','Curiaú'])
$q$), '42501', 'Secretaria não cadastra locais de praia');
select is(pg_temp.it_try('coord', $q$
  select public.internship_configure_cfo_2026_beaches(
    array['Fazendinha','Santa Inês','Araxá','Cidade Nova','Curiaú'])
$q$), 'ok', 'Coordenação registra os cinco locais');
select is((select count(*)::integer from public.internship_sites s
  join public.internship_programs p on p.id = s.program_id
  where p.name = 'Estágio Supervisionado CFO 2026.1' and s.site_type = 'praia'),
  5, 'A configuração idempotente mantém cinco locais de praia');
select is(pg_temp.it_try('coord',
  'select public.internship_publish_cfo_2026()'), 'ok',
  'Coordenação publica programa após completar locais');
select is((select status from public.internship_programs
  where name = 'Estágio Supervisionado CFO 2026.1'), 'publicado',
  'Programa passa a publicado sem criar turnos');

select is(pg_temp.it_try('coord', $q$
  select public.internship_schedule_gbm_from_template(
    (select id from public.internship_programs where name = 'Estágio Supervisionado CFO 2026.1'),
    'DU-USB-12',
    (select id from public.internship_sites where name = '1º GBM'
      and program_id = (select id from public.internship_programs
        where name = 'Estágio Supervisionado CFO 2026.1')),
    date '2026-09-28',
    (select s.id from public.students s
      join public.internship_programs p on p.class_id = s.class_id
      where p.name = 'Estágio Supervisionado CFO 2026.1'
        and s.war_name <> 'SILVA NUNES' and s.deleted_at is null
      order by s.student_number offset 10 limit 1), 'Oficial de teste')
$q$), 'ok', 'Coordenação publica plantão pelo padrão operacional');
select is((select count(*)::integer from public.internship_shifts sh
  join public.internship_shift_templates t on t.id = sh.template_id
  join public.internship_programs p on p.id = sh.program_id
  where p.name = 'Estágio Supervisionado CFO 2026.1' and t.code = 'DU-USB-12'
    and sh.planned_minutes = 720
    and (sh.starts_at at time zone p.timezone) = timestamp '2026-09-28 18:00'
    and (sh.ends_at at time zone p.timezone) = timestamp '2026-09-29 06:00'), 1,
  'Padrão calcula a carga da saída até o retorno à ABM');
select is(pg_temp.it_try('coord', $q$
  select public.internship_schedule_gbm_from_template(
    (select id from public.internship_programs where name = 'Estágio Supervisionado CFO 2026.1'),
    'SAB-AR-24',
    (select id from public.internship_sites where name = '2º GBM'
      and program_id = (select id from public.internship_programs
        where name = 'Estágio Supervisionado CFO 2026.1')),
    date '2026-10-03',
    (select s.id from public.students s
      join public.internship_programs p on p.class_id = s.class_id
      where p.name = 'Estágio Supervisionado CFO 2026.1'
        and s.war_name <> 'SILVA NUNES' and s.deleted_at is null
      order by s.student_number offset 12 limit 1), 'Oficial de teste')
$q$), 'ok', 'Padrão AR de sábado publica jornada de 24 horas');
select is((select count(*)::integer from public.internship_shifts sh
  join public.internship_shift_templates t on t.id = sh.template_id
  join public.internship_programs p on p.id = sh.program_id
  where p.name = 'Estágio Supervisionado CFO 2026.1' and t.code = 'SAB-AR-24'
    and sh.planned_minutes = 1440
    and (sh.starts_at at time zone p.timezone) = timestamp '2026-10-03 07:45'
    and (sh.ends_at at time zone p.timezone) = timestamp '2026-10-04 07:45'), 1,
  'AR de 24 horas conta apresentação na OBM sem deslocamento');
select is(pg_temp.it_try('coord', $q$
  select public.internship_schedule_gbm_from_template(
    (select id from public.internship_programs where name = 'Estágio Supervisionado CFO 2026.1'),
    'DU-AR-12',
    (select id from public.internship_sites where name = '2º GBM'
      and program_id = (select id from public.internship_programs
        where name = 'Estágio Supervisionado CFO 2026.1')),
    date '2026-10-04',
    (select s.id from public.students s
      join public.internship_programs p on p.class_id = s.class_id
      where p.name = 'Estágio Supervisionado CFO 2026.1'
        and s.war_name <> 'SILVA NUNES' and s.deleted_at is null
      order by s.student_number offset 11 limit 1), 'Oficial de teste')
$q$), '23514', 'Padrão de dia útil rejeita início no domingo');

select is(pg_temp.it_try('secretaria', $q$
  select public.internship_schedule_lifeguard_day(
    (select id from public.internship_programs where name = 'Estágio Supervisionado CFO 2026.1'),
    date '2026-09-27', array(select s.id from public.students s
      join public.internship_programs p on p.class_id = s.class_id
      where p.name = 'Estágio Supervisionado CFO 2026.1'
        and s.war_name <> 'SILVA NUNES' and s.deleted_at is null
      order by s.student_number limit 5), 'OS 123/2026', 'Oficial de teste')
$q$), '42501', 'Somente a Coordenação publica a escala de guarda-vida');
select is(pg_temp.it_try('coord', $q$
  select public.internship_schedule_lifeguard_day(
    (select id from public.internship_programs where name = 'Estágio Supervisionado CFO 2026.1'),
    date '2026-09-28', array(select s.id from public.students s
      join public.internship_programs p on p.class_id = s.class_id
      where p.name = 'Estágio Supervisionado CFO 2026.1'
        and s.war_name <> 'SILVA NUNES' and s.deleted_at is null
      order by s.student_number limit 5), 'OS 123/2026', 'Oficial de teste')
$q$), '23514', 'Dia útil não aceita escala de guarda-vida');
select is(pg_temp.it_try('coord', $q$
  select public.internship_schedule_lifeguard_day(
    (select id from public.internship_programs where name = 'Estágio Supervisionado CFO 2026.1'),
    date '2026-09-27', array(select s.id from public.students s
      join public.internship_programs p on p.class_id = s.class_id
      where p.name = 'Estágio Supervisionado CFO 2026.1'
        and s.war_name <> 'SILVA NUNES' and s.deleted_at is null
      order by s.student_number limit 5), '', 'Oficial de teste')
$q$), '23514', 'Guarda-vida exige referência documental');
select is(pg_temp.it_try('coord', $q$
  select public.internship_schedule_lifeguard_day(
    (select id from public.internship_programs where name = 'Estágio Supervisionado CFO 2026.1'),
    date '2026-09-27', array(select s.id from public.students s
      join public.internship_programs p on p.class_id = s.class_id
      where p.name = 'Estágio Supervisionado CFO 2026.1'
        and s.war_name <> 'SILVA NUNES' and s.deleted_at is null
      order by s.student_number limit 5), 'OS 123/2026', 'Oficial de teste')
$q$), 'ok', 'Cinco postos são publicados juntos com plano autorizado');
select is((select count(*)::integer from public.internship_shifts sh
  join public.internship_operation_plans plan on plan.id = sh.operation_plan_id
  where plan.code = 'guarda_vida_20260927' and sh.status = 'publicado'
    and sh.planned_minutes = 480
    and (sh.starts_at at time zone 'America/Belem')::time = time '10:00'
    and (sh.ends_at at time zone 'America/Belem')::time = time '18:00'
    and sh.additional_member_required), 5,
  'Cada posto tem um turno adicional de oito horas, das 10h às 18h');
select is((select count(*)::integer from public.internship_assignments a
  join public.internship_shifts sh on sh.id = a.shift_id
  join public.internship_operation_plans plan on plan.id = sh.operation_plan_id
  where plan.code = 'guarda_vida_20260927' and a.status = 'prevista'), 5,
  'Cada um dos cinco postos tem exatamente um cadete adicional');
select is((select count(*)::integer from public.internship_operation_plans
  where code = 'guarda_vida_20260927' and status = 'autorizado'
    and document_reference = 'OS 123/2026' and officer_name = 'Oficial de teste'), 1,
  'Documento e oficial ficam ligados aos cinco turnos');

select * from finish();
rollback;
