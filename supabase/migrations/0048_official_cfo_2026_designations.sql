-- 0048 — Dados oficiais do CFO BM 2026 — 1º Ano.
-- Fontes: BG nº 107, de 17/06/2026; Portarias nº 549 e nº 550, de 28/07/2026.
-- A Portaria nº 550 designa instrutores titulares; ela não lhes atribui a função de chefe de cadeira.

-- Matrículas funcionais publicadas no BG. O nº 27 foi deliberadamente excluído,
-- conforme determinação da Coordenação, preservando qualquer dado já existente.
update public.students as student
set enrollment_id = source.enrollment_id
from (
  values
    (1, '10163140'), (2, '10163506'), (3, '10163514'), (4, '10163522'),
    (5, '10163166'), (6, '10163530'), (7, '10163549'), (8, '10163557'),
    (9, '10163565'), (10, '10163174'), (11, '10163182'), (12, '10163476'),
    (13, '10163573'), (14, '10163190'), (15, '10163581'), (16, '10163590'),
    (17, '10163603'), (18, '10163204'), (19, '10163212'), (20, '10163611'),
    (21, '10163620'), (22, '10163301'), (23, '10163638'), (24, '10163280'),
    (25, '10163646'), (26, '10163654'),
    (28, '10163662'), (29, '10163670'), (30, '10163336')
) as source(student_number, enrollment_id)
where student.class_id = '22222222-2222-2222-2222-222222222222'
  and student.student_number = source.student_number;

create table public.cfo_coordination_members (
  id uuid primary key default gen_random_uuid(),
  registration text not null unique check (registration ~ '^[0-9]+$'),
  full_name text not null check (length(btrim(full_name)) > 0),
  military_rank text not null check (length(btrim(military_rank)) > 0),
  function_name text not null check (length(btrim(function_name)) > 0),
  effective_from date not null,
  designation_ref text not null check (length(btrim(designation_ref)) >= 5),
  profile_id uuid unique references public.profiles(id) on delete set null,
  active boolean not null default true,
  display_order smallint not null check (display_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_cfo_coordination_members_updated_at
  before update on public.cfo_coordination_members
  for each row execute function public.set_updated_at();

create function public.guard_cfo_coordination_member() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.profile_id is not null and not exists (
    select 1 from public.profiles
    where id = new.profile_id and role = 'coordenacao' and active
  ) then
    raise exception 'A conta vinculada deve ser uma conta ativa da Coordenação.' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger trg_guard_cfo_coordination_member
  before insert or update on public.cfo_coordination_members
  for each row execute function public.guard_cfo_coordination_member();

insert into public.cfo_coordination_members
  (registration, full_name, military_rank, function_name, effective_from, designation_ref, display_order)
values
  ('1175742', 'MÁRCIO FONSECA DA COSTA', 'MAJ QOEM BM', 'Coordenação-Geral', '2026-06-01', 'Portaria nº 549, de 28 de julho de 2026, art. 1º', 1),
  ('1195506', 'FRANCIELTON ARAÚJO AMADOR', 'CAP QOEM BM', 'Supervisão do Curso', '2026-06-01', 'Portaria nº 549, de 28 de julho de 2026, art. 1º', 2),
  ('1195867', 'JOSIANE OLIVEIRA DOS SANTOS', 'CAP QOEM BM FEM', 'Comando do Corpo de Alunos', '2026-06-01', 'Portaria nº 549, de 28 de julho de 2026, art. 1º', 3),
  ('1195549', 'MARLÚCIO ANDERSON DA CONCEIÇÃO TRAJANO', 'CAP QOEM BM', 'Coordenação Operacional de Instrução', '2026-06-01', 'Portaria nº 549, de 28 de julho de 2026, art. 1º', 4),
  ('1195808', 'ALDO NAHUM CARDOSO', 'CAP QOEM BM', 'Coordenação Pedagógica', '2026-06-01', 'Portaria nº 549, de 28 de julho de 2026, art. 1º', 5),
  ('943894', 'ANA CECÍLIA BARBOSA DE CANTUÁRIA', '2º TEN QOE BM', 'Secretaria da Coordenação', '2026-06-01', 'Portaria nº 549, de 28 de julho de 2026, art. 1º', 6),
  ('1160680', 'JACKSON DA SILVA SANTANA', '3º SGT QEP BM', 'Apoio Administrativo', '2026-06-01', 'Portaria nº 549, de 28 de julho de 2026, art. 1º', 7),
  ('1113666', 'ELINE DOS SANTOS MELO FURLAN', '1º SGT QP BM', 'Apoio Administrativo', '2026-06-01', 'Portaria nº 549, de 28 de julho de 2026, art. 1º', 8)
on conflict (registration) do update set
  full_name = excluded.full_name,
  military_rank = excluded.military_rank,
  function_name = excluded.function_name,
  effective_from = excluded.effective_from,
  designation_ref = excluded.designation_ref,
  display_order = excluded.display_order,
  active = true;

-- Registro independente de uma oferta acadêmica: a Portaria é uma designação
-- de pessoa para disciplina, não uma aprovação de política, VCs ou matrículas acadêmicas.
create table public.academic_official_designations (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.academic_disciplines(id) on delete restrict,
  source_code text not null,
  designation_kind text not null check (designation_kind in ('instrutor_titular','instrutor','monitor')),
  display_name text not null check (length(btrim(display_name)) > 0),
  designation_ref text not null check (length(btrim(designation_ref)) >= 5),
  active boolean not null default true,
  unique (discipline_id, source_code, designation_kind, display_name, designation_ref)
);

alter table public.cfo_coordination_members enable row level security;
alter table public.academic_official_designations enable row level security;
revoke all on public.cfo_coordination_members, public.academic_official_designations from public, anon, authenticated;
grant select on public.cfo_coordination_members, public.academic_official_designations to authenticated;

create policy cfo_coordination_members_read on public.cfo_coordination_members for select to authenticated
using (public.is_coord());
create policy cfo_coordination_members_write on public.cfo_coordination_members for all to authenticated
using (public.is_coord()) with check (public.is_coord());
create policy academic_official_designations_read on public.academic_official_designations for select to authenticated
using (public.academic_active_role() in ('coordenacao', 'secretaria'));

insert into public.academic_disciplines
  (code, name, phase, kind, workload_hours, source_ref, conflicts, active)
values
  ('CFO1-25-COMPORTAMENTO', 'Comportamento Escolar', 1, 'comportamento', 1,
   'Portaria nº 550, de 28 de julho de 2026, art. 1º. A carga é contínua; o valor técnico de 1 h/a apenas atende à restrição do catálogo e não representa carga horária oficial.',
   array['Carga horária contínua; não usar o valor técnico do catálogo para cômputo.']::text[], true)
on conflict (code) do nothing;

-- A Portaria nº 550 substitui a referência nominal anterior do repositório.
-- Não cria ofertas, avaliações ou matrículas acadêmicas: esses atos continuam
-- dependentes da configuração da Coordenação e da política aplicável.
insert into public.academic_official_designations
  (discipline_id, source_code, designation_kind, display_name, designation_ref)
select discipline.id, source.source_code, source.designation_kind, source.display_name,
  'Portaria nº 550, de 28 de julho de 2026, art. 1º'
from (
  values
    ('CFO1-01', '01', 'instrutor_titular', 'CEL QOEM BM MATEUS PICANÇO DE ALMEIDA'),
    ('CFO1-02', '02', 'instrutor_titular', 'CAP QOEM BM HAROLD DE SENA TAVARES'),
    ('CFO1-04', '04', 'instrutor_titular', 'CAP QOE BM BIANOR MONTEIRO DOS SANTOS JÚNIOR'),
    ('CFO1-05', '05', 'instrutor_titular', 'CEL QOEM BM PELSONDRÉ MARTINS DA SILVA'),
    ('CFO1-06', '06', 'instrutor_titular', 'CEL QOEM BM FEM IVANETE MORAES MONTEIRO'),
    ('CFO1-07', '07', 'instrutor_titular', 'CEL QOEM BM PELSONDRÉ MARTINS DA SILVA'),
    ('CFO1-08', '08', 'instrutor_titular', 'CAP QOE BM MARCELO DA SILVA OLIVEIRA'),
    ('CFO1-09', '09', 'instrutor_titular', 'CEL QOEM BM FEM IVANETE MORAES MONTEIRO'),
    ('CFO1-10', '10', 'instrutor_titular', 'TEN CEL QOEM BM JOSÉ LEANDRO TOMAZ MEDEIROS'),
    ('CFO1-11', '11', 'instrutor_titular', 'CEL QOEM BM ORIELSON FERREIRA PANTOJA CAMPOS'),
    ('CFO1-12', '12', 'instrutor_titular', 'CAP QOEM BM JUCIVALDO SANTANA LADISLAU'),
    ('CFO1-13', '13', 'instrutor_titular', '2º TEN QOE BM ANDRÉ BARROZO DA SILVA'),
    ('CFO1-14', '14', 'instrutor_titular', 'CAP QOEM BM LUIZ CÁSSIO DA PENHA CHAGAS'),
    ('CFO1-15', '15', 'instrutor_titular', 'CAP QOEM BM JASON NELSON BROCHADO SANT’ANA'),
    ('CFO1-16', '16', 'instrutor_titular', 'MAJ QOS BM ENF ANDERSON OLIVEIRA GALENO'),
    ('CFO1-17', '17', 'instrutor_titular', 'CEL QOEM BM ORIELSON FERREIRA PANTOJA CAMPOS'),
    ('CFO1-18', '18', 'instrutor_titular', 'CAP QOEM BM FEM JUCILEIDE MACHADO BARROS'),
    ('CFO1-19', '19', 'instrutor_titular', 'MAJ QOEM BM MÁRCIO FONSECA DA COSTA'),
    ('CFO1-20', '20', 'instrutor_titular', 'MAJ QOEM BM ANTÔNIO BRAGA CHUCRE SEGUNDO'),
    ('CFO1-21', '21', 'instrutor_titular', '2º TEN QOE BM FEM ANA CAROLINE NAIVA DANTAS'),
    ('CFO1-22', '22', 'instrutor_titular', 'CAP QOEM BM EVERTON WILLIAN SOUZA MARTINS'),
    ('CFO1-23', '23', 'instrutor_titular', 'CAP QOEM BM MARLÚCIO ANDERSON DA CONCEIÇÃO TRAJANO'),
    ('CFO1-24', '24', 'instrutor_titular', 'CAP QOEM BM DIEGO NUNES DA SILVA'),
    ('CFO1-25-COMPORTAMENTO', '25', 'instrutor', 'CAP QOEM BM FEM JOSIANE OLIVEIRA DOS SANTOS'),
    ('CFO1-25-COMPORTAMENTO', '25', 'instrutor', 'CAP QOEM BM MARLÚCIO ANDERSON DA CONCEIÇÃO TRAJANO'),
    ('CFO1-25-COMPORTAMENTO', '25', 'instrutor', 'CAP QOEM BM ALDO NAHUM CARDOSO'),
    ('CFO1-25-COMPORTAMENTO', '25', 'instrutor', '2º TEN QOE BM ANA CECÍLIA BARBOSA DE CANTUÁRIA'),
    ('CFO1-25-COMPORTAMENTO', '25', 'monitor', '3º SGT QEP BM JACKSON DA SILVA SANTANA'),
    ('CFO1-25-COMPORTAMENTO', '25', 'monitor', '1º SGT QP BM ELINE DOS SANTOS MELO FURLAN'),
    ('CFO1-25', '26', 'instrutor_titular', 'MAJ QOEM BM MÁRCIO FONSECA DA COSTA'),
    ('CFO1-25', '26', 'instrutor_titular', 'CAP QOEM BM FRANCIELTON ARAÚJO AMADOR'),
    ('CFO1-25', '26', 'instrutor_titular', 'CAP QOEM BM DIEGO NUNES DA SILVA'),
    ('CFO1-25', '26', 'instrutor_titular', 'CAP QOEM BM EMERSON SOUSA PAMPHYLIO')
) as source(discipline_code, source_code, designation_kind, display_name)
join public.academic_disciplines as discipline on discipline.code = source.discipline_code
on conflict (discipline_id, source_code, designation_kind, display_name, designation_ref) do nothing;

comment on table public.cfo_coordination_members is
  'Integrantes da Coordenação do CFO designados por ato formal; profile_id vincula uma conta individual de Coordenação.';
comment on table public.academic_official_designations is
  'Designações oficiais por disciplina, independentes da abertura de oferta, das matrículas acadêmicas e da política de avaliação.';
