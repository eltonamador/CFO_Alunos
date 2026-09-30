-- A avaliação permanece no sistema. O oficial envia um comprovante pelo seu
-- próprio WhatsApp e a Coordenação confere o remetente antes de liberá-la.
create table public.internship_evaluation_whatsapp_contacts (
  program_id uuid primary key references public.internship_programs(id) on delete cascade,
  primary_phone text not null check (primary_phone ~ '^55[0-9]{10,11}$'),
  secondary_phone text check (secondary_phone is null or secondary_phone ~ '^55[0-9]{10,11}$'),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id),
  check (secondary_phone is distinct from primary_phone)
);
alter table public.internship_evaluation_whatsapp_contacts enable row level security;
revoke all on public.internship_evaluation_whatsapp_contacts from public, anon, authenticated;
grant select, insert, update on public.internship_evaluation_whatsapp_contacts to authenticated;
create policy internship_evaluation_whatsapp_contacts_manager_read
  on public.internship_evaluation_whatsapp_contacts for select to authenticated
  using (public.internship_can_manage());
create policy internship_evaluation_whatsapp_contacts_manager_insert
  on public.internship_evaluation_whatsapp_contacts for insert to authenticated
  with check (public.internship_can_manage());
create policy internship_evaluation_whatsapp_contacts_manager_update
  on public.internship_evaluation_whatsapp_contacts for update to authenticated
  using (public.internship_can_manage()) with check (public.internship_can_manage());

alter table public.internship_evaluations
  add column whatsapp_targets text[] not null default '{}'::text[],
  add column whatsapp_sender_phone text
    check (whatsapp_sender_phone is null or whatsapp_sender_phone ~ '^55[0-9]{10,11}$'),
  add column whatsapp_verified_at timestamptz,
  add column whatsapp_verified_by uuid references auth.users(id);

create function public.internship_capture_evaluation_whatsapp_targets()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_primary text; v_secondary text;
begin
  if new.source = 'digital' and new.status = 'respondida'
    and old.status is distinct from 'respondida' then
    select c.primary_phone, c.secondary_phone into v_primary, v_secondary
      from public.internship_evaluation_whatsapp_contacts c
      join public.internship_shifts sh on sh.program_id = c.program_id
      join public.internship_assignments a on a.shift_id = sh.id
      where a.id = new.assignment_id;
    new.whatsapp_targets := array_remove(array[v_primary, v_secondary], null);
  end if;
  return new;
end;
$$;
revoke all on function public.internship_capture_evaluation_whatsapp_targets()
  from public, anon, authenticated;
create trigger internship_evaluation_whatsapp_targets
  before update of status on public.internship_evaluations
  for each row execute function public.internship_capture_evaluation_whatsapp_targets();

-- O token individual só revela a confirmação da própria avaliação respondida.
create function public.internship_evaluation_whatsapp_delivery(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e public.internship_evaluations;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return null; end if;
  select * into e from public.internship_evaluations
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if e.id is null or e.source <> 'digital'
    or e.status not in ('respondida', 'liberada')
    or e.submitted_at is null or e.submitted_at < now() - interval '30 days' then
    return null;
  end if;
  return jsonb_build_object(
    'evaluation_id', e.id,
    'protocol', 'AV-' || upper(e.id::text),
    'evaluator_name', e.evaluator_name,
    'context', e.context,
    'submitted_at', e.submitted_at,
    'phones', to_jsonb(e.whatsapp_targets)
  );
end;
$$;
revoke all on function public.internship_evaluation_whatsapp_delivery(text) from public;
grant execute on function public.internship_evaluation_whatsapp_delivery(text)
  to anon, authenticated;

-- A liberação digital com destinatários configurados exige a conferência
-- registrada do WhatsApp; avaliações anteriores seguem o fluxo anterior.
create or replace function public.internship_review_evaluation(
  p_id uuid, p_decision text, p_note text, p_identity_confirmed boolean
) returns void language plpgsql security definer set search_path = public as $$
declare e public.internship_evaluations;
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  select * into e from public.internship_evaluations where id = p_id for update;
  if e.status is distinct from 'respondida'
    or p_decision is null or p_decision not in ('liberada', 'devolvida') then
    raise exception 'Avaliação indisponível para revisão.' using errcode = '23514';
  end if;
  if p_decision = 'liberada' and p_identity_confirmed is distinct from true then
    raise exception 'Confirme a identidade do avaliador.' using errcode = '23514';
  end if;
  if p_decision = 'liberada' and e.source = 'digital'
    and cardinality(e.whatsapp_targets) > 0 and e.whatsapp_verified_at is null then
    raise exception 'Confira o protocolo e o remetente no WhatsApp da Coordenação.'
      using errcode = '23514';
  end if;
  if length(coalesce(p_note, '')) > 1000
    or (p_decision = 'devolvida' and length(btrim(coalesce(p_note, ''))) < 5) then
    raise exception 'Informe o motivo da devolução.' using errcode = '23514';
  end if;
  update public.internship_evaluations set status = p_decision,
    reviewed_by = auth.uid(), reviewed_at = now(),
    review_note = nullif(btrim(p_note), '') where id = p_id;
end;
$$;

create function public.internship_review_evaluation_with_whatsapp(
  p_id uuid, p_decision text, p_note text,
  p_identity_confirmed boolean, p_whatsapp_sender_phone text
) returns void language plpgsql security definer set search_path = public as $$
declare e public.internship_evaluations;
begin
  if not public.internship_can_manage() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  select * into e from public.internship_evaluations where id = p_id for update;
  if e.status is distinct from 'respondida' then
    raise exception 'Avaliação indisponível para revisão.' using errcode = '23514';
  end if;
  if p_decision = 'liberada' and e.source = 'digital'
    and cardinality(e.whatsapp_targets) > 0 then
    if p_identity_confirmed is distinct from true
      or p_whatsapp_sender_phone is null
      or p_whatsapp_sender_phone !~ '^55[0-9]{10,11}$' then
      raise exception 'Informe o número remetente do WhatsApp e confirme o oficial.'
        using errcode = '23514';
    end if;
    update public.internship_evaluations
      set whatsapp_sender_phone = p_whatsapp_sender_phone,
          whatsapp_verified_at = now(), whatsapp_verified_by = auth.uid()
      where id = p_id;
  end if;
  perform public.internship_review_evaluation(
    p_id, p_decision, p_note, p_identity_confirmed
  );
end;
$$;
revoke all on function public.internship_review_evaluation_with_whatsapp(
  uuid, text, text, boolean, text
) from public, anon;
grant execute on function public.internship_review_evaluation_with_whatsapp(
  uuid, text, text, boolean, text
) to authenticated;

notify pgrst, 'reload schema';
