-- Archive each issued PDF with its original bytes. Reprints are idempotent.
create table public.internship_scale_revisions (
  id uuid primary key default gen_random_uuid(),
  scale_number_id uuid not null references public.internship_scale_numbers(id),
  revision integer not null check (revision >= 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  change_summary text not null check (length(change_summary) between 1 and 1000),
  pdf_base64 text not null check (length(pdf_base64) between 8 and 8000000),
  issued_at timestamptz not null default now(),
  issued_by uuid not null references auth.users(id),
  unique(scale_number_id, revision)
);
alter table public.internship_scale_revisions enable row level security;
revoke all on public.internship_scale_revisions from public, anon, authenticated;
grant select on public.internship_scale_revisions to authenticated;
create policy internship_scale_revisions_manager_read on public.internship_scale_revisions
 for select to authenticated using (public.internship_can_manage());

-- Optimistic concurrency: stale renderings cannot overwrite a newer issue.
create function public.internship_archive_scale_revision(
 p_scale_number_id uuid, p_expected_revision integer, p_snapshot jsonb,
 p_summary text, p_pdf_base64 text, p_issued_at timestamptz
) returns uuid language plpgsql security definer set search_path = public as $$
declare latest public.internship_scale_revisions; result uuid; number public.internship_scale_numbers;
begin
 if not public.internship_can_manage() then
   raise exception 'Acesso restrito à administração do estágio.' using errcode='42501';
 end if;
 select * into strict number from public.internship_scale_numbers where id=p_scale_number_id for update;
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
