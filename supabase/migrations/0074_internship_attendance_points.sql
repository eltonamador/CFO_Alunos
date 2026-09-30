-- Location is collected only when a cadet explicitly records entry/exit.
-- A point is evidence for review, never an automatic homologation or deduction.
create table public.internship_site_locations (
 site_id uuid primary key references public.internship_sites(id) on delete restrict,
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 radius_m integer not null check(radius_m between 50 and 5000),
 updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now()
);
alter table public.internship_site_locations enable row level security;
revoke all on public.internship_site_locations from public,anon,authenticated;
grant select,insert,update on public.internship_site_locations to authenticated;
create policy internship_locations_manager on public.internship_site_locations for all to authenticated
 using(public.internship_can_manage()) with check(public.internship_can_manage());
create function public.internship_stamp_location() returns trigger language plpgsql security definer set search_path=public as $$begin
 if not public.internship_can_manage() then raise exception 'Acesso restrito à administração do estágio.' using errcode='42501';end if;
 new.updated_by:=auth.uid();new.updated_at:=now();return new;
end$$;
revoke all on function public.internship_stamp_location() from public,anon,authenticated;
create trigger internship_locations_stamp before insert or update on public.internship_site_locations for each row execute function public.internship_stamp_location();

create table public.internship_attendance_points (
 id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.internship_assignments(id) on delete restrict,
 student_id uuid not null references public.students(id) on delete restrict,
 point_type text not null check(point_type in ('entrada','saida')),
 recorded_at timestamptz not null default now(),recorded_by uuid not null references auth.users(id),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 accuracy_m double precision not null check(accuracy_m between 0 and 100000),
 supervisor_name text check(supervisor_name is null or length(btrim(supervisor_name)) between 3 and 120),
 site_latitude double precision,site_longitude double precision,site_radius_m integer,
 distance_m double precision,
 location_status text not null check(location_status in ('dentro','fora','impreciso','sem_configuracao')),
 unique(assignment_id,point_type)
);
alter table public.internship_attendance_points enable row level security;
revoke all on public.internship_attendance_points from public,anon,authenticated;
grant select on public.internship_attendance_points to authenticated;
create policy internship_points_read on public.internship_attendance_points for select to authenticated
 using(public.internship_can_manage() or (public.internship_has_role(array['aluno']) and student_id=public.current_student_id()));
create index internship_points_student on public.internship_attendance_points(student_id,recorded_at);
create trigger internship_points_audit after insert on public.internship_attendance_points for each row execute function public.internship_audit_change();

create function public.internship_record_point(p_assignment_id uuid,p_point_type text,
 p_latitude double precision,p_longitude double precision,p_accuracy_m double precision,p_supervisor_name text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.internship_assignments;sh public.internship_shifts;loc public.internship_site_locations;
 tz text;distance double precision;point_id uuid;entry_at timestamptz;status text;supervisor text;
begin
 if not public.internship_has_role(array['aluno']) then raise exception 'Somente o cadete registra seu ponto.' using errcode='42501';end if;
 select * into a from public.internship_assignments where id=p_assignment_id for update;
 if a.id is null or a.student_id is distinct from public.current_student_id() then raise exception 'O ponto deve pertencer ao cadete autenticado.' using errcode='42501';end if;
 select * into sh from public.internship_shifts where id=a.shift_id;
 if a.status<>'prevista' or sh.status<>'publicado' then raise exception 'A participação não está ativa.' using errcode='23514';end if;
 if p_point_type is null or p_point_type not in ('entrada','saida') then raise exception 'Escolha entrada ou saída.' using errcode='23514';end if;
 select id into point_id from public.internship_attendance_points where assignment_id=a.id and point_type=p_point_type;
 if found then return point_id;end if;
 select timezone into tz from public.internship_programs where id=sh.program_id;
 if (now() at time zone tz)::date not between (sh.starts_at at time zone tz)::date and (sh.ends_at at time zone tz)::date then
  raise exception 'O ponto fica disponível nas datas do seu plantão. Para correções, procure a administração do estágio.' using errcode='23514';
 end if;
 if p_latitude is null or p_longitude is null or p_accuracy_m is null
  or not (p_latitude between -90 and 90 and p_longitude between -180 and 180 and p_accuracy_m between 0 and 100000) then
  raise exception 'Não foi possível validar a localização enviada pelo aparelho.' using errcode='23514';
 end if;
 supervisor:=nullif(btrim(p_supervisor_name),'');
 if supervisor is not null and length(supervisor) not between 3 and 120 then raise exception 'Revise o nome do supervisor.' using errcode='23514';end if;
 if p_point_type='saida' then
  select recorded_at,coalesce(supervisor,supervisor_name) into entry_at,supervisor from public.internship_attendance_points where assignment_id=a.id and point_type='entrada';
  if not found then raise exception 'Registre a entrada antes da saída.' using errcode='23514';end if;
  if now()<entry_at then raise exception 'Saída anterior à entrada.' using errcode='23514';end if;
 end if;
 select * into loc from public.internship_site_locations where site_id=sh.site_id;
 if loc.site_id is null then status:='sem_configuracao';
 else
  distance:=2*6371000*asin(sqrt(least(1.0,greatest(0.0,
   power(sin(radians(p_latitude-loc.latitude)/2),2)+cos(radians(loc.latitude))*cos(radians(p_latitude))*power(sin(radians(p_longitude-loc.longitude)/2),2)))));
  status:=case when p_accuracy_m>loc.radius_m then 'impreciso' when distance<=loc.radius_m then 'dentro' else 'fora' end;
 end if;
 insert into public.internship_attendance_points(assignment_id,student_id,point_type,recorded_by,latitude,longitude,accuracy_m,supervisor_name,site_latitude,site_longitude,site_radius_m,distance_m,location_status)
 values(a.id,a.student_id,p_point_type,auth.uid(),p_latitude,p_longitude,p_accuracy_m,supervisor,loc.latitude,loc.longitude,loc.radius_m,distance,status) returning id into point_id;
 return point_id;
end$$;
revoke all on function public.internship_record_point(uuid,text,double precision,double precision,double precision,text) from public,anon;
grant execute on function public.internship_record_point(uuid,text,double precision,double precision,double precision,text) to authenticated;

-- Catalog location changes are auditable without rewriting previously recorded GPS checks.
create function public.internship_audit_location() returns trigger language plpgsql security definer set search_path=public as $$begin
 insert into public.audit_logs(actor_id,actor_role,entity,entity_id,action,before_data,after_data,reason)
 values(auth.uid(),public.current_role(),'internship_site_locations',new.site_id,lower(tg_op),case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new),'Configuração da localização e do raio para conferência do ponto.');
 return new;
end$$;
revoke all on function public.internship_audit_location() from public,anon,authenticated;
create trigger internship_locations_audit after insert or update on public.internship_site_locations for each row execute function public.internship_audit_location();
notify pgrst,'reload schema';
