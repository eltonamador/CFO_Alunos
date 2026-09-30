-- Tipo específico para a escala de permanência do CFSD recebida pela Coordenação.
insert into public.schedule_types (code, name, description)
values (
  'permanencia_cfsd',
  'Escala de Permanência do CFSD',
  'Publicação do documento de permanência do Curso de Formação de Soldados.'
)
on conflict (code) do nothing;
