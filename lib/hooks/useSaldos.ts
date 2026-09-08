"use client";

import { useMemo } from "react";

/**
 * Réplica exata do cálculo de saldo já usado em app/dashboard e app/ui-lab:
 * saldo por banco/cofre é a soma de receitas/despesas/transferências das
 * contas correntes vinculadas àquele banco; dinheiro segue a mesma lógica
 * para contas do tipo "dinheiro".
 */
export function useSaldos(contas: any[], transacoes: any[], bancos: any[]) {
  return useMemo(() => {
    const saldosBancarios = bancos
      .map((banco) => {
        const ids = contas.filter((c) => c.conta_bancaria_id === banco.id && c.tipo === "corrente").map((c) => c.id);
        let saldo = 0;
        transacoes.forEach((t) => {
          const v = Number(t.valor);
          if (t.tipo === "receita" && ids.includes(t.conta_id)) saldo += v;
          if (t.tipo === "despesa" && ids.includes(t.conta_id)) saldo -= v;
          if (t.tipo === "transferencia") {
            if (ids.includes(t.conta_id)) saldo -= v;
            if (ids.includes(t.conta_destino_id)) saldo += v;
          }
        });
        return { ...banco, saldo };
      })
      .filter((b) => b.ativo !== false);

    const idsDinheiro = contas.filter((c) => c.tipo === "dinheiro").map((c) => c.id);
    let saldoDinheiro = 0;
    transacoes.forEach((t) => {
      const v = Number(t.valor);
      if (t.tipo === "receita" && idsDinheiro.includes(t.conta_id)) saldoDinheiro += v;
      if (t.tipo === "despesa" && idsDinheiro.includes(t.conta_id)) saldoDinheiro -= v;
      if (t.tipo === "transferencia") {
        if (idsDinheiro.includes(t.conta_id)) saldoDinheiro -= v;
        if (idsDinheiro.includes(t.conta_destino_id)) saldoDinheiro += v;
      }
    });

    const saldoTotal = saldoDinheiro + saldosBancarios.reduce((a, b) => a + b.saldo, 0);

    return { saldosBancarios, saldoDinheiro, saldoTotal };
  }, [contas, transacoes, bancos]);
}
