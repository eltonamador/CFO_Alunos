-- Avaliação formativa por plantão. A resposta não altera presença nem horas.
create table public.internship_evaluations (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.internship_assignments(id) on delete restrict,
 version integer not null,
 student_id uuid not null references public.students(id) on delete restrict,
 context jsonb not null,
 source text not null check(source in ('digital','papel')),
 status text not null default 'aguardando' check(status in ('aguardando','respondida','liberada','devolvida','revogada')),
 recipient_name text not null check(length(btrim(recipient_name)) between 3 and 120),
 recipient_contact text not null check(length(btrim(recipient_contact)) between 3 and 200),
 token_hash text unique,
 expires_at timestamptz,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 evaluator_name text,
 evaluator_unit text,
 ratings jsonb,
 guidance text,
 incident boolean,
 incident_note text,
 paper_reference text,
 submitted_at timestamptz,
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id),
 review_note text,
 unique(assignment_id,version)
);
create index internship_evaluations_assignment on public.internship_evaluations(assignment_id,version desc);
create unique index internship_evaluations_open on public.internship_evaluations(assignment_id) where status='aguardando';
alter table public.internship_evaluations enable row level security;
revoke all on public.internship_evaluations from public,anon,authenticated;
grant select on public.internship_evaluations to authenticated;
create policy internship_evaluations_manager_read on public.internship_evaluations for select to authenticated
 using(public.internship_can_manage());
create trigger internship_evaluations_audit after insert or update or delete on public.internship_evaluations
 for each row execute function public.internship_audit_change();

create function public.internship_evaluation_context(p_assignment_id uuid) returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object('student_number',s.student_number,'war_name',s.war_name,
 'course_phase',s.pelotao,'activity_name',t.name,'site_name',site.name,
 'starts_at',sh.starts_at,'ends_at',sh.ends_at)
 from public.internship_assignments a join public.internship_shifts sh on sh.id=a.shift_id
 join public.students s on s.id=a.student_id
 join public.internship_activity_types t on t.id=sh.activity_type_id
 join public.internship_sites site on site.id=sh.site_id
 where a.id=p_assignment_id and a.status='prevista' and sh.status='publicado'
 and s.deleted_at is null and s.course_status='matriculado';
$$;
revoke all on function public.internship_evaluation_context(uuid) from public,anon,authenticated;

create function public.internship_evaluation_assignment(p_assignment_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if not public.internship_can_manage() then raise exception 'Acesso negado.' using errcode='42501'; end if;
 return public.internship_evaluation_context(p_assignment_id);
end$$;
revoke all on function public.internship_evaluation_assignment(uuid) from public,anon;
grant execute on function public.internship_evaluation_assignment(uuid) to authenticated;

create function public.internship_validate_evaluation(p_ratings jsonb,p_guidance text,p_incident boolean,p_incident_note text) returns void
language plpgsql immutable set search_path=public as $$
begin
 if p_ratings is null or jsonb_typeof(p_ratings)<>'object' then raise exception 'Responda aos seis critérios.' using errcode='23514'; end if;
 if (select count(*) from jsonb_object_keys(p_ratings))<>6 or not p_ratings ?& array['pontualidade','seguranca','tecnica','equipe','postura','aprendizagem']
 or exists(select 1 from jsonb_each(p_ratings) x where jsonb_typeof(x.value)<>'string' or x.value #>> '{}' not in ('reforco','esperado','acima','nao_observado')) then
 raise exception 'Responda aos seis critérios.' using errcode='23514'; end if;
 if length(coalesce(p_guidance,''))>1000 or length(coalesce(p_incident_note,''))>1000 then raise exception 'Texto acima do limite.' using errcode='23514'; end if;
 if exists(select 1 from jsonb_each_text(p_ratings) x where x.value='reforco') and length(btrim(coalesce(p_guidance,'')))<5 then
 raise exception 'Informe a orientação para o reforço.' using errcode='23514'; end if;
 if p_incident is null or (p_incident and length(btrim(coalesce(p_incident_note,'')))<5) then
 raise exception 'Descreva a situação e a providência adotada.' using errcode='23514'; end if;
end$$;
revoke all on function public.internship_validate_evaluation(jsonb,text,boolean,text) from public,anon,authenticated;

create function public.internship_create_evaluation_invite(p_assignment_id uuid,p_recipient_name text,p_recipient_contact text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_context jsonb; v_token text; v_id uuid; v_version integer; v_student uuid; v_expiry timestamptz;
begin
 if not public.internship_can_manage() then raise exception 'Acesso negado.' using errcode='42501'; end if;
 if length(btrim(coalesce(p_recipient_name,''))) not between 3 and 120 or length(btrim(coalesce(p_recipient_contact,''))) not between 3 and 200 then
 raise exception 'Informe o oficial e o contato de destino.' using errcode='23514'; end if;
 select student_id into v_student from public.internship_assignments where id=p_assignment_id for update;
 v_context:=public.internship_evaluation_context(p_assignment_id);
 if v_context is null then raise exception 'Participação indisponível.' using errcode='23514'; end if;
 update public.internship_evaluations set status='revogada' where assignment_id=p_assignment_id and status='aguardando';
 select coalesce(max(version),0)+1 into v_version from public.internship_evaluations where assignment_id=p_assignment_id;
 v_token:=encode(extensions.gen_random_bytes(32),'hex');
 v_expiry:=greatest(now(),(v_context->>'ends_at')::timestamptz)+interval '7 days';
 insert into public.internship_evaluations(assignment_id,version,student_id,context,source,recipient_name,recipient_contact,token_hash,expires_at,created_by)
 values(p_assignment_id,v_version,v_student,v_context,'digital',btrim(p_recipient_name),btrim(p_recipient_contact),encode(extensions.digest(v_token,'sha256'),'hex'),v_expiry,auth.uid()) returning id into v_id;
 return jsonb_build_object('id',v_id,'token',v_token,'expires_at',v_expiry);
end$$;
revoke all on function public.internship_create_evaluation_invite(uuid,text,text) from public,anon;
grant execute on function public.internship_create_evaluation_invite(uuid,text,text) to authenticated;

create function public.internship_read_evaluation_invite(p_token text) returns jsonb
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
 'expires_at',e.expires_at,'can_submit',(e.context->>'ends_at')::timestamptz<=now());
end$$;
revoke all on function public.internship_read_evaluation_invite(text) from public;
grant execute on function public.internship_read_evaluation_invite(text) to anon,authenticated;

create function public.internship_submit_evaluation(p_token text,p_evaluator_name text,p_evaluator_unit text,p_ratings jsonb,p_guidance text,p_incident boolean,p_incident_note text,p_confirmed boolean) returns uuid
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
 if (c->>'ends_at')::timestamptz>now() then raise exception 'Envie a avaliação após o término do plantão.' using errcode='23514'; end if;
 if p_confirmed is distinct from true or length(btrim(coalesce(p_evaluator_name,''))) not between 3 and 120 or length(btrim(coalesce(p_evaluator_unit,''))) not between 2 and 120 then raise exception 'Confirme o acompanhamento e a identificação do avaliador.' using errcode='23514'; end if;
 perform public.internship_validate_evaluation(p_ratings,p_guidance,p_incident,p_incident_note);
 update public.internship_evaluations set status='respondida',evaluator_name=btrim(p_evaluator_name),evaluator_unit=btrim(p_evaluator_unit),ratings=p_ratings,
 guidance=nullif(btrim(p_guidance),''),incident=p_incident,incident_note=case when p_incident then btrim(p_incident_note) end,submitted_at=now() where id=e.id;
 return e.id;
end$$;
revoke all on function public.internship_submit_evaluation(text,text,text,jsonb,text,boolean,text,boolean) from public;
grant execute on function public.internship_submit_evaluation(text,text,text,jsonb,text,boolean,text,boolean) to anon,authenticated;

create function public.internship_record_paper_evaluation(p_assignment_id uuid,p_evaluator_name text,p_evaluator_unit text,p_ratings jsonb,p_guidance text,p_incident boolean,p_incident_note text,p_paper_reference text) returns uuid
language plpgsql security definer set search_path=public as $$
declare c jsonb; v_student uuid; v_version integer; v_id uuid;
begin
 if not public.internship_can_manage() then raise exception 'Acesso negado.' using errcode='42501'; end if;
 select student_id into v_student from public.internship_assignments where id=p_assignment_id for update;
 c:=public.internship_evaluation_context(p_assignment_id);
 if c is null or (c->>'ends_at')::timestamptz>now() then raise exception 'Aguarde o término de um plantão vigente.' using errcode='23514'; end if;
 if length(btrim(coalesce(p_evaluator_name,''))) not between 3 and 120 or length(btrim(coalesce(p_evaluator_unit,''))) not between 2 and 120 or length(btrim(coalesce(p_paper_reference,''))) not between 3 and 200 then raise exception 'Identifique avaliador, unidade e ficha recebida.' using errcode='23514'; end if;
 perform public.internship_validate_evaluation(p_ratings,p_guidance,p_incident,p_incident_note);
 update public.internship_evaluations set status='revogada' where assignment_id=p_assignment_id and status='aguardando';
 select coalesce(max(version),0)+1 into v_version from public.internship_evaluations where assignment_id=p_assignment_id;
 insert into public.internship_evaluations(assignment_id,version,student_id,context,source,status,recipient_name,recipient_contact,created_by,evaluator_name,evaluator_unit,ratings,guidance,incident,incident_note,paper_reference,submitted_at)
 values(p_assignment_id,v_version,v_student,c,'papel','respondida',btrim(p_evaluator_name),'Ficha física',auth.uid(),btrim(p_evaluator_name),btrim(p_evaluator_unit),p_ratings,nullif(btrim(p_guidance),''),p_incident,case when p_incident then btrim(p_incident_note) end,btrim(p_paper_reference),now()) returning id into v_id;
 return v_id;
end$$;
revoke all on function public.internship_record_paper_evaluation(uuid,text,text,jsonb,text,boolean,text,text) from public,anon;
grant execute on function public.internship_record_paper_evaluation(uuid,text,text,jsonb,text,boolean,text,text) to authenticated;

create function public.internship_review_evaluation(p_id uuid,p_decision text,p_note text,p_identity_confirmed boolean) returns void
language plpgsql security definer set search_path=public as $$
declare e public.internship_evaluations;
begin
 if not public.internship_can_manage() then raise exception 'Acesso negado.' using errcode='42501'; end if;
 select * into e from public.internship_evaluations where id=p_id for update;
 if e.status is distinct from 'respondida' or p_decision is null or p_decision not in ('liberada','devolvida') then raise exception 'Avaliação indisponível para revisão.' using errcode='23514'; end if;
 if p_decision='liberada' and p_identity_confirmed is distinct from true then raise exception 'Confirme a identidade do avaliador.' using errcode='23514'; end if;
 if length(coalesce(p_note,''))>1000 or (p_decision='devolvida' and length(btrim(coalesce(p_note,'')))<5) then raise exception 'Informe o motivo da devolução.' using errcode='23514'; end if;
 update public.internship_evaluations set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),review_note=nullif(btrim(p_note),'') where id=p_id;
end$$;
revoke all on function public.internship_review_evaluation(uuid,text,text,boolean) from public,anon;
grant execute on function public.internship_review_evaluation(uuid,text,text,boolean) to authenticated;

create function public.internship_revoke_evaluation_invite(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.internship_can_manage() then raise exception 'Acesso negado.' using errcode='42501'; end if;
 update public.internship_evaluations set status='revogada' where id=p_id and status='aguardando';
 if not found then raise exception 'Convite indisponível.' using errcode='23514'; end if;
end$$;
revoke all on function public.internship_revoke_evaluation_invite(uuid) from public,anon;
grant execute on function public.internship_revoke_evaluation_invite(uuid) to authenticated;

create function public.internship_my_evaluations() returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and active and role='aluno') then raise exception 'Acesso negado.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'context',e.context,'ratings',e.ratings,'guidance',e.guidance,'reviewed_at',e.reviewed_at) order by e.submitted_at desc)
 from public.internship_evaluations e where e.student_id=public.current_student_id() and e.status='liberada'),'[]'::jsonb);
end$$;
revoke all on function public.internship_my_evaluations() from public,anon;
grant execute on function public.internship_my_evaluations() to authenticated;
notify pgrst,'reload schema';
