-- Testes transacionais: nenhum dado fictício permanece no banco.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims', '{}', true);

create function pg_temp.it_id(label text) returns uuid language sql immutable
as $$ select md5('permanence-batch-test-' || label)::uuid $$;

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
select pg_temp.it_id(label), label || '@permanence-batch-test.invalid'
from unnest(array['coord','secretaria','instrutor','inativo','aluno1','aluno2']) label;
insert into public.profiles(id,role,full_name,active) values
  (pg_temp.it_id('coord'),'coordenacao','Coordenação de teste',true),
  (pg_temp.it_id('secretaria'),'secretaria','Secretaria de teste',true),
  (pg_temp.it_id('instrutor'),'instrutor','Instrutor de teste',true),
  (pg_temp.it_id('inativo'),'coordenacao','Coordenação inativa',false),
  (pg_temp.it_id('aluno1'),'aluno','Cadete de teste 1',true),
  (pg_temp.it_id('aluno2'),'aluno','Cadete de teste 2',true);
insert into public.courses(id,code,name,year)
values (pg_temp.it_id('course'),'PERMANENCE-BATCH-TEST','Curso de teste',2099);
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
    '2099-09-01','2099-12-31',15000,15120,'publicado',pg_temp.it_id('coord'),
    pg_temp.it_id('coord'),now())
$q$), 'ok', 'Coordenação cria programa');
select is(pg_temp.it_try('secretaria', $q$
  insert into public.internship_programs(class_id,course_phase,name,starts_on,ends_on,
    required_minutes,target_minutes)
  values (pg_temp.it_id('class'),'CFO II','Estágio negado','2099-09-01','2099-12-31',15000,15120)
$q$), '42501', 'Secretaria não cria programa');

select is(pg_temp.it_try('coord',$q$ select public.permanence_publish(pg_temp.it_id('program'),'2099-10-10 06:00-03','2099-10-10 18:00-03','ABM','3A',array[pg_temp.it_id('student1'),pg_temp.it_id('student2')]) $q$),'ok','Publica primeiro turno de teste');
select is(pg_temp.it_try('coord',$q$ select public.permanence_publish(pg_temp.it_id('program'),'2099-10-12 06:00-03','2099-10-12 18:00-03','ABM','3A',array[pg_temp.it_id('student1'),pg_temp.it_id('student2')]) $q$),'ok','Publica segundo turno de teste');
create function pg_temp.rosters() returns uuid[] language sql as $$ select array_agg(id order by id) from public.duty_rosters where class_id=pg_temp.it_id('class') $$;
create function pg_temp.assignments() returns uuid[] language sql as $$ select array_agg(id order by id) from public.duty_assignments where roster_id=any(pg_temp.rosters()) and status in ('prevista','confirmada') $$;
select is(pg_temp.it_try('aluno1',$q$select public.permanence_cancel_batch(pg_temp.it_id('program'),pg_temp.rosters(),pg_temp.assignments(),'Teste de cancelamento')$q$),'42501','Aluno comum não cancela lote');
select isnt(pg_temp.it_try('coord',$q$select public.permanence_cancel_batch(pg_temp.it_id('program'),pg_temp.rosters(),array[pg_temp.it_id('missing')],'Teste de cancelamento')$q$),'ok','Prévia desatualizada recusada');
select is((select count(*)::int from public.duty_assignments where roster_id=any(pg_temp.rosters()) and status='confirmada'),4,'Falha preserva todas as participações');
select isnt(pg_temp.it_try('coord',$q$select public.permanence_cancel_batch(pg_temp.it_id('program'),pg_temp.rosters()||pg_temp.it_id('missing'),pg_temp.assignments(),'Teste de cancelamento')$q$),'ok','Turno inexistente invalida lote inteiro');
select is((select count(*)::int from public.duty_rosters where id=any(pg_temp.rosters()) and status='publicada'),2,'Nenhum cancelamento parcial');
-- Simula turno já iniciado somente em fixture da transação.
update public.duty_permanence_services set starts_at='2020-01-01 06:00-03', ends_at='2020-01-01 18:00-03' where roster_id=(pg_temp.rosters())[1];
select isnt(pg_temp.it_try('coord',$q$select public.permanence_cancel_batch(pg_temp.it_id('program'),pg_temp.rosters(),pg_temp.assignments(),'Teste de cancelamento')$q$),'ok','Não cancela serviço iniciado junto com futuro');
select is((select count(*)::int from public.duty_rosters where id=any(pg_temp.rosters()) and status='publicada'),2,'Falha por turno iniciado mantém todo lote');
update public.duty_permanence_services s set starts_at=(r.period_start::timestamp at time zone 'America/Belem')+interval '6 hours',ends_at=(r.period_start::timestamp at time zone 'America/Belem')+interval '18 hours' from public.duty_rosters r where r.id=s.roster_id and r.id=any(pg_temp.rosters());
insert into public.internship_administrators(student_id,reason) values(pg_temp.it_id('student2'),'Delegação de teste');
select is(pg_temp.it_try('aluno2',format('select public.permanence_cancel_batch(%L,%L::uuid[],%L::uuid[],%L)',pg_temp.it_id('program'),pg_temp.rosters(),pg_temp.assignments(),'Priorizar serviços operacionais')),'ok','Administrador delegado cancela o lote');
select is((select count(*)::int from public.duty_rosters where id=any(pg_temp.rosters()) and status='arquivada'),2,'Ambos os turnos arquivados');
select is((select count(*)::int from public.duty_assignments where roster_id=any(pg_temp.rosters()) and status='cancelada'),4,'Participações canceladas preservadas');
select is((select count(*)::int from public.duty_assignment_logs where roster_id=any(pg_temp.rosters()) and action='cancelled'),2,'Auditoria individual de cada turno');
select is(pg_temp.it_count('coord',$q$select jsonb_array_length(public.permanence_planning_context(pg_temp.it_id('program')))$q$),0,'Cadetes deixam de estar ocupados pela permanência no rodízio');
select ok(not has_function_privilege('anon','public.permanence_cancel_batch(uuid,uuid[],uuid[],text)','execute'),'Anônimo sem execução');
select * from finish();
rollback;
