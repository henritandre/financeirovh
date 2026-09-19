"use client";

import { useMemo } from "react";
import { calcularSaldo } from "../saldo";

function dataLocalStr(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

export interface PontoEvolucao {
  data: string;
  saldo: number;
}

/**
 * Saldo acumulado dia a dia, para os últimos `dias` dias corridos, considerando
 * só as contas em `contaIds`. Mesma fórmula de useSaldos, só que "fotografada"
 * em cada dia em vez de só no presente.
 */
export function useEvolucaoSaldo(transacoes: any[], contaIds: string[], dias: number): PontoEvolucao[] {
  return useMemo(() => {
    if (contaIds.length === 0) return [];
    const hoje = new Date();
    const pontos: PontoEvolucao[] = [];
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const dataStr = dataLocalStr(d);
      const saldo = calcularSaldo(transacoes, contaIds, dataStr);
      pontos.push({ data: dataStr, saldo });
    }
    return pontos;
  }, [transacoes, contaIds, dias]);
}
