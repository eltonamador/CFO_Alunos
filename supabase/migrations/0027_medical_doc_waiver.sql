-- 0027_medical_doc_waiver.sql
-- Permite que a Coordenação dispense a pendência do documento
-- "declaracao_medica" para alunos que declararam restrição de saúde mas
-- não podem (ou já apresentaram fisicamente) a declaração médica.
--
-- Regra de pendência atual:
--   Se health_restrictions tem allergies | continuous_medication |
--   chronic_disease | physical_restriction | dietary_restriction
--   ⇒ documents.declaracao_medica passa a ser exigido.
--
-- Após esta migração: se medical_doc_waived = true, a exigência é
-- suspensa, com rastro de auditoria (quem dispensou, quando e por quê).

ALTER TABLE public.health_restrictions
  ADD COLUMN IF NOT EXISTS medical_doc_waived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_doc_waived_reason text,
  ADD COLUMN IF NOT EXISTS medical_doc_waived_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS medical_doc_waived_at timestamptz;

-- Integridade: se waived = true, exige justificativa e autor.
ALTER TABLE public.health_restrictions
  DROP CONSTRAINT IF EXISTS health_restrictions_waiver_consistency;

ALTER TABLE public.health_restrictions
  ADD CONSTRAINT health_restrictions_waiver_consistency
  CHECK (
    medical_doc_waived = false
    OR (
      medical_doc_waived = true
      AND medical_doc_waived_reason IS NOT NULL
      AND length(trim(medical_doc_waived_reason)) > 0
      AND medical_doc_waived_by IS NOT NULL
      AND medical_doc_waived_at IS NOT NULL
    )
  );

COMMENT ON COLUMN public.health_restrictions.medical_doc_waived IS
  'Quando true, a exigência do documento declaracao_medica é dispensada para este aluno.';
COMMENT ON COLUMN public.health_restrictions.medical_doc_waived_reason IS
  'Justificativa textual obrigatória quando medical_doc_waived = true.';
COMMENT ON COLUMN public.health_restrictions.medical_doc_waived_by IS
  'auth.users.id do membro da Coordenação que registrou a dispensa.';
COMMENT ON COLUMN public.health_restrictions.medical_doc_waived_at IS
  'Timestamp em que a dispensa foi gravada (ou retirada — se retirada, todos os 3 campos voltam a NULL/false).';
