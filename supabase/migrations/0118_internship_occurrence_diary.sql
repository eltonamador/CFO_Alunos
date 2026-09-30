-- Diário de ocorrências do estágio: registro pessoal, extraoficial e narrativo do cadete.
-- Não integra o PPC, não altera carga horária, avaliação nem escalas. Não há fila de aprovação:
-- rascunhos ficam só com o cadete; registros salvos também são lidos pela Coordenação; os
-- compartilhados aparecem no mural da turma, e a Coordenação pode destacá-los ou ocultá-los depois.
create table public.internship_diary_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  assignment_id uuid references public.internship_assignments(id) on delete set null,
  status text not null default 'rascunho'
    check (status in ('rascunho','pessoal','compartilhado')),
  occurred_on date not null default ((now() at time zone 'America/Belem')::date),
  summary text not null default '' check (length(summary) <= 200),
  occurrence_type text check (occurrence_type ~ '^[a-z_]{2,40}$'),
  other_type text check (length(other_type) <= 80),
  severity text check (severity in ('leve','moderada','grave')),
  participation text check (participation in ('observei','apoiei','atuei')),
  vehicle text check (length(vehicle) <= 60),
  perception text check (length(perception) <= 2000),
  description text check (length(description) <= 4000),
  companion_ids uuid[] not null default '{}' check (cardinality(companion_ids) <= 30),
  protocol_number text check (length(protocol_number) <= 40),
  shared_at timestamptz,
  featured_at timestamptz,
  featured_by uuid references auth.users(id) on delete set null,
  hidden_at timestamptz,
  hidden_by uuid references auth.users(id) on delete set null,
  hidden_reason text check (length(hidden_reason) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Só "o que aconteceu" é exigido, e apenas quando o registro sai do rascunho.
  check (status = 'rascunho' or length(btrim(summary)) >= 3)
);
create index internship_diary_entries_student
  on public.internship_diary_entries(student_id, occurred_on desc);
create index internship_diary_entries_mural on public.internship_diary_entries(shared_at desc)
  where status = 'compartilhado' and hidden_at is null;

create table public.internship_diary_reactions (
  entry_id uuid not null references public.internship_diary_entries(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('aplauso','aprendi')),
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id, kind)
);

create function public.internship_diary_is_coordination() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p
    where p.id = auth.uid() and p.active and p.role = 'coordenacao');
$$;
revoke all on function public.internship_diary_is_coordination() from public, anon;
grant execute on function public.internship_diary_is_coordination() to authenticated;

-- Autor da mesma turma do cadete autenticado (inclui o próprio cadete).
create function public.internship_diary_classmate(p_student_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles me
    join public.students mine on mine.id = me.student_id and mine.deleted_at is null
    join public.students author on author.id = p_student_id and author.class_id = mine.class_id
    where me.id = auth.uid() and me.active and me.role = 'aluno'
  );
$$;
revoke all on function public.internship_diary_classmate(uuid) from public, anon;
grant execute on function public.internship_diary_classmate(uuid) to authenticated;

create function public.internship_diary_can_react(p_entry_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.internship_diary_entries e
    where e.id = p_entry_id and e.status = 'compartilhado' and e.hidden_at is null
      and e.student_id is distinct from public.current_student_id()
      and (public.internship_diary_classmate(e.student_id)
        or public.internship_diary_is_coordination())
  );
$$;
revoke all on function public.internship_diary_can_react(uuid) from public, anon;
grant execute on function public.internship_diary_can_react(uuid) to authenticated;

create function public.internship_diary_guard_entry() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_class_id uuid;
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.student_id := old.student_id;
    new.created_at := old.created_at;
    if auth.uid() is not null and old.student_id is distinct from public.current_student_id() then
      -- Só a moderação da Coordenação chega aqui; o relato do cadete fica intacto.
      new.assignment_id := old.assignment_id;
      new.status := old.status;
      new.occurred_on := old.occurred_on;
      new.summary := old.summary;
      new.occurrence_type := old.occurrence_type;
      new.other_type := old.other_type;
      new.severity := old.severity;
      new.participation := old.participation;
      new.vehicle := old.vehicle;
      new.perception := old.perception;
      new.description := old.description;
      new.companion_ids := old.companion_ids;
      new.protocol_number := old.protocol_number;
      new.shared_at := old.shared_at;
      new.updated_at := old.updated_at;
      return new;
    end if;
    -- O cadete não altera a moderação nem devolve um registro salvo ao rascunho.
    new.featured_at := old.featured_at;
    new.featured_by := old.featured_by;
    new.hidden_at := old.hidden_at;
    new.hidden_by := old.hidden_by;
    new.hidden_reason := old.hidden_reason;
    if old.status <> 'rascunho' and new.status = 'rascunho' then
      new.status := old.status;
    end if;
    new.updated_at := now();
  else
    new.featured_at := null;
    new.featured_by := null;
    new.hidden_at := null;
    new.hidden_by := null;
    new.hidden_reason := null;
    new.created_at := now();
    new.updated_at := now();
  end if;

  if new.status <> 'compartilhado' then
    new.shared_at := null;
  elsif tg_op = 'INSERT' or old.status <> 'compartilhado' then
    new.shared_at := now();
  end if;

  if new.assignment_id is not null
    and (tg_op = 'INSERT' or new.assignment_id is distinct from old.assignment_id)
    and not exists (select 1 from public.internship_assignments a
      where a.id = new.assignment_id and a.student_id = new.student_id) then
    raise exception 'Plantão não encontrado entre os seus.' using errcode = '23514';
  end if;

  -- Colegas marcados: apenas da mesma turma, sem repetição e sem o próprio autor.
  select s.class_id into v_class_id from public.students s where s.id = new.student_id;
  new.companion_ids := array(
    select s.id from public.students s
    where s.id = any(coalesce(new.companion_ids, '{}')) and s.id <> new.student_id
      and s.class_id = v_class_id and s.deleted_at is null
    order by s.student_number, s.id
  );
  return new;
end;
$$;
revoke all on function public.internship_diary_guard_entry() from public, anon, authenticated;
create trigger internship_diary_guard_entry before insert or update
  on public.internship_diary_entries
  for each row execute function public.internship_diary_guard_entry();

-- Sem aprovação prévia: a Coordenação destaca ou oculta um relato depois de compartilhado.
create function public.internship_diary_moderate(
  p_entry_id uuid, p_action text, p_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.internship_diary_is_coordination() then
    raise exception 'Acesso restrito à Coordenação.' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('destacar','remover_destaque','ocultar','reexibir') then
    raise exception 'Ação de moderação inválida.' using errcode = '22023';
  end if;
  update public.internship_diary_entries set
    featured_at = case when p_action = 'destacar' then now()
      when p_action in ('remover_destaque','ocultar') then null else featured_at end,
    featured_by = case when p_action = 'destacar' then auth.uid()
      when p_action in ('remover_destaque','ocultar') then null else featured_by end,
    hidden_at = case when p_action = 'ocultar' then now()
      when p_action = 'reexibir' then null else hidden_at end,
    hidden_by = case when p_action = 'ocultar' then auth.uid()
      when p_action = 'reexibir' then null else hidden_by end,
    hidden_reason = case when p_action = 'ocultar' then nullif(left(btrim(coalesce(p_reason, '')), 300), '')
      when p_action = 'reexibir' then null else hidden_reason end
  where id = p_entry_id and status = 'compartilhado';
  if not found then
    raise exception 'Este relato não está compartilhado no mural.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.internship_diary_moderate(uuid,text,text) from public, anon;
grant execute on function public.internship_diary_moderate(uuid,text,text) to authenticated;

alter table public.internship_diary_entries enable row level security;
alter table public.internship_diary_reactions enable row level security;
revoke all on public.internship_diary_entries, public.internship_diary_reactions
  from public, anon, authenticated;

create policy internship_diary_entries_own on public.internship_diary_entries
  for all to authenticated
  using (public.internship_has_role(array['aluno']) and student_id = public.current_student_id())
  with check (public.internship_has_role(array['aluno'])
    and student_id = public.current_student_id());
create policy internship_diary_entries_mural on public.internship_diary_entries
  for select to authenticated
  using (status = 'compartilhado' and hidden_at is null
    and public.internship_diary_classmate(student_id));
create policy internship_diary_entries_coordination on public.internship_diary_entries
  for select to authenticated
  using (status <> 'rascunho' and public.internship_diary_is_coordination());

create policy internship_diary_reactions_read on public.internship_diary_reactions
  for select to authenticated
  using (exists (select 1 from public.internship_diary_entries e where e.id = entry_id));
create policy internship_diary_reactions_insert on public.internship_diary_reactions
  for insert to authenticated
  with check (user_id = auth.uid() and public.internship_diary_can_react(entry_id));
create policy internship_diary_reactions_delete on public.internship_diary_reactions
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.internship_diary_entries to authenticated;
grant select, insert, delete on public.internship_diary_reactions to authenticated;

notify pgrst, 'reload schema';
