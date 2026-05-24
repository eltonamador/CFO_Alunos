-- =====================================================================
-- 0008 — Equipment Checklist
-- =====================================================================

create table public.equipment_categories (
  id uuid primary key default gen_random_uuid(),
  ordinal int not null,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create index idx_categories_ordinal on public.equipment_categories(ordinal);

create table public.equipment_requirements (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.equipment_categories(id) on delete restrict,
  subcategory text,
  discipline text,
  name text not null,
  short_description text,
  quantity numeric not null default 1,
  unit text not null default 'un',
  mandatory boolean not null default true,
  applicability text not null default 'todos'
    check (applicability in ('masculino','feminino','todos','condicional')),
  phase text not null default 'inicio'
    check (phase in ('quarentena','inicio','posterior')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_eqreq_updated_at
  before update on public.equipment_requirements
  for each row execute function public.set_updated_at();

create index idx_eqreq_category on public.equipment_requirements(category_id);
create index idx_eqreq_phase on public.equipment_requirements(phase) where active = true;

create table public.student_equipment_status (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  requirement_id uuid not null references public.equipment_requirements(id) on delete restrict,
  status text not null default 'pendente_validacao'
    check (status in ('ok','comprado','vai_chegar','falta_comprar','em_duvida','inadequado','nao_se_aplica','pendente_validacao')),
  student_notes text,
  attachment_path text,
  validation_status text not null default 'nao_validado'
    check (validation_status in ('nao_validado','validado','reprovado')),
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (student_id, requirement_id)
);

create trigger trg_seqs_updated_at
  before update on public.student_equipment_status
  for each row execute function public.set_updated_at();

create index idx_seqs_student on public.student_equipment_status(student_id);
create index idx_seqs_status on public.student_equipment_status(status);

create table public.equipment_questions (
  id uuid primary key default gen_random_uuid(),
  student_equipment_status_id uuid not null references public.student_equipment_status(id) on delete cascade,
  asked_by uuid not null references auth.users(id),
  question text not null,
  answer text,
  answered_by uuid references auth.users(id),
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_eq_questions_status on public.equipment_questions(student_equipment_status_id);
create index idx_eq_questions_open on public.equipment_questions(created_at desc) where answer is null;
