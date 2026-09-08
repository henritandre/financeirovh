"use client";

import { Surface } from "../_ui/Surface";
import { Secao } from "./Secao";
import { brl } from "../_lib/formatar";

export function ResumoPeriodo({ resumo }: { resumo: { saldo: number; receitas: number; despesas: number } }) {
  const itens = [
    ["Saldo do mês", resumo.saldo, resumo.saldo >= 0 ? "azul" : "vermelho"],
    ["Receitas", resumo.receitas, "verde"],
    ["Despesas pagas", resumo.despesas, "vermelho"],
  ] as const;

  return (
    <Secao titulo="Resumo do mês">
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
        {itens.map(([rotulo, valor, tom]) => (
          <Surface key={rotulo} className="p-4">
            <p className="text-[12px] font-medium text-[var(--nova-ink-faint)] leading-tight">{rotulo}</p>
            <p
              className={`mt-1.5 whitespace-nowrap text-[15px] font-semibold ${
                tom === "verde" ? "text-[var(--nova-success)]" : tom === "vermelho" ? "text-[var(--nova-danger)]" : "text-[var(--nova-ink)]"
              }`}
              style={{ letterSpacing: "-0.02em" }}
            >
              {brl(valor)}
            </p>
          </Surface>
        ))}
      </div>
    </Secao>
  );
}
