-- O cadete autenticado pode indicar o oficial do próprio plantão e encaminhar
-- um convite individual. A resposta continua disponível somente após o fim do
-- serviço e permanece sujeita à revisão da Coordenação.
create function public.internship_create_cadet_evaluation_invite(
  p_assignment_id uuid, p_recipient_name text, p_recipient_contact text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_context jsonb;
  v_student_id uuid;
  v_status text;
  v_token text;
  v_id uuid;
  v_version integer;
  v_expiry timestamptz;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role = 'aluno'
  ) then
    raise exception 'Acesso reservado ao cadete.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_recipient_name,''))) not between 3 and 120
    or length(btrim(coalesce(p_recipient_contact,''))) not between 3 and 200 then
    raise exception 'Informe o nome do oficial e o contato de destino.' using errcode = '23514';
  end if;
  select student_id into v_student_id
    from public.internship_assignments where id = p_assignment_id for update;
  if v_student_id is null or v_student_id is distinct from public.current_student_id() then
    raise exception 'Plantão indisponível para este cadete.' using errcode = '42501';
  end if;
  v_context := public.internship_evaluation_context(p_assignment_id);
  if v_context is null then
    raise exception 'Plantão indisponível.' using errcode = '23514';
  end if;
  if now() < (v_context->>'starts_at')::timestamptz
    or now() > (v_context->>'ends_at')::timestamptz + interval '7 days' then
    raise exception 'O convite pode ser gerado a partir do início do plantão e até sete dias após o término.'
      using errcode = '23514';
  end if;
  select status into v_status from public.internship_evaluations
    where assignment_id = p_assignment_id order by version desc limit 1;
  if v_status in ('respondida','liberada') then
    raise exception 'A avaliação já foi recebida. Aguarde a revisão da Coordenação.'
      using errcode = '23514';
  end if;
  update public.internship_evaluations set status = 'revogada'
    where assignment_id = p_assignment_id and status = 'aguardando';
  select coalesce(max(version),0) + 1 into v_version
    from public.internship_evaluations where assignment_id = p_assignment_id;
  v_token := encode(extensions.gen_random_bytes(32),'hex');
  v_expiry := greatest(now(),(v_context->>'ends_at')::timestamptz) + interval '7 days';
  insert into public.internship_evaluations (
    assignment_id,version,student_id,context,source,recipient_name,
    recipient_contact,token_hash,expires_at,created_by
  ) values (
    p_assignment_id,v_version,v_student_id,v_context,'digital',
    btrim(p_recipient_name),btrim(p_recipient_contact),
    encode(extensions.digest(v_token,'sha256'),'hex'),v_expiry,auth.uid()
  ) returning id into v_id;
  return jsonb_build_object('id',v_id,'token',v_token,'expires_at',v_expiry);
end;
$$;
revoke all on function public.internship_create_cadet_evaluation_invite(uuid,text,text)
  from public, anon;
grant execute on function public.internship_create_cadet_evaluation_invite(uuid,text,text)
  to authenticated;

create function public.internship_my_evaluation_invites() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role = 'aluno'
  ) then
    raise exception 'Acesso reservado ao cadete.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'assignment_id', latest.assignment_id,
      'id', latest.id,
      'status', latest.status,
      'recipient_name', latest.recipient_name,
      'recipient_contact', latest.recipient_contact,
      'expires_at', latest.expires_at,
      'submitted_at', latest.submitted_at
    )) from (
      select distinct on (e.assignment_id)
        e.assignment_id,e.id,e.status,e.recipient_name,e.recipient_contact,
        e.expires_at,e.submitted_at
      from public.internship_evaluations e
      where e.student_id = public.current_student_id()
      order by e.assignment_id,e.version desc
    ) latest
  ),'[]'::jsonb);
end;
$$;
revoke all on function public.internship_my_evaluation_invites() from public, anon;
grant execute on function public.internship_my_evaluation_invites() to authenticated;

notify pgrst, 'reload schema';
