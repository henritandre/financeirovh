"use client";

import { useState, type ReactNode } from "react";

// ============================================================================
// COMPONENTES DE VISUALIZAÇÃO DA INSIGHTS
// SVG interativo (hover mostra valores) + classes Tailwind (dark: adapta sozinho).
// Sem grade de fundo — os valores aparecem no hover. Ordem categórica FIXA.
// ============================================================================

export const PALETA = {
  receita: "#10b981",
  despesa: "#ef4444",
  saldo: "#3b82f6",
  fixo: "#6366f1",
  variavel: "#f59e0b",
  poupanca: "#14b8a6",
  categorias: ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444", "#64748b"],
};

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtK = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(v / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(".", ",")}k`;
  return `${Math.round(v)}`;
};

// ============================================================================
// FLIP CARD — vira o conteúdo (gráfico ↔ explicação) ao clicar no info.
// O cabeçalho fica fora; só o miolo gira.
// ============================================================================
export function FlipCard({ flipped, frente, verso }: { flipped: boolean; frente: ReactNode; verso: ReactNode }) {
  return (
    <div style={{ perspective: "1400px" }}>
      <div className="relative transition-transform duration-500" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
        <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>{frente}</div>
        <div className="absolute inset-0 flex items-center" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <div className="w-full max-h-full overflow-auto text-xs font-bold text-gray-600 dark:text-gray-300 leading-relaxed">{verso}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GAUGE DE SAÚDE — arco com faixas + número legível. Labels 0/100 fora do arco.
// ============================================================================
export function GaugeSaude({ score, corHex, label, compact = false }: { score: number; corHex: string; label: string; compact?: boolean }) {
  const cx = 120, cy = 118, r = 90;
  const s = Math.max(0, Math.min(100, score));
  const pol = (ang: number) => [cx + r * Math.cos((ang * Math.PI) / 180), cy - r * Math.sin((ang * Math.PI) / 180)];
  const arco = (ini: number, fim: number) => {
    const [x1, y1] = pol(ini); const [x2, y2] = pol(fim);
    const large = Math.abs(fim - ini) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const fim = 180 - (s / 100) * 180;
  const [mx, my] = pol(fim);
  const zonas: [number, number, string][] = [
    [180, 180 - 40 * 1.8, "#ef4444"],
    [180 - 40 * 1.8, 180 - 60 * 1.8, "#f59e0b"],
    [180 - 60 * 1.8, 180 - 80 * 1.8, "#3b82f6"],
    [180 - 80 * 1.8, 0, "#22c55e"],
  ];
  return (
    <svg viewBox="0 0 240 164" className={`w-full mx-auto ${compact ? "max-w-[180px]" : "max-w-[280px]"}`}>
      {zonas.map(([a, b, c], i) => (<path key={i} d={arco(a, b)} fill="none" strokeWidth="13" className="opacity-20" stroke={c} strokeLinecap={i === 0 ? "round" : i === 3 ? "butt" : "butt"} />))}
      <path d={arco(180, fim)} fill="none" strokeWidth="13" strokeLinecap="round" stroke={corHex} />
      <circle cx={mx} cy={my} r="8" fill={corHex} className="stroke-white dark:stroke-gray-800" strokeWidth="3" />
      <text x={cx} y={cy - 10} textAnchor="middle" className="fill-gray-900 dark:fill-gray-50" style={{ fontSize: compact ? "34px" : "46px", fontWeight: 900 }}>{s}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: compact ? "11px" : "13px", fontWeight: 800, letterSpacing: "1px" }} fill={corHex}>{label.toUpperCase()}</text>
      <text x={20} y={cy + 34} textAnchor="middle" className="fill-gray-300 dark:fill-gray-600" style={{ fontSize: "10px", fontWeight: 700 }}>0</text>
      <text x={220} y={cy + 34} textAnchor="middle" className="fill-gray-300 dark:fill-gray-600" style={{ fontSize: "10px", fontWeight: 700 }}>100</text>
    </svg>
  );
}

// Tooltip SVG reutilizável.
function Tooltip({ x, w, title, items }: { x: number; w: number; title: string; items: { nome: string; cor: string; v: number }[] }) {
  const tw = 176;
  const th = 20 + items.length * 15 + 6;
  const tx = x > w / 2 ? x - tw - 10 : x + 10;
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={tx} y={10} width={tw} height={th} rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" opacity="0.96" />
      <text x={tx + 10} y={26} className="fill-gray-300" style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.5px" }}>{title}</text>
      {items.map((it, i) => (
        <g key={i}>
          <circle cx={tx + 14} cy={38 + i * 15} r="4" fill={it.cor} />
          <text x={tx + 24} y={42 + i * 15} className="fill-white" style={{ fontSize: "11px", fontWeight: 700 }}>{it.nome}</text>
          <text x={tx + tw - 10} y={42 + i * 15} textAnchor="end" className="fill-white" style={{ fontSize: "11px", fontWeight: 800 }}>{brl(it.v)}</text>
        </g>
      ))}
    </g>
  );
}

// ============================================================================
// LINHAS — multi-série interativa (história, fluxo diário, evolução, runway).
// series: [{ nome, valores:(number|null)[], cor, area?, tracejada? }]
// ============================================================================
export function Linhas({ labels, series, height = 210, marcadorIndex = -1 }: { labels: string[]; series: { nome: string; valores: (number | null)[]; cor: string; area?: boolean; tracejada?: boolean }[]; height?: number; marcadorIndex?: number }) {
  const [hi, setHi] = useState<number | null>(null);
  const w = 640, h = height, padL = 44, padR = 16, padT = 20, padB = 28;
  const n = labels.length;
  const vals = series.flatMap((s) => s.valores).filter((v): v is number => v != null);
  const maxV = Math.max(...vals, 0.01);
  const minV = Math.min(0, ...vals);
  const x = (i: number) => padL + (n <= 1 ? (w - padL - padR) / 2 : (i / (n - 1)) * (w - padL - padR));
  const y = (v: number) => h - padB - ((v - minV) / (maxV - minV || 1)) * (h - padT - padB);
  const yl = [maxV, (maxV + minV) / 2, minV];
  const xIdx = n <= 8 ? labels.map((_, i) => i) : [0, Math.floor(n / 2), n - 1];
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * w;
    let i = Math.round(((sx - padL) / (w - padL - padR || 1)) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    setHi(i);
  };
  const tipItems = hi == null ? [] : series.map((s) => ({ nome: s.nome, cor: s.cor, v: s.valores[hi] })).filter((it) => it.v != null) as { nome: string; cor: string; v: number }[];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full select-none" style={{ height, cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      <defs>
        {series.filter((s) => s.area).map((s, i) => (
          <linearGradient key={i} id={`gl-${s.cor.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.cor} stopOpacity="0.25" /><stop offset="100%" stopColor={s.cor} stopOpacity="0.02" /></linearGradient>
        ))}
      </defs>
      {yl.map((lv, i) => (<text key={i} x={padL - 6} y={y(lv) + 3} textAnchor="end" className="fill-gray-300 dark:fill-gray-600" style={{ fontSize: "9px", fontWeight: 700 }}>{fmtK(lv)}</text>))}
      {xIdx.map((i) => (<text key={i} x={x(i)} y={h - 8} textAnchor="middle" className="fill-gray-300 dark:fill-gray-600" style={{ fontSize: "9px", fontWeight: 700 }}>{labels[i]}</text>))}
      {marcadorIndex >= 0 && <line x1={x(marcadorIndex)} y1={padT} x2={x(marcadorIndex)} y2={h - padB} strokeWidth="1" strokeDasharray="3 3" className="stroke-gray-400 dark:stroke-gray-500 opacity-50" />}
      {series.map((s, si) => {
        const pts = s.valores.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean).join(" ");
        const area = s.area && s.valores.filter((v) => v != null).length > 1 ? `M ${x(0)},${y(minV)} L ${s.valores.map((v, i) => `${x(i)},${y(v ?? minV)}`).join(" L ")} L ${x(n - 1)},${y(minV)} Z` : "";
        return (
          <g key={si}>
            {area && <path d={area} fill={`url(#gl-${s.cor.replace("#", "")})`} />}
            <polyline points={pts} fill="none" strokeWidth={s.tracejada ? 2 : 2.5} strokeDasharray={s.tracejada ? "5 4" : undefined} strokeLinecap="round" strokeLinejoin="round" stroke={s.tracejada ? undefined : s.cor} className={s.tracejada ? "stroke-gray-300 dark:stroke-gray-600" : undefined} />
          </g>
        );
      })}
      {hi != null && (
        <>
          <line x1={x(hi)} y1={padT} x2={x(hi)} y2={h - padB} strokeWidth="1.5" className="stroke-gray-400 dark:stroke-gray-500 opacity-60" />
          {series.map((s, si) => s.valores[hi] == null ? null : (<circle key={si} cx={x(hi)} cy={y(s.valores[hi] as number)} r="4.5" fill={s.tracejada ? "#9ca3af" : s.cor} className="stroke-white dark:stroke-gray-800" strokeWidth="2" />))}
          {tipItems.length > 0 && <Tooltip x={x(hi)} w={w} title={labels[hi]} items={tipItems} />}
        </>
      )}
    </svg>
  );
}

// ============================================================================
// BARRAS — grupo/empilhado interativo, com linha opcional. Hover destaca o grupo.
// ============================================================================
export function Barras({ labels, series, empilhado = false, linha }: { labels: string[]; series: { nome: string; valores: number[]; cor: string }[]; empilhado?: boolean; linha?: { nome: string; valores: number[]; cor: string } }) {
  const [hi, setHi] = useState<number | null>(null);
  const w = 640, h = 220, padL = 44, padR = 16, padT = 20, padB = 30;
  const n = labels.length;
  const totais = labels.map((_, i) => empilhado ? series.reduce((a, s) => a + (s.valores[i] || 0), 0) : Math.max(...series.map((s) => s.valores[i] || 0)));
  const linhaVals = linha ? linha.valores : [];
  const maxV = Math.max(...totais, ...linhaVals.map((v) => Math.abs(v)), 0.01);
  const base = Math.min(0, ...(linha ? linhaVals : [0]));
  const x = (i: number) => padL + (i + 0.5) * ((w - padL - padR) / n);
  const y = (v: number) => h - padB - ((v - base) / (maxV - base || 1)) * (h - padT - padB);
  const grupoW = (w - padL - padR) / n;
  const barW = empilhado ? grupoW * 0.5 : (grupoW * 0.7) / series.length;
  const yl = [maxV, (maxV + base) / 2, base];
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * w;
    let i = Math.floor((sx - padL) / grupoW);
    i = Math.max(0, Math.min(n - 1, i));
    setHi(i);
  };
  const tipItems = hi == null ? [] : [...series.map((s) => ({ nome: s.nome, cor: s.cor, v: s.valores[hi] || 0 })), ...(linha ? [{ nome: linha.nome, cor: linha.cor, v: linha.valores[hi] || 0 }] : [])];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56 select-none" style={{ cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      {yl.map((lv, i) => (<text key={i} x={padL - 6} y={y(lv) + 3} textAnchor="end" className="fill-gray-300 dark:fill-gray-600" style={{ fontSize: "9px", fontWeight: 700 }}>{fmtK(lv)}</text>))}
      {labels.map((lb, i) => (<text key={i} x={x(i)} y={h - 9} textAnchor="middle" className={`${hi === i ? "fill-gray-600 dark:fill-gray-300" : "fill-gray-300 dark:fill-gray-600"}`} style={{ fontSize: "9px", fontWeight: 700 }}>{lb}</text>))}
      {hi != null && <rect x={x(hi) - grupoW / 2} y={padT} width={grupoW} height={h - padT - padB} className="fill-gray-100/60 dark:fill-gray-700/30" rx="4" />}
      {labels.map((_, i) => {
        if (empilhado) {
          let acc = 0;
          return (
            <g key={i}>
              {series.map((s, si) => { const v = s.valores[i] || 0; const y0 = y(acc); acc += v; const y1 = y(acc); return <rect key={si} x={x(i) - barW / 2} y={y1} width={barW} height={Math.max(y0 - y1, 0)} rx="2" fill={s.cor} />; })}
            </g>
          );
        }
        const total = grupoW * 0.7; const start = x(i) - total / 2;
        return (<g key={i}>{series.map((s, si) => { const v = s.valores[i] || 0; const yy = y(v); const y0 = y(0); return <rect key={si} x={start + si * barW} y={Math.min(yy, y0)} width={barW * 0.86} height={Math.max(Math.abs(y0 - yy), 1)} rx="2" fill={s.cor} />; })}</g>);
      })}
      {linha && <polyline points={linha.valores.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke={linha.cor} />}
      {hi != null && tipItems.length > 0 && <Tooltip x={x(hi)} w={w} title={labels[hi]} items={tipItems} />}
    </svg>
  );
}

// ============================================================================
// DONUT — composição (comprometimento da renda). segmentos: [{nome,valor,cor}]
// ============================================================================
export function Donut({ segmentos, centroLabel, centroValor }: { segmentos: { nome: string; valor: number; cor: string }[]; centroLabel: string; centroValor: string }) {
  const total = segmentos.reduce((a, s) => a + Math.max(0, s.valor), 0) || 1;
  const cx = 100, cy = 100, r = 78, sw = 26;
  let ang = -90;
  const seg = (valor: number) => {
    const frac = Math.max(0, valor) / total;
    const a0 = ang; const a1 = ang + frac * 360; ang = a1;
    const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = p(a0); const [x1, y1] = p(a1);
    return { d: `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`, frac };
  };
  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[220px] mx-auto">
      <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={sw} className="stroke-gray-100 dark:stroke-gray-700/60" />
      {segmentos.map((s, i) => { const { d, frac } = seg(s.valor); return frac > 0.001 ? <path key={i} d={d} fill="none" strokeWidth={sw} stroke={s.cor}><title>{`${s.nome}: ${brl(s.valor)} (${(frac * 100).toFixed(0)}%)`}</title></path> : null; })}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-gray-900 dark:fill-gray-50" style={{ fontSize: "22px", fontWeight: 900 }}>{centroValor}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "9px", fontWeight: 700 }}>{centroLabel.toUpperCase()}</text>
    </svg>
  );
}
