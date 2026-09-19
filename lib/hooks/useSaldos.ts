"use client";

import { useMemo } from "react";
import { calcularSaldo, centavos } from "../saldo";

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
        const saldo = calcularSaldo(transacoes, ids);
        return { ...banco, saldo };
      })
      .filter((b) => b.ativo !== false);

    const idsDinheiro = contas.filter((c) => c.tipo === "dinheiro").map((c) => c.id);
    const saldoDinheiro = calcularSaldo(transacoes, idsDinheiro);
    const saldoTotal = (centavos(saldoDinheiro) + saldosBancarios.reduce((a, b) => a + centavos(b.saldo), 0)) / 100;

    return { saldosBancarios, saldoDinheiro, saldoTotal };
  }, [contas, transacoes, bancos]);
}
