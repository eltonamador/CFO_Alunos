-- Nomes curtos solicitados pela Coordenação para as modalidades do estágio.
-- Códigos, eixos de formação, plantões, cargas e histórico permanecem intactos.
create temporary table internship_activity_names_before on commit drop as
select id, to_jsonb(t) as before_data
from public.internship_activity_types t
where (code = 'ar' and name <> 'AR — Salvamento')
   or (code = 'usb' and name <> 'USB — APH');

-- O catálogo é imutável após a publicação. A exceção desta migration altera só o rótulo.
alter table public.internship_activity_types disable trigger internship_activity_catalog_guard;
update public.internship_activity_types
set name = case code when 'ar' then 'AR — Salvamento' when 'usb' then 'USB — APH' end
where id in (select id from internship_activity_names_before);
alter table public.internship_activity_types enable trigger internship_activity_catalog_guard;

insert into public.audit_logs(actor_id,actor_role,entity,entity_id,action,before_data,after_data,reason)
select auth.uid(), public.current_role(), 'internship_activity_types', b.id, 'update',
  b.before_data, to_jsonb(t),
  'Descrição operacional abreviada pela Coordenação: AR — Salvamento e USB — APH; códigos e carga horária preservados.'
from internship_activity_names_before b
join public.internship_activity_types t on t.id = b.id;

notify pgrst, 'reload schema';
