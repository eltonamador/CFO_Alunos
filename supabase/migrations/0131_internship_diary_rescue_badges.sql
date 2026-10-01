-- Novos marcos simbólicos do diário. Mantém todos os tipos anteriores,
-- o limite de seis etiquetas e as políticas de acesso existentes.
alter table public.internship_diary_entries
  drop constraint internship_diary_occurrence_types_valid,
  add constraint internship_diary_occurrence_types_valid check (
    cardinality(occurrence_types) <= 6 and
    occurrence_types <@ array[
      'trem_socorro','aph','acidente_transito',
      'incendio_residencial','incendio_urbano','incendio_vegetacao',
      'incendio_veiculo','salvamento_veicular','salvamento_altura',
      'salvamento_confinado','salvamento_inundacao','salvamento_aquatico',
      'busca_salvamento','animal','abelhas_marimbondos',
      'arvore','produtos_perigosos','prevencao',
      'apoio','outro'
    ]::text[] and
    array_position(occurrence_types, null) is null
  );
