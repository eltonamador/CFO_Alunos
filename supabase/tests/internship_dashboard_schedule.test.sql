begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims','{}',true);
create function pg_temp.uid(label text) returns uuid language sql immutable as $$select md5('dashboard-stage-'||label)::uuid$$;
insert into auth.users(id,email) values
 (pg_temp.uid('coord'),'dashboard-coord@test.invalid'),
 (pg_temp.uid('cadet'),'dashboard-cadet@test.invalid'),
 (pg_temp.uid('unlinked'),'dashboard-unlinked@test.invalid'),
 (pg_temp.uid('instructor'),'dashboard-instructor@test.invalid'),
 (pg_temp.uid('secretariat'),'dashboard-secretariat@test.invalid'),
 (pg_temp.uid('inactive'),'dashboard-inactive@test.invalid');
insert into public.profiles(id,role,full_name,student_id,active) values
 (pg_temp.uid('coord'),'coordenacao','Coordenação local',null,true),
 (pg_temp.uid('cadet'),'aluno','Cadete local',(select id from public.students where war_name='RIVALDO' limit 1),true),
 (pg_temp.uid('unlinked'),'aluno','Sem vínculo',null,true),
 (pg_temp.uid('instructor'),'instrutor','Instrutor local',null,true),
 (pg_temp.uid('secretariat'),'secretaria','Secretaria local',null,true),
 (pg_temp.uid('inactive'),'instrutor','Inativo local',null,false);
create function pg_temp.rows_as(label text) returns integer language plpgsql as $$declare count_rows integer;begin
 perform set_config('request.jwt.claims',json_build_object('sub',pg_temp.uid(label))::text,true);set local role authenticated;
 select count(*) into count_rows from public.internship_dashboard_schedule('2026-09-26','2026-09-27');
 reset role;perform set_config('request.jwt.claims','{}',true);return count_rows;
 exception when others then reset role;perform set_config('request.jwt.claims','{}',true);raise;end$$;
create temporary table expected as
 select count(*)::integer n from public.internship_assignments a
 join public.internship_shifts sh on sh.id=a.shift_id
 join public.internship_programs p on p.id=sh.program_id
 join public.classes c on c.id=p.class_id join public.courses course on course.id=c.course_id
 join public.students s on s.id=a.student_id
 where a.status='prevista' and sh.status='publicado' and s.deleted_at is null
 and c.name='CFO 2026.1' and course.code='CFO-2026'
 and (sh.starts_at at time zone p.timezone)::date between '2026-09-26' and '2026-09-27';
select ok((select n from expected)>0,'A amostra local contém plantões publicados');
select ok(not has_function_privilege('anon','public.internship_dashboard_schedule(date,date)','execute'),'A consulta não é anônima');
select is(pg_temp.rows_as('coord'),(select n from expected),'Coordenação vê somente participações vigentes');
select is(pg_temp.rows_as('cadet'),(select n from expected),'Cadete vinculado vê a escala operacional');
select is(pg_temp.rows_as('instructor'),(select n from expected),'Instrutor vê a escala operacional');
select is(pg_temp.rows_as('secretariat'),(select n from expected),'Secretaria vê a escala operacional');
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.uid('unlinked'))::text,true);set local role authenticated;
select throws_ok($$select count(*) from public.internship_dashboard_schedule('2026-09-26','2026-09-27')$$,'42501','Consulta restrita aos usuários ativos do CFO.','Aluno sem vínculo não vê a escala');
reset role;
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.uid('inactive'))::text,true);set local role authenticated;
select throws_ok($$select count(*) from public.internship_dashboard_schedule('2026-09-26','2026-09-27')$$,'42501','Consulta restrita aos usuários ativos do CFO.','Perfil inativo não vê a escala');
reset role;
select set_config('request.jwt.claims',json_build_object('sub',pg_temp.uid('coord'))::text,true);set local role authenticated;
select throws_ok($$select count(*) from public.internship_dashboard_schedule('2026-09-01','2026-12-31')$$,'23514','Consulte até 31 dias por vez.','Janela longa é recusada');
select ok((select count(*) from public.internship_dashboard_schedule('2026-09-26','2026-09-27') where uniform_code='4D')>0,'Guarda-vida antigo exibe 4º D sem importação de PDF');
reset role;
select * from finish();
rollback;
