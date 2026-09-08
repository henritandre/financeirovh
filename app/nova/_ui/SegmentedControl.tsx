"use client";

import { useEffect, useRef } from "react";
import { criarMola, prefereMenosMovimento, SPRING_PADRAO } from "../../ui/spring";

type Tom = "neutro" | "sucesso" | "perigo" | "info";

const FUNDO_INDICADOR: Record<Tom, string> = {
  neutro: "bg-[var(--nova-bg-elevated)]",
  sucesso: "bg-[var(--nova-success-bg)]",
  perigo: "bg-[var(--nova-danger-bg)]",
  info: "bg-[color-mix(in_srgb,var(--nova-accent)_15%,transparent)]",
};

const TEXTO_ATIVO: Record<Tom, string> = {
  neutro: "text-[var(--nova-ink)]",
  sucesso: "text-[var(--nova-success)]",
  perigo: "text-[var(--nova-danger)]",
  info: "text-[var(--nova-accent)]",
};

export function SegmentedControl<T extends string>({
  opcoes,
  valor,
  aoMudar,
}: {
  opcoes: { valor: T; rotulo: string; tom?: Tom }[];
  valor: T;
  aoMudar: (v: T) => void;
}) {
  const indiceAtivo = Math.max(
    0,
    opcoes.findIndex((o) => o.valor === valor)
  );
  const tomAtivo = opcoes[indiceAtivo]?.tom ?? "neutro";
  const ind = useRef<HTMLDivElement>(null);
  const mola = useRef<ReturnType<typeof criarMola> | null>(null);
  const largura = 100 / opcoes.length;

  useEffect(() => {
    if (!ind.current) return;
    if (!mola.current) {
      mola.current = criarMola(indiceAtivo, (v) => {
        if (ind.current) ind.current.style.transform = `translateX(${v * 100}%)`;
      });
    }
    mola.current.animarPara(indiceAtivo, prefereMenosMovimento() ? { damping: 1, response: 0.01 } : SPRING_PADRAO);
  }, [indiceAtivo]);

  return (
    <div className="relative flex p-1 rounded-2xl bg-[var(--nova-ink-hairline)]" role="tablist">
      <div className="absolute inset-y-1 left-1 pointer-events-none" ref={ind} style={{ width: `calc(${largura}% - 0.25rem)` }}>
        <div className={`h-full w-full rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.12)] ${FUNDO_INDICADOR[tomAtivo]}`} />
      </div>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          role="tab"
          aria-selected={o.valor === valor}
          onClick={() => aoMudar(o.valor)}
          className={`relative flex-1 py-2 text-[14px] rounded-xl select-none transition-colors duration-200 ${
            o.valor === valor ? `${TEXTO_ATIVO[o.tom ?? "neutro"]} font-semibold` : "text-[var(--nova-ink-faint)] font-medium"
          }`}
          style={{ touchAction: "manipulation" }}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
