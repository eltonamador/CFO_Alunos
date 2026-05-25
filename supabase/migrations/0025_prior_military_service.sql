-- =====================================================================
-- 0025 — Prior Military Service
-- Registra se o aluno já foi militar antes do CFO e detalhes opcionais.
-- Não há campo "situação" (ativo/inativo) por decisão de produto.
-- Todas as colunas são nullable para preservar registros existentes.
-- =====================================================================

alter table public.students
  add column if not exists had_prior_military_service boolean,
  add column if not exists prior_military_branch text,
  add column if not exists prior_military_institution text,
  add column if not exists prior_military_rank text,
  add column if not exists prior_military_duration text,
  add column if not exists prior_military_notes text;

-- Idempotente: dropa o constraint se existir antes de recriar.
alter table public.students
  drop constraint if exists students_prior_military_branch_check;

alter table public.students
  add constraint students_prior_military_branch_check
  check (
    prior_military_branch is null
    or prior_military_branch in (
      'corpo_de_bombeiros_militar',
      'policia_militar',
      'forcas_armadas',
      'outra'
    )
  );

comment on column public.students.had_prior_military_service is
  'Aluno já foi militar antes de ingressar no CFO? Bool obrigatório no formulário.';
comment on column public.students.prior_military_branch is
  'Força/instituição (corpo_de_bombeiros_militar | policia_militar | forcas_armadas | outra). Só preenche se had_prior_military_service = true.';
comment on column public.students.prior_military_institution is
  'Nome da instituição/corporação. Obrigatório quando had_prior_military_service = true.';
comment on column public.students.prior_military_rank is
  'Posto/graduação anterior, opcional mesmo quando teve serviço anterior.';
comment on column public.students.prior_military_duration is
  'Tempo aproximado de serviço (texto livre). Obrigatório quando had_prior_military_service = true.';
comment on column public.students.prior_military_notes is
  'Observações livres sobre o serviço anterior. Opcional.';
