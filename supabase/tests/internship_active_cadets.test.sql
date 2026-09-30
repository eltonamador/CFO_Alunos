begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims','{}',true);

insert into auth.users(id,email)
values ('f819f77c-f164-43d0-9aac-a936ef1c7d30','internship-active-roster@test.invalid');
insert into public.profiles(id,role,full_name,active)
values ('f819f77c-f164-43d0-9aac-a936ef1c7d30','coordenacao','Coordenação de teste',true);

select is((select name from public.internship_activity_types where code='ar' limit 1),
  'AR — Salvamento','AR usa o rótulo operacional abreviado');
select is((select name from public.internship_activity_types where code='usb' limit 1),
  'USB — APH','USB usa o rótulo operacional abreviado');

update public.students set course_status='excluido',situation='desligado'
where student_number=27 and upper(war_name)='MILENA';
select set_config('request.jwt.claims',
  '{"sub":"f819f77c-f164-43d0-9aac-a936ef1c7d30"}',true);
set local role authenticated;

select is((select count(*)::integer from public.internship_coordination_workload(
  (select id from public.internship_programs limit 1))),
  (select count(*)::integer from public.students s
   join public.internship_programs p on p.class_id=s.class_id
   where s.course_status='matriculado' and s.deleted_at is null),
  'Controle de carga contém somente os matriculados');
select is((select count(*)::integer from public.internship_coordination_workload(
  (select id from public.internship_programs limit 1)) where student_number=27),
  0,'Milena desligada não aparece no controle de carga');
select is((select count(*)::integer from public.internship_planning_cadets(
  (select id from public.internship_programs limit 1)) where student_number=27),
  0,'Milena desligada não aparece para escala');
select * from finish();
rollback;
