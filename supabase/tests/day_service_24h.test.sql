begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims', '{}', true);

create function pg_temp.day_id(label text) returns uuid language sql immutable
as $$ select md5('day-service-test-' || label)::uuid $$;
create function pg_temp.cadet_id(number integer) returns uuid language sql immutable
as $$ select md5('day-service-cadet-' || number::text)::uuid $$;
create function pg_temp.day_try(actor text, command text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.day_id(actor))::text, true);
  set local role authenticated;
  execute command;
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  return 'ok';
exception when others then
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  return sqlstate;
end $$;

insert into auth.users(id,email) values
  (pg_temp.day_id('coord'),'day-coord@test.invalid'),
  (pg_temp.day_id('manager'),'day-manager@test.invalid'),
  (pg_temp.day_id('other'),'day-other@test.invalid');
insert into public.profiles(id,role,full_name,active) values
  (pg_temp.day_id('coord'),'coordenacao','Coordenação teste',true),
  (pg_temp.day_id('manager'),'aluno','Gestor teste',true),
  (pg_temp.day_id('other'),'aluno','Aluno teste',true);
insert into public.courses(id,code,name,year)
values(pg_temp.day_id('course'),'DAY-TEST','Curso teste',2099);
insert into public.classes(id,course_id,name)
values(pg_temp.day_id('class'),pg_temp.day_id('course'),'Turma teste');
insert into public.students(id,class_id,student_number,war_name,full_name,pelotao)
select pg_temp.cadet_id(i),pg_temp.day_id('class'),i,'CADETE '||i,'Cadete de teste '||i,'CFO I'
from generate_series(1,10) i;
update public.profiles set student_id=pg_temp.cadet_id(1) where id=pg_temp.day_id('manager');
update public.profiles set student_id=pg_temp.cadet_id(2) where id=pg_temp.day_id('other');
insert into public.internship_administrators(student_id,reason)
values(pg_temp.cadet_id(1),'Delegação de teste para o gestor do estágio');
insert into public.internship_programs(id,class_id,course_phase,name,starts_on,ends_on,
  required_minutes,target_minutes,status,created_by,published_by,published_at)
values(pg_temp.day_id('program'),pg_temp.day_id('class'),'CFO I','Programa teste',
  '2099-09-01','2099-12-31',15000,15120,'publicado',pg_temp.day_id('coord'),
  pg_temp.day_id('coord'),now());

select is(pg_temp.day_try('other', $q$
  select public.permanence_publish(pg_temp.day_id('program'),
    '2099-10-01 06:00-03','2099-10-02 06:00-03','ABM','3A',
    array[pg_temp.cadet_id(1),pg_temp.cadet_id(2)])
$q$),'42501','Aluno sem delegação não publica');

select is(pg_temp.day_try('manager', $q$
  select public.permanence_publish_batch(pg_temp.day_id('program'),'ABM','3A',
    jsonb_build_array(
      jsonb_build_object('startsAt','2099-10-10T06:00:00-03:00',
        'endsAt','2099-10-11T06:00:00-03:00',
        'students',(select jsonb_agg(pg_temp.cadet_id(i) order by i) from generate_series(1,5) i)),
      jsonb_build_object('startsAt','2099-10-11T06:00:00-03:00',
        'endsAt','2099-10-12T06:00:00-03:00',
        'students',(select jsonb_agg(pg_temp.cadet_id(i) order by i) from generate_series(6,10) i))
    ))
$q$),'ok','Gestor delegado publica dois dias de 24h com quatro apoios');
select is((select count(*)::integer from public.duty_assignments
  where class_id=pg_temp.day_id('class') and status='confirmada'),10,
  'Cada serviço possui o titular e quatro apoios');
select is((select count(*)::integer from public.duty_permanence_services s
  join public.duty_rosters r on r.id=s.roster_id
  where r.class_id=pg_temp.day_id('class') and s.ends_at-s.starts_at=interval '24 hours'),2,
  'Cada jornada publicada dura 24 horas');

select isnt(pg_temp.day_try('manager', $q$
  select public.permanence_publish_batch(pg_temp.day_id('program'),'ABM','3A',
    jsonb_build_array(
      jsonb_build_object('startsAt','2099-10-20T06:00:00-03:00',
        'endsAt','2099-10-21T06:00:00-03:00',
        'students',jsonb_build_array(pg_temp.cadet_id(1),pg_temp.cadet_id(2))),
      jsonb_build_object('startsAt','2099-10-21T06:00:00-03:00',
        'endsAt','2099-10-22T06:00:00-03:00',
        'students',jsonb_build_array(pg_temp.cadet_id(1),pg_temp.cadet_id(3)))
    ))
$q$),'ok','Descanso de 24h impede repetição no dia seguinte');
select is((select count(*)::integer from public.duty_rosters
  where class_id=pg_temp.day_id('class') and period_start='2099-10-20'),0,
  'Falha no segundo dia reverte todo o período');
select * from finish();
rollback;
