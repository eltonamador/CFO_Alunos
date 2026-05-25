-- Correção de dados: alunos 16, 18, 20 e 22 estavam com sex='F' incorretamente.
-- Estes alunos são do sexo masculino.
update students
set sex = 'M'
where student_number in (16, 18, 20, 22)
  and sex = 'F';
