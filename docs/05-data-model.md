# 05 — Modelo de Dados

## Convenções gerais
- **PK**: `uuid` gerado por `gen_random_uuid()` (extensão `pgcrypto`).
- Toda tabela tem: `created_at timestamptz default now()`, `updated_at timestamptz default now()`, `created_by uuid references auth.users(id)`, `updated_by uuid references auth.users(id)`.
- **Soft delete** quando faz sentido: `deleted_at timestamptz null` + filtro padrão `deleted_at is null`.
- Nomes de tabelas em **snake_case plural** (`students`, `equipment_requirements`).
- Enums implementados como `text` + `check constraint` (mais flexível para migrações que `enum type`).
- Toda tabela com RLS habilitado (`enable row level security`).

---

## Mapa Agregado → Tabelas

### Aggregate: `Student` (root: `students`)
- `students` — root + dados pessoais
- `student_contacts` — 1:1 (split por privacidade)
- `student_addresses` — 1:1 (endereço atual + origem)
- `student_logistics` — 1:1 (alojamento, residência fixa, familiares no AP)
- `emergency_contacts` — 1:N (até 2)
- `vehicles` — 0:1 (veículo + CNH)

### Aggregate: `HealthRestriction` (root: `health_restrictions`)
- `health_restrictions` — 1:1 com `students`

### Aggregate: `Document` (root: `documents`)
- `documents` — N por student

### Aggregate: `EquipmentChecklist` (root pragmático: `student_equipment_status`)
- `equipment_categories` — catálogo
- `equipment_requirements` — catálogo (item)
- `student_equipment_status` — instância por aluno × item
- `equipment_questions` — N por status

### Aggregate: `CangaAssignment` (root: `canga_assignments`)
- `canga_assignments` — histórico append-mostly; `is_current bool`

### Transversais
- `pending_changes` — fila de alterações sensíveis aguardando validação
- `audit_logs` — append-only

---

## Schema SQL (resumo)

> Migrations completas ficam em `supabase/migrations/` na Fase 4. Abaixo, o esqueleto.

```sql
-- Extensões
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ============================================================
-- IDENTITY & ACCESS
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('coordenacao','secretaria','instrutor','aluno')),
  full_name text not null,
  active boolean not null default true,
  student_id uuid null, -- preenchido só para role='aluno'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- COURSE MANAGEMENT
-- ============================================================
create table courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,           -- ex.: 'CFO-2026'
  name text not null,
  year int not null,
  created_at timestamptz default now()
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id),
  name text not null,                  -- ex.: 'Turma Única'
  start_date date,
  end_date date,
  unique (course_id, name)
);

-- ============================================================
-- STUDENT PROFILE
-- ============================================================
create table students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id),
  pelotao text,                        -- editável só por Coordenação
  student_number int,                  -- "número" — único na turma
  situation text not null default 'matriculado'
    check (situation in ('matriculado','apresentado','afastado','desligado','concluido')),
  full_name text not null,
  war_name text not null,              -- nome de guerra
  sex text check (sex in ('M','F')),
  birth_date date,
  nationality text default 'Brasileira',
  naturality_state text,
  naturality_city text,
  marital_status text,
  education_level text,
  graduation_type text,
  enrollment_id text,                  -- matrícula
  cpf text,
  rg text,
  pis text,
  voter_id text,
  voter_zone text,
  voter_section text,
  father_name text,
  mother_name text,
  presentation_date date,
  photo_path text,                     -- caminho no Storage
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique (class_id, student_number),
  unique (class_id, war_name)
);
create index idx_students_class on students(class_id) where deleted_at is null;
create index idx_students_war_name on students(class_id, lower(war_name));
create index idx_students_number on students(class_id, student_number);

create table student_contacts (
  student_id uuid primary key references students(id) on delete cascade,
  whatsapp text,
  phone_secondary text,
  email_personal text,
  email_institutional text,
  notes text,
  updated_at timestamptz default now(),
  updated_by uuid
);

create table student_addresses (
  student_id uuid primary key references students(id) on delete cascade,
  street text, district text, city text, state text, zip text, landmark text,
  origin_in_amapa boolean,
  from_other_state boolean,
  origin_state text,
  origin_city text,
  updated_at timestamptz default now(),
  updated_by uuid
);

create table student_logistics (
  student_id uuid primary key references students(id) on delete cascade,
  has_fixed_residence_macapa boolean,
  course_address text,
  needs_housing boolean,
  has_family_in_ap boolean,
  local_contact text,
  updated_at timestamptz default now(),
  updated_by uuid
);

create table emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  priority int not null check (priority in (1,2)),
  full_name text not null,
  relationship text,
  phone text not null,
  address text,
  notes text,
  unique (student_id, priority)
);

create table vehicles (
  student_id uuid primary key references students(id) on delete cascade,
  has_vehicle boolean default false,
  vehicle_type text,
  plate text,
  has_cnh boolean default false,
  cnh_category text,
  cnh_valid_until date,
  cnh_attached boolean default false,
  available_for_deployment boolean default false,
  notes text
);

-- ============================================================
-- HEALTH & RESTRICTIONS  (LGPD-sensitive)
-- ============================================================
create table health_restrictions (
  student_id uuid primary key references students(id) on delete cascade,
  blood_type text check (blood_type in ('A','B','AB','O')),
  rh_factor text check (rh_factor in ('+','-')),
  allergies text,
  continuous_medication text,
  chronic_disease text,
  physical_restriction text,
  dietary_restriction text,
  uses_glasses boolean,
  medical_declaration_doc_id uuid, -- FK lógica p/ documents
  medical_notes text,
  operational_summary text,        -- editado/curado pela Coordenação
  validation_status text not null default 'pendente'
    check (validation_status in ('pendente','validado','recusado')),
  validated_by uuid,
  validated_at timestamptz,
  last_updated_at timestamptz default now()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  doc_type text not null
    check (doc_type in ('rg_cpf','cnh','comprovante_residencia','foto_3x4','declaracao_medica','outro')),
  storage_path text not null,
  status text not null default 'enviado'
    check (status in ('pendente','enviado','em_analise','validado','recusado')),
  rejection_reason text,
  validated_by uuid,
  validated_at timestamptz,
  linked_health_restriction_id uuid references health_restrictions(student_id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_documents_student on documents(student_id);
create index idx_documents_status on documents(status);

-- ============================================================
-- CANGA
-- ============================================================
create table canga_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  canga_student_id uuid not null references students(id),
  assigned_at date not null default current_date,
  assigned_by uuid not null,
  is_current boolean not null default true,
  notes text,
  created_at timestamptz default now(),
  check (student_id <> canga_student_id)
);
create unique index uniq_canga_current on canga_assignments(student_id) where is_current = true;

-- ============================================================
-- EQUIPMENT CHECKLIST
-- ============================================================
create table equipment_categories (
  id uuid primary key default gen_random_uuid(),
  ordinal int not null,
  name text not null unique,
  description text
);

create table equipment_requirements (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references equipment_categories(id),
  subcategory text,
  discipline text,
  name text not null,
  short_description text,
  quantity numeric default 1,
  unit text default 'un',
  mandatory boolean not null default true,
  applicability text not null default 'todos'
    check (applicability in ('masculino','feminino','todos','condicional')),
  phase text not null default 'inicio'
    check (phase in ('quarentena','inicio','posterior')),
  notes text,
  active boolean not null default true
);
create index idx_eqreq_category on equipment_requirements(category_id);
create index idx_eqreq_phase on equipment_requirements(phase);

create table student_equipment_status (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  requirement_id uuid not null references equipment_requirements(id),
  status text not null default 'pendente_validacao'
    check (status in ('ok','comprado','vai_chegar','falta_comprar','em_duvida','inadequado','nao_se_aplica','pendente_validacao')),
  student_notes text,
  attachment_path text,
  validation_status text not null default 'nao_validado'
    check (validation_status in ('nao_validado','validado','reprovado')),
  validated_by uuid,
  validated_at timestamptz,
  updated_at timestamptz default now(),
  updated_by uuid,
  unique (student_id, requirement_id)
);
create index idx_seqs_student on student_equipment_status(student_id);
create index idx_seqs_status on student_equipment_status(status);

create table equipment_questions (
  id uuid primary key default gen_random_uuid(),
  student_equipment_status_id uuid not null references student_equipment_status(id) on delete cascade,
  asked_by uuid not null,
  question text not null,
  answer text,
  answered_by uuid,
  answered_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- TRANSVERSAIS
-- ============================================================
create table pending_changes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  context text not null,          -- 'health','documents','profile','equipment'
  entity text not null,           -- 'health_restrictions','documents', ...
  field text not null,
  previous_value jsonb,
  new_value jsonb,
  requested_by uuid not null,
  status text not null default 'pendente'
    check (status in ('pendente','validado','recusado')),
  resolved_by uuid,
  resolved_at timestamptz,
  reason text,
  created_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  entity text not null,
  entity_id uuid,
  action text not null,           -- 'insert','update','delete','validate','reject'
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz default now()
);
create index idx_audit_entity on audit_logs(entity, entity_id);
```

---

## Value Objects (no código TypeScript, não no DB)

| VO | Validação |
|---|---|
| `CPF` | 11 dígitos, dígitos verificadores válidos |
| `RG` | string normalizada |
| `PhoneNumber` | E.164 BR (`+55…`) |
| `Email` | RFC simplificado |
| `Address` | composição de campos |
| `BloodType` | `(A\|B\|AB\|O) + (+\|-)` |
| `VehiclePlate` | Mercosul (`ABC1D23`) ou antiga (`ABC1234`) |
| `DocumentStatus`, `EquipmentStatus`, `ValidationStatus` | enums |
| `UserRole` | enum |
| `StudentNumber` | int > 0, único por turma |
| `CourseCode` | string sem espaços |

---

## Storage (Supabase)

| Bucket | Conteúdo | Acesso |
|---|---|---|
| `student-photos` | foto de perfil 3x4 | privado; URLs assinadas |
| `student-documents` | RG, CPF, CNH, comprovante, declaração médica | privado; URLs assinadas com TTL curto |
| `equipment-attachments` | fotos de itens enviadas pelo aluno | privado; URLs assinadas |
