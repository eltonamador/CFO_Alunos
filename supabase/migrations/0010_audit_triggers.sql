-- =====================================================================
-- 0010 — Triggers de auditoria automática para tabelas sensíveis
-- =====================================================================

-- Função genérica de log para INSERT/UPDATE/DELETE.
-- Detecta o autor via auth.uid() (pode ser null em jobs).
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  role_label text;
  before_json jsonb;
  after_json jsonb;
  entity_id_val uuid;
begin
  select role into role_label from public.profiles where id = actor;

  if (tg_op = 'INSERT') then
    after_json := to_jsonb(new);
    before_json := null;
    entity_id_val := (new.id)::uuid;
  elsif (tg_op = 'UPDATE') then
    before_json := to_jsonb(old);
    after_json := to_jsonb(new);
    entity_id_val := (new.id)::uuid;
  elsif (tg_op = 'DELETE') then
    before_json := to_jsonb(old);
    after_json := null;
    entity_id_val := (old.id)::uuid;
  end if;

  insert into public.audit_logs (actor_id, actor_role, entity, entity_id, action, before_data, after_data)
  values (actor, role_label, tg_table_name, entity_id_val, lower(tg_op), before_json, after_json);

  if tg_op = 'DELETE' then return old; end if;
  return new;
exception
  when others then
    -- Auditoria nunca deve bloquear a operação principal.
    if tg_op = 'DELETE' then return old; end if;
    return new;
end;
$$;

-- Variação para tabelas com PK composta (health_restrictions usa student_id como PK).
create or replace function public.audit_trigger_student_pk()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  role_label text;
  before_json jsonb;
  after_json jsonb;
  entity_id_val uuid;
begin
  select role into role_label from public.profiles where id = actor;

  if (tg_op = 'INSERT') then
    after_json := to_jsonb(new);
    entity_id_val := (new.student_id)::uuid;
  elsif (tg_op = 'UPDATE') then
    before_json := to_jsonb(old);
    after_json := to_jsonb(new);
    entity_id_val := (new.student_id)::uuid;
  elsif (tg_op = 'DELETE') then
    before_json := to_jsonb(old);
    entity_id_val := (old.student_id)::uuid;
  end if;

  insert into public.audit_logs (actor_id, actor_role, entity, entity_id, action, before_data, after_data)
  values (actor, role_label, tg_table_name, entity_id_val, lower(tg_op), before_json, after_json);

  if tg_op = 'DELETE' then return old; end if;
  return new;
exception
  when others then
    if tg_op = 'DELETE' then return old; end if;
    return new;
end;
$$;

-- Tabelas auditadas (sensíveis):
create trigger trg_audit_students
  after insert or update or delete on public.students
  for each row execute function public.audit_trigger();

create trigger trg_audit_health
  after insert or update or delete on public.health_restrictions
  for each row execute function public.audit_trigger_student_pk();

create trigger trg_audit_documents
  after insert or update or delete on public.documents
  for each row execute function public.audit_trigger();

create trigger trg_audit_canga
  after insert or update or delete on public.canga_assignments
  for each row execute function public.audit_trigger();

create trigger trg_audit_emergency
  after insert or update or delete on public.emergency_contacts
  for each row execute function public.audit_trigger();
