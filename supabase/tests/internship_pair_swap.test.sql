begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims', '{}', true);

create function pg_temp.pair_id(label text) returns uuid language sql immutable
as $$ select md5('pair-swap-' || label)::uuid $$;
create function pg_temp.as_user(actor text, statement text) returns text
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.pair_id(actor))::text, true);
  set local role authenticated;
  execute statement;
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  return 'ok';
exception when others then
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  return sqlstate;
end $$;

insert into auth.users(id,email) values
  (pg_temp.pair_id('coord'),'pair-coord@test.invalid'),
  (pg_temp.pair_id('ian'),'pair-ian@test.invalid');
insert into public.profiles(id,role,full_name,active) values
  (pg_temp.pair_id('coord'),'coordenacao','Coordenação teste',true),
  (pg_temp.pair_id('ian'),'aluno','Ian teste',true);
insert into public.courses(id,code,name,year)
values(pg_temp.pair_id('course'),'PAIR-TEST','Teste permuta',2026);
insert into public.classes(id,course_id,name)
values(pg_temp.pair_id('class'),pg_temp.pair_id('course'),'Teste permuta');
insert into public.students(id,class_id,student_number,war_name,full_name,pelotao)
values
  (pg_temp.pair_id('student1'),pg_temp.pair_id('class'),1,'CAROLINA','Carolina teste','CFO I'),
  (pg_temp.pair_id('student2'),pg_temp.pair_id('class'),2,'JULIANA','Juliana teste','CFO I');
update public.profiles set student_id=pg_temp.pair_id('student2') where id=pg_temp.pair_id('ian');
insert into public.internship_administrators(student_id,reason,created_by)
values(pg_temp.pair_id('student2'),'Delegação para teste de permuta',pg_temp.pair_id('coord'));
insert into public.internship_programs(
  id,class_id,course_phase,name,starts_on,ends_on,required_minutes,target_minutes,
  status,published_by,published_at
) values(
  pg_temp.pair_id('program'),pg_temp.pair_id('class'),'CFO I','Teste permuta',
  (now()-interval '1 month')::date,(now()+interval '2 months')::date,
  15000,15120,'publicado',pg_temp.pair_id('coord'),now()
);
insert into public.internship_activity_types(id,program_id,code,name,training_axis,default_minutes,requires_operation_plan)
values
  (pg_temp.pair_id('ar'),pg_temp.pair_id('program'),'ar','AR','salvamento',1440,false),
  (pg_temp.pair_id('usb'),pg_temp.pair_id('program'),'usb','USB','aph',720,false);
insert into public.internship_sites(id,program_id,site_type,code,name,gbm_number)
values
  (pg_temp.pair_id('site2'),pg_temp.pair_id('program'),'gbm','gbm2','2º GBM',2),
  (pg_temp.pair_id('site5'),pg_temp.pair_id('program'),'gbm','gbm5','5º GBM',5);
insert into public.internship_resources(id,site_id,code,display_name,resource_type)
values
  (pg_temp.pair_id('resource2'),pg_temp.pair_id('site2'),'AR','AR','ar'),
  (pg_temp.pair_id('resource5'),pg_temp.pair_id('site5'),'USB','USB','usb');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.pair_id('coord'))::text,true);
insert into public.internship_shifts(
  id,program_id,activity_type_id,site_id,resource_id,starts_at,ends_at,
  status,capacity,planned_supervisor_name,created_by
) values
  (pg_temp.pair_id('shift2'),pg_temp.pair_id('program'),pg_temp.pair_id('ar'),
    pg_temp.pair_id('site2'),pg_temp.pair_id('resource2'),
    date_trunc('day',now()+interval '4 days')+interval '10 hours',
    date_trunc('day',now()+interval '5 days')+interval '10 hours',
    'rascunho',1,'Oficial teste',pg_temp.pair_id('coord')),
  (pg_temp.pair_id('shift5'),pg_temp.pair_id('program'),pg_temp.pair_id('usb'),
    pg_temp.pair_id('site5'),pg_temp.pair_id('resource5'),
    date_trunc('day',now()+interval '4 days')+interval '10 hours',
    date_trunc('day',now()+interval '4 days')+interval '22 hours',
    'rascunho',1,'Oficial teste',pg_temp.pair_id('coord'));
insert into public.internship_assignments(id,shift_id,student_id,assignment_source,created_by)
values
  (pg_temp.pair_id('assignment2'),pg_temp.pair_id('shift2'),pg_temp.pair_id('student1'),'manual',pg_temp.pair_id('coord')),
  (pg_temp.pair_id('assignment5'),pg_temp.pair_id('shift5'),pg_temp.pair_id('student2'),'manual',pg_temp.pair_id('coord'));
update public.internship_shifts set status='publicado',published_by=pg_temp.pair_id('coord'),published_at=now()
where id in (pg_temp.pair_id('shift2'),pg_temp.pair_id('shift5'));

select is(pg_temp.as_user('ian', format(
  'select public.internship_request_pair_swap(%L,%L,%L)',
  pg_temp.pair_id('assignment2'),pg_temp.pair_id('assignment5'),
  'Permuta consensual por logística de deslocamento'
)), 'ok', 'Administração delegada propõe a permuta');
select is((select count(*)::integer from public.internship_assignments where status='prevista'
  and shift_id in (pg_temp.pair_id('shift2'),pg_temp.pair_id('shift5'))),2,
  'Proposta não altera os dois plantões');
select is(pg_temp.as_user('ian', format(
  'select public.internship_decide_change(%L,true)',
  (select id from public.internship_change_requests where change_type='permuta')
)), '42501', 'Administração delegada não homologa');
select is(pg_temp.as_user('ian', format(
  'select public.internship_request_change(%L,%L,%L,p_reason=>%L)',
  pg_temp.pair_id('assignment5'),'substituicao',pg_temp.pair_id('student1'),
  'Segunda proposta sobre plantão pendente'
)), '23505', 'Outra alteração não pode ocupar um dos dois plantões pendentes');

insert into public.internship_student_blackouts(program_id,student_id,starts_on,ends_on,blocked_weekdays,reason)
values(pg_temp.pair_id('program'),pg_temp.pair_id('student2'),
  (now()+interval '4 days')::date,(now()+interval '5 days')::date,
  array[0,1,2,3,4,5,6],'Bloqueio temporário para testar rollback');
select is(pg_temp.as_user('coord', format(
  'select public.internship_decide_change(%L,true)',
  (select id from public.internship_change_requests where change_type='permuta')
)), '23514', 'Conflito na homologação impede a permuta');
select is((select count(*)::integer from public.internship_assignments where status='prevista'
  and shift_id in (pg_temp.pair_id('shift2'),pg_temp.pair_id('shift5'))),2,
  'Falha mantém os dois plantões originais');
select is((select status from public.internship_change_requests where change_type='permuta'),
  'pendente', 'Solicitação continua pendente após falha');
delete from public.internship_student_blackouts where program_id=pg_temp.pair_id('program');

select is(pg_temp.as_user('coord', format(
  'select public.internship_decide_change(%L,true)',
  (select id from public.internship_change_requests where change_type='permuta')
)), 'ok', 'Coordenação homologa os dois plantões juntos');
select is((select student_id from public.internship_assignments
  where shift_id=pg_temp.pair_id('shift2') and status='prevista'),
  pg_temp.pair_id('student2'), 'Juliana passa ao AR de 24 horas');
select is((select student_id from public.internship_assignments
  where shift_id=pg_temp.pair_id('shift5') and status='prevista'),
  pg_temp.pair_id('student1'), 'Carolina passa ao APH de 12 horas');
select is((select count(*)::integer from public.internship_assignments
  where id in (pg_temp.pair_id('assignment2'),pg_temp.pair_id('assignment5')) and status='substituida'),
  2, 'Participações anteriores permanecem no histórico');
select is((select status from public.internship_change_requests where change_type='permuta'),
  'homologada', 'Decisão da Coordenação fica registrada');
select * from finish();
rollback;
