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

create function pg_temp.it_preview(actor text) returns jsonb language plpgsql as $$
declare result jsonb;
begin
 perform set_config('request.jwt.claims',json_build_object('sub',pg_temp.it_id(actor))::text,true);
 set local role authenticated;
 select public.internship_schedule_restart_preview(pg_temp.it_id('program')) into result;
 reset role;
 perform set_config('request.jwt.claims','{}',true);
 return result;
end$$;

select is(pg_temp.it_try('aluno1',format('select public.internship_schedule_restart_preview(%L)',pg_temp.it_id('program'))),'42501','Cadete não pode consultar reinício');
select is(pg_temp.it_try('secretaria',format('select public.internship_schedule_restart_preview(%L)',pg_temp.it_id('program'))),'42501','Secretaria não pode consultar reinício');
select is(pg_temp.it_try('coord',format('select public.internship_schedule_restart(%L,%L,%L)',pg_temp.it_id('program'),pg_temp.it_preview('coord')->>'snapshot','Replanejamento definitivo')),'23514','Plantão já iniciado impede reinício em lote');
select is(pg_temp.it_try('coord',format('select public.internship_cancel_assignment(%L,%L)',pg_temp.it_id('assignment'),'Preparar cenário de teste')),'ok','Cancela plantão passado pela via normal');

insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,
 starts_at,ends_at,capacity,status,planned_supervisor_name,created_by,published_by,published_at)
values
 (pg_temp.it_id('future-shift-1'),pg_temp.it_id('program'),pg_temp.it_id('activity'),pg_temp.it_id('site'),pg_temp.it_id('resource'),'2026-09-30 08:00-03','2026-09-30 20:00-03',1,'publicado','Oficial de teste',pg_temp.it_id('coord'),pg_temp.it_id('coord'),now()),
 (pg_temp.it_id('future-shift-2'),pg_temp.it_id('program'),pg_temp.it_id('activity'),pg_temp.it_id('site'),pg_temp.it_id('resource'),'2026-10-02 08:00-03','2026-10-02 20:00-03',1,'publicado','Oficial de teste',pg_temp.it_id('coord'),pg_temp.it_id('coord'),now());
insert into public.internship_assignments(id,shift_id,student_id,created_by)
values
 (pg_temp.it_id('future-assignment-1'),pg_temp.it_id('future-shift-1'),pg_temp.it_id('student1'),pg_temp.it_id('coord')),
 (pg_temp.it_id('future-assignment-2'),pg_temp.it_id('future-shift-2'),pg_temp.it_id('student2'),pg_temp.it_id('coord'));
select is(pg_temp.it_try('coord',format('select public.internship_create_evaluation_invite(%L,%L,%L)',pg_temp.it_id('future-assignment-1'),'Capitão Teste','Contato Teste')),'ok','Convite pendente criado');
select is((pg_temp.it_preview('coord')->>'published_shifts')::integer,2,'Prévia conta dois plantões ativos');
select is((pg_temp.it_preview('coord')->>'active_assignments')::integer,2,'Prévia conta duas participações');
select is((pg_temp.it_preview('coord')->>'open_invites')::integer,1,'Prévia conta convite pendente');
select is(pg_temp.it_try('coord',format('select public.internship_schedule_restart(%L,%L,%L)',pg_temp.it_id('program'),'snapshot-antigo','Replanejamento definitivo')),'40001','Snapshot desatualizado impede reinício');
select is(pg_temp.it_try('aluno1',format('select public.internship_schedule_restart(%L,%L,%L)',pg_temp.it_id('program'),pg_temp.it_preview('coord')->>'snapshot','Replanejamento definitivo')),'42501','Cadete não pode recomeçar');
select is(pg_temp.it_try('coord',format('select public.internship_schedule_restart(%L,%L,%L)',pg_temp.it_id('program'),pg_temp.it_preview('coord')->>'snapshot','Replanejamento definitivo')),'ok','Coordenação reinicia escala futura atomicamente');
select is((select count(*)::integer from public.internship_shifts where program_id=pg_temp.it_id('program') and status='publicado'),0,'Nenhum plantão publicado permanece');
select is((select count(*)::integer from public.internship_assignments a join public.internship_shifts s on s.id=a.shift_id where s.program_id=pg_temp.it_id('program') and a.status='prevista'),0,'Nenhuma participação ativa permanece');
select is((select count(*)::integer from public.internship_evaluations where assignment_id=pg_temp.it_id('future-assignment-1') and status='revogada'),1,'Convite foi revogado');
select is((select count(*)::integer from public.internship_schedule_restarts where program_id=pg_temp.it_id('program') and actor_id=pg_temp.it_id('coord') and cancelled_shifts=2 and cancelled_assignments=2 and revoked_invites=1),1,'Lote auditável registra autor e totais');
select is((select count(*)::integer from public.internship_activity_types where program_id=pg_temp.it_id('program')),1,'Catálogo permanece para refazer escala');
select is((select count(*)::integer from public.internship_sites where program_id=pg_temp.it_id('program')),1,'Local permanece para refazer escala');
select * from finish();
rollback;
