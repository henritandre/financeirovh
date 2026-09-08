"use client";

import { useMemo } from "react";

export function dataLocal(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

/**
 * Réplica exata do cálculo de resumo do período usado em app/ui-lab: trata
 * despesa em cartão de crédito como "fatura" (não desconta do saldo na hora),
 * e transferência para fatura de cartão como pagamento (abate cartão, conta
 * como despesa realizada).
 */
export function useResumoPeriodo(transacoes: any[], inicio?: string, fim?: string) {
  return useMemo(() => {
    const hoje = new Date();
    const dataInicio = inicio ?? dataLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    const dataFim = fim ?? dataLocal(hoje);
    const doPeriodo = transacoes.filter((t) => t.data >= dataInicio && t.data <= dataFim);

    const resumo = doPeriodo.reduce(
      (acc, t) => {
        const v = Number(t.valor);
        if (t.tipo === "receita") {
          acc.receitas += v;
          acc.saldo += v;
        } else if (t.tipo === "despesa") {
          if (t.conta_origem?.tipo === "credito") acc.cartao += v;
          else {
            acc.despesas += v;
            acc.saldo -= v;
          }
        } else if (t.tipo === "transferencia") {
          if (t.conta_origem?.tipo !== "credito") acc.saldo -= v;
          if (t.conta_destino?.tipo === "credito") {
            acc.cartao -= v;
            acc.despesas += v;
          } else if (t.conta_destino) acc.saldo += v;
        }
        return acc;
      },
      { saldo: 0, receitas: 0, despesas: 0, cartao: 0 }
    );

    return { resumo, doPeriodo, dataInicio, dataFim };
  }, [transacoes, inicio, fim]);
}
