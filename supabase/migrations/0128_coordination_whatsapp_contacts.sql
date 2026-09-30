-- Contatos de entrega dos acessos; os números são inseridos por operação privada.
alter table public.cfo_coordination_members
  add column whatsapp_phone text
  constraint cfo_coordination_members_whatsapp_phone_format
    check (whatsapp_phone is null or whatsapp_phone ~ '^55[0-9]{11}$');

create unique index cfo_coordination_members_whatsapp_phone_unique
  on public.cfo_coordination_members (whatsapp_phone)
  where whatsapp_phone is not null;
