-- =====================================================================
-- 0028 — Booleanos explícitos para campos de saúde
-- =====================================================================
-- Antes desta migração os campos de saúde eram apenas texto livre. Isso
-- fazia com que valores como "nenhum" / "não possui" fossem interpretados
-- pelos filtros como ocorrência positiva (qualquer texto != vazio).
--
-- Agora cada situação possui um booleano explícito (has_*). Os campos de
-- texto continuam existindo apenas como detalhe — quando o booleano é
-- false o texto é limpo. Filtros e relatórios passam a usar o booleano.
-- =====================================================================

ALTER TABLE public.health_restrictions
  ADD COLUMN IF NOT EXISTS has_allergies              boolean,
  ADD COLUMN IF NOT EXISTS has_continuous_medication  boolean,
  ADD COLUMN IF NOT EXISTS has_chronic_disease        boolean,
  ADD COLUMN IF NOT EXISTS has_physical_restriction   boolean,
  ADD COLUMN IF NOT EXISTS has_dietary_restriction    boolean,
  ADD COLUMN IF NOT EXISTS has_eye_surgery            boolean;

-- ---------------------------------------------------------------------
-- Backfill seguro a partir dos textos existentes.
-- Considera "negativos" (não conta como ocorrência): vazio, "nenhum(a)",
-- "não", "nao", "n/a", "na", "nada", "sem", "0", "-", "nenhuma
-- diagnosticada", "não possui", "não tenho", "não tem" (com variações).
-- ---------------------------------------------------------------------
DO $$
DECLARE
  neg_re text := '^\s*(nenhum[ao]?|nao|n[aã]o|n/?a|nada|sem|0|-|nenhum[ao]?\s+diagnosticad[ao]|n[aã]o\s+possui|n[aã]o\s+tenho|n[aã]o\s+tem|sem\s+restri[cç][aã]o|sem\s+alergias?)\s*[.!]?\s*$';
BEGIN
  UPDATE public.health_restrictions SET
    has_allergies = CASE
      WHEN allergies IS NULL OR length(btrim(allergies)) = 0 THEN false
      WHEN lower(btrim(allergies)) ~ neg_re THEN false
      ELSE true END,
    has_continuous_medication = CASE
      WHEN continuous_medication IS NULL OR length(btrim(continuous_medication)) = 0 THEN false
      WHEN lower(btrim(continuous_medication)) ~ neg_re THEN false
      ELSE true END,
    has_chronic_disease = CASE
      WHEN chronic_disease IS NULL OR length(btrim(chronic_disease)) = 0 THEN false
      WHEN lower(btrim(chronic_disease)) ~ neg_re THEN false
      ELSE true END,
    has_physical_restriction = CASE
      WHEN physical_restriction IS NULL OR length(btrim(physical_restriction)) = 0 THEN false
      WHEN lower(btrim(physical_restriction)) ~ neg_re THEN false
      ELSE true END,
    has_dietary_restriction = CASE
      WHEN dietary_restriction IS NULL OR length(btrim(dietary_restriction)) = 0 THEN false
      WHEN lower(btrim(dietary_restriction)) ~ neg_re THEN false
      ELSE true END,
    has_eye_surgery = COALESCE(cirurgia_ocular, false);

  -- Limpa textos negativos identificados — o detalhe deve refletir somente
  -- conteúdo descritivo real. Textos válidos (true) são preservados.
  UPDATE public.health_restrictions SET allergies             = NULL WHERE has_allergies             = false;
  UPDATE public.health_restrictions SET continuous_medication = NULL WHERE has_continuous_medication = false;
  UPDATE public.health_restrictions SET chronic_disease       = NULL WHERE has_chronic_disease       = false;
  UPDATE public.health_restrictions SET physical_restriction  = NULL WHERE has_physical_restriction  = false;
  UPDATE public.health_restrictions SET dietary_restriction   = NULL WHERE has_dietary_restriction   = false;
END $$;

COMMENT ON COLUMN public.health_restrictions.has_allergies IS
  'Aluno declara possuir alergia. Filtros e relatórios devem usar esta coluna em vez de avaliar o texto.';
COMMENT ON COLUMN public.health_restrictions.has_continuous_medication IS
  'Aluno usa medicação contínua. Texto em continuous_medication só faz sentido quando true.';
COMMENT ON COLUMN public.health_restrictions.has_chronic_disease IS
  'Aluno declara doença crônica relevante. Texto em chronic_disease só faz sentido quando true.';
COMMENT ON COLUMN public.health_restrictions.has_physical_restriction IS
  'Aluno declara restrição física. Texto em physical_restriction só faz sentido quando true.';
COMMENT ON COLUMN public.health_restrictions.has_dietary_restriction IS
  'Aluno declara restrição alimentar. Texto em dietary_restriction só faz sentido quando true.';
COMMENT ON COLUMN public.health_restrictions.has_eye_surgery IS
  'Aluno realizou cirurgia ocular/refrativa. Espelha cirurgia_ocular (mantido por compatibilidade).';
