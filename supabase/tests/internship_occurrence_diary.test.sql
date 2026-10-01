begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select set_config('request.jwt.claims','{}',true);
create function pg_temp.did(label text) returns uuid language sql immutable as $$select md5('occurrence-diary-'||label)::uuid$$;
create function pg_temp.act(label text) returns text language sql as $$
  select set_config('request.jwt.claims',json_build_object('sub',pg_temp.did(label))::text,true)$$;
-- Turma A: cadetes 1, 2 e 4 (o 4 administra o estágio por delegação). Turma B: cadete 3.
insert into auth.users(id,email)
select pg_temp.did(u),u||'@diary.test.invalid' from unnest(array['coord','coord2','cad1','cad2','cad3','cad4','boris']) u;
insert into public.courses(id,code,name,year) values(pg_temp.did('course'),'DIARY-TEST','Curso diário',2099);
insert into public.classes(id,course_id,name)
values(pg_temp.did('classA'),pg_temp.did('course'),'Turma A'),(pg_temp.did('classB'),pg_temp.did('course'),'Turma B');
insert into public.students(id,class_id,student_number,war_name,full_name,pelotao) values
 (pg_temp.did('student1'),pg_temp.did('classA'),1,'DIARIO UM','Cadete diário um','CFO I'),
 (pg_temp.did('student2'),pg_temp.did('classA'),2,'DIARIO DOIS','Cadete diário dois','CFO I'),
 (pg_temp.did('student3'),pg_temp.did('classB'),3,'DIARIO TRES','Cadete diário três','CFO I'),
 (pg_temp.did('student4'),pg_temp.did('classA'),4,'DIARIO QUATRO','Cadete diário quatro','CFO I');
insert into public.students(id,class_id,war_name,full_name,pelotao,course_status,is_test)
values(pg_temp.did('student_boris'),pg_temp.did('classA'),'BORIS','Boris — aluno de teste','CFO I','outro',true);
insert into public.profiles(id,role,full_name,active,student_id) values
 (pg_temp.did('coord'),'coordenacao','Coordenação diário',true,null),
 (pg_temp.did('coord2'),'coordenacao','Outra Coordenação diário',true,null),
 (pg_temp.did('cad1'),'aluno','Cadete 1',true,pg_temp.did('student1')),
 (pg_temp.did('cad2'),'aluno','Cadete 2',true,pg_temp.did('student2')),
 (pg_temp.did('cad3'),'aluno','Cadete 3',true,pg_temp.did('student3')),
 (pg_temp.did('cad4'),'aluno','Cadete 4',true,pg_temp.did('student4')),
 (pg_temp.did('boris'),'aluno','Boris',true,pg_temp.did('student_boris'));
insert into public.internship_administrators(student_id,reason) values(pg_temp.did('student4'),'Delegação de teste do diário');
insert into public.internship_programs(id,class_id,course_phase,name,starts_on,ends_on,required_minutes,target_minutes,status,published_by,published_at)
values(pg_temp.did('program'),pg_temp.did('classA'),'CFO I','Programa diário','2026-10-01','2026-11-30',15000,15120,'publicado',pg_temp.did('coord'),now());
insert into public.internship_activity_types(id,program_id,code,name,training_axis,default_minutes,requires_operation_plan)
values(pg_temp.did('usb'),pg_temp.did('program'),'usb','USB','aph',720,false);
insert into public.internship_sites(id,program_id,site_type,code,name,gbm_number)
values(pg_temp.did('gbm'),pg_temp.did('program'),'gbm','gbm1','GBM teste',1);
insert into public.internship_resources(id,site_id,code,display_name,resource_type)
values(pg_temp.did('resource'),pg_temp.did('gbm'),'usb','USB','usb');
create function pg_temp.addshift(student integer,label text,starts timestamptz) returns uuid language plpgsql as $$
declare sid uuid := pg_temp.did(label);
begin
 insert into public.internship_shifts(id,program_id,activity_type_id,site_id,resource_id,starts_at,ends_at,status,capacity,created_by)
 values(sid,pg_temp.did('program'),pg_temp.did('usb'),pg_temp.did('gbm'),pg_temp.did('resource'),starts,starts+interval '12 hours','rascunho',1,pg_temp.did('coord'));
 insert into public.internship_assignments(id,shift_id,student_id,assignment_source,created_by)
 values(pg_temp.did('assignment'||student),sid,pg_temp.did('student'||student),'manual',pg_temp.did('coord'));
 update public.internship_shifts set status='publicado',published_by=pg_temp.did('coord'),published_at=now() where id=sid;
 return sid;
end$$;
select pg_temp.act('coord');
select pg_temp.addshift(1,'shift1','2026-10-05 07:45-03');
select pg_temp.addshift(2,'shift2','2026-10-06 07:45-03');

-- Cadete 1 escreve: rascunho livre, registro pessoal e relato compartilhado.
select pg_temp.act('cad1');
set local role authenticated;
select lives_ok($$insert into public.internship_diary_entries(id,student_id,summary) values(pg_temp.did('draft1'),pg_temp.did('student1'),'')$$,
 'Rascunho aceita tudo em branco');
select throws_ok($$insert into public.internship_diary_entries(student_id,status,summary) values(pg_temp.did('student1'),'pessoal','  ')$$,
 '23514',null,'Registro salvo exige só a frase do que aconteceu');
select lives_ok($$insert into public.internship_diary_entries(id,student_id,status,summary) values(pg_temp.did('personal1'),pg_temp.did('student1'),'pessoal','Registro só no meu diário')$$,
 'Registro pessoal com um único campo');
select lives_ok($$insert into public.internship_diary_entries(id,student_id,status,summary,assignment_id,occurrence_type,companion_ids,featured_at,hidden_at)
 values(pg_temp.did('shared1'),pg_temp.did('student1'),'compartilhado','Queda de moto, apoiei na imobilização',pg_temp.did('assignment1'),'aph',
  array[pg_temp.did('student2'),pg_temp.did('student3'),pg_temp.did('student1'),pg_temp.did('student2')],now(),now())$$,
 'Relato compartilhado vinculado ao próprio plantão');
select is((select occurrence_types from public.internship_diary_entries where id=pg_temp.did('shared1')),
 array['aph']::text[],'Coluna legada simples vira etiqueta na criação');
update public.internship_diary_entries set
 occurrence_types=array['acidente_transito','abelhas_marimbondos'],
 vehicles=array['AT','AR','ABT']
where id=pg_temp.did('shared1');
select ok((select occurrence_type='acidente_transito' and vehicle='AT'
 and occurrence_types=array['acidente_transito','abelhas_marimbondos']
 and vehicles=array['AT','AR','ABT']
 from public.internship_diary_entries where id=pg_temp.did('shared1')),
 'Múltiplas etiquetas preservam espelho legado e ABT');
select is((select companion_ids from public.internship_diary_entries where id=pg_temp.did('shared1')),array[pg_temp.did('student2')],
 'Colegas marcados ficam só os da turma, sem repetição e sem o autor');
select ok((select shared_at is not null and featured_at is null and hidden_at is null from public.internship_diary_entries where id=pg_temp.did('shared1')),
 'Cadete não se destaca nem se oculta ao criar');
select throws_ok($$insert into public.internship_diary_entries(student_id,status,summary,assignment_id) values(pg_temp.did('student1'),'pessoal','Plantão de outro cadete',pg_temp.did('assignment2'))$$,
 '23514','Plantão não encontrado entre os seus.','Não vincula plantão de outro cadete');
select throws_ok($$insert into public.internship_diary_entries(student_id,summary) values(pg_temp.did('student2'),'Em nome de outro')$$,
 '42501',null,'Não escreve no diário de outro cadete');
update public.internship_diary_entries set featured_at=now(),hidden_at=now(),status='rascunho' where id=pg_temp.did('shared1');
select ok((select status='compartilhado' and featured_at is null and hidden_at is null from public.internship_diary_entries where id=pg_temp.did('shared1')),
 'Edição do cadete não altera moderação nem devolve o relato ao rascunho');
select throws_ok($$insert into public.internship_diary_reactions(entry_id,user_id,kind) values(pg_temp.did('shared1'),pg_temp.did('cad1'),'aplauso')$$,
 '42501',null,'Cadete não reage ao próprio relato');
reset role;

-- Colega da mesma turma: vê e reage apenas ao que foi compartilhado.
select pg_temp.act('cad2');
set local role authenticated;
select is((select array_agg(id) from public.internship_diary_entries where student_id=pg_temp.did('student1')),array[pg_temp.did('shared1')],
 'Colega vê só o relato compartilhado, sem rascunho nem registro pessoal');
select lives_ok($$insert into public.internship_diary_reactions(entry_id,user_id,kind) values(pg_temp.did('shared1'),pg_temp.did('cad2'),'aplauso')$$,
 'Colega aplaude o relato');
select throws_ok($$insert into public.internship_diary_reactions(entry_id,user_id,kind) values(pg_temp.did('personal1'),pg_temp.did('cad2'),'aplauso')$$,
 '42501',null,'Registro pessoal não recebe reação');
update public.internship_diary_entries set summary='Alterado por colega' where id=pg_temp.did('shared1');
delete from public.internship_diary_entries where id=pg_temp.did('shared1');
reset role;
select is((select summary from public.internship_diary_entries where id=pg_temp.did('shared1')),'Queda de moto, apoiei na imobilização',
 'Colega não edita nem exclui o relato de outro');

-- Outra turma e administrador delegado do estágio não ganham acesso extra.
select pg_temp.act('cad3');
set local role authenticated;
select is((select count(*)::integer from public.internship_diary_entries where student_id=pg_temp.did('student1')),0,'Outra turma não vê o mural');
select throws_ok($$insert into public.internship_diary_reactions(entry_id,user_id,kind) values(pg_temp.did('shared1'),pg_temp.did('cad3'),'aprendi')$$,
 '42501',null,'Outra turma não reage');
reset role;
select pg_temp.act('cad4');
set local role authenticated;
select is((select count(*)::integer from public.internship_diary_entries where student_id=pg_temp.did('student1')),1,
 'Administrador delegado vê só o mural, como qualquer colega');
select throws_ok(format('select public.internship_diary_moderate(%L,%L)',pg_temp.did('shared1'),'ocultar'),
 '42501','Acesso restrito à Coordenação.','Moderação é só da Coordenação');
reset role;

-- Coordenação lê registros salvos (sem rascunhos) e modera depois de compartilhado.
select pg_temp.act('coord');
set local role authenticated;
select is((select count(*)::integer from public.internship_diary_entries where student_id=pg_temp.did('student1')),2,
 'Coordenação lê registros salvos, mas não rascunhos');
select lives_ok($$insert into public.internship_diary_reactions(entry_id,user_id,kind) values(pg_temp.did('shared1'),pg_temp.did('coord'),'aprendi')$$,
 'Coordenação também pode reagir');
select lives_ok(format('select public.internship_diary_moderate(%L,%L)',pg_temp.did('shared1'),'destacar'),'Coordenação destaca');
select ok((select featured_at is not null from public.internship_diary_entries where id=pg_temp.did('shared1')),'Relato destacado');
select lives_ok(format('select public.internship_diary_moderate(%L,%L,%L)',pg_temp.did('shared1'),'ocultar','Dados da vítima no texto'),'Coordenação oculta');
select ok((select hidden_at is not null and featured_at is null and hidden_reason='Dados da vítima no texto'
 and summary='Queda de moto, apoiei na imobilização' from public.internship_diary_entries where id=pg_temp.did('shared1')),
 'Ocultar tira o destaque, guarda o motivo e preserva o texto do cadete');
select throws_ok(format('select public.internship_diary_moderate(%L,%L)',pg_temp.did('personal1'),'destacar'),
 'P0002',null,'Registro pessoal não entra na moderação');
update public.internship_diary_entries set summary='Alterado pela Coordenação' where id=pg_temp.did('shared1');
reset role;
select is((select summary from public.internship_diary_entries where id=pg_temp.did('shared1')),'Queda de moto, apoiei na imobilização',
 'Coordenação não reescreve o relato');

select pg_temp.act('cad2');
set local role authenticated;
select is((select count(*)::integer from public.internship_diary_entries where id=pg_temp.did('shared1')),0,'Relato oculto sai do mural');
select is((select count(*)::integer from public.internship_diary_reactions where entry_id=pg_temp.did('shared1')),0,'Reações de relato oculto também somem');
reset role;

select pg_temp.act('cad1');
set local role authenticated;
select is((select count(*)::integer from public.internship_diary_reactions where entry_id=pg_temp.did('shared1')),2,'Autor continua vendo as reações recebidas');
update public.internship_diary_entries set summary='Queda de moto, relato revisado' where id=pg_temp.did('shared1');
select ok((select summary='Queda de moto, relato revisado' and hidden_at is not null from public.internship_diary_entries where id=pg_temp.did('shared1')),
 'Autor corrige o relato oculto, que segue fora do mural');
delete from public.internship_diary_entries where id=pg_temp.did('personal1');
select is((select count(*)::integer from public.internship_diary_entries where id=pg_temp.did('personal1')),0,'Autor exclui o próprio registro');
reset role;

select pg_temp.act('coord');
set local role authenticated;
select lives_ok(format('select public.internship_diary_moderate(%L,%L)',pg_temp.did('shared1'),'reexibir'),'Coordenação volta a exibir');
reset role;
select pg_temp.act('cad2');
set local role authenticated;
select is((select count(*)::integer from public.internship_diary_entries where id=pg_temp.did('shared1')),1,'Relato volta ao mural');
delete from public.internship_diary_reactions where entry_id=pg_temp.did('shared1') and kind='aplauso';
select is((select count(*)::integer from public.internship_diary_reactions where entry_id=pg_temp.did('shared1')),1,'Colega desfaz a própria reação');
reset role;

-- A conta de teste usa o portal da turma sem participar de listas ou do mural oficial.
select pg_temp.act('boris');
set local role authenticated;
select is((select count(*)::integer from public.students where id=pg_temp.did('student_boris')),1,
 'Boris lê a própria ficha');
select is((select count(*)::integer from public.v_student_class_basic where id=pg_temp.did('student_boris')),0,
 'View da turma não lista Boris');
select is((select count(*)::integer from public.internship_diary_entries where id=pg_temp.did('shared1')),1,
 'Boris vê o mural compartilhado da turma');
select lives_ok($$insert into public.internship_diary_entries(id,student_id,status,summary)
 values(pg_temp.did('boris_entry'),pg_temp.did('student_boris'),'compartilhado','Relato de ensaio')$$,
 'Boris grava relato de teste');
select throws_ok($$insert into public.internship_diary_reactions(entry_id,user_id,kind)
 values(pg_temp.did('shared1'),pg_temp.did('boris'),'aplauso')$$,
 '42501',null,'Boris não altera reações do mural oficial');
select throws_ok($$update public.students set is_test=false where id=pg_temp.did('student_boris')$$,
 '42501',null,'Boris não remove seu marcador de teste');
reset role;
select pg_temp.act('cad2');
set local role authenticated;
select is((select count(*)::integer from public.internship_diary_entries where id=pg_temp.did('boris_entry')),0,
 'Cadetes reais não veem o relato de Boris');
reset role;
select pg_temp.act('coord');
set local role authenticated;
select is((select count(*)::integer from public.students where id=pg_temp.did('student_boris')),0,
 'Painel da Coordenação não recebe a ficha de Boris');
select is((select count(*)::integer from public.internship_diary_entries where id=pg_temp.did('boris_entry')),0,
 'Painel de ocorrências não recebe o relato de Boris');
reset role;

-- Todas as contas de Coordenação acessam o mural/quadro, sem delegação ou student_id.
select pg_temp.act('coord2');
set local role authenticated;
select is((select count(*)::integer from public.internship_diary_entries
 where id=pg_temp.did('shared1') and status='compartilhado' and hidden_at is null),1,
 'Outra conta de Coordenação vê o relato compartilhado no mural e quadro');
select is((select count(*)::integer from public.internship_diary_reactions where entry_id=pg_temp.did('shared1')),1,
 'Outra conta de Coordenação lê as reações para o quadro');
select lives_ok(format('select public.internship_diary_moderate(%L,%L)',pg_temp.did('shared1'),'destacar'),
 'Outra conta de Coordenação também pode destacar no mural');
reset role;

-- Categorias precisas para as novas insígnias; mantém limites e validações anteriores.
select pg_temp.act('cad1');
set local role authenticated;
select lives_ok($$update public.internship_diary_entries set occurrence_types=array[
 'trem_socorro','incendio_residencial','salvamento_veicular',
 'salvamento_altura','salvamento_confinado','salvamento_inundacao']
 where id=pg_temp.did('shared1')$$,'Cadete salva as seis novas etiquetas das insígnias');
select is((select occurrence_type from public.internship_diary_entries where id=pg_temp.did('shared1')),
 'trem_socorro','Nova etiqueta continua compatível com a coluna legada');
select throws_ok($$update public.internship_diary_entries set occurrence_types=array['tipo_inexistente']
 where id=pg_temp.did('shared1')$$,'23514',null,'Banco rejeita etiqueta desconhecida');
select throws_ok($$update public.internship_diary_entries set occurrence_types=array['trem_socorro',null]
 where id=pg_temp.did('shared1')$$,'23514',null,'Banco rejeita etiqueta nula');
select throws_ok($$update public.internship_diary_entries set occurrence_types=array[
 'aph','trem_socorro','incendio_residencial','salvamento_veicular',
 'salvamento_altura','salvamento_confinado','salvamento_inundacao']
 where id=pg_temp.did('shared1')$$,'23514',null,'Banco mantém máximo de seis etiquetas');
reset role;

select ok(not has_table_privilege('anon','public.internship_diary_entries','SELECT'),'Visitante anônimo não lê o diário');
select ok(not has_function_privilege('authenticated','public.internship_diary_guard_entry()','EXECUTE'),'Gatilho interno não fica exposto');
select * from finish();
rollback;
