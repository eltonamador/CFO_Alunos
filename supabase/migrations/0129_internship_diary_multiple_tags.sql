-- Etiquetas múltiplas para o diário; as colunas singulares continuam espelhando
-- a primeira etiqueta para leitores antigos durante a transição.
alter table public.internship_diary_entries
  add column occurrence_types text[] not null default '{}',
  add column vehicles text[] not null default '{}';

update public.internship_diary_entries
set occurrence_types = case when occurrence_type is null then '{}'::text[] else array[occurrence_type] end,
    vehicles = case when vehicle is null then '{}'::text[] else array[vehicle] end;

alter table public.internship_diary_entries
  add constraint internship_diary_occurrence_types_valid check (
    cardinality(occurrence_types) <= 6 and
    occurrence_types <@ array['aph','acidente_transito','incendio_urbano',
      'incendio_vegetacao','incendio_veiculo','salvamento_aquatico',
      'busca_salvamento','animal','abelhas_marimbondos','arvore','produtos_perigosos',
      'prevencao','apoio','outro']::text[] and
    array_position(occurrence_types, null) is null
  ),
  add constraint internship_diary_vehicles_valid check (
    cardinality(vehicles) <= 6 and
    array_position(vehicles, null) is null
  );

-- O gatilho original protege os campos singulares na moderação. Este gatilho
-- roda depois dele e protege também as novas listas.
create function public.internship_diary_sync_tags() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_vehicle text;
begin
  if tg_op = 'UPDATE' and auth.uid() is not null
    and old.student_id is distinct from public.current_student_id() then
    new.occurrence_types := old.occurrence_types;
    new.vehicles := old.vehicles;
    return new;
  end if;

  -- Leitores antigos ainda escrevem apenas a coluna singular.
  if tg_op = 'UPDATE' then
    if new.occurrence_types is not distinct from old.occurrence_types
      and new.occurrence_type is distinct from old.occurrence_type then
      new.occurrence_types := case when new.occurrence_type is null
        then '{}'::text[] else array[new.occurrence_type] end;
    end if;
    if new.vehicles is not distinct from old.vehicles
      and new.vehicle is distinct from old.vehicle then
      new.vehicles := case when new.vehicle is null
        then '{}'::text[] else array[new.vehicle] end;
    end if;
  end if;

  if cardinality(new.occurrence_types) = 0 and new.occurrence_type is not null then
    new.occurrence_types := array[new.occurrence_type];
  end if;
  if cardinality(new.vehicles) = 0 and new.vehicle is not null then
    new.vehicles := array[new.vehicle];
  end if;
  foreach v_vehicle in array new.vehicles loop
    if length(btrim(v_vehicle)) = 0 or length(v_vehicle) > 60 then
      raise exception 'Etiqueta de viatura inválida.' using errcode = '23514';
    end if;
  end loop;
  new.occurrence_type := new.occurrence_types[1];
  new.vehicle := new.vehicles[1];
  return new;
end;
$$;
revoke all on function public.internship_diary_sync_tags() from public, anon, authenticated;
create trigger zz_internship_diary_sync_tags before insert or update
  on public.internship_diary_entries for each row
  execute function public.internship_diary_sync_tags();

notify pgrst, 'reload schema';
