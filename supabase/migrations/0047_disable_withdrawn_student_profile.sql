-- =====================================================================
-- 0047 — Desativa o autoatendimento de participante desligada
-- =====================================================================

update public.profiles p
set active = false
from public.students s
where p.student_id = s.id
  and p.role = 'aluno'
  and s.student_number = 27
  and upper(s.war_name) = 'MILENA';
