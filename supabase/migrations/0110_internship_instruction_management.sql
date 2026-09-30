-- Cadastro explícito de instruções. Não importa nem altera o QTS automaticamente.
alter table public.internship_instruction_blocks add column updated_at timestamptz not null default now();
create trigger internship_instruction_audit after insert or update on public.internship_instruction_blocks
  for each row execute function public.internship_audit_change();

create function public.internship_save_instruction(
 p_program_id uuid, p_title text, p_starts_at timestamptz, p_ends_at timestamptz,
 p_source_reference text default '', p_id uuid default null,
 p_expected_updated_at timestamptz default null, p_active boolean default true
) returns uuid language plpgsql security definer set search_path=public as $$
declare p public.internship_programs; old_row public.internship_instruction_blocks; result uuid;
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito.' using errcode='42501'; end if;
 select * into strict p from public.internship_programs where id=p_program_id and status='publicado';
 if p_title is null or length(btrim(p_title)) not between 3 and 120
   or p_starts_at is null or p_ends_at is null or p_ends_at<=p_starts_at
   or p_ends_at-p_starts_at>interval '24 hours' or p_active is null
   or (p_starts_at at time zone p.timezone)::date<p.starts_on
   or ((p_ends_at-interval '1 second') at time zone p.timezone)::date>p.ends_on
   or length(coalesce(p_source_reference,''))>500 then
   raise exception 'Revise título, horários e período da instrução.' using errcode='23514';
 end if;
 if p_id is null then
   if not p_active then raise exception 'Nova instrução deve estar ativa.' using errcode='23514'; end if;
   insert into public.internship_instruction_blocks(program_id,title,starts_at,ends_at,source_reference,created_by)
   values(p_program_id,btrim(p_title),p_starts_at,p_ends_at,
     case when length(btrim(coalesce(p_source_reference,'')))>=5 then btrim(p_source_reference) else 'Cadastro da administração do estágio' end,auth.uid()) returning id into result;
 else
   select * into strict old_row from public.internship_instruction_blocks where id=p_id and program_id=p_program_id for update;
   if old_row.updated_at is distinct from p_expected_updated_at then
     raise exception 'A instrução mudou. Atualize a página antes de salvar.' using errcode='40001';
   end if;
   update public.internship_instruction_blocks set title=btrim(p_title),starts_at=p_starts_at,ends_at=p_ends_at,
     source_reference=case when length(btrim(coalesce(p_source_reference,'')))>=5 then btrim(p_source_reference) else 'Cadastro da administração do estágio' end,
     active=p_active,updated_at=clock_timestamp() where id=p_id returning id into result;
 end if;
 return result;
end $$;
revoke all on function public.internship_save_instruction(uuid,text,timestamptz,timestamptz,text,uuid,timestamptz,boolean) from public,anon;
grant execute on function public.internship_save_instruction(uuid,text,timestamptz,timestamptz,text,uuid,timestamptz,boolean) to authenticated;

-- Revalidação ao vivo: não congela alertas que poderiam ficar desatualizados.
-- Permanência na academia é aviso de sobreaviso; só o estágio externo é conflito impeditivo.
create function public.internship_instruction_conflicts(p_program_id uuid)
returns table(instruction_id uuid,instruction_title text,assignment_id uuid,service_id uuid,
 service_kind text,site_name text,war_name text,starts_at timestamptz,ends_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito.' using errcode='42501'; end if;
 return query
 select b.id,b.title,a.id,s.id,site.site_type,site.name,st.war_name,s.starts_at,s.ends_at
 from public.internship_instruction_blocks b
 join public.internship_shifts s on s.program_id=b.program_id and s.status='publicado'
   and tstzrange(s.starts_at,s.ends_at,'[)') && tstzrange(b.starts_at,b.ends_at,'[)')
 join public.internship_assignments a on a.shift_id=s.id and a.status='prevista'
 join public.students st on st.id=a.student_id
 join public.internship_sites site on site.id=s.site_id
 where b.program_id=p_program_id and b.active and s.ends_at>now()
 union all
 select b.id,b.title,a.id,r.id,'permanencia'::text,ps.location,st.war_name,ps.starts_at,ps.ends_at
 from public.internship_instruction_blocks b
 join public.internship_programs p on p.id=b.program_id
 join public.duty_rosters r on r.class_id=p.class_id and r.status='publicada'
 join public.duty_permanence_services ps on ps.roster_id=r.id
   and tstzrange(ps.starts_at,ps.ends_at,'[)') && tstzrange(b.starts_at,b.ends_at,'[)')
 join public.duty_assignments a on a.roster_id=r.id and a.status in ('prevista','confirmada')
 join public.students st on st.id=a.student_id
 where b.program_id=p_program_id and b.active and ps.ends_at>now();
end $$;
revoke all on function public.internship_instruction_conflicts(uuid) from public,anon;
grant execute on function public.internship_instruction_conflicts(uuid) to authenticated;
notify pgrst,'reload schema';
