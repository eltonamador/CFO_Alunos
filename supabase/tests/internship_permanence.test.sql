-- Testes transacionais: nenhum dado fictício permanece no banco.
begin;
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


create function pg_temp.publish(day text,students uuid[], rid uuid default null) returns text language sql as $$
 select format('select public.permanence_publish(%L,%L,%L,%L,%L,%L::uuid[],%L,%L)',pg_temp.it_id('program'),day||' 08:00-03',day||' 20:00-03','ABM','3A',students,rid,'Teste de alteração');
$$;
select is(pg_temp.it_try('aluno1',pg_temp.publish('2026-10-10',array[pg_temp.it_id('student1'),pg_temp.it_id('student2')])),'42501','Aluno não publica permanência');
select is(pg_temp.it_try('inativo',pg_temp.publish('2026-10-10',array[pg_temp.it_id('student1'),pg_temp.it_id('student2')])),'42501','Coordenação inativa não publica');
select isnt(pg_temp.it_try('coord',pg_temp.publish('2026-10-10',array[pg_temp.it_id('student1')])),'ok','Não aceita efetivo de um cadete');
select isnt(pg_temp.it_try('coord',pg_temp.publish('2026-10-10',array[pg_temp.it_id('student1'),pg_temp.it_id('student1')])),'ok','Não aceita cadete repetido');
select isnt(pg_temp.it_try('coord',pg_temp.publish('2026-09-11',array[pg_temp.it_id('student1'),pg_temp.it_id('student2')])),'ok','Estágio anterior bloqueia permanência no D+1');
select is((select count(*)::int from public.duty_rosters where class_id=pg_temp.it_id('class')),0,'Falha não deixa escala parcial');
insert into public.internship_administrators(student_id,reason)
values(pg_temp.it_id('student2'),'Delegação de teste para gestão da permanência');
select is(pg_temp.it_count('aluno2','select case when public.is_coord() then 1 else 0 end'),0,'Administrador do módulo continua com perfil global de aluno');
select is(pg_temp.it_try('aluno2',pg_temp.publish('2026-10-20',array[pg_temp.it_id('student1'),pg_temp.it_id('student2')])),'ok','Administrador delegado publica permanência');
select is(pg_temp.it_try('aluno2',pg_temp.publish('2026-10-21',array[pg_temp.it_id('student2'),pg_temp.it_id('student1')],(select id from public.duty_rosters where class_id=pg_temp.it_id('class') and period_start='2026-10-20' and status='publicada'))),'ok','Administrador delegado altera permanência com motivo');
select is(pg_temp.it_try('aluno2',format('select public.permanence_cancel(%L,%L)',(select id from public.duty_rosters where class_id=pg_temp.it_id('class') and period_start='2026-10-21' and status='publicada'),'Cancelamento autorizado de teste')),'ok','Administrador delegado cancela permanência');
update public.internship_administrators set active=false where student_id=pg_temp.it_id('student2');
select is(pg_temp.it_try('aluno2',pg_temp.publish('2026-10-22',array[pg_temp.it_id('student1'),pg_temp.it_id('student2')])),'42501','Revogação da delegação retira a gestão da permanência');
select is(pg_temp.it_try('coord',pg_temp.publish('2026-10-10',array[pg_temp.it_id('student1'),pg_temp.it_id('student2')])),'ok','Publica composição de dois');
select is((select count(*)::int from public.duty_assignments where class_id=pg_temp.it_id('class') and status='confirmada'),2,'Duas funções confirmadas');
create function pg_temp.roster() returns uuid language sql as $$select id from public.duty_rosters where class_id=pg_temp.it_id('class') and status='publicada' limit 1$$;
select is(pg_temp.it_count('coord','select validated_minutes::int from public.internship_coordination_workload(pg_temp.it_id(''program'')) where student_id=pg_temp.it_id(''student1'')'),0,'Permanência não aumenta carga curricular');
select is(pg_temp.it_try('coord',pg_temp.publish('2026-10-10',array[pg_temp.it_id('student1'),pg_temp.it_id('student2')])),'23505','Publicação duplicada recusada');
select isnt(pg_temp.it_try('coord',pg_temp.publish('2026-09-11',array[pg_temp.it_id('student1'),pg_temp.it_id('student2')],pg_temp.roster())),'ok','Remanejamento conflitante recusado');
select is((select count(*)::int from public.duty_assignments where roster_id=pg_temp.roster() and status='confirmada'),2,'Falha em alteração preserva equipe anterior');
select is((select (starts_at at time zone 'America/Belem')::date from public.duty_permanence_services where roster_id=pg_temp.roster()),'2026-10-10'::date,'Falha mantém horário anterior');
select isnt(pg_temp.it_try('coord',$q$select public.duty_replace_assignment((select id from public.duty_assignments where roster_id=pg_temp.roster() and student_id=pg_temp.it_id('student1')),pg_temp.it_id('student2'),'Substituição teste')$q$),'ok','Substituição por cadete já escalado recusada');
select is((select count(*)::int from public.duty_assignments where roster_id=pg_temp.roster() and status='confirmada'),2,'Substituição falha sem retirar cadete original');
select is(pg_temp.it_try('coord',pg_temp.publish('2026-10-12',array[pg_temp.it_id('student2'),pg_temp.it_id('student1')],pg_temp.roster())),'ok','Remanejamento válido preserva histórico');
select is((select count(*)::int from public.duty_assignments where roster_id=pg_temp.roster() and status='substituida'),2,'Histórico de posições anteriores preservado');
-- A later internship assignment must also honor the complete overnight permanence interval.
select is(pg_temp.it_try('coord',$q$insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,starts_at,ends_at,capacity,status,planned_supervisor_name,created_by,published_by,published_at) select pg_temp.it_id('conflict-shift'),program_id,activity_type_id,site_id,resource_id,'2026-10-13 08:00-03','2026-10-13 20:00-03',1,'publicado','Oficial',created_by,published_by,now() from public.internship_shifts where id=pg_temp.it_id('shift')$q$),'ok','Cria plantão para testar conflito recíproco');
select isnt(pg_temp.it_try('coord',$q$insert into public.internship_assignments(shift_id,student_id,created_by) values(pg_temp.it_id('conflict-shift'),pg_temp.it_id('student1'),pg_temp.it_id('coord'))$q$),'ok','Permanência anterior bloqueia estágio no D+1');
select is(pg_temp.it_try('coord',$q$select public.permanence_cancel(pg_temp.roster(),'Cancelamento de teste')$q$),'ok','Cancelamento motivado');
select is((select count(*)::int from public.duty_assignments where class_id=pg_temp.it_id('class') and status='confirmada'),0,'Cancelamento libera ocupação');
select is(pg_temp.it_try('coord',$q$insert into public.internship_assignments(shift_id,student_id,created_by) values(pg_temp.it_id('conflict-shift'),pg_temp.it_id('student1'),pg_temp.it_id('coord'))$q$),'ok','Após cancelamento estágio pode ocupar o cadete');
select ok((select count(*)>0 from public.duty_assignment_logs where roster_id in(select id from public.duty_rosters where class_id=pg_temp.it_id('class'))),'Operações têm trilha de auditoria');
select ok(not has_function_privilege('anon','public.permanence_publish(uuid,timestamptz,timestamptz,text,text,uuid[],uuid,text)','execute'),'Anônimo não publica');
select ok(not has_table_privilege('authenticated','public.duty_permanence_services','update'),'Horários não admitem edição direta');
insert into public.students(id,class_id,student_number,war_name,full_name,pelotao) values(pg_temp.it_id('student3'),pg_temp.it_id('class'),3,'CADETE C','Cadete C','CFO I'),(pg_temp.it_id('student4'),pg_temp.it_id('class'),4,'CADETE D','Cadete D','CFO I');
select is(pg_temp.it_try('coord',$q$select public.permanence_publish(pg_temp.it_id('program'),'2026-11-01 08:00-03','2026-11-02 08:00-03','ABM','3A',array[pg_temp.it_id('student1'),pg_temp.it_id('student2'),pg_temp.it_id('student3'),pg_temp.it_id('student4')])$q$),'ok','Publica quatro cadetes em serviço de 24h');
select is((select count(*)::int from public.duty_assignments where roster_id=pg_temp.roster() and status='confirmada'),4,'Aluno de Dia e três apoios');
select is(pg_temp.it_try('coord',$q$insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,starts_at,ends_at,capacity,status,planned_supervisor_name,created_by,published_by,published_at) select pg_temp.it_id('overnight-shift'),program_id,activity_type_id,site_id,resource_id,'2026-11-03 08:00-03','2026-11-03 20:00-03',1,'publicado','Oficial',created_by,published_by,now() from public.internship_shifts where id=pg_temp.it_id('shift')$q$),'ok','Prepara conflito no dia posterior ao término da permanência');
select is(pg_temp.it_try('coord',$q$insert into public.internship_assignments(shift_id,student_id,created_by) values(pg_temp.it_id('overnight-shift'),pg_temp.it_id('student1'),pg_temp.it_id('coord'))$q$),'23514','Proteção considera término no dia seguinte, não apenas data de entrada');
select is(pg_temp.it_count('coord',$q$select count(*)::int from jsonb_array_elements(public.permanence_planning_context(pg_temp.it_id('program')))$q$),4,'Contexto do rodízio possui todas as funções ativas');
select * from finish();
rollback;
