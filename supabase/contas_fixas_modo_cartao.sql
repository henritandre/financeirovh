-- ============================================================
-- CONTAS FIXAS — modo "cartao" (pagamentos de fatura de cartão
-- de crédito). Rodar depois de contas_fixas.sql e
-- contas_fixas_modo.sql.
--
-- modo = 'cartao' -> conta fixa "guarda-chuva" que soma, mês a
-- mês, todas as transferências de pagamento de fatura
-- (transacoes.tipo = 'transferencia' com conta_destino_id
-- apontando pra um cartão de crédito em `contas`). Não usa
-- categoria_id (fica null) nem contas_fixas_ocorrencias — assim
-- como o modo "agregado", é 100% calculado a partir de
-- `transacoes` na tela.
-- ============================================================

alter table public.contas_fixas
  drop constraint if exists contas_fixas_modo_check;

alter table public.contas_fixas
  add constraint contas_fixas_modo_check check (modo in ('unico', 'agregado', 'cartao'));

alter table public.contas_fixas
  alter column categoria_id drop not null;

alter table public.contas_fixas
  add constraint chk_categoria_obrigatoria_exceto_cartao check (modo = 'cartao' or categoria_id is not null);
