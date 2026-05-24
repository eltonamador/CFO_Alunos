-- =====================================================================
-- 0006 — Documents
-- =====================================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  doc_type text not null
    check (doc_type in ('rg_cpf','cnh','comprovante_residencia','foto_3x4','declaracao_medica','outro')),
  storage_path text not null,
  status text not null default 'enviado'
    check (status in ('pendente','enviado','em_analise','validado','recusado')),
  rejection_reason text,
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  linked_health_restriction_id uuid references public.health_restrictions(student_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create index idx_documents_student on public.documents(student_id);
create index idx_documents_status on public.documents(status);
create index idx_documents_type_status on public.documents(doc_type, status);

-- Adiciona FK reversa em health_restrictions.medical_declaration_doc_id
alter table public.health_restrictions
  add constraint fk_health_medical_doc
  foreign key (medical_declaration_doc_id) references public.documents(id) on delete set null;
