-- Permite a carga inicial por manutenção sem atribuir falsamente a mudança a
-- um usuário. Alterações pela tela continuam registrando o gestor autenticado.
alter table public.internship_evaluation_whatsapp_contacts
  alter column updated_by drop not null;

create function public.internship_audit_evaluation_whatsapp_contacts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(
    actor_id, actor_role, entity, entity_id, action,
    before_data, after_data, reason
  ) values (
    auth.uid(), public.current_role(), tg_table_name, new.program_id,
    lower(tg_op),
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new),
    'Destinatários de WhatsApp para confirmação das avaliações de estágio.'
  );
  return new;
end;
$$;
revoke all on function public.internship_audit_evaluation_whatsapp_contacts()
  from public, anon, authenticated;
create trigger internship_evaluation_whatsapp_contacts_audit
  after insert or update on public.internship_evaluation_whatsapp_contacts
  for each row execute function public.internship_audit_evaluation_whatsapp_contacts();
