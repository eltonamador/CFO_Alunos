-- 0019 — Add graduation_name to students table
alter table public.students
  add column if not exists graduation_name text;
