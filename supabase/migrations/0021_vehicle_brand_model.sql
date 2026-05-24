-- 0020 — Adiciona "marca e modelo do veículo" à tabela vehicles
alter table public.vehicles
  add column if not exists vehicle_brand_model text;
