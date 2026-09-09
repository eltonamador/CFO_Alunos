-- =====================================================================
-- 0033 - Acompanhamento do Cadete (MVP: FO- / FO+)
--
-- Estrutura minima e evolutiva: registro (FO), motivo aprendido por uso,
-- manifestacao do cadete, decisao da coordenacao, punicao, cumprimento,
-- anexos e linha do tempo. Ver docs/ACOMPANHAMENTO_CADETE.md.
-- =====================================================================

-- ---------------------------------------------------------------------
-- normalize_label(): chave de deduplicacao "tolerante" para os catalogos
-- aprendidos (motivos e punicoes). Minusculas, sem acento, sem pontuacao
-- e com espacos colapsados. Nunca impede o cadastro de um texto novo:
-- apenas identifica quando o texto ja existe.
-- ---------------------------------------------------------------------
create or replace function public.normalize_label(input text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(
          translate(
            lower(coalesce(input, '')),
            'áàâãäéèêëíìîïóòôõöúùûüçñ',
            'aaaaaeeeeiiiiooooouuuucn'
          ),
          '[^a-z0-9 ]', ' ', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;

comment on function public.normalize_label(text) is
  'Normaliza texto livre (motivos/punicoes) para deduplicacao por autocomplete.';

-- ---------------------------------------------------------------------
-- Catalogo de motivos aprendido pelo uso (alimenta o autocomplete)
-- ---------------------------------------------------------------------
create table public.fo_reasons (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in ('fo_negativo','fo_positivo','saude','missao','administrativo')),
  label text not null,
  normalized_label text not null,
  usage_count int not null default 0,
  last_used_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uniq_fo_reasons_kind_label
  on public.fo_reasons(kind, normalized_label);
create index idx_fo_reasons_ranking
  on public.fo_reasons(kind, usage_count desc, last_used_at desc nulls last)
  where active;

create trigger trg_fo_reasons_updated_at
  before update on public.fo_reasons
  for each row execute function public.set_updated_at();

comment on table public.fo_reasons is
  'Motivos de FO escritos pelos usuarios. Base do autocomplete e das estatisticas de uso.';

-- ---------------------------------------------------------------------
-- Catalogo de punicoes aprendido pelo uso
-- ---------------------------------------------------------------------
create table public.punishment_options (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  normalized_label text not null unique,
  usage_count int not null default 0,
  last_used_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_punishment_options_updated_at
  before update on public.punishment_options
  for each row execute function public.set_updated_at();

comment on table public.punishment_options is
  'Punicoes ja utilizadas pela Coordenacao. Base do autocomplete de punicao.';

-- ---------------------------------------------------------------------
-- Registro de acompanhamento (o "FO")
-- ---------------------------------------------------------------------
create table public.follow_up_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id),
  type text not null
    check (type in ('fo_negativo','fo_positivo','saude','missao','administrativo')),
  reason_id uuid references public.fo_reasons(id) on delete set null,
  reason_text text not null,
  notes text,
  status text not null
    check (status in (
      'registrado',
      'aguardando_manifestacao',
      'aguardando_analise',
      'prazo_expirado',
      'deferido',
      'indeferido',
      'aguardando_cumprimento',
      'concluido',
      'cancelado'
    )),
  requires_manifestation boolean not null default false,
  deadline_at timestamptz,
  occurred_at timestamptz not null default now(),
  auto_generated boolean not null default false,
  origin_record_id uuid references public.follow_up_records(id) on delete set null,
  created_by uuid references auth.users(id),
  created_by_name text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requires_manifestation = false or deadline_at is not null)
);

create index idx_follow_up_records_student
  on public.follow_up_records(student_id, occurred_at desc);
create index idx_follow_up_records_status
  on public.follow_up_records(status, deadline_at);
create index idx_follow_up_records_reason
  on public.follow_up_records(reason_id);
-- Impede que a expiracao gere mais de um FO- derivado do mesmo registro
-- (protecao contra ciclos automaticos).
create unique index uniq_follow_up_records_origin
  on public.follow_up_records(origin_record_id)
  where origin_record_id is not null;

create trigger trg_follow_up_records_updated_at
  before update on public.follow_up_records
  for each row execute function public.set_updated_at();

comment on table public.follow_up_records is
  'Fatos observados e demais registros de acompanhamento do cadete.';
comment on column public.follow_up_records.reason_text is
  'Snapshot do motivo no momento do registro - nao muda se o catalogo for editado.';
comment on column public.follow_up_records.auto_generated is
  'true = gerado pelo sistema (ex.: ausencia de manifestacao no prazo).';

-- ---------------------------------------------------------------------
-- Manifestacao do cadete (uma por registro no MVP)
-- ---------------------------------------------------------------------
create table public.follow_up_manifestations (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null unique references public.follow_up_records(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  body text not null,
  submitted_at timestamptz not null default now(),
  submitted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Decisao da Coordenacao
-- ---------------------------------------------------------------------
create table public.follow_up_decisions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null unique references public.follow_up_records(id) on delete cascade,
  outcome text not null check (outcome in ('deferido','indeferido')),
  rationale text,
  decided_by uuid references auth.users(id),
  decided_by_name text,
  decided_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Punicao e cumprimento
-- ---------------------------------------------------------------------
create table public.follow_up_punishments (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null unique references public.follow_up_records(id) on delete cascade,
  punishment_option_id uuid references public.punishment_options(id) on delete set null,
  punishment_text text not null,
  instructions text,
  status text not null default 'aguardando_cumprimento'
    check (status in (
      'aguardando_cumprimento',
      'cumprida',
      'parcialmente_cumprida',
      'nao_cumprida',
      'cancelada'
    )),
  status_notes text,
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_follow_up_punishments_updated_at
  before update on public.follow_up_punishments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Anexos (usados hoje pela manifestacao do cadete)
-- Convencao de path: <student_id>/<record_id>/<arquivo>
-- ---------------------------------------------------------------------
create table public.follow_up_attachments (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.follow_up_records(id) on delete cascade,
  manifestation_id uuid references public.follow_up_manifestations(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_follow_up_attachments_record on public.follow_up_attachments(record_id);

-- ---------------------------------------------------------------------
-- Linha do tempo / historico do registro
-- ---------------------------------------------------------------------
create table public.follow_up_events (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.follow_up_records(id) on delete cascade,
  event_type text not null,
  description text,
  payload jsonb,
  actor_id uuid references auth.users(id),
  actor_name text,
  created_at timestamptz not null default now()
);

create index idx_follow_up_events_record on public.follow_up_events(record_id, created_at);

-- ---------------------------------------------------------------------
-- Estatisticas de uso dos motivos (item "aprendizado baseado no uso").
-- Preparada para, depois de algumas semanas, sustentar atalhos de
-- motivos frequentes com base em dados reais.
-- ---------------------------------------------------------------------
create or replace view public.v_fo_reason_stats as
select
  r.id                                as reason_id,
  r.kind,
  r.label,
  r.active,
  r.usage_count,
  r.last_used_at,
  count(f.id)                         as total_records,
  count(f.id) filter (where f.created_at >= now() - interval '7 days')  as uses_last_7d,
  count(f.id) filter (where f.created_at >= now() - interval '30 days') as uses_last_30d,
  count(distinct f.student_id)        as distinct_students,
  min(f.created_at)                   as first_used_at
from public.fo_reasons r
left join public.follow_up_records f on f.reason_id = r.id
group by r.id;

comment on view public.v_fo_reason_stats is
  'Frequencia de uso dos motivos - insumo para futuros atalhos de motivos frequentes.';

-- ---------------------------------------------------------------------
-- Contadores de uso dos catalogos
-- ---------------------------------------------------------------------
create or replace function public.bump_fo_reason_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reason_id is not null then
    update public.fo_reasons
       set usage_count = usage_count + 1,
           last_used_at = greatest(coalesce(last_used_at, new.created_at), new.created_at)
     where id = new.reason_id;
  end if;
  return new;
end;
$$;

create trigger trg_follow_up_records_reason_usage
  after insert on public.follow_up_records
  for each row execute function public.bump_fo_reason_usage();

create or replace function public.bump_punishment_option_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.punishment_option_id is not null then
    update public.punishment_options
       set usage_count = usage_count + 1,
           last_used_at = new.created_at
     where id = new.punishment_option_id;
  end if;
  return new;
end;
$$;

create trigger trg_follow_up_punishments_option_usage
  after insert on public.follow_up_punishments
  for each row execute function public.bump_punishment_option_usage();

-- ---------------------------------------------------------------------
-- Motivo institucional usado pela rotina de expiracao de prazo
-- ---------------------------------------------------------------------
insert into public.fo_reasons (kind, label, normalized_label)
values (
  'fo_negativo',
  'Não apresentou manifestação no prazo',
  public.normalize_label('Não apresentou manifestação no prazo')
)
on conflict (kind, normalized_label) do nothing;

-- ---------------------------------------------------------------------
-- expire_follow_up_deadlines(): fecha o prazo de 24h e gera o FO-
-- derivado da ausencia de manifestacao.
--
-- Nao gera ciclo: o registro derivado nasce com requires_manifestation
-- = false (logo nunca entra nesta varredura) e o indice unico sobre
-- origin_record_id impede uma segunda geracao para o mesmo FO.
-- ---------------------------------------------------------------------
create or replace function public.expire_follow_up_deadlines()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  expired integer := 0;
  fallback_reason uuid;
begin
  select id into fallback_reason
    from public.fo_reasons
   where kind = 'fo_negativo'
     and normalized_label = public.normalize_label('Não apresentou manifestação no prazo')
   limit 1;

  for rec in
    select id, student_id, class_id, occurred_at
      from public.follow_up_records
     where status = 'aguardando_manifestacao'
       and requires_manifestation
       and deadline_at is not null
       and deadline_at <= now()
     order by deadline_at
     for update skip locked
  loop
    update public.follow_up_records
       set status = 'prazo_expirado'
     where id = rec.id;

    insert into public.follow_up_events (record_id, event_type, description, actor_name)
    values (
      rec.id,
      'prazo_expirado',
      'Prazo de 24 horas encerrado sem manifestação do cadete.',
      'Sistema'
    );

    insert into public.follow_up_records (
      student_id, class_id, type, reason_id, reason_text, notes, status,
      requires_manifestation, occurred_at, auto_generated, origin_record_id, created_by_name
    )
    values (
      rec.student_id,
      rec.class_id,
      'fo_negativo',
      fallback_reason,
      'Não apresentou manifestação no prazo',
      'Registro gerado automaticamente: o FO− de '
        || to_char(rec.occurred_at at time zone 'America/Belem', 'DD/MM/YYYY HH24:MI')
        || ' não recebeu manifestação dentro de 24 horas.',
      'aguardando_analise',
      false,
      now(),
      true,
      rec.id,
      'Sistema'
    )
    on conflict do nothing;

    expired := expired + 1;
  end loop;

  return expired;
end;
$$;

grant execute on function public.expire_follow_up_deadlines() to authenticated;

-- ---------------------------------------------------------------------
-- submit_follow_up_manifestation(): unico caminho da manifestacao do
-- cadete. SECURITY DEFINER porque a transicao de status pertence ao
-- fluxo, nao ao cadete: ele nao recebe permissao de UPDATE sobre o
-- proprio FO (nao poderia, por exemplo, reescrever o fato registrado).
--
-- Faz em uma transacao: grava a manifestacao, move o FO para
-- `aguardando_analise` e registra o evento na linha do tempo.
-- ---------------------------------------------------------------------
create or replace function public.submit_follow_up_manifestation(
  p_record_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  actor uuid := auth.uid();
  actor_student uuid := public.current_student_id();
  actor_label text;
  new_id uuid;
begin
  if actor_student is null then
    raise exception 'Apenas o cadete pode se manifestar.' using errcode = '42501';
  end if;

  select id, student_id, status, deadline_at
    into rec
    from public.follow_up_records
   where id = p_record_id
   for update;

  if not found or rec.student_id <> actor_student then
    raise exception 'Registro nao encontrado.' using errcode = 'P0002';
  end if;

  if rec.status <> 'aguardando_manifestacao' then
    raise exception 'Este FO nao esta mais aberto para manifestacao.' using errcode = 'P0001';
  end if;

  if rec.deadline_at is not null and rec.deadline_at <= now() then
    raise exception 'Prazo encerrado.' using errcode = 'P0001';
  end if;

  if length(btrim(coalesce(p_body, ''))) < 10 then
    raise exception 'Justificativa muito curta.' using errcode = '22023';
  end if;

  insert into public.follow_up_manifestations (record_id, student_id, body, submitted_by)
  values (p_record_id, actor_student, btrim(p_body), actor)
  returning id into new_id;

  update public.follow_up_records
     set status = 'aguardando_analise'
   where id = p_record_id;

  select coalesce(war_name, 'Cadete') into actor_label
    from public.students where id = actor_student;

  insert into public.follow_up_events (record_id, event_type, description, actor_id, actor_name)
  values (p_record_id, 'manifestacao_enviada', 'Cadete apresentou manifestacao.', actor, actor_label);

  return new_id;
end;
$$;

grant execute on function public.submit_follow_up_manifestation(uuid, text) to authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.fo_reasons enable row level security;
alter table public.punishment_options enable row level security;
alter table public.follow_up_records enable row level security;
alter table public.follow_up_manifestations enable row level security;
alter table public.follow_up_decisions enable row level security;
alter table public.follow_up_punishments enable row level security;
alter table public.follow_up_attachments enable row level security;
alter table public.follow_up_events enable row level security;

-- Catalogos: Coordenacao gerencia; demais perfis nao precisam ler.
create policy "fo_reasons: coord all"
  on public.fo_reasons for all using (public.is_coord()) with check (public.is_coord());
create policy "punishment_options: coord all"
  on public.punishment_options for all using (public.is_coord()) with check (public.is_coord());

-- Registros: Coordenacao gerencia tudo; o cadete ve apenas os proprios.
create policy "follow_up_records: coord all"
  on public.follow_up_records for all using (public.is_coord()) with check (public.is_coord());
create policy "follow_up_records: student read own"
  on public.follow_up_records for select using (
    public.current_role() = 'aluno' and student_id = public.current_student_id()
  );

-- Manifestacao: o cadete escreve a propria; a Coordenacao le todas.
create policy "follow_up_manifestations: coord all"
  on public.follow_up_manifestations for all
  using (public.is_coord()) with check (public.is_coord());
create policy "follow_up_manifestations: student read own"
  on public.follow_up_manifestations for select using (
    public.current_role() = 'aluno' and student_id = public.current_student_id()
  );

create policy "follow_up_decisions: coord all"
  on public.follow_up_decisions for all using (public.is_coord()) with check (public.is_coord());
create policy "follow_up_decisions: student read own"
  on public.follow_up_decisions for select using (
    public.current_role() = 'aluno'
    and exists (
      select 1 from public.follow_up_records r
       where r.id = record_id and r.student_id = public.current_student_id()
    )
  );

create policy "follow_up_punishments: coord all"
  on public.follow_up_punishments for all using (public.is_coord()) with check (public.is_coord());
create policy "follow_up_punishments: student read own"
  on public.follow_up_punishments for select using (
    public.current_role() = 'aluno'
    and exists (
      select 1 from public.follow_up_records r
       where r.id = record_id and r.student_id = public.current_student_id()
    )
  );

create policy "follow_up_attachments: coord all"
  on public.follow_up_attachments for all using (public.is_coord()) with check (public.is_coord());
create policy "follow_up_attachments: student read own"
  on public.follow_up_attachments for select using (
    public.current_role() = 'aluno'
    and exists (
      select 1 from public.follow_up_records r
       where r.id = record_id and r.student_id = public.current_student_id()
    )
  );
create policy "follow_up_attachments: student insert own"
  on public.follow_up_attachments for insert with check (
    public.current_role() = 'aluno'
    and exists (
      select 1 from public.follow_up_records r
       where r.id = record_id and r.student_id = public.current_student_id()
    )
  );

create policy "follow_up_events: coord all"
  on public.follow_up_events for all using (public.is_coord()) with check (public.is_coord());
create policy "follow_up_events: student read own"
  on public.follow_up_events for select using (
    public.current_role() = 'aluno'
    and exists (
      select 1 from public.follow_up_records r
       where r.id = record_id and r.student_id = public.current_student_id()
    )
  );

-- =====================================================================
-- Auditoria institucional (alem da linha do tempo do modulo)
-- =====================================================================
create trigger trg_audit_follow_up_records
  after insert or update or delete on public.follow_up_records
  for each row execute function public.audit_trigger();

create trigger trg_audit_follow_up_decisions
  after insert or update or delete on public.follow_up_decisions
  for each row execute function public.audit_trigger();

create trigger trg_audit_follow_up_punishments
  after insert or update or delete on public.follow_up_punishments
  for each row execute function public.audit_trigger();

-- =====================================================================
-- Storage: anexos da manifestacao
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'followup-attachments', 'followup-attachments', false, 10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;

create policy "followup files: self all"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'followup-attachments'
    and public._storage_student_id(name) = public.current_student_id()
  )
  with check (
    bucket_id = 'followup-attachments'
    and public._storage_student_id(name) = public.current_student_id()
  );

create policy "followup files: coord all"
  on storage.objects for all to authenticated
  using (bucket_id = 'followup-attachments' and public.is_coord())
  with check (bucket_id = 'followup-attachments' and public.is_coord());
