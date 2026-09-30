-- Turnos de 12 horas de sábado por modalidade e exceções conferidas do QTS.
-- Os códigos antigos permanecem no histórico dos plantões já publicados.
update public.internship_shift_templates t set active = false
from public.internship_programs p join public.classes c on c.id = p.class_id
where t.program_id = p.id and c.name = 'CFO 2026.1'
  and t.code in ('SAB-USB-D12', 'SAB-USB-N12') and t.active;

insert into public.internship_shift_templates (
  program_id, activity_type_id, code, name, start_weekdays, journey_minutes,
  abm_departure_time, obm_arrival_time, obm_departure_time, abm_return_time,
  end_day_offset, revision, includes_travel
)
select p.id, a.id, v.code, v.name, array[6], 720, null,
  v.starts_at, v.ends_at, null, v.day_offset, 1, false
from public.internship_programs p
join public.classes c on c.id = p.class_id
join (values
  ('usb', 'SAB-USB-M12', 'USB — sábado manhã, 12h', time '07:45', time '19:45', 0),
  ('usb', 'SAB-USB-T12', 'USB — sábado tarde/noite, 12h', time '19:45', time '07:45', 1),
  ('ar', 'SAB-AR-M12', 'AR — sábado manhã, 12h', time '07:45', time '19:45', 0),
  ('ar', 'SAB-AR-T12', 'AR — sábado tarde/noite, 12h', time '19:45', time '07:45', 1)
) as v(activity_code, code, name, starts_at, ends_at, day_offset) on true
join public.internship_activity_types a on a.program_id = p.id and a.code = v.activity_code
where c.name = 'CFO 2026.1' and p.course_phase = 'CFO I'
  and not exists (select 1 from public.internship_shift_templates existing
    where existing.program_id = p.id and existing.code = v.code);

-- Bloqueios de instrução conferidos, independentes da extração parcial do PDF.
create table public.internship_instruction_blocks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.internship_programs(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  title text not null check (length(btrim(title)) >= 3),
  source_reference text not null check (length(btrim(source_reference)) >= 5),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  check (ends_at > starts_at),
  unique (program_id, starts_at, ends_at, title)
);
create index internship_instruction_blocks_period on public.internship_instruction_blocks(program_id, starts_at, ends_at) where active;
alter table public.internship_instruction_blocks enable row level security;
revoke all on public.internship_instruction_blocks from public, anon, authenticated;
grant select on public.internship_instruction_blocks to authenticated;
create policy internship_instruction_blocks_read on public.internship_instruction_blocks
  for select to authenticated using (public.internship_can_manage());

insert into public.internship_instruction_blocks(program_id, starts_at, ends_at, title, source_reference)
select p.id, timestamptz '2026-09-26 08:00:00-03', timestamptz '2026-09-26 12:40:00-03',
  'APH I — instrução de sábado', 'QTS 017 de 21 a 27/09/2026; horário confirmado pela Coordenação em 24/09/2026'
from public.internship_programs p join public.classes c on c.id = p.class_id
where c.name = 'CFO 2026.1' and p.course_phase = 'CFO I'
on conflict do nothing;

-- A permanência na ABM durante APH permanece em sobreaviso, conforme decisão
-- da Coordenação. O bloqueio afeta somente estágios externos dos cadetes.
create table public.internship_lifeguard_windows (
  program_id uuid not null references public.internship_programs(id) on delete restrict,
  shift_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null check (length(btrim(reason)) >= 5),
  primary key (program_id, shift_date),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '8 hours'),
  check (ends_at - starts_at >= interval '1 hour')
);
alter table public.internship_lifeguard_windows enable row level security;
revoke all on public.internship_lifeguard_windows from public, anon, authenticated;
grant select on public.internship_lifeguard_windows to authenticated;
create policy internship_lifeguard_windows_read on public.internship_lifeguard_windows
  for select to authenticated using (public.internship_can_manage());

insert into public.internship_lifeguard_windows(program_id, shift_date, starts_at, ends_at, reason)
select p.id, date '2026-09-26', timestamptz '2026-09-26 14:00:00-03',
  timestamptz '2026-09-26 18:00:00-03',
  'APH de 08h a 12h40 e deslocamento; janela de GV confirmada pela Coordenação.'
from public.internship_programs p join public.classes c on c.id = p.class_id
where c.name = 'CFO 2026.1' and p.course_phase = 'CFO I'
on conflict do nothing;

-- O publicador de GV usa a janela excepcional quando existir. Demais dias
-- conservam o padrão 10h–18h. A operação ainda requer documento oficial.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.internship_schedule_lifeguard_day(uuid,date,uuid[],text,text)'::regprocedure)
    into definition;
  if position('v_ends_at := v_starts_at + interval ''8 hours'';' in definition) = 0 then
    raise exception 'Publicador de GV mudou; conferir antes de adaptar a janela.';
  end if;
  definition := replace(definition,
    'v_ends_at := v_starts_at + interval ''8 hours'';',
    'v_starts_at := coalesce((select w.starts_at from public.internship_lifeguard_windows w where w.program_id = p_program_id and w.shift_date = p_shift_date), v_starts_at);' || chr(10) ||
    '  v_ends_at := coalesce((select w.ends_at from public.internship_lifeguard_windows w where w.program_id = p_program_id and w.shift_date = p_shift_date), v_starts_at + interval ''8 hours'');');
  execute definition;
end $$;

-- A guarda central recebe a indisponibilidade real do QTS. Turnos já
-- publicados permanecem auditáveis até o remanejamento específico.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.internship_check_assignment(uuid,uuid,uuid,text)'::regprocedure)
    into definition;
  if position('v_first := (v_shift.starts_at at time zone v_program.timezone)::date;' in definition) = 0 then
    raise exception 'Guarda de estágio mudou; conferir antes de integrar o APH.';
  end if;
  definition := replace(definition,
    'v_first := (v_shift.starts_at at time zone v_program.timezone)::date;',
    'if exists (select 1 from public.internship_instruction_blocks b where b.program_id = v_program.id and b.active and tstzrange(b.starts_at,b.ends_at,''[)'') && tstzrange(v_shift.starts_at,v_shift.ends_at,''[)'')) then raise exception ''Conflito com instrução obrigatória do QTS.'' using errcode = ''23514''; end if;' || chr(10) ||
    '  v_first := (v_shift.starts_at at time zone v_program.timezone)::date;');
  execute definition;
end $$;

-- A duração de AR aos sábados passa a vir do padrão selecionado. Sem padrão,
-- conserva-se o requisito de 24h. USB continua com 12h.
do $$
declare definition text;
  old_case text := 'v_expected := case' || chr(10) ||
    '    when p_activity_code = ''ar''' || chr(10) ||
    '      and extract(isodow from (p_starts_at at time zone v_program.timezone)) in (6,7)' || chr(10) ||
    '      then 1440' || chr(10) ||
    '    else 720' || chr(10) ||
    '  end;';
begin
  select pg_get_functiondef('public.internship_schedule_gbm_shift(uuid,text,uuid,uuid,timestamptz,timestamptz,uuid,text,uuid)'::regprocedure)
    into definition;
  if position(old_case in definition) = 0 then
    raise exception 'Publicador GBM mudou; conferir duração antes de habilitar AR 12h.';
  end if;
  definition := replace(definition, old_case,
    'v_expected := coalesce((select t.journey_minutes from public.internship_shift_templates t where t.id = p_template_id and t.program_id = p_program_id and t.activity_type_id = v_activity.id and t.active),' || chr(10) ||
    '    case when p_activity_code = ''ar'' and extract(isodow from (p_starts_at at time zone v_program.timezone)) in (6,7) then 1440 else 720 end);');
  definition := replace(definition,
    'when p_activity_code = ''usb'' and extract(isodow from v_local_date) in (6,7)',
    'when p_activity_code in (''usb'',''ar'') and extract(isodow from v_local_date) in (6,7)');
  execute definition;
end $$;

notify pgrst, 'reload schema';
