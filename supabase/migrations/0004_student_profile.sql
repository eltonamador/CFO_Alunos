-- =====================================================================
-- 0004 — Student Profile aggregate
-- students + contacts + addresses + logistics + emergency + vehicles
-- =====================================================================

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  pelotao text,
  student_number int,
  situation text not null default 'matriculado'
    check (situation in ('matriculado','apresentado','afastado','desligado','concluido')),
  full_name text not null,
  war_name text not null,
  sex text check (sex in ('M','F')),
  birth_date date,
  nationality text default 'Brasileira',
  naturality_state text,
  naturality_city text,
  marital_status text,
  education_level text,
  graduation_type text,
  enrollment_id text,
  cpf text,
  rg text,
  pis text,
  voter_id text,
  voter_zone text,
  voter_section text,
  father_name text,
  mother_name text,
  presentation_date date,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  unique (class_id, student_number),
  unique (class_id, war_name)
);

create trigger trg_students_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

create index idx_students_class on public.students(class_id) where deleted_at is null;
create index idx_students_war_name on public.students(class_id, lower(war_name));
create index idx_students_number on public.students(class_id, student_number);
create index idx_students_cpf on public.students(cpf) where deleted_at is null;

-- FK reversa de profiles.student_id agora que students existe.
alter table public.profiles
  add constraint fk_profiles_student
  foreign key (student_id) references public.students(id) on delete set null;

-- ---------------------------------------------------------------------
-- Sub-tabelas do agregado Student
-- ---------------------------------------------------------------------
create table public.student_contacts (
  student_id uuid primary key references public.students(id) on delete cascade,
  whatsapp text,
  phone_secondary text,
  email_personal text,
  email_institutional text,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create trigger trg_contacts_updated_at
  before update on public.student_contacts
  for each row execute function public.set_updated_at();

create table public.student_addresses (
  student_id uuid primary key references public.students(id) on delete cascade,
  street text,
  district text,
  city text,
  state text,
  zip text,
  landmark text,
  origin_in_amapa boolean,
  from_other_state boolean,
  origin_state text,
  origin_city text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create trigger trg_addresses_updated_at
  before update on public.student_addresses
  for each row execute function public.set_updated_at();

create table public.student_logistics (
  student_id uuid primary key references public.students(id) on delete cascade,
  has_fixed_residence_macapa boolean,
  course_address text,
  needs_housing boolean,
  has_family_in_ap boolean,
  local_contact text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create trigger trg_logistics_updated_at
  before update on public.student_logistics
  for each row execute function public.set_updated_at();

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  priority int not null check (priority in (1,2)),
  full_name text not null,
  relationship text,
  phone text not null,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, priority)
);

create trigger trg_emergency_updated_at
  before update on public.emergency_contacts
  for each row execute function public.set_updated_at();

create table public.vehicles (
  student_id uuid primary key references public.students(id) on delete cascade,
  has_vehicle boolean default false,
  vehicle_type text,
  plate text,
  has_cnh boolean default false,
  cnh_category text,
  cnh_valid_until date,
  cnh_attached boolean default false,
  available_for_deployment boolean default false,
  notes text,
  updated_at timestamptz not null default now()
);

create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();
