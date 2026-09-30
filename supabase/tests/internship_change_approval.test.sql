begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims', '{}', true);

create function pg_temp.change_id(label text) returns uuid language sql immutable
as $$ select md5('change-approval-' || label)::uuid $$;

create function pg_temp.as_user(actor text, statement text) returns text
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.change_id(actor))::text, true);
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
  (pg_temp.change_id('coord'),'change-coord@test.invalid'),
  (pg_temp.change_id('ian'),'change-ian@test.invalid');
insert into public.profiles(id,role,full_name,active) values
  (pg_temp.change_id('coord'),'coordenacao','Coordenação teste',true),
  (pg_temp.change_id('ian'),'aluno','Ian teste',true);
insert into public.courses(id,code,name,year)
values(pg_temp.change_id('course'),'CHANGE-TEST','Teste trocas',2026);
insert into public.classes(id,course_id,name)
values(pg_temp.change_id('class'),pg_temp.change_id('course'),'Teste trocas');
insert into public.students(id,class_id,student_number,war_name,full_name,pelotao)
select pg_temp.change_id('student'||n),pg_temp.change_id('class'),n,
  'TESTE '||n,'Cadete teste '||n,'CFO I' from generate_series(1,30)n;
update public.profiles set student_id=pg_temp.change_id('student30')
where id=pg_temp.change_id('ian');
insert into public.internship_administrators(student_id,reason,created_by)
values(pg_temp.change_id('student30'),'Delegação de teste para trocas',pg_temp.change_id('coord'));
insert into public.internship_programs(
  id,class_id,course_phase,name,starts_on,ends_on,required_minutes,target_minutes,
  status,published_by,published_at
) values(
  pg_temp.change_id('program'),pg_temp.change_id('class'),'CFO I','Teste trocas',
  (now()-interval '1 month')::date,(now()+interval '2 months')::date,
  15000,15120,'publicado',pg_temp.change_id('coord'),now()
);
insert into public.internship_activity_types(id,program_id,code,name,training_axis,default_minutes,requires_operation_plan)
values(pg_temp.change_id('activity'),pg_temp.change_id('program'),'usb','USB','aph',720,false);
insert into public.internship_sites(id,program_id,site_type,code,name,gbm_number)
values(pg_temp.change_id('site'),pg_temp.change_id('program'),'gbm','gbm1','GBM teste',1);
insert into public.internship_resources(id,site_id,code,display_name,resource_type)
values(pg_temp.change_id('resource'),pg_temp.change_id('site'),'USB','USB','usb');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.change_id('coord'))::text,true);
insert into public.internship_shifts(
  id,program_id,activity_type_id,site_id,resource_id,starts_at,ends_at,status,capacity,created_by
) values(
  pg_temp.change_id('shift'),pg_temp.change_id('program'),pg_temp.change_id('activity'),
  pg_temp.change_id('site'),pg_temp.change_id('resource'),
  date_trunc('day',now()+interval '3 days')+interval '10 hours',
  date_trunc('day',now()+interval '3 days')+interval '22 hours',
  'rascunho',1,pg_temp.change_id('coord')
);
insert into public.internship_assignments(id,shift_id,student_id,assignment_source,created_by)
values(pg_temp.change_id('assignment'),pg_temp.change_id('shift'),pg_temp.change_id('student1'),'manual',pg_temp.change_id('coord'));
update public.internship_shifts set status='publicado',published_by=pg_temp.change_id('coord'),published_at=now()
where id=pg_temp.change_id('shift');

select is(pg_temp.as_user('ian', format(
  'select public.internship_request_change(%L, %L, %L, p_reason => %L)',
  pg_temp.change_id('assignment'), 'substituicao', pg_temp.change_id('student2'), 'Troca por necessidade do serviço'
)), 'ok', 'Ian pode solicitar troca');
select is((select count(*)::integer from public.internship_change_requests where status='pendente'),1,
  'Solicitação fica pendente');
select is((select status from public.internship_assignments where id=pg_temp.change_id('assignment')),
  'prevista','Solicitação não muda a escala');
select is(pg_temp.as_user('ian', format(
  'select public.internship_substitute_assignment(%L,%L,%L)',
  pg_temp.change_id('assignment'),pg_temp.change_id('student2'),'Troca direta indevida'
)), '42501', 'Ian não pode contornar a homologação com a RPC antiga');
select is(pg_temp.as_user('ian', format(
  'update public.internship_assignments set status=%L,reason=%L where id=%L',
  'substituida','Troca direta indevida',pg_temp.change_id('assignment')
)), '42501', 'Ian não pode substituir por escrita direta');
select is(pg_temp.as_user('ian', format(
  'select public.internship_decide_change(%L,true)',
  (select id from public.internship_change_requests where status='pendente')
)), '42501', 'Ian não homologa a própria proposta');
select is(pg_temp.as_user('coord', format(
  'select public.internship_decide_change(%L,true)',
  (select id from public.internship_change_requests where status='pendente')
)), 'ok', 'Coordenação homologa a troca');
select is((select status from public.internship_assignments where id=pg_temp.change_id('assignment')),
  'substituida','A escala muda somente após homologação');
select is((select count(*)::integer from public.internship_assignments
  where student_id=pg_temp.change_id('student2') and status='prevista'),1,
  'Substituto ocupa o plantão');
select is((select status from public.internship_change_requests limit 1),
  'homologada','Decisão fica registrada');
select * from finish();
rollback;
