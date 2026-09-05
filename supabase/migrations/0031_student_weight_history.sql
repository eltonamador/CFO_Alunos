-- =====================================================================
-- 0031 - Historico de peso do aluno
-- Modelo append-only: novos pesos geram novos lancamentos historicos.
-- =====================================================================

create table if not exists public.student_weight_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  weight_kg numeric(5,2) not null,
  measured_at date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_by_name text,
  created_by_role text,
  source text not null check (source in ('aluno', 'coordenacao')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_weight_history_weight_range
    check (weight_kg >= 30 and weight_kg <= 300)
);

create index if not exists idx_student_weight_history_student_measured
  on public.student_weight_history (student_id, measured_at desc, created_at desc);

drop trigger if exists trg_student_weight_history_updated_at on public.student_weight_history;
create trigger trg_student_weight_history_updated_at
  before update on public.student_weight_history
  for each row execute function public.set_updated_at();

-- Backfill do primeiro lancamento a partir do peso legado da ficha medica.
insert into public.student_weight_history (
  student_id,
  weight_kg,
  measured_at,
  created_by,
  created_by_name,
  created_by_role,
  source,
  notes,
  created_at,
  updated_at
)
select
  h.student_id,
  h.peso_kg,
  coalesce(h.last_updated_at::date, h.updated_at::date, h.created_at::date, current_date),
  null,
  'Sistema',
  'coordenacao',
  'coordenacao',
  'Registro inicial migrado de health_restrictions.peso_kg.',
  coalesce(h.last_updated_at, h.updated_at, h.created_at, now()),
  coalesce(h.last_updated_at, h.updated_at, h.created_at, now())
from public.health_restrictions h
where h.peso_kg is not null
  and h.peso_kg >= 30
  and h.peso_kg <= 300
  and not exists (
    select 1
    from public.student_weight_history w
    where w.student_id = h.student_id
  );

alter table public.student_weight_history enable row level security;

drop policy if exists "weight_history: self read" on public.student_weight_history;
create policy "weight_history: self read"
  on public.student_weight_history for select
  using (student_id = public.current_student_id());

drop policy if exists "weight_history: coord read" on public.student_weight_history;
create policy "weight_history: coord read"
  on public.student_weight_history for select
  using (public.is_coord());

drop policy if exists "weight_history: self insert" on public.student_weight_history;
create policy "weight_history: self insert"
  on public.student_weight_history for insert
  with check (
    public.current_role() = 'aluno'
    and student_id = public.current_student_id()
    and source = 'aluno'
    and created_by = auth.uid()
  );

drop policy if exists "weight_history: coord insert" on public.student_weight_history;
create policy "weight_history: coord insert"
  on public.student_weight_history for insert
  with check (
    public.is_coord()
    and source = 'coordenacao'
    and created_by = auth.uid()
  );

drop trigger if exists trg_audit_student_weight_history on public.student_weight_history;
create trigger trg_audit_student_weight_history
  after insert or update or delete on public.student_weight_history
  for each row execute function public.audit_trigger();

comment on table public.student_weight_history is
  'Historico append-only de medicoes de peso dos alunos.';
comment on column public.student_weight_history.weight_kg is
  'Peso em quilogramas, com ate duas casas decimais.';
comment on column public.student_weight_history.measured_at is
  'Data da medicao informada no lancamento.';
