-- O ponto de saída comum fica disponível uma hora antes do fim previsto,
-- desde que haja pelo menos 30 minutos entre os dois pontos. Saída antecipada
-- permanece no fluxo de ocorrência e conferência pela Coordenação.
create or replace function public.internship_record_point(
 p_assignment_id uuid,p_point_type text,p_latitude double precision,
 p_longitude double precision,p_accuracy_m double precision,p_supervisor_name text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare
 a public.internship_assignments; sh public.internship_shifts;
 loc public.internship_site_locations; tz text; distance double precision;
 point_id uuid; entry_at timestamptz; status text; supervisor text;
begin
 if not public.internship_has_role(array['aluno']) then
  raise exception 'Somente o cadete registra seu ponto.' using errcode='42501';
 end if;
 select * into a from public.internship_assignments where id=p_assignment_id for update;
 if a.id is null or a.student_id is distinct from public.current_student_id() then
  raise exception 'O ponto deve pertencer ao cadete autenticado.' using errcode='42501';
 end if;
 select * into sh from public.internship_shifts where id=a.shift_id;
 if a.status<>'prevista' or sh.status<>'publicado' then
  raise exception 'A participação não está ativa.' using errcode='23514';
 end if;
 if p_point_type is null or p_point_type not in ('entrada','saida') then
  raise exception 'Escolha entrada ou saída.' using errcode='23514';
 end if;
 select id into point_id from public.internship_attendance_points
  where assignment_id=a.id and point_type=p_point_type;
 if found then return point_id; end if;
 select timezone into tz from public.internship_programs where id=sh.program_id;
 if (now() at time zone tz)::date not between
  (sh.starts_at at time zone tz)::date and (sh.ends_at at time zone tz)::date then
  raise exception 'O ponto fica disponível nas datas do seu plantão. Para correções, procure a administração do estágio.' using errcode='23514';
 end if;
 if p_latitude is null or p_longitude is null or p_accuracy_m is null
  or not (p_latitude between -90 and 90 and p_longitude between -180 and 180
   and p_accuracy_m between 0 and 100000) then
  raise exception 'Não foi possível validar a localização enviada pelo aparelho.' using errcode='23514';
 end if;
 supervisor:=nullif(btrim(p_supervisor_name),'');
 if supervisor is not null and length(supervisor) not between 3 and 120 then
  raise exception 'Revise o nome do supervisor.' using errcode='23514';
 end if;
 if p_point_type='saida' then
  select recorded_at,coalesce(supervisor,supervisor_name) into entry_at,supervisor
   from public.internship_attendance_points
   where assignment_id=a.id and point_type='entrada';
  if not found then
   raise exception 'Registre a entrada antes da saída.' using errcode='23514';
  end if;
  if now()<sh.ends_at-interval '60 minutes' or now()<entry_at+interval '30 minutes' then
   raise exception 'Plantão em andamento. A saída comum só fica disponível uma hora antes do término previsto e 30 minutos após a entrada. Para sair antes, informe saída antecipada e comunique a administração.' using errcode='23514';
  end if;
 end if;
 select * into loc from public.internship_site_locations where site_id=sh.site_id;
 if loc.site_id is null then status:='sem_configuracao';
 else
  distance:=2*6371000*asin(sqrt(least(1.0,greatest(0.0,
   power(sin(radians(p_latitude-loc.latitude)/2),2)
   +cos(radians(loc.latitude))*cos(radians(p_latitude))
   *power(sin(radians(p_longitude-loc.longitude)/2),2)))));
  status:=case when p_accuracy_m>loc.radius_m then 'impreciso'
   when distance<=loc.radius_m then 'dentro' else 'fora' end;
 end if;
 insert into public.internship_attendance_points(
  assignment_id,student_id,point_type,recorded_by,latitude,longitude,
  accuracy_m,supervisor_name,site_latitude,site_longitude,site_radius_m,
  distance_m,location_status
 ) values(
  a.id,a.student_id,p_point_type,auth.uid(),p_latitude,p_longitude,
  p_accuracy_m,supervisor,loc.latitude,loc.longitude,loc.radius_m,distance,status
 ) returning id into point_id;
 return point_id;
end$$;

notify pgrst,'reload schema';
