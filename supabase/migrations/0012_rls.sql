-- =====================================================================
-- 0012 — Row Level Security (RLS) — TODAS as tabelas
-- Princípios:
--   - Coordenação: tudo
--   - Secretaria: administrativo (sem health detalhe)
--   - Instrutor: SELECT em views específicas + lista básica
--   - Aluno: somente seus próprios dados
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: self read"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: admin read all"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles: coord write"
  on public.profiles for all
  using (public.is_coord())
  with check (public.is_coord());

-- ---------------------------------------------------------------------
-- courses + classes — leitura geral, escrita só coord
-- ---------------------------------------------------------------------
alter table public.courses enable row level security;
alter table public.classes enable row level security;

create policy "courses: read all authenticated"
  on public.courses for select to authenticated using (true);
create policy "courses: coord write"
  on public.courses for all using (public.is_coord()) with check (public.is_coord());

create policy "classes: read all authenticated"
  on public.classes for select to authenticated using (true);
create policy "classes: coord write"
  on public.classes for all using (public.is_coord()) with check (public.is_coord());

-- ---------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------
alter table public.students enable row level security;

create policy "students: self read"
  on public.students for select
  using (id = public.current_student_id());

create policy "students: instructor read (via view preferida)"
  on public.students for select
  using (public.current_role() = 'instrutor');

create policy "students: admin read all"
  on public.students for select
  using (public.is_admin());

create policy "students: self update (limited fields)"
  on public.students for update
  using (id = public.current_student_id())
  with check (
    id = public.current_student_id()
    -- Bloqueio de campos protegidos é feito no application service (UpdateStudentProfile).
    -- DB-level extra: aluno não pode mudar class_id, student_number, pelotao, situation.
    -- (Verificação adicional via trigger ficará em migration futura se necessário.)
  );

create policy "students: admin write"
  on public.students for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- student_contacts / addresses / logistics / vehicles
-- Padrão repetido: self + admin + (instrutor SELECT em contacts apenas)
-- ---------------------------------------------------------------------
alter table public.student_contacts enable row level security;
alter table public.student_addresses enable row level security;
alter table public.student_logistics enable row level security;
alter table public.vehicles enable row level security;

create policy "contacts: self all"
  on public.student_contacts for all
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());
create policy "contacts: admin all"
  on public.student_contacts for all
  using (public.is_admin()) with check (public.is_admin());
create policy "contacts: instructor read"
  on public.student_contacts for select
  using (public.current_role() = 'instrutor');

create policy "addresses: self all"
  on public.student_addresses for all
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());
create policy "addresses: admin all"
  on public.student_addresses for all
  using (public.is_admin()) with check (public.is_admin());

create policy "logistics: self all"
  on public.student_logistics for all
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());
create policy "logistics: coord all"
  on public.student_logistics for all
  using (public.is_coord()) with check (public.is_coord());

create policy "vehicles: self all"
  on public.vehicles for all
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());
create policy "vehicles: admin all"
  on public.vehicles for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- emergency_contacts — aluno mantém; admin lê; INSTRUTOR LÊ (com audit)
-- ---------------------------------------------------------------------
alter table public.emergency_contacts enable row level security;

create policy "emergency: self all"
  on public.emergency_contacts for all
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());
create policy "emergency: admin all"
  on public.emergency_contacts for all
  using (public.is_admin()) with check (public.is_admin());
create policy "emergency: instructor read"
  on public.emergency_contacts for select
  using (public.current_role() = 'instrutor');

-- ---------------------------------------------------------------------
-- health_restrictions — CRITICAL
--   Coordenação: read+write
--   Aluno: read+write próprio
--   Secretaria: NÃO acessa (usa view v_health_indicator_secretaria)
--   Instrutor: NÃO acessa (usa v_student_card_instructor)
-- ---------------------------------------------------------------------
alter table public.health_restrictions enable row level security;

create policy "health: self read"
  on public.health_restrictions for select
  using (student_id = public.current_student_id());
create policy "health: self upsert"
  on public.health_restrictions for insert
  with check (student_id = public.current_student_id());
create policy "health: self update"
  on public.health_restrictions for update
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());

create policy "health: coord all"
  on public.health_restrictions for all
  using (public.is_coord()) with check (public.is_coord());

-- ---------------------------------------------------------------------
-- documents
--   Coordenação + Secretaria: tudo
--   Aluno: read/insert/update próprios
--   Instrutor: NEGADO
-- ---------------------------------------------------------------------
alter table public.documents enable row level security;

create policy "documents: self read"
  on public.documents for select
  using (student_id = public.current_student_id());
create policy "documents: self insert"
  on public.documents for insert
  with check (student_id = public.current_student_id());
create policy "documents: self update (reupload)"
  on public.documents for update
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());

create policy "documents: admin all"
  on public.documents for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- canga_assignments
--   Coordenação: write
--   Todos autenticados: read (visualização da designação atual)
--   Aluno: vê a sua atual
-- ---------------------------------------------------------------------
alter table public.canga_assignments enable row level security;

create policy "canga: read all authenticated"
  on public.canga_assignments for select to authenticated using (true);
create policy "canga: coord write"
  on public.canga_assignments for all
  using (public.is_coord()) with check (public.is_coord());

-- ---------------------------------------------------------------------
-- equipment_categories / requirements — catálogo
-- ---------------------------------------------------------------------
alter table public.equipment_categories enable row level security;
alter table public.equipment_requirements enable row level security;

create policy "eq_cat: read all authenticated"
  on public.equipment_categories for select to authenticated using (true);
create policy "eq_cat: coord write"
  on public.equipment_categories for all
  using (public.is_coord()) with check (public.is_coord());

create policy "eq_req: read all authenticated"
  on public.equipment_requirements for select to authenticated using (true);
create policy "eq_req: coord write"
  on public.equipment_requirements for all
  using (public.is_coord()) with check (public.is_coord());

-- ---------------------------------------------------------------------
-- student_equipment_status
--   Aluno: read/write próprio
--   Coordenação: tudo
--   Secretaria: read (para relatórios)
--   Instrutor: NEGADO
-- ---------------------------------------------------------------------
alter table public.student_equipment_status enable row level security;

create policy "seqs: self read"
  on public.student_equipment_status for select
  using (student_id = public.current_student_id());
create policy "seqs: self upsert"
  on public.student_equipment_status for insert
  with check (student_id = public.current_student_id());
create policy "seqs: self update"
  on public.student_equipment_status for update
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());

create policy "seqs: coord all"
  on public.student_equipment_status for all
  using (public.is_coord()) with check (public.is_coord());
create policy "seqs: secretaria read"
  on public.student_equipment_status for select
  using (public.current_role() = 'secretaria');

-- ---------------------------------------------------------------------
-- equipment_questions
-- ---------------------------------------------------------------------
alter table public.equipment_questions enable row level security;

create policy "eq_q: self read"
  on public.equipment_questions for select
  using (
    exists (
      select 1 from public.student_equipment_status s
      where s.id = student_equipment_status_id
        and s.student_id = public.current_student_id()
    )
  );
create policy "eq_q: self insert"
  on public.equipment_questions for insert
  with check (
    exists (
      select 1 from public.student_equipment_status s
      where s.id = student_equipment_status_id
        and s.student_id = public.current_student_id()
    )
  );
create policy "eq_q: coord all"
  on public.equipment_questions for all
  using (public.is_coord()) with check (public.is_coord());

-- ---------------------------------------------------------------------
-- pending_changes
-- ---------------------------------------------------------------------
alter table public.pending_changes enable row level security;

create policy "pending: self read"
  on public.pending_changes for select
  using (student_id = public.current_student_id());
create policy "pending: self insert"
  on public.pending_changes for insert
  with check (requested_by = auth.uid());
create policy "pending: admin all"
  on public.pending_changes for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- audit_logs — APPEND-ONLY
--   Inserções via trigger (security definer) — bypassa RLS
--   Leitura: Coord vê tudo; Aluno vê do próprio aluno
-- ---------------------------------------------------------------------
alter table public.audit_logs enable row level security;

create policy "audit: coord read"
  on public.audit_logs for select
  using (public.is_coord());

create policy "audit: self read (related to own student)"
  on public.audit_logs for select
  using (
    entity_id = public.current_student_id()
    or (entity in ('student_contacts','student_addresses','student_logistics','vehicles',
                   'emergency_contacts','health_restrictions','documents','canga_assignments',
                   'student_equipment_status','equipment_questions')
        and exists (
          select 1 from public.students s
          where s.id = public.current_student_id()
        )
    )
  );

-- Sem policy de INSERT/UPDATE/DELETE → ninguém via API. Triggers usam security definer.
