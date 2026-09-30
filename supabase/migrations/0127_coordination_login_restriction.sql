-- Os sargentos designados ao apoio administrativo constam na equipe,
-- porém não têm autorização para receber uma conta individual de acesso.
alter table public.cfo_coordination_members
  add constraint cfo_coordination_login_authorized
  check (registration not in ('1160680', '1113666') or profile_id is null);
