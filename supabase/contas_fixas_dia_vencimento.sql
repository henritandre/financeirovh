-- ============================================================
-- CONTAS FIXAS — dia de vencimento (só relevante pro modo
-- "unico", ex: Água vence todo dia 10). Rodar depois dos
-- arquivos anteriores em supabase/.
-- ============================================================

alter table public.contas_fixas
  add column dia_vencimento smallint null;

alter table public.contas_fixas
  add constraint chk_dia_vencimento_valido check (dia_vencimento is null or (dia_vencimento between 1 and 31));
