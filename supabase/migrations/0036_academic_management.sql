-- 0036 — Gestão acadêmica: expansão aditiva, sem atualizar dados legados.
-- Notas não representam aprovação oficial sem política normativa aprovada.
-- A auditoria deste módulo é atômica: qualquer falha cancela a gravação.

create table public.academic_disciplines (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(btrim(code)) > 0),
  name text not null check (length(btrim(name)) > 0),
  phase int not null check (phase between 1 and 3),
  kind text not null check (kind in ('disciplina','estagio','atividade','comportamento','tcc')),
  workload_hours int not null check (workload_hours > 0),
  source_ref text not null check (length(btrim(source_ref)) > 0),
  conflicts text[] not null default '{}',
  active boolean not null default true
);

create function public.academic_valid_parameters(p jsonb) returns boolean
language sql immutable
as $$
  select case when jsonb_typeof(p) = 'object'
    and jsonb_typeof(p -> 'version') = 'number'
    and jsonb_typeof(p -> 'directPassGrade') = 'number'
    and jsonb_typeof(p -> 'vfMinAverage') = 'number'
    and jsonb_typeof(p -> 'vfPassGrade') = 'number'
    and jsonb_typeof(p -> 'vfReduction') = 'boolean'
    and jsonb_typeof(p -> 'vfMaxRecordedGrade') = 'number'
    and jsonb_typeof(p -> 'maxVfDisciplines') = 'number'
    and jsonb_typeof(p -> 'absenceLimitPercent') = 'number'
    and jsonb_typeof(p -> 'averageDecimals') = 'number'
    and jsonb_typeof(p -> 'courseAttendanceMinimum') = 'number'
  then coalesce(
    (p ->> 'version')::numeric = 1
    and (p ->> 'directPassGrade')::numeric between 0 and 10
    and (p ->> 'vfMinAverage')::numeric >= 0
    and (p ->> 'vfMinAverage')::numeric < (p ->> 'directPassGrade')::numeric
    and (p ->> 'vfPassGrade')::numeric > 0 and (p ->> 'vfPassGrade')::numeric <= 10
    and (p ->> 'vfMaxRecordedGrade')::numeric >= (p ->> 'vfPassGrade')::numeric
    and (p ->> 'vfMaxRecordedGrade')::numeric <= 10
    and (p ->> 'maxVfDisciplines')::numeric between 0 and 2147483647
    and (p ->> 'maxVfDisciplines')::numeric = trunc((p ->> 'maxVfDisciplines')::numeric)
    and (p ->> 'absenceLimitPercent')::numeric between 0 and 100
    and (p ->> 'attendanceMode') in ('total','unjustified')
    and (p ->> 'absencePenaltyStage') in ('before_vf','after_vf')
    and (p ->> 'averageDecimals')::numeric in (2,3,7)
    and (p ->> 'roundingMode') = 'half_even'
    and (p ->> 'comparisonStage') in ('rounded','exact')
    and (p ->> 'courseAttendanceMinimum')::numeric between 0 and 100,
    false)
  else false end
$$;

create table public.academic_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  parameters jsonb not null check (public.academic_valid_parameters(parameters)),
  decision_ref text not null check (length(btrim(decision_ref)) >= 5),
  approved_by uuid not null references public.profiles(id) on delete restrict,
  approved_at timestamptz not null default now()
);

create table public.academic_offerings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  discipline_id uuid not null references public.academic_disciplines(id) on delete restrict,
  academic_year int not null check (academic_year between 2000 and 2200),
  workload_hours int not null check (workload_hours > 0),
  vc_count int not null check (vc_count between 1 and 12),
  policy_id uuid references public.academic_policies(id) on delete restrict,
  decision_ref text not null check (length(btrim(decision_ref)) >= 5),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (class_id, discipline_id, academic_year)
);

create table public.academic_assignments (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.academic_offerings(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete restrict,
  display_name text not null check (length(btrim(display_name)) > 0),
  role text not null check (role in ('chefe','instrutor')),
  designation_ref text not null check (length(btrim(designation_ref)) >= 5),
  active boolean not null default true
);
create unique index academic_assignments_profile_role
  on public.academic_assignments(offering_id, profile_id, role) where profile_id is not null and active;

create table public.academic_enrollments (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.academic_offerings(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  student_label text not null,
  justified_absences numeric(7,2) check (justified_absences >= 0),
  unjustified_absences numeric(7,2) check (unjustified_absences >= 0),
  revision int not null default 1 check (revision > 0),
  change_reason text,
  unique (offering_id, student_id),
  unique (id, offering_id)
);

create table public.academic_assessments (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.academic_offerings(id) on delete restrict,
  kind text not null check (kind in ('VC','VF')),
  sequence int not null check (sequence between 1 and 12),
  title text not null check (length(btrim(title)) > 0),
  held_on date,
  check (kind <> 'VF' or sequence = 1),
  unique (offering_id, kind, sequence),
  unique (id, offering_id)
);

create table public.academic_grades (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.academic_offerings(id) on delete restrict,
  enrollment_id uuid not null,
  assessment_id uuid not null,
  score numeric(4,2) check (score between 0 and 10),
  revision int not null default 1 check (revision > 0),
  change_reason text,
  updated_at timestamptz not null default now(),
  unique (enrollment_id, assessment_id),
  foreign key (enrollment_id, offering_id)
    references public.academic_enrollments(id, offering_id) on delete restrict,
  foreign key (assessment_id, offering_id)
    references public.academic_assessments(id, offering_id) on delete restrict
);

create table public.academic_audit_events (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid references public.academic_offerings(id) on delete restrict,
  student_id uuid references public.students(id) on delete restrict,
  entity text not null,
  entity_id uuid not null,
  action text not null check (action in ('insert','update','delete')),
  actor_id uuid references public.profiles(id) on delete restrict,
  actor_name text,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index academic_offerings_class on public.academic_offerings(class_id);
create index academic_assignments_profile on public.academic_assignments(profile_id) where active;
create index academic_enrollments_student on public.academic_enrollments(student_id);
create index academic_grades_assessment on public.academic_grades(assessment_id);
create index academic_grades_offering on public.academic_grades(offering_id);
create index academic_audit_offering on public.academic_audit_events(offering_id, created_at desc);
create index academic_audit_student on public.academic_audit_events(student_id, created_at desc);

-- Helpers exclusivos evitam herdar acesso de perfis inativos do legado.
create function public.academic_active_role() returns text
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active $$;

create function public.academic_current_student() returns uuid
language sql stable security definer set search_path = public
as $$ select student_id from public.profiles where id = auth.uid() and active and role = 'aluno' $$;

create function public.academic_can_read_offering(p_offering_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    public.academic_active_role() in ('coordenacao','secretaria')
    or (public.academic_active_role() = 'instrutor' and exists (
      select 1 from public.academic_assignments a where a.offering_id = p_offering_id
      and a.profile_id = auth.uid() and a.active
    ))
    or (public.academic_active_role() = 'aluno' and exists (
      select 1 from public.academic_enrollments e where e.offering_id = p_offering_id
      and e.student_id = public.academic_current_student()
    )), false)
$$;

create function public.academic_can_grade(p_offering_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(exists (
    select 1 from public.academic_offerings o where o.id = p_offering_id and o.active
      and (public.academic_active_role() = 'coordenacao'
        or (public.academic_active_role() = 'instrutor' and exists (
          select 1 from public.academic_assignments a where a.offering_id = o.id
            and a.profile_id = auth.uid() and a.active
        )))
  ), false)
$$;

-- Os triggers definem snapshots/autor no servidor e protegem invariantes
-- mesmo quando o cliente chama diretamente a API de tabelas do Supabase.
create function public.academic_guard_record() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_offering public.academic_offerings;
  v_student public.students;
  v_profile public.profiles;
begin
  if tg_op = 'DELETE' then
    raise exception 'Registros acadêmicos não podem ser excluídos.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.id <> old.id then
    raise exception 'Identificador acadêmico é imutável.' using errcode = '23514';
  end if;

  if tg_table_name = 'academic_disciplines' then
    if tg_op = 'UPDATE' and exists (
      select 1 from public.academic_offerings where discipline_id = old.id
    ) and (to_jsonb(new) - 'active') is distinct from (to_jsonb(old) - 'active') then
      raise exception 'Disciplina com oferta é imutável; cadastre nova versão do catálogo.' using errcode = '23514';
    end if;

  elsif tg_table_name = 'academic_policies' then
    if tg_op <> 'INSERT' then
      raise exception 'Política aprovada é imutável; cadastre nova versão.' using errcode = '23514';
    end if;
    if public.academic_active_role() is distinct from 'coordenacao' then
      raise exception 'Somente coordenação ativa aprova políticas.' using errcode = '42501';
    end if;
    new.approved_by := auth.uid();
    new.approved_at := now();

  elsif tg_table_name = 'academic_offerings' then
    if tg_op = 'UPDATE' then
      new.created_at := old.created_at;
      if exists (select 1 from public.academic_assessments where offering_id = old.id)
        and (new.class_id is distinct from old.class_id
          or new.discipline_id is distinct from old.discipline_id
          or new.academic_year is distinct from old.academic_year
          or new.workload_hours is distinct from old.workload_hours
          or new.vc_count is distinct from old.vc_count
          or (new.policy_id is distinct from old.policy_id and old.policy_id is not null)) then
        raise exception 'Configuração congelada após a primeira avaliação.' using errcode = '23514';
      end if;
      if exists (select 1 from public.academic_enrollments where offering_id = old.id)
        and new.class_id is distinct from old.class_id then
        raise exception 'Turma não pode mudar depois de matricular cadetes.' using errcode = '23514';
      end if;
    end if;

  elsif tg_table_name = 'academic_assignments' then
    if tg_op = 'UPDATE' and (new.offering_id <> old.offering_id or new.profile_id is distinct from old.profile_id) then
      raise exception 'Desative a designação e cadastre outra para alterar seu vínculo.' using errcode = '23514';
    end if;
    if new.profile_id is not null then
      select * into v_profile from public.profiles where id = new.profile_id;
      if not found or (new.active and (v_profile.role not in ('coordenacao','instrutor') or not v_profile.active)) then
        raise exception 'Responsável deve ser um perfil ativo de instrutor ou coordenação.' using errcode = '23514';
      end if;
      new.display_name := v_profile.full_name;
    end if;

  elsif tg_table_name = 'academic_enrollments' then
    select * into v_offering from public.academic_offerings where id = new.offering_id for update;
    select * into v_student from public.students where id = new.student_id;
    if v_student.id is null or v_offering.id is null
      or (tg_op = 'INSERT' and (v_student.class_id <> v_offering.class_id
        or v_student.deleted_at is not null or not v_offering.active)) then
      raise exception 'Cadete deve pertencer à turma da oferta.' using errcode = '23514';
    end if;
    if coalesce(new.justified_absences, 0) + coalesce(new.unjustified_absences, 0) > v_offering.workload_hours then
      raise exception 'Ausências não podem exceder a carga da oferta.' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' then
      new.student_label := v_student.war_name || ' — ' ||
        lpad(coalesce(v_student.student_number::text, '?'), greatest(2, length(coalesce(v_student.student_number::text, '?'))), '0');
      new.revision := 1;
    else
      if new.offering_id <> old.offering_id or new.student_id <> old.student_id then
        raise exception 'Vínculo de matrícula é imutável.' using errcode = '23514';
      end if;
      new.student_label := old.student_label;
      if new.revision <> old.revision + 1 then
        raise exception 'Matrícula mudou; atualize a página.' using errcode = '40001';
      end if;
      if length(btrim(coalesce(new.change_reason, ''))) < 5 then
        raise exception 'Informe justificativa para alterar a frequência.' using errcode = '23514';
      end if;
    end if;

  elsif tg_table_name = 'academic_assessments' then
    select * into v_offering from public.academic_offerings where id = new.offering_id for update;
    if not found or not v_offering.active then
      raise exception 'Oferta indisponível.' using errcode = '23514';
    end if;
    if new.kind = 'VC' and new.sequence > v_offering.vc_count then
      raise exception 'Sequência excede a quantidade de VCs da oferta.' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' then
      if new.offering_id <> old.offering_id then
        raise exception 'Oferta da avaliação é imutável.' using errcode = '23514';
      end if;
      if exists (select 1 from public.academic_grades where assessment_id = old.id) and new is distinct from old then
        raise exception 'Avaliação com lançamentos não pode ser alterada.' using errcode = '23514';
      end if;
    end if;

  elsif tg_table_name = 'academic_grades' then
    if tg_op = 'INSERT' then
      new.revision := 1;
    else
      if new.offering_id <> old.offering_id or new.enrollment_id <> old.enrollment_id or new.assessment_id <> old.assessment_id then
        raise exception 'Vínculos da nota são imutáveis.' using errcode = '23514';
      end if;
      if new.revision <> old.revision + 1 then
        raise exception 'Nota mudou; atualize a página.' using errcode = '40001';
      end if;
      if length(btrim(coalesce(new.change_reason, ''))) < 5 then
        raise exception 'Correção exige justificativa com pelo menos 5 caracteres.' using errcode = '23514';
      end if;
    end if;
    new.updated_at := now();
  end if;
  return new;
end
$$;

create function public.academic_audit_record() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_row jsonb;
  v_offering uuid;
  v_student uuid;
begin
  if tg_op <> 'INSERT' then v_before := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_after := to_jsonb(new); end if;
  v_row := coalesce(v_after, v_before);
  v_offering := (v_row ->> 'offering_id')::uuid;
  if tg_table_name = 'academic_offerings' then v_offering := (v_row ->> 'id')::uuid; end if;
  v_student := (v_row ->> 'student_id')::uuid;
  if tg_table_name = 'academic_grades' then
    select student_id into v_student from public.academic_enrollments where id = (v_row ->> 'enrollment_id')::uuid;
  end if;
  insert into public.academic_audit_events
    (offering_id, student_id, entity, entity_id, action, actor_id, actor_name, before_data, after_data, reason)
  values (v_offering, v_student, tg_table_name, (v_row ->> 'id')::uuid, lower(tg_op),
    auth.uid(), (select full_name from public.profiles where id = auth.uid()),
    v_before, v_after, coalesce(v_row ->> 'change_reason', v_row ->> 'decision_ref', v_row ->> 'designation_ref'));
  -- Deliberadamente sem EXCEPTION: não pode existir nota sem auditoria.
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create function public.academic_reject_audit_change() returns trigger
language plpgsql as $$
begin
  raise exception 'Histórico acadêmico é imutável.' using errcode = '42501';
end
$$;
create trigger academic_audit_immutable before update or delete on public.academic_audit_events
for each row execute function public.academic_reject_audit_change();

do $$
declare t text;
begin
  foreach t in array array['academic_disciplines','academic_policies','academic_offerings',
    'academic_assignments','academic_enrollments','academic_assessments','academic_grades'] loop
    execute format('create trigger academic_guard before insert or update or delete on public.%I for each row execute function public.academic_guard_record()', t);
    execute format('create trigger academic_audit after insert or update or delete on public.%I for each row execute function public.academic_audit_record()', t);
  end loop;
end
$$;

-- Gravação única transacional, com compare-and-swap obrigatório. O bloqueio
-- da oferta também serializa alterações na avaliação e primeiro lançamento.
create function public.academic_save_grade(
  p_assessment_id uuid, p_enrollment_id uuid, p_score numeric,
  p_expected_revision int, p_reason text
) returns public.academic_grades
language plpgsql security definer set search_path = public
as $$
declare
  v_assessment public.academic_assessments;
  v_enrollment public.academic_enrollments;
  v_grade public.academic_grades;
begin
  select * into v_assessment from public.academic_assessments where id = p_assessment_id;
  if not found or not public.academic_can_grade(v_assessment.offering_id) then
    raise exception 'Sem permissão para lançar nesta oferta.' using errcode = '42501';
  end if;
  perform 1 from public.academic_offerings where id = v_assessment.offering_id for update;
  -- Revalida depois do lock, incluindo desativação ocorrida durante a espera.
  if not public.academic_can_grade(v_assessment.offering_id) then
    raise exception 'Oferta indisponível para lançamento.' using errcode = '42501';
  end if;
  select * into v_enrollment from public.academic_enrollments where id = p_enrollment_id for update;
  if not found or v_enrollment.offering_id <> v_assessment.offering_id then
    raise exception 'Matrícula e avaliação devem pertencer à mesma oferta.' using errcode = '23514';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Revisão esperada é obrigatória.' using errcode = '23514';
  end if;
  if p_score is not null and (p_score < 0 or p_score > 10 or p_score <> round(p_score, 2)) then
    raise exception 'Nota deve estar entre 0 e 10, com até duas casas decimais.' using errcode = '23514';
  end if;
  select * into v_grade from public.academic_grades
    where enrollment_id = p_enrollment_id and assessment_id = p_assessment_id for update;
  if found then
    if p_expected_revision <> v_grade.revision then
      raise exception 'Nota mudou; atualize antes de corrigir.' using errcode = '40001';
    end if;
    update public.academic_grades set score = p_score, revision = revision + 1, change_reason = btrim(p_reason)
      where id = v_grade.id returning * into v_grade;
  else
    if p_expected_revision <> 0 then
      raise exception 'Nota não encontrada na revisão esperada.' using errcode = '40001';
    end if;
    insert into public.academic_grades(offering_id, enrollment_id, assessment_id, score, change_reason)
      values (v_assessment.offering_id, p_enrollment_id, p_assessment_id, p_score, nullif(btrim(p_reason), ''))
      returning * into v_grade;
  end if;
  return v_grade;
end
$$;

create function public.academic_configure_policy(
  p_offering_id uuid, p_name text, p_parameters jsonb, p_decision_ref text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_offering public.academic_offerings;
  v_policy_id uuid;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente coordenação ativa aprova políticas.' using errcode = '42501';
  end if;
  select * into v_offering from public.academic_offerings where id = p_offering_id for update;
  if not found or not v_offering.active then
    raise exception 'Oferta indisponível.' using errcode = '23514';
  end if;
  if v_offering.policy_id is not null then
    raise exception 'Oferta já possui uma política aprovada.' using errcode = '23514';
  end if;
  insert into public.academic_policies(name, parameters, decision_ref, approved_by)
    values (btrim(p_name), p_parameters, btrim(p_decision_ref), auth.uid()) returning id into v_policy_id;
  update public.academic_offerings set policy_id = v_policy_id, decision_ref = btrim(p_decision_ref)
    where id = p_offering_id;
  return v_policy_id;
end
$$;

create function public.academic_save_attendance(
  p_enrollment_id uuid, p_justified numeric, p_unjustified numeric,
  p_expected_revision int, p_reason text
) returns public.academic_enrollments
language plpgsql security definer set search_path = public
as $$
declare
  v_enrollment public.academic_enrollments;
  v_offering_id uuid;
begin
  if public.academic_active_role() is distinct from 'coordenacao' then
    raise exception 'Somente coordenação ativa altera frequência.' using errcode = '42501';
  end if;
  select offering_id into v_offering_id from public.academic_enrollments where id = p_enrollment_id;
  perform 1 from public.academic_offerings where id = v_offering_id and active for update;
  if not found then raise exception 'Oferta indisponível.' using errcode = '23514'; end if;
  select * into v_enrollment from public.academic_enrollments where id = p_enrollment_id for update;
  if p_expected_revision is null or p_expected_revision <> v_enrollment.revision then
    raise exception 'Frequência mudou; atualize antes de corrigir.' using errcode = '40001';
  end if;
  if (p_justified is not null and (p_justified < 0 or p_justified <> round(p_justified, 2)))
    or (p_unjustified is not null and (p_unjustified < 0 or p_unjustified <> round(p_unjustified, 2))) then
    raise exception 'Ausências devem ser não negativas, com até duas casas decimais.' using errcode = '23514';
  end if;
  update public.academic_enrollments set justified_absences = p_justified,
    unjustified_absences = p_unjustified, revision = revision + 1, change_reason = btrim(p_reason)
    where id = p_enrollment_id returning * into v_enrollment;
  return v_enrollment;
end
$$;

-- Todas as tabelas ficam sem permissões herdadas para anon e PUBLIC.
do $$
declare t text;
begin
  foreach t in array array['academic_disciplines','academic_policies','academic_offerings',
    'academic_assignments','academic_enrollments','academic_assessments','academic_grades','academic_audit_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end
$$;
grant insert, update on public.academic_disciplines, public.academic_offerings,
  public.academic_assignments, public.academic_enrollments, public.academic_assessments to authenticated;
grant insert on public.academic_policies to authenticated;

create policy academic_disciplines_read on public.academic_disciplines for select to authenticated
using (public.academic_active_role() is not null);
create policy academic_disciplines_insert on public.academic_disciplines for insert to authenticated
with check (public.academic_active_role() = 'coordenacao');
create policy academic_disciplines_update on public.academic_disciplines for update to authenticated
using (public.academic_active_role() = 'coordenacao') with check (public.academic_active_role() = 'coordenacao');

create policy academic_policies_read on public.academic_policies for select to authenticated
using (public.academic_active_role() in ('coordenacao','secretaria') or exists (
  select 1 from public.academic_offerings o where o.policy_id = academic_policies.id and public.academic_can_read_offering(o.id)
));
create policy academic_policies_insert on public.academic_policies for insert to authenticated
with check (public.academic_active_role() = 'coordenacao' and approved_by = auth.uid());

create policy academic_offerings_read on public.academic_offerings for select to authenticated
using (public.academic_can_read_offering(id));
create policy academic_offerings_insert on public.academic_offerings for insert to authenticated
with check (public.academic_active_role() = 'coordenacao');
create policy academic_offerings_update on public.academic_offerings for update to authenticated
using (public.academic_active_role() = 'coordenacao') with check (public.academic_active_role() = 'coordenacao');

create policy academic_assignments_read on public.academic_assignments for select to authenticated
using (public.academic_can_read_offering(offering_id));
create policy academic_assignments_insert on public.academic_assignments for insert to authenticated
with check (public.academic_active_role() = 'coordenacao');
create policy academic_assignments_update on public.academic_assignments for update to authenticated
using (public.academic_active_role() = 'coordenacao') with check (public.academic_active_role() = 'coordenacao');

create policy academic_enrollments_read on public.academic_enrollments for select to authenticated
using ((public.academic_active_role() in ('coordenacao','secretaria','instrutor') and public.academic_can_read_offering(offering_id))
  or student_id = public.academic_current_student());
create policy academic_enrollments_insert on public.academic_enrollments for insert to authenticated
with check (public.academic_active_role() = 'coordenacao');
create policy academic_enrollments_update on public.academic_enrollments for update to authenticated
using (public.academic_active_role() = 'coordenacao') with check (public.academic_active_role() = 'coordenacao');

create policy academic_assessments_read on public.academic_assessments for select to authenticated
using (public.academic_can_read_offering(offering_id));
create policy academic_assessments_insert on public.academic_assessments for insert to authenticated
with check (public.academic_can_grade(offering_id));
create policy academic_assessments_update on public.academic_assessments for update to authenticated
using (public.academic_can_grade(offering_id)) with check (public.academic_can_grade(offering_id));

create policy academic_grades_read on public.academic_grades for select to authenticated
using ((public.academic_active_role() in ('coordenacao','secretaria','instrutor') and public.academic_can_read_offering(offering_id))
  or exists (select 1 from public.academic_enrollments e where e.id = enrollment_id and e.student_id = public.academic_current_student()));
create policy academic_audit_read on public.academic_audit_events for select to authenticated
using (public.academic_active_role() = 'coordenacao');

revoke all on function public.academic_active_role(), public.academic_current_student(),
  public.academic_can_read_offering(uuid), public.academic_can_grade(uuid),
  public.academic_guard_record(), public.academic_audit_record(), public.academic_reject_audit_change(),
  public.academic_save_grade(uuid, uuid, numeric, int, text),
  public.academic_configure_policy(uuid, text, jsonb, text),
  public.academic_save_attendance(uuid, numeric, numeric, int, text) from public, anon, authenticated;
grant execute on function public.academic_active_role(), public.academic_current_student(),
  public.academic_can_read_offering(uuid), public.academic_can_grade(uuid),
  public.academic_save_grade(uuid, uuid, numeric, int, text),
  public.academic_configure_policy(uuid, text, jsonb, text),
  public.academic_save_attendance(uuid, numeric, numeric, int, text) to authenticated;

comment on table public.academic_policies is 'Versões normativas aprovadas e imutáveis; sem regra automática presumida.';
comment on table public.academic_grades is 'Lançamento apenas por academic_save_grade; NULL é pendência e zero é nota válida.';
comment on table public.academic_audit_events is 'Auditoria acadêmica atômica, somente leitura da coordenação; falha de log cancela escrita.';
