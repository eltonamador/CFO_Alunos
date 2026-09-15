-- =====================================================================
-- 0060 — Auditoria dos vínculos entre equipe da Coordenação e contas.
--
-- A tabela já restringe vínculos a perfis ativos de Coordenação. Este
-- trigger torna cada associação, troca ou desvínculo rastreável em
-- public.audit_logs, sem apagar o histórico anterior.
-- =====================================================================

drop trigger if exists trg_audit_cfo_coordination_members on public.cfo_coordination_members;

create trigger trg_audit_cfo_coordination_members
  after insert or update or delete on public.cfo_coordination_members
  for each row execute function public.audit_trigger();
