"use client";

import { useMemo } from "react";

/**
 * Réplica exata do agrupamento de fatura por dia de fechamento usado em
 * app/dashboard e app/ui-lab: cada despesa no cartão entra na competência
 * seguinte se cair no ou após o dia de fechamento; pagamentos (transferência
 * para a fatura) abatem da competência mais antiga em aberto primeiro.
 */
export function useFaturasCartao(contas: any[], transacoes: any[]) {
  const faturasDoCartao = useMemo(() => {
    return (cartaoId: string) => {
      const cartao = contas.find((c) => c.id === cartaoId);
      if (!cartao) return { total: 0, aberta: 0, faturas: [] as { competencia: string; venc: Date; aberto: number }[] };

      const fech = Number(cartao.dia_fechamento) || 1;
      const venc = Number(cartao.dia_vencimento) || 10;
      const trans = transacoes.filter(
        (t) => (t.tipo === "despesa" && t.conta_id === cartaoId) || (t.tipo === "transferencia" && t.conta_destino_id === cartaoId)
      );

      const grupos: Record<string, number> = {};
      let pagos = 0;
      trans.forEach((t) => {
        const v = Number(t.valor);
        if (t.tipo === "despesa") {
          const [a, m, d] = t.data.split("-").map(Number);
          let ano = a;
          let mes = m - 1;
          if (d >= fech) {
            mes++;
            if (mes > 11) {
              mes = 0;
              ano++;
            }
          }
          const k = `${ano}-${String(mes + 1).padStart(2, "0")}`;
          grupos[k] = (grupos[k] || 0) + v;
        } else pagos += v;
      });

      const arr = Object.keys(grupos)
        .sort()
        .map((k) => {
          const [a, m] = k.split("-").map(Number);
          return { competencia: k, venc: new Date(a, m - 1, venc), aberto: grupos[k] };
        });

      let resta = pagos;
      for (const f of arr) {
        if (resta >= f.aberto) {
          resta -= f.aberto;
          f.aberto = 0;
        } else {
          f.aberto -= resta;
          resta = 0;
          break;
        }
      }

      const abertas = arr.filter((f) => f.aberto > 0.01);
      const proxima = [...abertas].sort((x, y) => x.venc.getTime() - y.venc.getTime())[0];
      return { total: abertas.reduce((a, f) => a + f.aberto, 0), aberta: proxima?.aberto || 0, faturas: abertas };
    };
  }, [contas, transacoes]);

  const cartoes = useMemo(() => {
    return contas.filter((c) => c.tipo === "credito" && c.ativo !== false).map((c) => ({ ...c, ...faturasDoCartao(c.id) }));
  }, [contas, faturasDoCartao]);

  const totalCartoes = useMemo(() => cartoes.reduce((a, c) => a + c.total, 0), [cartoes]);

  return { faturasDoCartao, cartoes, totalCartoes };
}
