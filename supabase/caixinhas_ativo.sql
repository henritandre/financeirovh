-- ============================================================
-- CAIXINHAS — coluna "ativo" para arquivar/inativar caixinhas
-- sem excluí-las. Rodar manualmente no Supabase SQL Editor.
--
-- Caixinhas arquivadas (ativo = false) somem da lista principal
-- e do Patrimônio Total, mas continuam com todo o histórico.
-- A "liquidação" de saldo residual (ex.: IR retido) NÃO precisa
-- de schema novo: é gravada em caixinhas_historico como um
-- lançamento de tipo 'rendimento' com valor negativo e sem
-- transacao_id, apenas zerando o saldo (sem tocar no Dashboard).
-- ============================================================

alter table public.caixinhas
  add column if not exists ativo boolean not null default true;

create index if not exists idx_caixinhas_ativo on public.caixinhas(ativo);
