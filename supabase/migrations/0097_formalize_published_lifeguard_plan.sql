-- Completa documento e oficial sem recriar nem interromper a escala publicada.
create function public.internship_formalize_published_lifeguard_plan(
  p_program_id uuid, p_shift_date date, p_document_reference text, p_officer_name text
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_plan public.internship_operation_plans; v_count integer;
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do estágio.' using errcode='42501';
  end if;
  if length(btrim(coalesce(p_document_reference,'')))<5
    or length(btrim(coalesce(p_officer_name,''))) not between 3 and 120 then
    raise exception 'Informe documento operacional e oficial supervisor.' using errcode='23514';
  end if;
  select * into v_plan from public.internship_operation_plans
    where program_id=p_program_id and code='guarda_vida_'||to_char(p_shift_date,'YYYYMMDD')
    for update;
  if v_plan.id is null or v_plan.status<>'em_definicao'
    or (v_plan.starts_at at time zone 'America/Belem')::date<>p_shift_date
    or v_plan.document_reference is not null or v_plan.officer_name is not null then
    raise exception 'Plano publicado pendente não encontrado.' using errcode='23514';
  end if;
  select count(*) into v_count from public.internship_shifts sh
    join public.internship_assignments a on a.shift_id=sh.id and a.status='prevista'
    join public.internship_sites site on site.id=sh.site_id
    where sh.operation_plan_id=v_plan.id and sh.status='publicado'
      and site.site_type='praia' and site.code in
        ('praia_1','praia_2','praia_3','praia_4','praia_5')
      and sh.starts_at=v_plan.starts_at and sh.ends_at=v_plan.ends_at;
  if v_count<>5 or
    (select count(distinct sh.site_id) from public.internship_shifts sh
      where sh.operation_plan_id=v_plan.id and sh.status='publicado')<>5 or
    (select count(distinct a.student_id) from public.internship_assignments a
      join public.internship_shifts sh on sh.id=a.shift_id
      where sh.operation_plan_id=v_plan.id and a.status='prevista')<>5 then
    raise exception 'A escala precisa ter cinco postos e cinco cadetes distintos.' using errcode='23514';
  end if;
  update public.internship_operation_plans set
    status='autorizado', document_reference=btrim(p_document_reference),
    officer_name=btrim(p_officer_name),authorized_by=auth.uid(),authorized_at=now(),
    title='Guarda-vidas '||to_char(p_shift_date,'DD/MM/YYYY')||' — documento formalizado'
    where id=v_plan.id;
  return v_plan.id;
end $$;
revoke all on function public.internship_formalize_published_lifeguard_plan(uuid,date,text,text)
  from public,anon;
grant execute on function public.internship_formalize_published_lifeguard_plan(uuid,date,text,text)
  to authenticated;
notify pgrst, 'reload schema';
