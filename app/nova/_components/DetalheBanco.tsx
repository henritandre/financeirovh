"use client";

import { useMemo } from "react";
import { useEvolucaoSaldo } from "../../../lib/hooks/useEvolucaoSaldo";
import { GraficoLinha } from "../_ui/GraficoLinha";
import { brl, dataBR } from "../_lib/formatar";

export function DetalheBanco({
  nome,
  contaIds,
  transacoes,
  dias,
  qtdLancamentos,
  mapPerfis,
}: {
  nome: string;
  contaIds: string[];
  transacoes: any[];
  dias: number;
  qtdLancamentos: number;
  mapPerfis: Record<string, string>;
}) {
  const pontos = useEvolucaoSaldo(transacoes, contaIds, dias);

  // Entradas, débito e PIX desta conta — pagamento de fatura de cartão fica de fora de propósito.
  const lancamentos = useMemo(() => {
    return transacoes
      .filter((t) => {
        if (t.tipo === "receita" || t.tipo === "despesa") return contaIds.includes(t.conta_id);
        if (t.tipo === "transferencia") {
          if (t.conta_destino?.tipo === "credito") return false;
          return contaIds.includes(t.conta_id) || contaIds.includes(t.conta_destino_id);
        }
        return false;
      })
      .slice(0, qtdLancamentos);
  }, [transacoes, contaIds, qtdLancamentos]);

  const saldoAtual = pontos.length > 0 ? pontos[pontos.length - 1].saldo : 0;
  const saldoInicial = pontos.length > 0 ? pontos[0].saldo : 0;
  const variacao = saldoAtual - saldoInicial;

  return (
    <div>
      <p className="text-[13px] font-medium text-[var(--nova-ink-faint)]">Visão rápida</p>
      <h3 className="text-[22px] font-semibold text-[var(--nova-ink)] mt-0.5" style={{ letterSpacing: "-0.02em" }}>
        {nome}
      </h3>
      <p className="mt-2 text-[30px] font-semibold text-[var(--nova-ink)]" style={{ letterSpacing: "-0.02em" }}>
        {brl(saldoAtual)}
      </p>
      <p className={`text-[13px] font-medium ${variacao >= 0 ? "text-[var(--nova-success)]" : "text-[var(--nova-danger)]"}`}>
        {variacao >= 0 ? "+" : ""}
        {brl(variacao)} nos últimos {dias} dias
      </p>

      <div className="mt-4">
        <GraficoLinha pontos={pontos.map((p) => p.saldo)} />
      </div>

      <p className="mt-6 mb-2 text-[13px] font-semibold text-[var(--nova-ink-faint)]">Últimos lançamentos</p>
      <div>
        {lancamentos.length === 0 && <p className="text-[13px] text-[var(--nova-ink-faint)] py-3">Nada por aqui ainda.</p>}
        {lancamentos.map((t, i) => {
          const foto = mapPerfis[t.autor_nome];
          const receita = t.tipo === "receita";
          return (
            <div key={t.id} className={`flex items-center gap-3 py-2.5 ${i === 0 ? "" : "border-t border-[var(--nova-ink-hairline)]"}`}>
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-[var(--nova-ink-hairline)] flex items-center justify-center text-[11px] font-semibold text-[var(--nova-ink-faint)]">
                {foto ? <img src={foto} alt="" draggable={false} className="w-full h-full object-cover" /> : (t.autor_nome || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-[var(--nova-ink)] truncate">{t.descricao}</p>
                <p className="text-[12px] text-[var(--nova-ink-faint)] truncate">{dataBR(t.data)}</p>
              </div>
              <p className={`text-[14px] font-semibold shrink-0 ${receita ? "text-[var(--nova-success)]" : "text-[var(--nova-ink)]"}`}>
                {receita ? "+" : "−"}
                {brl(Number(t.valor))}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
