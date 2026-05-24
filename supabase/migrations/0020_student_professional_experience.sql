-- 0020 — Add professional_experience to students table
alter table public.students
  add column if not exists professional_experience text;
