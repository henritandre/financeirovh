"use client";

import { useId } from "react";

/** Sparkline minimalista: linha + preenchimento em degradê, sem eixos — para uma visão rápida, não uma análise. */
export function GraficoLinha({ pontos }: { pontos: number[] }) {
  const gradId = useId();

  if (pontos.length < 2) {
    return <div className="h-28 flex items-center justify-center text-[13px] text-[var(--nova-ink-faint)]">Sem histórico suficiente ainda.</div>;
  }

  const w = 320;
  const h = 112;
  const pad = 6;
  const min = Math.min(...pontos);
  const max = Math.max(...pontos);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (pontos.length - 1);

  const coords = pontos.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });

  const linha = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${linha} L${coords[coords.length - 1][0].toFixed(1)},${h - pad} L${coords[0][0].toFixed(1)},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" preserveAspectRatio="none" role="img" aria-label="Evolução do saldo">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--nova-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--nova-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} stroke="none" />
      <path d={linha} fill="none" stroke="var(--nova-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
