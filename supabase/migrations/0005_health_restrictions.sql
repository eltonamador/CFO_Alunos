-- =====================================================================
-- 0005 — Health & Restrictions (LGPD-sensitive)
-- =====================================================================

create table public.health_restrictions (
  student_id uuid primary key references public.students(id) on delete cascade,
  blood_type text check (blood_type in ('A','B','AB','O')),
  rh_factor text check (rh_factor in ('+','-')),
  allergies text,
  continuous_medication text,
  chronic_disease text,
  physical_restriction text,
  dietary_restriction text,
  uses_glasses boolean,
  medical_declaration_doc_id uuid, -- FK lógica para documents (mesmo bound. context)
  medical_notes text,
  operational_summary text,
  validation_status text not null default 'pendente'
    check (validation_status in ('pendente','validado','recusado')),
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_health_updated_at
  before update on public.health_restrictions
  for each row execute function public.set_updated_at();

comment on column public.health_restrictions.operational_summary is
  'Texto curto curado pela Coordenação. ÚNICO campo de saúde visível ao Instrutor.';
comment on column public.health_restrictions.medical_notes is
  'Dados clínicos brutos — NUNCA expostos ao Instrutor.';
