-- =====================================================================
-- 0015 — Dados físicos em health_restrictions
-- altura_cm, peso_kg, cirurgia_ocular, cirurgia_ocular_obs
-- =====================================================================

alter table public.health_restrictions
  add column if not exists altura_cm integer,
  add column if not exists peso_kg numeric(5,2),
  add column if not exists cirurgia_ocular boolean,
  add column if not exists cirurgia_ocular_obs text;
