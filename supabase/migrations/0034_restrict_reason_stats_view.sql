-- =====================================================================
-- 0034 - Restringe a view de estatisticas de motivos
--
-- Views nao respeitam RLS: sao executadas com os direitos do dono
-- (postgres). Como o Supabase concede privilegios a `anon` e
-- `authenticated` por padrao em tudo que nasce no schema public, a
-- v_fo_reason_stats ficava legivel inclusive sem autenticacao — expondo
-- os motivos de FO da turma e suas frequencias pela API REST.
--
-- A tela de estatisticas da Coordenacao nao depende dela: calcula a
-- partir das tabelas base, que sao protegidas por RLS. A view continua
-- disponivel para analise ad hoc feita pelo dono do banco.
-- =====================================================================
revoke all on public.v_fo_reason_stats from anon, authenticated;

comment on view public.v_fo_reason_stats is
  'Frequencia de uso dos motivos - insumo para futuros atalhos. Acesso '
  'restrito ao dono do banco (analise ad hoc); a aplicacao calcula as '
  'estatisticas a partir das tabelas base, com RLS.';
