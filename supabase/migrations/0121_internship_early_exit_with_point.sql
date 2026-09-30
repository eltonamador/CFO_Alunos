-- Saída antes da janela comum: registra ponto real e relato na mesma transação.
-- A carga prevista permanece apenas prevista até decisão da Coordenação.
create function public.internship_record_point_with_reason(
  p_assignment_id uuid, p_point_type text, p_latitude double precision,
  p_longitude double precision, p_accuracy_m double precision,
  p_supervisor_name text, p_early_exit_reason text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  a public.internship_assignments;
  sh public.internship_shifts;
  loc public.internship_site_locations;
  tz text;
  distance double precision;
  point_id uuid;
  entry_at timestamptz;
  recorded_at timestamptz;
  status text;
  officer text;
  site_kind text;
  reason text := nullif(btrim(p_early_exit_reason), '');
begin
  if not public.internship_has_role(array['aluno']) then
    raise exception 'Somente o cadete registra seu ponto.' using errcode = '42501';
  end if;
  select * into a from public.internship_assignments where id = p_assignment_id for update;
  if a.id is null or a.student_id is distinct from public.current_student_id() then
    raise exception 'O ponto deve pertencer ao cadete autenticado.' using errcode = '42501';
  end if;
  select * into sh from public.internship_shifts where id = a.shift_id;
  if a.status <> 'prevista' or sh.status <> 'publicado' then
    raise exception 'A participação não está ativa.' using errcode = '23514';
  end if;
  if p_point_type not in ('entrada', 'saida') or p_point_type is null
    or (p_point_type = 'entrada' and reason is not null)
    or (reason is not null and length(reason) not between 5 and 500) then
    raise exception 'Revise o tipo de ponto e o motivo da saída.' using errcode = '23514';
  end if;
  select id into point_id from public.internship_attendance_points
    where assignment_id = a.id and point_type = p_point_type;
  if found then return point_id; end if;
  select timezone into tz from public.internship_programs where id = sh.program_id;
  if (now() at time zone tz)::date not between
    (sh.starts_at at time zone tz)::date and (sh.ends_at at time zone tz)::date then
    raise exception 'O ponto fica disponível nas datas do seu plantão. Para correções, procure a Coordenação.' using errcode = '23514';
  end if;
  if p_latitude is null or p_longitude is null or p_accuracy_m is null
    or not (p_latitude between -90 and 90 and p_longitude between -180 and 180
      and p_accuracy_m between 0 and 100000) then
    raise exception 'Não foi possível validar a localização enviada pelo aparelho.' using errcode = '23514';
  end if;
  officer := nullif(btrim(p_supervisor_name), '');
  if officer is not null and length(officer) not between 3 and 120 then
    raise exception 'Revise o nome do oficial responsável pelo serviço.' using errcode = '23514';
  end if;
  if p_point_type = 'saida' then
    select p.recorded_at, coalesce(officer, p.supervisor_name) into entry_at, officer
      from public.internship_attendance_points p
      where p.assignment_id = a.id and p.point_type = 'entrada';
    if not found then
      raise exception 'Registre a entrada antes da saída.' using errcode = '23514';
    end if;
    if now() < entry_at + interval '30 minutes' then
      raise exception 'A saída só pode ser registrada 30 minutos após a entrada.' using errcode = '23514';
    end if;
    if now() < sh.ends_at - interval '60 minutes' and reason is null then
      raise exception 'Informe o motivo da saída antecipada para registrar o ponto.' using errcode = '23514';
    end if;
    if now() >= sh.ends_at - interval '60 minutes' and reason is not null then
      raise exception 'A saída comum já está disponível; registre a saída normal.' using errcode = '23514';
    end if;
  end if;
  select site_type into site_kind from public.internship_sites where id = sh.site_id;
  if site_kind = 'praia' then
    status := 'praia_livre';
  else
    select * into loc from public.internship_site_locations where site_id = sh.site_id;
    if loc.site_id is null then status := 'sem_configuracao';
    else
      distance := 2 * 6371000 * asin(sqrt(least(1.0, greatest(0.0,
        power(sin(radians(p_latitude - loc.latitude) / 2), 2)
        + cos(radians(loc.latitude)) * cos(radians(p_latitude))
        * power(sin(radians(p_longitude - loc.longitude) / 2), 2)))));
      status := case when p_accuracy_m > loc.radius_m then 'impreciso'
        when distance <= loc.radius_m then 'dentro' else 'fora' end;
    end if;
  end if;
  insert into public.internship_attendance_points(
    assignment_id, student_id, point_type, recorded_by, latitude, longitude,
    accuracy_m, supervisor_name, site_latitude, site_longitude, site_radius_m,
    distance_m, location_status
  ) values (
    a.id, a.student_id, p_point_type, auth.uid(), p_latitude, p_longitude,
    p_accuracy_m, officer, loc.latitude, loc.longitude, loc.radius_m,
    distance, status
  ) returning id, internship_attendance_points.recorded_at into point_id, recorded_at;
  if reason is not null then
    insert into public.internship_cadet_reports(
      assignment_id, student_id, report_type, reported_exit_at, reason, reported_by
    ) values (
      a.id, a.student_id, 'saida_antecipada', recorded_at, reason, auth.uid()
    );
  end if;
  return point_id;
end;
$$;

create or replace function public.internship_record_point(
  p_assignment_id uuid, p_point_type text, p_latitude double precision,
  p_longitude double precision, p_accuracy_m double precision,
  p_supervisor_name text default null
) returns uuid language sql security definer set search_path = public as $$
  select public.internship_record_point_with_reason(
    p_assignment_id, p_point_type, p_latitude, p_longitude,
    p_accuracy_m, p_supervisor_name, null
  );
$$;

revoke all on function public.internship_record_point_with_reason(
  uuid, text, double precision, double precision, double precision, text, text
) from public, anon;
grant execute on function public.internship_record_point_with_reason(
  uuid, text, double precision, double precision, double precision, text, text
) to authenticated;

create function public.internship_guard_early_exit_approval() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.validation_status = 'homologado'
    and exists (
      select 1 from public.internship_cadet_reports r
      where r.assignment_id = new.assignment_id and r.report_type = 'saida_antecipada'
    ) and length(btrim(coalesce(new.decision_reason, ''))) < 5 then
    raise exception 'Saída antecipada exige justificativa da Coordenação para homologar a carga.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger internship_guard_early_exit_approval
before insert on public.internship_execution_records
for each row execute function public.internship_guard_early_exit_approval();

notify pgrst, 'reload schema';
