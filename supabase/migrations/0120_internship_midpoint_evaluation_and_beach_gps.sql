-- Metade da duração prevista libera a avaliação. O GPS da praia registra
-- a posição real, sem raio fixo ou impedimento por mobilidade do posto.
create or replace function public.internship_evaluation_ready_at(p_context jsonb)
returns timestamptz language sql stable set search_path=public as $$
 select (p_context->>'starts_at')::timestamptz +
  (((p_context->>'ends_at')::timestamptz - (p_context->>'starts_at')::timestamptz) / 2)
$$;
revoke all on function public.internship_evaluation_ready_at(jsonb) from public,anon,authenticated;

create or replace function public.internship_read_evaluation_invite(p_token text) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare e public.internship_evaluations; c jsonb;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return null; end if;
 select * into e from public.internship_evaluations where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
 if e.id is null or e.status='revogada' or e.expires_at<=now() then return null; end if;
 c:=public.internship_evaluation_context(e.assignment_id);
 if c is null or c is distinct from e.context then return null; end if;
 if e.status<>'aguardando' then return jsonb_build_object('status','respondida'); end if;
 return jsonb_build_object('status','aguardando','context',e.context,'recipient_name',e.recipient_name,
 'expires_at',e.expires_at,'available_at',public.internship_evaluation_ready_at(e.context),
 'can_submit',public.internship_evaluation_ready_at(e.context)<=now());
end$$;

create or replace function public.internship_submit_evaluation(p_token text,p_evaluator_name text,p_evaluator_unit text,p_ratings jsonb,p_guidance text,p_incident boolean,p_incident_note text,p_confirmed boolean) returns uuid
language plpgsql security definer set search_path=public as $$
declare e public.internship_evaluations; c jsonb;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Link indisponível.' using errcode='23514'; end if;
 -- Serialize with cancellation and invitation replacement using the same lock order.
 select * into e from public.internship_evaluations where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
 perform 1 from public.internship_assignments where id=e.assignment_id for update;
 select * into e from public.internship_evaluations where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if e.id is null or e.status<>'aguardando' or e.expires_at<=now() then raise exception 'Link indisponível ou já respondido.' using errcode='23514'; end if;
 c:=public.internship_evaluation_context(e.assignment_id);
 if c is null or c is distinct from e.context then raise exception 'Plantão alterado. Solicite novo link.' using errcode='23514'; end if;
 if public.internship_evaluation_ready_at(c)>now() then raise exception 'Envie a avaliação após metade do plantão.' using errcode='23514'; end if;
 if p_confirmed is distinct from true or length(btrim(coalesce(p_evaluator_name,''))) not between 3 and 120 or length(btrim(coalesce(p_evaluator_unit,''))) not between 2 and 120 then raise exception 'Confirme o acompanhamento e a identificação do avaliador.' using errcode='23514'; end if;
 perform public.internship_validate_evaluation(p_ratings,p_guidance,p_incident,p_incident_note);
 update public.internship_evaluations set status='respondida',evaluator_name=btrim(p_evaluator_name),evaluator_unit=btrim(p_evaluator_unit),ratings=p_ratings,
 guidance=nullif(btrim(p_guidance),''),incident=p_incident,incident_note=case when p_incident then btrim(p_incident_note) end,submitted_at=now() where id=e.id;
 return e.id;
end$$;

create or replace function public.internship_record_paper_evaluation(p_assignment_id uuid,p_evaluator_name text,p_evaluator_unit text,p_ratings jsonb,p_guidance text,p_incident boolean,p_incident_note text,p_paper_reference text) returns uuid
language plpgsql security definer set search_path=public as $$
declare c jsonb; v_student uuid; v_version integer; v_id uuid;
begin
 if not public.internship_can_manage() then raise exception 'Acesso negado.' using errcode='42501'; end if;
 select student_id into v_student from public.internship_assignments where id=p_assignment_id for update;
 c:=public.internship_evaluation_context(p_assignment_id);
 if c is null or public.internship_evaluation_ready_at(c)>now() then raise exception 'Aguarde metade de um plantão vigente.' using errcode='23514'; end if;
 if length(btrim(coalesce(p_evaluator_name,''))) not between 3 and 120 or length(btrim(coalesce(p_evaluator_unit,''))) not between 2 and 120 or length(btrim(coalesce(p_paper_reference,''))) not between 3 and 200 then raise exception 'Identifique avaliador, unidade e ficha recebida.' using errcode='23514'; end if;
 perform public.internship_validate_evaluation(p_ratings,p_guidance,p_incident,p_incident_note);
 update public.internship_evaluations set status='revogada' where assignment_id=p_assignment_id and status='aguardando';
 select coalesce(max(version),0)+1 into v_version from public.internship_evaluations where assignment_id=p_assignment_id;
 insert into public.internship_evaluations(assignment_id,version,student_id,context,source,status,recipient_name,recipient_contact,created_by,evaluator_name,evaluator_unit,ratings,guidance,incident,incident_note,paper_reference,submitted_at)
 values(p_assignment_id,v_version,v_student,c,'papel','respondida',btrim(p_evaluator_name),'Ficha física',auth.uid(),btrim(p_evaluator_name),btrim(p_evaluator_unit),p_ratings,nullif(btrim(p_guidance),''),p_incident,case when p_incident then btrim(p_incident_note) end,btrim(p_paper_reference),now()) returning id into v_id;
 return v_id;
end$$;

alter table public.internship_attendance_points
 drop constraint if exists internship_attendance_points_location_status_check;
alter table public.internship_attendance_points
 add constraint internship_attendance_points_location_status_check
 check(location_status in ('dentro','fora','impreciso','sem_configuracao','praia_livre'));

create or replace function public.internship_stamp_location() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if not public.internship_can_manage() then
  raise exception 'Acesso restrito à administração do estágio.' using errcode='42501';
 end if;
 if not exists(select 1 from public.internship_sites where id=new.site_id and site_type='gbm') then
  raise exception 'Raio fixo de GPS permitido apenas nos GBMs.' using errcode='23514';
 end if;
 new.updated_by:=auth.uid();
 new.updated_at:=now();
 return new;
end$$;

create or replace function public.internship_record_point(
 p_assignment_id uuid,p_point_type text,p_latitude double precision,
 p_longitude double precision,p_accuracy_m double precision,p_supervisor_name text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare
 a public.internship_assignments; sh public.internship_shifts;
 loc public.internship_site_locations; tz text; distance double precision;
 point_id uuid; entry_at timestamptz; status text; supervisor text; site_kind text;
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
 select site_type into site_kind from public.internship_sites where id=sh.site_id;
 if site_kind='praia' then status:='praia_livre';
 else
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

revoke all on function public.internship_record_point(uuid,text,double precision,double precision,double precision,text) from public,anon;
grant execute on function public.internship_record_point(uuid,text,double precision,double precision,double precision,text) to authenticated;
notify pgrst,'reload schema';
