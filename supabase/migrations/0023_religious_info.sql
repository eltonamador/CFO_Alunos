-- =====================================================================
-- 0023 — Religious Info
-- Adiciona campos de religião e restrições religiosas à tabela students
-- =====================================================================

ALTER TABLE public.students 
  ADD COLUMN religion text,
  ADD COLUMN religion_other text,
  ADD COLUMN has_religious_restriction boolean,
  ADD COLUMN religious_restriction_notes text;
