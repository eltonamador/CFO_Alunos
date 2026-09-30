-- Emissões não distribuídas podem ser desconsideradas pela manutenção autorizada.
-- Os arquivos antigos permanecem auditáveis e não concorrem com a numeração válida.
alter table public.internship_scale_numbers
  add column voided_at timestamptz,
  add column void_reason text,
  add constraint internship_scale_number_void_reason check (
    (voided_at is null and void_reason is null) or
    (voided_at is not null and length(btrim(void_reason)) >= 5)
  );
alter table public.internship_scale_numbers
  drop constraint internship_scale_numbers_program_id_sequence_year_sequence__key;
drop index public.internship_scale_numbers_identity;
create unique index internship_scale_numbers_active_sequence
  on public.internship_scale_numbers(program_id,sequence_year,sequence_number) where voided_at is null;
create unique index internship_scale_numbers_identity on public.internship_scale_numbers(
  program_id,service,period_start,period_end,
  coalesce(gbm_site_id,'00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(source_roster_id,'00000000-0000-0000-0000-000000000000'::uuid)
) where voided_at is null;
create trigger internship_scale_number_audit after update on public.internship_scale_numbers
  for each row execute function public.internship_audit_change();

create or replace function public.internship_issue_scale_number(
  p_program_id uuid,
  p_service text,
  p_period_start date,
  p_period_end date,
  p_gbm_site_id uuid default null,
  p_source_roster_id uuid default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_year integer;
  v_number integer;
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso restrito à administração do estágio.' using errcode = '42501';
  end if;
  if p_service not in ('estagio', 'todos', 'gbm', 'praia', 'permanencia')
    or p_period_start is null or p_period_end is null or p_period_end < p_period_start
    or (p_gbm_site_id is not null and p_service <> 'gbm')
    or (p_source_roster_id is not null and p_service <> 'permanencia') then
    raise exception 'Dados inválidos para numerar a escala.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.internship_programs
    where id = p_program_id and status = 'publicado'
  ) then
    raise exception 'Programa de estágio indisponível.' using errcode = '23514';
  end if;
  if p_gbm_site_id is not null and not exists (
    select 1 from public.internship_sites
    where id = p_gbm_site_id and program_id = p_program_id and site_type = 'gbm'
  ) then
    raise exception 'GBM inválido para esta escala.' using errcode = '23514';
  end if;
  if p_source_roster_id is not null and not exists (
    select 1 from public.duty_permanence_services ps
    join public.duty_rosters r on r.id = ps.roster_id
    join public.internship_programs p on p.class_id = r.class_id
    where ps.roster_id = p_source_roster_id and p.id = p_program_id
  ) then
    raise exception 'Permanência inválida para esta escala.' using errcode = '23514';
  end if;

  v_year := extract(year from p_period_start)::integer;
  perform pg_advisory_xact_lock(hashtext('internship-scale-number:' || p_program_id || ':' || v_year));
  select sequence_number into v_number
    from public.internship_scale_numbers
    where voided_at is null and program_id = p_program_id and service = p_service
      and period_start = p_period_start and period_end = p_period_end
      and gbm_site_id is not distinct from p_gbm_site_id
      and source_roster_id is not distinct from p_source_roster_id;
  if found then return v_number; end if;

  select coalesce(max(sequence_number), 0) + 1 into v_number
    from public.internship_scale_numbers
    where voided_at is null and program_id = p_program_id and sequence_year = v_year;
  insert into public.internship_scale_numbers (
    program_id, sequence_year, sequence_number, service,
    gbm_site_id, source_roster_id, period_start, period_end, issued_by
  ) values (
    p_program_id, v_year, v_number, p_service,
    p_gbm_site_id, p_source_roster_id, p_period_start, p_period_end, auth.uid()
  );
  return v_number;
end;
$$;

revoke all on function public.internship_issue_scale_number(uuid,text,date,date,uuid,uuid) from public, anon;
grant execute on function public.internship_issue_scale_number(uuid,text,date,date,uuid,uuid) to authenticated;

create or replace function public.internship_archive_scale_revision(
 p_scale_number_id uuid, p_expected_revision integer, p_snapshot jsonb,
 p_summary text, p_pdf_base64 text, p_issued_at timestamptz
) returns uuid language plpgsql security definer set search_path = public as $$
declare latest public.internship_scale_revisions; result uuid; number public.internship_scale_numbers;
begin
 if not public.internship_can_manage() then
   raise exception 'Acesso restrito à administração do estágio.' using errcode='42501';
 end if;
 select * into strict number from public.internship_scale_numbers where id=p_scale_number_id for update;
 if number.voided_at is not null then
   raise exception 'Emissão desconsiderada. Gere o PDF atual.' using errcode='23514';
 end if;
 select * into latest from public.internship_scale_revisions where scale_number_id=p_scale_number_id order by revision desc limit 1;
 if latest.id is not null and latest.snapshot=p_snapshot then return latest.id; end if;
 if coalesce(latest.revision,-1) is distinct from p_expected_revision then
   raise exception 'A escala foi atualizada durante a emissão. Tente novamente.' using errcode='40001';
 end if;
 if p_snapshot is null or jsonb_typeof(p_snapshot)<>'object'
   or p_snapshot->>'programId' is distinct from number.program_id::text
   or p_snapshot->>'service' is distinct from number.service
   or p_snapshot->>'periodStart' is distinct from number.period_start::text
   or p_snapshot->>'periodEnd' is distinct from number.period_end::text
   or coalesce(jsonb_typeof(p_snapshot->'rows'),'') <> 'array'
   or p_snapshot->>'signatory' not in ('coordenador','supervisor')
   or p_snapshot->>'signatory' is null
   or p_issued_at is null or abs(extract(epoch from now()-p_issued_at))>300
   or p_pdf_base64 is null or left(p_pdf_base64,7)<>'JVBERi0' then
   raise exception 'Versão da escala inválida.' using errcode='23514';
 end if;
 insert into public.internship_scale_revisions(scale_number_id,revision,snapshot,change_summary,pdf_base64,issued_at,issued_by)
 values(p_scale_number_id,coalesce(latest.revision,-1)+1,p_snapshot,p_summary,p_pdf_base64,p_issued_at,auth.uid()) returning id into result;
 return result;
end $$;
revoke all on function public.internship_archive_scale_revision(uuid,integer,jsonb,text,text,timestamptz) from public,anon;
grant execute on function public.internship_archive_scale_revision(uuid,integer,jsonb,text,text,timestamptz) to authenticated;
notify pgrst,'reload schema';
