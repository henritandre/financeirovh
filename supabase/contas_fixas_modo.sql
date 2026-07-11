-- ============================================================
-- CONTAS FIXAS — modo "único" vs "agregado" + observação
-- Rodar manualmente no Supabase SQL Editor, depois de já ter
-- rodado contas_fixas.sql.
--
-- modo = 'unico'    -> comportamento original (1 ocorrência por
--                       mês, vinculável a um lançamento do
--                       Dashboard ou marcada como paga manualmente).
-- modo = 'agregado' -> a conta fixa não usa contas_fixas_ocorrencias;
--                       o valor de cada mês é a soma automática dos
--                       lançamentos da categoria vinculada no
--                       Dashboard (ex: Mercado).
-- ============================================================

alter table public.contas_fixas
  add column modo text not null default 'unico' check (modo in ('unico', 'agregado'));

alter table public.contas_fixas_ocorrencias
  add column observacao text null;
