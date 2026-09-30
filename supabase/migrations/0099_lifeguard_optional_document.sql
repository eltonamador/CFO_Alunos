-- Documento de GV pode ser complementado depois. A publicação continua exigindo
-- administrador autenticado, cinco postos/cadetes e todas as guardas de descanso.
-- Planos sem documento ficam em_definicao; os turnos são efetivamente publicados.
do $$
declare definition text; old_text text;
begin
 select pg_get_functiondef('public.internship_schedule_lifeguard_day(uuid,date,uuid[],text,text)'::regprocedure) into definition;
 old_text := 'or length(btrim(coalesce(p_document_reference,''''))) < 5';
 if position(old_text in definition)=0 then raise exception 'Validação GV mudou.'; end if;
 definition:=replace(definition,old_text,'or length(btrim(coalesce(p_document_reference,''''))) > 200');
 definition:=replace(definition,'Informe cinco cadetes distintos e documento operacional.','Informe cinco cadetes distintos e confira os dados opcionais.');
 old_text := '''Guarda-vida '' || to_char(p_shift_date,''DD/MM/YYYY''),''autorizado'',';
 if position(old_text in definition)=0 then raise exception 'Criação do plano GV mudou.'; end if;
 definition:=replace(definition,old_text,'''Guarda-vida '' || to_char(p_shift_date,''DD/MM/YYYY''),case when nullif(btrim(p_document_reference),'''') is null then ''em_definicao'' else ''autorizado'' end,');
 definition:=replace(definition,'v_starts_at,v_ends_at,btrim(p_document_reference),','v_starts_at,v_ends_at,nullif(btrim(p_document_reference),''''),');
 execute definition;

 select pg_get_functiondef('public.internship_guard_shift()'::regprocedure) into definition;
 old_text := 'v_plan.status not in (''autorizado'',''executado'')';
 if position(old_text in definition)=0 then raise exception 'Guarda de publicação mudou.'; end if;
 definition:=replace(definition,old_text,'(v_plan.status not in (''autorizado'',''executado'') and not (v_activity.code=''guarda_vida'' and v_plan.status=''em_definicao'' and v_plan.authorized_by is not null and v_plan.authorized_at is not null and v_plan.program_id=new.program_id and v_plan.starts_at=new.starts_at and v_plan.ends_at=new.ends_at))');
 execute definition;

 select pg_get_functiondef('public.internship_finalize_lifeguard_draft(uuid,date,text,text)'::regprocedure) into definition;
 definition:=replace(definition,'length(btrim(coalesce(p_document_reference,''''))) < 5','length(btrim(coalesce(p_document_reference,''''))) > 200');
 definition:=replace(definition,'length(btrim(coalesce(p_officer_name,''''))) not between 3 and 120','(nullif(btrim(p_officer_name),'''') is not null and length(btrim(p_officer_name)) not between 3 and 120)');
 definition:=replace(definition,'Informe o documento operacional e o oficial supervisor.','Confira o documento e o supervisor, se informados.');
 old_text := 'status=''autorizado'', document_reference=btrim(p_document_reference),';
 if position(old_text in definition)=0 then raise exception 'Finalização GV mudou.'; end if;
 definition:=replace(definition,old_text,'status=case when nullif(btrim(p_document_reference),'''') is null then ''em_definicao'' else ''autorizado'' end, document_reference=nullif(btrim(p_document_reference),''''),');
 definition:=replace(definition,'officer_name=btrim(p_officer_name)','officer_name=nullif(btrim(p_officer_name),'''')');
 definition:=replace(definition,'planned_supervisor_name=btrim(p_officer_name)','planned_supervisor_name=nullif(btrim(p_officer_name),'''')');
 execute definition;

 -- O supervisor pode já ter sido identificado antes do documento.
 select pg_get_functiondef('public.internship_formalize_published_lifeguard_plan(uuid,date,text,text)'::regprocedure) into definition;
 definition:=replace(definition,'or v_plan.document_reference is not null or v_plan.officer_name is not null','or v_plan.document_reference is not null');
 execute definition;
end $$;
notify pgrst, 'reload schema';
