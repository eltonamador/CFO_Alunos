-- Fixtures artificiais; tudo revertido ao final. Executar em banco de teste.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims', '{}', true);

create function pg_temp.ac_id(label text) returns uuid language sql immutable
as $$ select md5('academic-sprint-test-' || label)::uuid $$;

create function pg_temp.ac_try(p_actor text, p_cmd text) returns text
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.ac_id(p_actor))::text, true);
  set local role authenticated;
  execute p_cmd;
  reset role;
  return 'ok';
exception when others then
  reset role;
  return sqlstate;
end $$;

create function pg_temp.ac_count(p_actor text, p_query text) returns int
language plpgsql as $$
declare v int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.ac_id(p_actor))::text, true);
  set local role authenticated;
  execute p_query into v;
  reset role;
  return v;
end $$;

create function pg_temp.ac_parameters() returns jsonb language sql immutable as $$
 select '{"version":1,"directPassGrade":7,"vfMinAverage":5,"vfPassGrade":5,"vfReduction":true,"vfMaxRecordedGrade":6.75,"maxVfDisciplines":3,"absenceLimitPercent":25,"attendanceMode":"total","absencePenaltyStage":"before_vf","averageDecimals":2,"roundingMode":"half_even","comparisonStage":"rounded","courseAttendanceMinimum":90}'::jsonb
$$;

select is((select count(*)::int from pg_tables where schemaname = 'public'
  and tablename like 'academic_%' and rowsecurity), 16, 'RLS habilitada nas dezesseis tabelas acadêmicas');
select ok(not has_table_privilege('anon','public.academic_grades','select'), 'anon sem SELECT de notas');
select ok(not has_table_privilege('authenticated','public.academic_grades','insert'), 'sem INSERT REST de notas');
select ok(not has_table_privilege('authenticated','public.academic_grades','update'), 'sem UPDATE REST de notas');
select ok(not has_table_privilege('authenticated','public.academic_grades','delete'), 'sem DELETE REST de notas');
select ok(not has_table_privilege('authenticated','public.academic_audit_events','insert'), 'auditoria sem INSERT REST');
select ok(not has_function_privilege('anon','public.academic_save_grade(uuid,uuid,numeric,integer,text)','execute'), 'anon sem RPC de notas');
select ok(public.academic_valid_parameters(pg_temp.ac_parameters()), 'contrato normativo válido');
select ok(not public.academic_valid_parameters(pg_temp.ac_parameters() - 'comparisonStage'), 'momento de comparação deve ser explicitamente aprovado');
select ok(public.academic_valid_parameters(pg_temp.ac_parameters() || '{"comparisonStage":"exact"}'), 'comparação com intermediários exatos é aceita quando explícita');
select ok(not public.academic_valid_parameters(pg_temp.ac_parameters() || '{"comparisonStage":"inventado"}'), 'semântica desconhecida de comparação é rejeitada');
select ok(not public.academic_valid_parameters('{}'::jsonb), 'parâmetros incompletos rejeitados');
select ok(not public.academic_valid_parameters(pg_temp.ac_parameters() || '{"vfMinAverage":7}'), 'piso VF deve ser menor que aprovação direta');
select ok(not public.academic_valid_parameters(pg_temp.ac_parameters() || '{"attendanceMode":"inventado"}'), 'modo de frequência inválido rejeitado');
select ok(not public.academic_valid_parameters(pg_temp.ac_parameters() || '{"maxVfDisciplines":1.5}'), 'limite de disciplinas VF deve ser inteiro');

insert into auth.users(id, email)
select pg_temp.ac_id(label), label || '@academic-test.invalid'
from unnest(array['coord','secretaria','instrutor','outro-instrutor','inativo','aluno1','aluno2']) label;
insert into public.profiles(id, role, full_name, active)
values
 (pg_temp.ac_id('coord'),'coordenacao','Coordenação fictícia',true),
 (pg_temp.ac_id('secretaria'),'secretaria','Secretaria fictícia',true),
 (pg_temp.ac_id('instrutor'),'instrutor','Instrutor fictício',true),
 (pg_temp.ac_id('outro-instrutor'),'instrutor','Outro instrutor fictício',true),
 (pg_temp.ac_id('inativo'),'coordenacao','Perfil inativo fictício',false),
 (pg_temp.ac_id('aluno1'),'aluno','Aluno fictício 1',true),
 (pg_temp.ac_id('aluno2'),'aluno','Aluno fictício 2',true);
insert into public.courses(id, code, name, year)
values (pg_temp.ac_id('course'),'ACADEMIC-TEST-0036','Curso fictício',2099);
insert into public.classes(id, course_id, name) values
 (pg_temp.ac_id('class'), pg_temp.ac_id('course'), 'Turma fictícia'),
 (pg_temp.ac_id('other-class'), pg_temp.ac_id('course'), 'Outra turma fictícia');
insert into public.students(id, class_id, student_number, war_name, full_name, pelotao) values
 (pg_temp.ac_id('student1'), pg_temp.ac_id('class'), 1, 'TESTE UM', 'Cadete fictício um', 'CFO I'),
 (pg_temp.ac_id('student2'), pg_temp.ac_id('class'), 2, 'TESTE DOIS', 'Cadete fictício dois', 'CFO I'),
 (pg_temp.ac_id('other-student'), pg_temp.ac_id('other-class'), 1, 'OUTRA TURMA', 'Cadete fictício outra turma', 'CFO I');
update public.profiles set student_id = pg_temp.ac_id('student1') where id = pg_temp.ac_id('aluno1');
update public.profiles set student_id = pg_temp.ac_id('student2') where id = pg_temp.ac_id('aluno2');

select is(pg_temp.ac_try('coord', $q$
 insert into public.academic_disciplines(id,code,name,phase,kind,workload_hours,source_ref)
 values (pg_temp.ac_id('discipline'),'ACADEMIC-TEST-DISC','Disciplina fictícia',1,'disciplina',40,'Fonte artificial de teste')
$q$), 'ok', 'coordenação cadastra disciplina');
select is(pg_temp.ac_try('secretaria', $q$
 insert into public.academic_disciplines(code,name,phase,kind,workload_hours,source_ref)
 values ('ACADEMIC-TEST-FAIL','Falha',1,'disciplina',40,'Teste')
$q$), '42501', 'secretaria não cadastra disciplina');
select is(pg_temp.ac_try('coord', $q$
 insert into public.academic_offerings(id,class_id,discipline_id,academic_year,workload_hours,vc_count,decision_ref)
 values (pg_temp.ac_id('offering'),pg_temp.ac_id('class'),pg_temp.ac_id('discipline'),2099,40,2,'Decisão fictícia'),
        (pg_temp.ac_id('other-offering'),pg_temp.ac_id('class'),pg_temp.ac_id('discipline'),2100,40,1,'Decisão fictícia')
$q$), 'ok', 'coordenação cria ofertas com política pendente');
select is(pg_temp.ac_try('coord', $q$
 update public.academic_disciplines set kind='estagio' where id=pg_temp.ac_id('discipline')
$q$), '23514', 'tipo da disciplina fica congelado quando existe oferta');
select is(pg_temp.ac_try('coord', $q$
 update public.academic_disciplines set name='Nome adulterado' where id=pg_temp.ac_id('discipline')
$q$), '23514', 'nome da disciplina histórica não pode ser reescrito');
select is(pg_temp.ac_try('coord', $q$
 insert into public.academic_offerings(class_id,discipline_id,academic_year,workload_hours,vc_count,decision_ref)
 values (pg_temp.ac_id('class'),pg_temp.ac_id('discipline'),2099,40,2,'Duplicidade fictícia')
$q$), '23505', 'oferta duplicada bloqueada');
select is(pg_temp.ac_try('coord', $q$
 insert into public.academic_assignments(id,offering_id,profile_id,display_name,role,designation_ref)
 values (pg_temp.ac_id('assignment'),pg_temp.ac_id('offering'),pg_temp.ac_id('instrutor'),'Nome adulterado','instrutor','Designação fictícia')
$q$), 'ok', 'coordenação designa instrutor');
select is((select display_name from public.academic_assignments where id = pg_temp.ac_id('assignment')),
 'Instrutor fictício', 'nome de responsável autenticado vem do banco');
select is(pg_temp.ac_try('coord', $q$
 insert into public.academic_enrollments(id,offering_id,student_id,student_label)
 values (pg_temp.ac_id('enrollment1'),pg_temp.ac_id('offering'),pg_temp.ac_id('student1'),'Adulterado'),
        (pg_temp.ac_id('enrollment2'),pg_temp.ac_id('offering'),pg_temp.ac_id('student2'),'Adulterado'),
        (pg_temp.ac_id('other-enrollment'),pg_temp.ac_id('other-offering'),pg_temp.ac_id('student1'),'Adulterado')
$q$), 'ok', 'coordenação matricula cadetes');
select is((select student_label from public.academic_enrollments where id = pg_temp.ac_id('enrollment1')),
 'TESTE UM — 01', 'identificação snapshot vem do cadastro');
select is(pg_temp.ac_try('coord', $q$
 insert into public.academic_enrollments(offering_id,student_id,student_label)
 values (pg_temp.ac_id('offering'),pg_temp.ac_id('other-student'),'Adulterado')
$q$), '23514', 'matrícula de turma incompatível rejeitada');
select is(pg_temp.ac_try('instrutor', $q$
 insert into public.academic_assessments(id,offering_id,kind,sequence,title)
 values (pg_temp.ac_id('vc1'),pg_temp.ac_id('offering'),'VC',1,'VC fictícia 1'),
        (pg_temp.ac_id('vc2'),pg_temp.ac_id('offering'),'VC',2,'VC fictícia 2'),
        (pg_temp.ac_id('vf'),pg_temp.ac_id('offering'),'VF',1,'VF fictícia')
$q$), 'ok', 'instrutor designado cadastra avaliações');
select is(pg_temp.ac_try('instrutor', $q$
 insert into public.academic_assessments(offering_id,kind,sequence,title)
 values (pg_temp.ac_id('offering'),'VC',3,'Excesso')
$q$), '23514', 'não aceita VC além da quantidade configurada');
select is(pg_temp.ac_try('instrutor', $q$
 insert into public.academic_assessments(offering_id,kind,sequence,title)
 values (pg_temp.ac_id('offering'),'VF',1,'Duplicada')
$q$), '23505', 'VF única por oferta');
select is(pg_temp.ac_try('outro-instrutor', $q$
 insert into public.academic_assessments(offering_id,kind,sequence,title)
 values (pg_temp.ac_id('other-offering'),'VC',1,'Sem designação')
$q$), '42501', 'instrutor sem designação não cadastra avaliação');

select is(pg_temp.ac_count('instrutor','select count(*) from public.academic_offerings'),1,'instrutor vê apenas oferta designada');
select is(pg_temp.ac_count('outro-instrutor','select count(*) from public.academic_offerings'),0,'instrutor sem vínculo não vê ofertas');
select is(pg_temp.ac_count('inativo','select count(*) from public.academic_offerings'),0,'perfil inativo não vê ofertas');
select is(pg_temp.ac_count('aluno2','select count(*) from public.academic_enrollments'),1,'cadete vê apenas a própria matrícula');
select is(pg_temp.ac_count('aluno2','select count(*) from public.academic_audit_events'),0,'cadete não vê auditoria administrativa');

select is(pg_temp.ac_try('instrutor', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc1'),pg_temp.ac_id('enrollment1'),0,0,null)
$q$), 'ok', 'zero é nota válida e política pendente permite lançamento');
select is(pg_temp.ac_try('instrutor', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc1'),pg_temp.ac_id('enrollment2'),null,0,null)
$q$), 'ok', 'NULL permanece pendência sem virar zero');
select is((select score from public.academic_grades where enrollment_id = pg_temp.ac_id('enrollment1')),0::numeric,'zero preservado');
select ok((select score is null from public.academic_grades where enrollment_id = pg_temp.ac_id('enrollment2')),'nota pendente é NULL');
select is(pg_temp.ac_count('aluno1','select count(*) from public.academic_grades'),1,'cadete só vê sua nota');
select is(pg_temp.ac_count('secretaria','select count(*) from public.academic_grades'),2,'secretaria consulta notas');
select is(pg_temp.ac_try('aluno1', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc1'),pg_temp.ac_id('enrollment1'),10,1,'Adulteração')
$q$),'42501','cadete não altera nota');
select is(pg_temp.ac_try('secretaria', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc1'),pg_temp.ac_id('enrollment1'),10,1,'Adulteração')
$q$),'42501','secretaria não altera nota');
select is(pg_temp.ac_try('outro-instrutor', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc1'),pg_temp.ac_id('enrollment1'),10,1,'Adulteração')
$q$),'42501','instrutor sem vínculo não altera nota');
select is(pg_temp.ac_try('inativo', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc1'),pg_temp.ac_id('enrollment1'),10,1,'Adulteração')
$q$),'42501','coordenação inativa não altera nota');
select is(pg_temp.ac_try('coord', $q$
 update public.academic_grades set score=10 where enrollment_id=pg_temp.ac_id('enrollment1')
$q$),'42501','nem coordenação contorna RPC via UPDATE REST');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc1'),pg_temp.ac_id('other-enrollment'),10,0,null)
$q$),'23514','não aceita matrícula de outra oferta');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc2'),pg_temp.ac_id('enrollment1'),10.01,0,null)
$q$),'23514','nota maior que dez rejeitada');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc2'),pg_temp.ac_id('enrollment1'),7.001,0,null)
$q$),'23514','precisão excessiva não é arredondada silenciosamente');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc1'),pg_temp.ac_id('enrollment1'),8,0,'Correção fictícia')
$q$),'40001','nova inserção concorrente não sobrescreve registro');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc1'),pg_temp.ac_id('enrollment1'),8,1,'x')
$q$),'23514','correção exige justificativa');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc1'),pg_temp.ac_id('enrollment1'),8,1,'Correção fictícia')
$q$),'ok','correção com revisão e motivo salva');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc1'),pg_temp.ac_id('enrollment1'),9,1,'Correção obsoleta')
$q$),'40001','revisão obsoleta não causa perda silenciosa');
select is((select revision from public.academic_grades where enrollment_id=pg_temp.ac_id('enrollment1')),2,'revisão sobe uma vez');
select is(pg_temp.ac_try('instrutor', $q$
 update public.academic_assessments set title='Troca' where id=pg_temp.ac_id('vc1')
$q$),'23514','avaliação com nota fica congelada');
select is(pg_temp.ac_try('coord', $q$
 update public.academic_offerings set vc_count=3 where id=pg_temp.ac_id('offering')
$q$),'23514','oferta com avaliação congela quantidade de VC');

select is(pg_temp.ac_try('coord', $q$
 select public.academic_configure_policy(pg_temp.ac_id('offering'),'Regra fictícia',pg_temp.ac_parameters(),'Decisão fictícia de teste')
$q$),'ok','política aprovada pode preencher oferta pendente com notas');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_configure_policy(pg_temp.ac_id('offering'),'Outra regra',pg_temp.ac_parameters(),'Outra decisão fictícia')
$q$),'23514','política já vinculada não pode ser trocada');
select is(pg_temp.ac_count('aluno1', 'select count(*) from public.academic_policies'),1,'cadete consulta política da sua oferta');
select is(pg_temp.ac_count('outro-instrutor','select count(*) from public.academic_policies'),0,'sem vínculo não vê política de outra oferta');
select is((select approved_by from public.academic_policies where name='Regra fictícia'),pg_temp.ac_id('coord'),'aprovação atribuída pelo banco');
select is(pg_temp.ac_try('coord', $q$
 update public.academic_policies set name='Adulterada' where name='Regra fictícia'
$q$),'42501','política não aceita UPDATE REST');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_configure_policy(pg_temp.ac_id('other-offering'),'Regra incompleta','{}','Decisão fictícia')
$q$),'23514','política malformada não é persistida');
select ok((select policy_id is null from public.academic_offerings where id=pg_temp.ac_id('other-offering')),'RPC malformada preserva oferta sem política');

select is(pg_temp.ac_try('instrutor', $q$
 select public.academic_save_attendance(pg_temp.ac_id('enrollment1'),1,0,1,'Frequência fictícia')
$q$),'42501','instrutor não altera frequência');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_save_attendance(pg_temp.ac_id('enrollment1'),1,0,1,'Frequência fictícia')
$q$),'ok','coordenação grava frequência por revisão');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_save_attendance(pg_temp.ac_id('enrollment1'),2,0,1,'Revisão obsoleta')
$q$),'40001','frequência obsoleta não sobrescreve');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_save_attendance(pg_temp.ac_id('enrollment1'),40,1,2,'Excesso fictício')
$q$),'23514','ausências não ultrapassam carga horária');

select cmp_ok((select count(*)::int from public.academic_audit_events
 where entity='academic_grades' and student_id=pg_temp.ac_id('student1')), '>=', 2,'nota e correção têm auditoria própria');
select is((select actor_id from public.academic_audit_events where entity='academic_grades'
 and action='update' and student_id=pg_temp.ac_id('student1') order by created_at desc limit 1),
 pg_temp.ac_id('coord'),'autor da correção obtido pela sessão');
select is(pg_temp.ac_try('coord', $q$
 update public.academic_audit_events set reason='Adulterada'
$q$),'42501','coordenação não adultera histórico');

-- Simula falha real na escrita do log: nota e revisão devem permanecer.
alter table public.academic_audit_events add constraint academic_test_audit_failure check (false) not valid;
select is(pg_temp.ac_try('coord', $q$
 select public.academic_save_grade(pg_temp.ac_id('vc1'),pg_temp.ac_id('enrollment1'),9,2,'Tentativa sem auditoria')
$q$),'23514','falha de auditoria cancela gravação');
select is((select score from public.academic_grades where enrollment_id=pg_temp.ac_id('enrollment1')),8::numeric,'nota preservada após falha de auditoria');
select is((select revision from public.academic_grades where enrollment_id=pg_temp.ac_id('enrollment1')),2,'revisão preservada após falha de auditoria');
alter table public.academic_audit_events drop constraint academic_test_audit_failure;

select is(pg_temp.ac_try('coord', $q$
 update public.academic_assignments set active=false where id=pg_temp.ac_id('assignment')
$q$),'ok','coordenação encerra designação mantendo histórico');
select is(pg_temp.ac_count('instrutor','select count(*) from public.academic_offerings'),0,'encerramento revoga acesso do instrutor');
select is(pg_temp.ac_try('coord', $q$
 insert into public.academic_assignments(offering_id,profile_id,display_name,role,designation_ref)
 values (pg_temp.ac_id('offering'),pg_temp.ac_id('instrutor'),'Instrutor fictício','instrutor','Nova designação fictícia')
$q$),'ok','instrutor pode receber nova designação após encerramento');
select is(pg_temp.ac_count('instrutor','select count(*) from public.academic_offerings'),1,'nova designação restaura apenas o acesso autorizado');
select is((select count(*)::int from public.academic_assignments where offering_id=pg_temp.ac_id('offering')),2,'designação encerrada permanece preservada');
select is(pg_temp.ac_try('coord', $q$
 update public.academic_assignments set active=true where id=pg_temp.ac_id('assignment')
$q$),'23505','não reativa designação antiga se já existe outra ativa para a mesma função');

-- Uma transferência cadastral futura não pode impedir a correção do diário histórico.
update public.students set class_id=pg_temp.ac_id('other-class'),student_number=3
where id=pg_temp.ac_id('student1');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_save_attendance(pg_temp.ac_id('enrollment1'),2,0,2,'Correção histórica após transferência')
$q$),'ok','correção da frequência histórica independe da turma atual do cadete');
select is((select student_label from public.academic_enrollments where id=pg_temp.ac_id('enrollment1')),
 'TESTE UM — 01','transferência não reescreve snapshot de identificação histórica');

select ok(not has_function_privilege('anon',
 'public.academic_create_offering_ri(uuid,uuid,integer,integer,integer,text)','execute'),
 'anon não cria oferta com política provisória');
select is(pg_temp.ac_try('inativo', $q$
 select public.academic_create_offering_ri(pg_temp.ac_id('class'),pg_temp.ac_id('discipline'),2101,40,2,'Aplicação provisória fictícia')
$q$),'42501','coordenação inativa não cria oferta provisória');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_create_offering_ri(pg_temp.ac_id('class'),pg_temp.ac_id('discipline'),2101,40,2,'Aplicação provisória fictícia')
$q$),'ok','coordenação cria oferta e política RI na mesma transação');
select is((select parameters ->> 'vfMinAverage' from public.academic_policies
 where decision_ref='Aplicação provisória fictícia'),'5','RI 2026 exige média cinco para acesso à VF');
select is((select parameters ->> 'attendanceMode' from public.academic_policies
 where decision_ref='Aplicação provisória fictícia'),'unjustified','RI provisório considera faltas não justificadas no limite');
select is((select parameters ->> 'absencePenaltyStage' from public.academic_policies
 where decision_ref='Aplicação provisória fictícia'),'none','RI 2026 não desconta faltas da nota');
select is((select parameters ->> 'version' from public.academic_policies
 where decision_ref='Aplicação provisória fictícia'),'2','nova oferta registra política versão dois');
select ok((select policy_id is not null from public.academic_offerings
 where academic_year=2101),'nova oferta nasce vinculada à política provisória');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_create_offering_ri(pg_temp.ac_id('class'),pg_temp.ac_id('discipline'),2101,40,2,'Tentativa duplicada fictícia')
$q$),'23505','oferta duplicada falha integralmente');
select is((select count(*)::int from public.academic_policies
 where decision_ref='Tentativa duplicada fictícia'),0,'falha da oferta não deixa política órfã');

-- Diário instrucional: horas validadas e chamada detalhada começam sem reescrever o consolidado legado.
select is(pg_temp.ac_try('coord', $q$
 select public.academic_create_year(
   pg_temp.ac_id('course'),2099,date '2099-01-01',date '2099-12-31','Calendário fictício aprovado','open',true
 )
$q$),'ok','coordenação abre ano letivo acadêmico');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_create_year(
   pg_temp.ac_id('course'),2100,date '2100-01-01',date '2100-12-31','Calendário sem confirmação','open',false
 )
$q$),'23514','calendário sem fonte verificada não pode abrir');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_create_year(
   pg_temp.ac_id('course'),2100,date '2100-01-01',date '2100-12-31','Calendário provisório','draft',false
 )
$q$),'ok','coordenação registra calendário provisório como rascunho');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_update_year(
   (select id from public.academic_years where course_id=pg_temp.ac_id('course') and year=2100),
   date '2100-01-01',date '2100-12-30','Calendário oficial conferido',1,
   'Documento oficial conferido pela coordenação',true
 )
$q$),'ok','coordenação confirma a fonte ao corrigir o rascunho');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_open_year(
   (select id from public.academic_years where course_id=pg_temp.ac_id('course') and year=2100),
   'Calendário confirmado e pronto para lançamentos'
 )
$q$),'ok','calendário com fonte verificada pode abrir');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_set_offering_year(
   pg_temp.ac_id('offering'),
   (select id from public.academic_years where course_id=pg_temp.ac_id('course') and year=2099),
   'Vínculo da oferta ao calendário de teste'
 )
$q$),'ok','oferta histórica é vinculada ao calendário sem alterar a carga');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_create_manual_session(
   pg_temp.ac_id('offering'),date '2099-06-10',time '08:00',time '09:40','Aula prática fictícia','ABM',null
 )
$q$),'ok','coordenação cria sessão planejada manual');
select is(pg_temp.ac_count('instrutor','select count(*) from public.academic_instruction_sessions'),1,
 'instrutor designado consulta apenas o próprio diário');
select is(pg_temp.ac_try('instrutor', $q$
 select public.academic_propose_session(
   (select id from public.academic_instruction_sessions where title='Aula prática fictícia'),
   time '08:00',time '09:40','Conteúdo prático confirmado','ABM','validated',
   jsonb_build_array((select id from public.academic_assignments where offering_id=pg_temp.ac_id('offering') and profile_id=pg_temp.ac_id('instrutor') and active limit 1))
 )
$q$),'ok','instrutor designado propõe execução e participantes');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_validate_session(
   (select id from public.academic_instruction_sessions where title='Aula prática fictícia'),
   (select revision from public.academic_instruction_sessions where title='Aula prática fictícia'),
   'validated',
   jsonb_build_array(
     jsonb_build_object('enrollmentId',pg_temp.ac_id('enrollment1'),'status','present'),
     jsonb_build_object('enrollmentId',pg_temp.ac_id('enrollment2'),'status','unjustified_absence')
   ),
   'Chamada completa conferida pela coordenação'
 )
$q$),'ok','coordenação valida a sessão com chamada completa');
select is((select taught_hours from public.academic_instruction_sessions where title='Aula prática fictícia'),2.00::numeric,
 '100 minutos equivalem a duas horas-aula de cinquenta minutos');
select is((select count(*)::int from public.academic_session_attendances where session_id=(select id from public.academic_instruction_sessions where title='Aula prática fictícia')),
 2,'uma chamada é gravada para cada matrícula da oferta');
select is(pg_temp.ac_count('aluno1','select count(*) from public.academic_session_attendances'),1,
 'cadete consulta somente a própria chamada');
select is(pg_temp.ac_count('instrutor','select count(*) from public.academic_session_attendances'),2,
 'instrutor designado consulta a chamada da própria oferta sem poder alterá-la');
select is(pg_temp.ac_try('instrutor', $q$
 insert into public.academic_session_attendances(session_id,enrollment_id,status)
 values ((select id from public.academic_instruction_sessions where title='Aula prática fictícia'),pg_temp.ac_id('enrollment1'),'present')
$q$),'42501','instrutor não contorna a chamada via REST');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_create_manual_session(
   pg_temp.ac_id('offering'),date '2099-06-11',time '08:00',time '08:50','Aula com chamada duplicada','ABM',null
 )
$q$),'ok','coordenação cria segunda sessão para validar integridade da chamada');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_propose_session(
   (select id from public.academic_instruction_sessions where title='Aula com chamada duplicada'),
   time '08:00',time '08:50','Conteúdo confirmado','ABM','validated',
   jsonb_build_array((select id from public.academic_assignments where offering_id=pg_temp.ac_id('offering') and profile_id=pg_temp.ac_id('instrutor') and active limit 1))
 )
$q$),'ok','coordenação pode registrar proposta para conferência da chamada');
select is(pg_temp.ac_try('coord', $q$
 select public.academic_validate_session(
   (select id from public.academic_instruction_sessions where title='Aula com chamada duplicada'),
   (select revision from public.academic_instruction_sessions where title='Aula com chamada duplicada'),
   'validated',
   jsonb_build_array(
     jsonb_build_object('enrollmentId',pg_temp.ac_id('enrollment1'),'status','present'),
     jsonb_build_object('enrollmentId',pg_temp.ac_id('enrollment1'),'status','present')
   ),'Tentativa de chamada duplicada'
 )
$q$),'23514','chamada com matrícula repetida é rejeitada');
select ok((select count(*) >= 1 from public.academic_audit_events where entity='academic_instruction_sessions'),
 'diário instrucional é auditado');

select * from finish();
rollback;
