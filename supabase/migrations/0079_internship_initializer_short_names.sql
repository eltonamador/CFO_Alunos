-- A inicialização em um banco novo também deve criar os nomes curtos.
-- Altera somente os dois literais do catálogo, preservando a lógica da função.
do $$
declare v_definition text;
begin
  select pg_get_functiondef('public.internship_initialize_cfo_2026()'::regprocedure)
    into v_definition;
  if position('USB — Atendimento Pré-Hospitalar' in v_definition)=0
    or position('AR — Autorresgate' in v_definition)=0 then
    raise exception 'Inicializador do estágio mudou; revise os rótulos antes de aplicar.';
  end if;
  execute replace(
    replace(v_definition,
      'USB — Atendimento Pré-Hospitalar','USB — APH'),
    'AR — Autorresgate','AR — Salvamento');
end $$;
