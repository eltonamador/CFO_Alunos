-- Atualiza somente a nomenclatura exibida. Os códigos estáveis e o histórico
-- das participações/arquivos recebidos permanecem intactos.
update public.duty_roles
set name = 'Dia ao 1º Ano'
where code = 'aluno_dia' and name = 'Aluno de Dia';

update public.schedule_types
set name = 'Escala de Dia ao 1º Ano'
where code = 'aluno_dia' and name = 'Escala de Aluno de Dia';
