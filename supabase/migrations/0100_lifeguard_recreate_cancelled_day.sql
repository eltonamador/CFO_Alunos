-- A limpeza de escalas preserva planos e turnos cancelados. Libera o código
-- do dia apenas ao publicar a nova escala; falhas desfazem tudo na transação.
do $$
declare definition text; marker text;
begin
 select pg_get_functiondef('public.internship_guard_operation_plan()'::regprocedure) into definition;
 marker := 'if old.status in (''autorizado'',''executado'',''encerrado'') then';
 if position(marker in definition)=0 then raise exception 'Guarda de plano mudou.'; end if;
 definition:=replace(definition,marker,
 'if old.code ~ ''^guarda_vida_[0-9]{8}$'' and old.status in (''reserva'',''em_definicao'',''autorizado'')
    and new.code=old.code||''_historico_''||old.id::text
    and (to_jsonb(new)-''code'')=(to_jsonb(old)-''code'')
    and not exists(select 1 from public.internship_shifts s where s.operation_plan_id=old.id and s.status<>''cancelado'') then
    return new;
  end if;
  '||marker);
 execute definition;

 select pg_get_functiondef('public.internship_schedule_lifeguard_day(uuid,date,uuid[],text,text)'::regprocedure) into definition;
 marker := 'insert into public.internship_operation_plans(program_id,code,title,status,';
 if position(marker in definition)=0 then raise exception 'Publicador de GV mudou.'; end if;
 definition:=replace(definition,marker,
 'select id into v_plan_id from public.internship_operation_plans
    where program_id=p_program_id and code=''guarda_vida_''||to_char(p_shift_date,''YYYYMMDD'') for update;
  if v_plan_id is not null then
    if exists(select 1 from public.internship_shifts where operation_plan_id=v_plan_id and status<>''cancelado'')
      or exists(select 1 from public.internship_operation_plans where id=v_plan_id and status in (''executado'',''encerrado'')) then
      raise exception ''Já existe escala de guarda-vidas nesta data. Consulte a agenda.'' using errcode=''23514'';
    end if;
    update public.internship_operation_plans set code=code||''_historico_''||id::text where id=v_plan_id;
  end if;
  '||marker);
 execute definition;
end $$;
notify pgrst, 'reload schema';
