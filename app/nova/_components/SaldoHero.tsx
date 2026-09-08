"use client";

import { Surface } from "../_ui/Surface";
import { brl } from "../_lib/formatar";

export function SaldoHero({ saldo, receitas, despesas }: { saldo: number; receitas: number; despesas: number }) {
  return (
    <Surface className="nova-balance p-6">
      <p className="text-[13px] font-medium text-[var(--nova-ink-faint)]">Saldo total real</p>
      <p
        className="mt-1 text-[var(--nova-ink)]"
        style={{ fontSize: "clamp(2.25rem, 9vw, 3.25rem)", fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.03em" }}
      >
        {brl(saldo)}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Pilula tom="sucesso" rotulo="Entrou" valor={receitas} />
        <Pilula tom="perigo" rotulo="Saiu" valor={despesas} />
      </div>
    </Surface>
  );
}

function Pilula({ tom, rotulo, valor }: { tom: "sucesso" | "perigo"; rotulo: string; valor: number }) {
  const cor = tom === "sucesso" ? "bg-[var(--nova-success-bg)] text-[var(--nova-success)]" : "bg-[var(--nova-danger-bg)] text-[var(--nova-danger)]";
  return (
    <div className={`flex-1 rounded-2xl px-3 py-2 ${cor}`}>
      <p className="text-[12px] font-medium opacity-80">{rotulo}</p>
      <p className="text-[15px] font-semibold">{brl(valor)}</p>
    </div>
  );
}
