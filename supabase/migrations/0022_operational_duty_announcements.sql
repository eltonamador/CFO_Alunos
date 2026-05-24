-- =====================================================================
-- 0022 - Escalas Operacionais e Comunicados da Turma
-- =====================================================================

-- ---------------------------------------------------------------------
-- Escalas operacionais
-- ---------------------------------------------------------------------
create table public.duty_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (code in ('aluno_dia','subxerife','aluno_alimentacao','aluno_logistica')),
  name text not null,
  description text,
  sort_order int not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_duty_roles_updated_at
  before update on public.duty_roles
  for each row execute function public.set_updated_at();

insert into public.duty_roles (code, name, description, sort_order)
values
  ('aluno_dia', 'Aluno de Dia', 'Aluno responsavel pelo acompanhamento operacional diario da turma.', 1),
  ('subxerife', 'Subxerife', 'Apoio direto a rotina disciplinar e operacional da turma.', 2),
  ('aluno_alimentacao', 'Aluno Alimentacao', 'Aluno responsavel por demandas de alimentacao da turma.', 3),
  ('aluno_logistica', 'Aluno Logistica', 'Aluno responsavel por apoio logistico diario.', 4)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = true;

create table public.duty_rosters (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  status text not null default 'rascunho'
    check (status in ('rascunho','publicada','arquivada')),
  generated_by uuid references auth.users(id),
  generated_at timestamptz,
  published_by uuid references auth.users(id),
  published_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create trigger trg_duty_rosters_updated_at
  before update on public.duty_rosters
  for each row execute function public.set_updated_at();

create index idx_duty_rosters_class_period on public.duty_rosters(class_id, period_start, period_end);
create unique index uniq_duty_rosters_published_period
  on public.duty_rosters(class_id, period_start, period_end)
  where status = 'publicada';

create table public.duty_assignments (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.duty_rosters(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  duty_date date not null,
  role_id uuid not null references public.duty_roles(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  status text not null default 'prevista'
    check (status in ('prevista','confirmada','substituida','cancelada')),
  assignment_source text not null default 'automatica'
    check (assignment_source in ('automatica','manual','substituicao_automatica')),
  manual_reason text,
  replaced_assignment_id uuid references public.duty_assignments(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    assignment_source <> 'manual'
    or length(trim(coalesce(manual_reason, ''))) > 0
  )
);

create trigger trg_duty_assignments_updated_at
  before update on public.duty_assignments
  for each row execute function public.set_updated_at();

create unique index uniq_duty_assignment_active_role_date
  on public.duty_assignments(duty_date, role_id)
  where status in ('prevista','confirmada');
create unique index uniq_duty_assignment_active_student_date
  on public.duty_assignments(duty_date, student_id)
  where status in ('prevista','confirmada');
create index idx_duty_assignments_roster on public.duty_assignments(roster_id);
create index idx_duty_assignments_student on public.duty_assignments(student_id, duty_date desc);
create index idx_duty_assignments_class_date on public.duty_assignments(class_id, duty_date);

create table public.duty_impediments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  impediment_type text not null
    check (impediment_type in ('ausencia','dispensa','restricao_medica','missao_externa','problema_administrativo','outro')),
  starts_on date not null,
  ends_on date not null,
  reason text not null,
  affected_role_ids uuid[],
  operational_note text,
  active boolean not null default true,
  registered_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (length(trim(reason)) > 0)
);

create trigger trg_duty_impediments_updated_at
  before update on public.duty_impediments
  for each row execute function public.set_updated_at();

create index idx_duty_impediments_student_period on public.duty_impediments(student_id, starts_on, ends_on);
create index idx_duty_impediments_active_period on public.duty_impediments(starts_on, ends_on)
  where active = true;

create table public.duty_assignment_logs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.duty_assignments(id) on delete set null,
  roster_id uuid references public.duty_rosters(id) on delete set null,
  action text not null
    check (action in ('generated','published','manual_change','auto_substitution','cancelled')),
  actor_id uuid references auth.users(id),
  actor_role text,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now(),
  check (action <> 'manual_change' or length(trim(coalesce(reason, ''))) > 0)
);

create index idx_duty_logs_assignment on public.duty_assignment_logs(assignment_id);
create index idx_duty_logs_roster_created on public.duty_assignment_logs(roster_id, created_at desc);

-- ---------------------------------------------------------------------
-- Comunicados
-- ---------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  body text not null,
  audience_type text not null
    check (audience_type in ('turma','individual','perfil')),
  target_role text
    check (target_role is null or target_role in ('coordenacao','secretaria','instrutor','aluno')),
  target_student_ids uuid[],
  priority text not null default 'normal'
    check (priority in ('normal','alta','urgente')),
  status text not null default 'rascunho'
    check (status in ('rascunho','publicado','arquivado')),
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(title)) > 0),
  check (length(trim(body)) > 0),
  check (
    (audience_type = 'perfil' and target_role is not null)
    or (audience_type <> 'perfil')
  ),
  check (
    (audience_type = 'individual' and coalesce(array_length(target_student_ids, 1), 0) > 0)
    or (audience_type <> 'individual')
  )
);

create trigger trg_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

create index idx_announcements_status_created on public.announcements(status, created_at desc);
create index idx_announcements_class on public.announcements(class_id);
create index idx_announcements_target_students on public.announcements using gin(target_student_ids);

create table public.announcement_attachments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  storage_path text,
  external_url text,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint,
  attachment_type text not null
    check (attachment_type in ('documento','planilha','imagem','video','link')),
  sort_order int not null default 0,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (
    (storage_path is not null and external_url is null)
    or (storage_path is null and external_url is not null)
  ),
  check (external_url is null or external_url ~* '^https://'),
  check (file_size_bytes is null or file_size_bytes <= 104857600),
  check (
    mime_type in (
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
      'text/uri-list'
    )
  )
);

create index idx_announcement_attachments_announcement on public.announcement_attachments(announcement_id, sort_order);
create index idx_announcement_attachments_storage on public.announcement_attachments(storage_path);

create table public.announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  read_by uuid not null references auth.users(id),
  read_at timestamptz not null default now(),
  unique (announcement_id, student_id)
);

create index idx_announcement_reads_student on public.announcement_reads(student_id, read_at desc);

create or replace function public.can_read_announcement(target public.announcements)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_coord()
    or (
      target.status = 'publicado'
      and (
        (target.audience_type = 'perfil' and target.target_role = public.current_role())
        or (
          public.current_role() = 'aluno'
          and (
            (
              target.audience_type = 'individual'
              and public.current_student_id() = any(coalesce(target.target_student_ids, array[]::uuid[]))
            )
            or (
              target.audience_type = 'turma'
              and exists (
                select 1
                from public.students s
                where s.id = public.current_student_id()
                  and (target.class_id is null or s.class_id = target.class_id)
              )
            )
          )
        )
        or (
          public.current_role() = 'instrutor'
          and target.audience_type in ('turma','perfil')
          and (target.target_role is null or target.target_role = 'instrutor')
        )
      )
    ),
    false
  );
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.duty_roles enable row level security;
alter table public.duty_rosters enable row level security;
alter table public.duty_assignments enable row level security;
alter table public.duty_impediments enable row level security;
alter table public.duty_assignment_logs enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_attachments enable row level security;
alter table public.announcement_reads enable row level security;

create policy "duty_roles: read authenticated"
  on public.duty_roles for select to authenticated using (true);
create policy "duty_roles: coord write"
  on public.duty_roles for all using (public.is_coord()) with check (public.is_coord());

create policy "duty_rosters: coord all"
  on public.duty_rosters for all using (public.is_coord()) with check (public.is_coord());
create policy "duty_rosters: instructor read published"
  on public.duty_rosters for select using (public.current_role() = 'instrutor' and status = 'publicada');
create policy "duty_rosters: student read published"
  on public.duty_rosters for select using (
    public.current_role() = 'aluno'
    and status = 'publicada'
    and exists (
      select 1 from public.students s
      where s.id = public.current_student_id()
        and s.class_id = duty_rosters.class_id
    )
  );

create policy "duty_assignments: coord all"
  on public.duty_assignments for all using (public.is_coord()) with check (public.is_coord());
create policy "duty_assignments: instructor read"
  on public.duty_assignments for select using (
    public.current_role() = 'instrutor'
    and exists (
      select 1 from public.duty_rosters r
      where r.id = duty_assignments.roster_id
        and r.status = 'publicada'
    )
  );
create policy "duty_assignments: student read own"
  on public.duty_assignments for select using (
    public.current_role() = 'aluno'
    and student_id = public.current_student_id()
  );

create policy "duty_impediments: coord all"
  on public.duty_impediments for all using (public.is_coord()) with check (public.is_coord());
create policy "duty_impediments: instructor operational read"
  on public.duty_impediments for select using (
    public.current_role() = 'instrutor'
    and active = true
    and operational_note is not null
  );
create policy "duty_impediments: student self read"
  on public.duty_impediments for select using (
    public.current_role() = 'aluno'
    and student_id = public.current_student_id()
  );

create policy "duty_logs: coord read"
  on public.duty_assignment_logs for select using (public.is_coord());
create policy "duty_logs: coord insert"
  on public.duty_assignment_logs for insert with check (public.is_coord());

create policy "announcements: coord all"
  on public.announcements for all using (public.is_coord()) with check (public.is_coord());
create policy "announcements: target read"
  on public.announcements for select using (public.can_read_announcement(announcements));

create policy "announcement_attachments: coord all"
  on public.announcement_attachments for all using (public.is_coord()) with check (public.is_coord());
create policy "announcement_attachments: target read"
  on public.announcement_attachments for select using (
    exists (
      select 1 from public.announcements a
      where a.id = announcement_attachments.announcement_id
        and public.can_read_announcement(a)
    )
  );

create policy "announcement_reads: coord read"
  on public.announcement_reads for select using (public.is_coord());
create policy "announcement_reads: student self read"
  on public.announcement_reads for select using (
    public.current_role() = 'aluno'
    and student_id = public.current_student_id()
  );
create policy "announcement_reads: student insert"
  on public.announcement_reads for insert with check (
    public.current_role() = 'aluno'
    and student_id = public.current_student_id()
    and read_by = auth.uid()
    and exists (
      select 1 from public.announcements a
      where a.id = announcement_id
        and public.can_read_announcement(a)
    )
  );

-- ---------------------------------------------------------------------
-- Storage privado para anexos de comunicados
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'announcement-attachments',
  'announcement-attachments',
  false,
  104857600,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "announcement_files: coord all"
  on storage.objects for all
  using (bucket_id = 'announcement-attachments' and public.is_coord())
  with check (bucket_id = 'announcement-attachments' and public.is_coord());

create policy "announcement_files: target read"
  on storage.objects for select
  using (
    bucket_id = 'announcement-attachments'
    and exists (
      select 1
      from public.announcement_attachments aa
      join public.announcements a on a.id = aa.announcement_id
      where aa.storage_path = storage.objects.name
        and public.can_read_announcement(a)
    )
  );
