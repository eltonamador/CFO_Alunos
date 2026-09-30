-- Contatos de oficiais confirmados na liberação da avaliação digital.
-- O convite do cadete é apenas uma sugestão; só o remetente conferido entra aqui.
create table public.internship_verified_officer_contacts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.internship_programs(id) on delete restrict,
  officer_name text not null check (length(btrim(officer_name)) between 3 and 120),
  officer_name_key text generated always as (lower(btrim(officer_name))) stored,
  phone text not null check (phone ~ '^55[0-9]{10,11}$'),
  source_evaluation_id uuid not null references public.internship_evaluations(id) on delete restrict,
  verified_at timestamptz not null,
  verified_by uuid not null references auth.users(id),
  unique (program_id, officer_name_key)
);
alter table public.internship_verified_officer_contacts enable row level security;
revoke all on public.internship_verified_officer_contacts from public, anon, authenticated;
grant select on public.internship_verified_officer_contacts to authenticated;
create policy internship_verified_officer_contacts_manager_read
  on public.internship_verified_officer_contacts for select to authenticated
  using (public.internship_can_manage());

create trigger internship_verified_officer_contacts_audit
  after insert or update on public.internship_verified_officer_contacts
  for each row execute function public.internship_audit_change();

-- Preserva as confirmações já registradas antes desta migração.
insert into public.internship_verified_officer_contacts (
  program_id, officer_name, phone, source_evaluation_id, verified_at, verified_by
)
select distinct on (sh.program_id, lower(btrim(coalesce(e.evaluator_name, e.recipient_name))))
  sh.program_id, btrim(coalesce(e.evaluator_name, e.recipient_name)),
  e.whatsapp_sender_phone, e.id, e.whatsapp_verified_at, e.whatsapp_verified_by
from public.internship_evaluations e
join public.internship_assignments a on a.id = e.assignment_id
join public.internship_shifts sh on sh.id = a.shift_id
where e.source = 'digital' and e.status = 'liberada'
  and e.whatsapp_sender_phone ~ '^55[0-9]{10,11}$'
  and e.whatsapp_verified_at is not null and e.whatsapp_verified_by is not null
order by sh.program_id, lower(btrim(coalesce(e.evaluator_name, e.recipient_name))),
  e.whatsapp_verified_at desc, e.id desc;

create function public.internship_save_verified_officer_contact()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_program_id uuid;
begin
  if new.source <> 'digital' or new.status <> 'liberada'
    or old.status is not distinct from 'liberada'
    or new.whatsapp_sender_phone is null or new.whatsapp_verified_at is null then
    return new;
  end if;
  select sh.program_id into v_program_id
    from public.internship_assignments a
    join public.internship_shifts sh on sh.id = a.shift_id
    where a.id = new.assignment_id;
  insert into public.internship_verified_officer_contacts (
    program_id, officer_name, phone, source_evaluation_id, verified_at, verified_by
  ) values (
    v_program_id, btrim(coalesce(new.evaluator_name, new.recipient_name)),
    new.whatsapp_sender_phone, new.id, new.whatsapp_verified_at, new.whatsapp_verified_by
  ) on conflict (program_id, officer_name_key) do update set
    officer_name = excluded.officer_name,
    phone = excluded.phone,
    source_evaluation_id = excluded.source_evaluation_id,
    verified_at = excluded.verified_at,
    verified_by = excluded.verified_by;
  return new;
end;
$$;
revoke all on function public.internship_save_verified_officer_contact()
  from public, anon, authenticated;
create trigger internship_evaluation_verified_officer_contact
  after update of status on public.internship_evaluations
  for each row execute function public.internship_save_verified_officer_contact();

notify pgrst, 'reload schema';
