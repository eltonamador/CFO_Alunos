-- 0061 — Corrige a data de início da turma CFO 2026.1.
-- A data foi confirmada pela coordenação. O término permanece sem alteração
-- até o respectivo calendário letivo oficial ser cadastrado.

update public.classes as class
set start_date = date '2026-06-02'
from public.courses as course
where class.course_id = course.id
  and course.code = 'CFO-2026'
  and class.name = 'CFO 2026.1';
