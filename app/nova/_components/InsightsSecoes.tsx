"use client";

import { useState, type ReactNode } from "react";
import { Surface } from "../_ui/Surface";
import { SegmentedControl } from "../_ui/SegmentedControl";
import { Secao } from "./Secao";
import { brl } from "../_lib/formatar";
import { GaugeSaude, Linhas, Barras, Donut } from "../../insights/charts";
import { PALETA, type Metrica, type ResultadoInsights } from "../../../lib/insights";

/* ------------------------------------------------------------------ */
/* Peças comuns                                                        */
/* ------------------------------------------------------------------ */

function Avatar({ nome, foto, tamanho = 24 }: { nome: string; foto?: string; tamanho?: number }) {
  return (
    <span
      className="rounded-full overflow-hidden shrink-0 bg-[var(--nova-ink-hairline)] inline-flex items-center justify-center text-[11px] font-semibold text-[var(--nova-ink-soft)]"
      style={{ width: tamanho, height: tamanho }}
    >
      {foto ? <img src={foto} alt="" className="w-full h-full object-cover" draggable={false} /> : nome.charAt(0).toUpperCase()}
    </span>
  );
}

/** Botão "Como ler" que troca o conteúdo do card pela explicação. */
function BotaoComoLer({ aberto, aoAlternar }: { aberto: boolean; aoAlternar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoAlternar}
      aria-expanded={aberto}
      className="shrink-0 min-h-[32px] px-2.5 rounded-full text-[12px] font-semibold text-[var(--nova-accent)] hover:bg-[var(--nova-ink-hairline)]"
    >
      {aberto ? "Ver gráfico" : "Como ler"}
    </button>
  );
}

export function CartaoGrafico({ titulo, sub, explicacao, children, largo = false }: {
  titulo: string; sub?: string; explicacao: ReactNode; children: ReactNode; largo?: boolean;
}) {
  const [explicando, setExplicando] = useState(false);
  return (
    <Surface className={`p-5 ${largo ? "lg:col-span-2" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-[var(--nova-ink)]">{titulo}</h3>
          {sub && <p className="text-[12px] text-[var(--nova-ink-faint)] mt-0.5">{sub}</p>}
        </div>
        <BotaoComoLer aberto={explicando} aoAlternar={() => setExplicando((v) => !v)} />
      </div>
      {explicando ? <div className="text-[13px] leading-relaxed text-[var(--nova-ink-soft)] py-2">{explicacao}</div> : children}
    </Surface>
  );
}

function Legenda({ itens }: { itens: { nome: string; cor: string; tracejada?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
      {itens.map((it) => (
        <span key={it.nome} className="flex items-center gap-1.5 text-[12px] text-[var(--nova-ink-soft)]">
          {it.tracejada
            ? <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: it.cor }} />
            : <span className="inline-block w-3 h-3 rounded-sm" style={{ background: it.cor }} />}
          {it.nome}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resumo do mês: "Sobrou" é o número da tela; entradas e saídas apoiam */
/* ------------------------------------------------------------------ */

export function ResumoInsights({ m }: { m: Metrica }) {
  const positivo = m.saldo >= 0;
  return (
    <Surface className="nova-balance p-6">
      <p className="text-[13px] font-medium text-[var(--nova-ink-faint)]">Sobrou no mês</p>
      <p
        className={positivo ? "text-[var(--nova-ink)]" : "text-[var(--nova-danger)]"}
        style={{ fontSize: "clamp(2.25rem, 9vw, 3.25rem)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.03em", marginTop: 4 }}
      >
        {brl(m.saldo)}
      </p>
      <p className={`text-[13px] font-medium mt-1 ${positivo ? "text-[var(--nova-success)]" : "text-[var(--nova-danger)]"}`}>
        {m.receitas > 0 ? (positivo ? `Guardou ${m.taxa.toFixed(1)}% da renda` : "Saídas maiores que as entradas") : "Sem entradas neste mês"}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl px-3 py-2 bg-[var(--nova-success-bg)] text-[var(--nova-success)]">
          <p className="text-[12px] font-medium opacity-80">Entradas</p>
          <p className="text-[15px] font-semibold">{brl(m.receitas)}</p>
        </div>
        <div className="rounded-2xl px-3 py-2 bg-[var(--nova-danger-bg)] text-[var(--nova-danger)]">
          <p className="text-[12px] font-medium opacity-80">Saídas</p>
          <p className="text-[15px] font-semibold">{brl(m.despesas)}</p>
        </div>
      </div>
      <p className="mt-3 text-[12px] text-[var(--nova-ink-faint)]">As saídas não incluem o que foi guardado em caixinhas.</p>
    </Surface>
  );
}

/* ------------------------------------------------------------------ */
/* Saúde financeira: geral, por pessoa e comparativo                    */
/* ------------------------------------------------------------------ */

export function SaudeInsights({ autores, computarMes, mapPerfis }: {
  autores: string[]; computarMes: ResultadoInsights["computarMes"]; mapPerfis: Record<string, string>;
}) {
  const opcoes = [
    { valor: "__geral__", rotulo: "Geral" },
    ...autores.map((a) => ({ valor: a, rotulo: `@${a}` })),
    ...(autores.length >= 2 ? [{ valor: "__comp__", rotulo: "Comparar" }] : []),
  ];
  const [escopo, setEscopo] = useState("__geral__");
  const [explicando, setExplicando] = useState(false);
  const atual = opcoes.some((o) => o.valor === escopo) ? escopo : "__geral__";

  const partes = (mm: Metrica) => [
    { n: "Poupança", v: mm.ptsPoup, mx: 40, dica: "Quanto da renda sobrou (30% ou mais = nota cheia)." },
    { n: "Ritmo", v: mm.ptsRitmo, mx: 30, dica: "Gastar menos que no mesmo dia do mês passado pontua mais." },
    { n: "Fixos", v: mm.ptsFixas, mx: 30, dica: "Peso das despesas fixas na renda. Quanto menor, melhor." },
  ];

  const individual = (mm: Metrica, autor: string | null) => (
    <div className="flex flex-col items-center">
      {autor && <div className="flex items-center gap-2 mb-1"><Avatar nome={autor} foto={mapPerfis[autor]} /><span className="text-[14px] font-semibold text-[var(--nova-ink)]">@{autor}</span></div>}
      <GaugeSaude score={mm.score} corHex={mm.faixa.hex} label={mm.faixa.label} />
      <div className="grid grid-cols-3 gap-2 w-full mt-1 text-center">
        {partes(mm).map((c) => (
          <div key={c.n} title={c.dica}>
            <p className="text-[11px] text-[var(--nova-ink-faint)]">{c.n}</p>
            <p className="text-[14px] font-semibold text-[var(--nova-ink)]">{Math.round(c.v)}/{c.mx}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const comparativo = () => {
    const [a, b] = autores;
    const coluna = (autor: string) => {
      const mm = computarMes(autor);
      return (
        <div className="flex-1 flex flex-col items-center min-w-0">
          <div className="flex items-center gap-1.5 mb-1 min-w-0"><Avatar nome={autor} foto={mapPerfis[autor]} tamanho={22} /><span className="text-[13px] font-semibold text-[var(--nova-ink)] truncate">@{autor}</span></div>
          <GaugeSaude score={mm.score} corHex={mm.faixa.hex} label={mm.faixa.label} compact />
          <div className="w-full mt-2 space-y-1 text-[12px]">
            {[["Entradas", mm.receitas], ["Saídas", mm.despesas], ["Sobrou", mm.saldo]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-2"><span className="text-[var(--nova-ink-faint)]">{k}</span><span className={`font-medium ${k === "Sobrou" && (v as number) < 0 ? "text-[var(--nova-danger)]" : "text-[var(--nova-ink)]"}`}>{brl(v as number)}</span></div>
            ))}
          </div>
        </div>
      );
    };
    return <div className="flex gap-4">{coluna(a)}<div className="w-px bg-[var(--nova-ink-hairline)]" />{coluna(b)}</div>;
  };

  return (
    <Surface className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-[16px] font-semibold text-[var(--nova-ink)]">Saúde financeira</h3>
        <BotaoComoLer aberto={explicando} aoAlternar={() => setExplicando((v) => !v)} />
      </div>
      {opcoes.length > 1 && <div className="mb-4"><SegmentedControl opcoes={opcoes} valor={atual} aoMudar={setEscopo} /></div>}
      {explicando ? (
        <div className="space-y-2 text-[13px] leading-relaxed text-[var(--nova-ink-soft)]">
          <p>Uma nota de <b>0 a 100</b> para a saúde do mês, somando três partes:</p>
          <p><b>Poupança (0 a 40):</b> quanto da renda sobrou. 30% ou mais é nota cheia.</p>
          <p><b>Ritmo (0 a 30):</b> se estão gastando menos que no mesmo ponto do mês passado.</p>
          <p><b>Fixos (0 a 30):</b> quanto menor o peso das despesas fixas na renda, melhor.</p>
          <p className="text-[var(--nova-ink-faint)]">Faixas: 0 a 39 ruim, 40 a 59 atenção, 60 a 79 bom, 80 a 100 ótimo.</p>
        </div>
      ) : atual === "__comp__" ? comparativo() : individual(computarMes(atual === "__geral__" ? null : atual), atual === "__geral__" ? null : atual)}
    </Surface>
  );
}

/* ------------------------------------------------------------------ */
/* A história do mês: gasto acumulado + narrativa                       */
/* ------------------------------------------------------------------ */

export function HistoriaInsights({ r }: { r: ResultadoInsights }) {
  const corrente = r.modo === "corrente";
  const corLinha = corrente ? PALETA.saldo : "#6b7280";
  return (
    <CartaoGrafico
      titulo="A história do mês"
      sub="Gasto acumulado dia a dia"
      largo
      explicacao={<>Cada ponto é o <b>total gasto acumulado</b> do começo do mês até aquele dia. A linha cheia é {corrente ? "este mês, até hoje" : "o mês selecionado"}; a tracejada é o mês anterior. Se a cheia está <b>abaixo</b> da tracejada, vocês gastaram menos que no mês passado no mesmo ponto.</>}
    >
      <Legenda itens={[{ nome: corrente ? "Este mês" : "Mês", cor: corLinha }, { nome: "Anterior", cor: "#9ca3af", tracejada: true }]} />
      <Linhas
        labels={Array.from({ length: r.totalDiasMes }, (_, i) => `dia ${i + 1}`)}
        marcadorIndex={r.diaLimiteGrafico - 1}
        series={[{ nome: corrente ? "Este mês" : "Mês", valores: r.serieEsteExib, cor: corLinha, area: true }, { nome: "Anterior", valores: r.serieAntExib, cor: "#9ca3af", tracejada: true }]}
        height={220}
      />
      <div className="mt-4 flex flex-col gap-2">
        {r.narrativa.map((f, i) => (
          <p key={i} className={`px-3 py-2 rounded-xl text-[13px] font-medium ${f.tom === "bom" ? "bg-[var(--nova-success-bg)] text-[var(--nova-success)]" : f.tom === "ruim" ? "bg-[var(--nova-danger-bg)] text-[var(--nova-danger)]" : "bg-[var(--nova-ink-hairline)] text-[var(--nova-ink)]"}`}>{f.texto}</p>
        ))}
        {r.narrativa.length === 0 && <p className="text-[13px] text-[var(--nova-ink-faint)] py-2">Sem movimentações suficientes para contar a história deste mês.</p>}
      </div>
    </CartaoGrafico>
  );
}

/* ------------------------------------------------------------------ */
/* Fluxo por categoria                                                  */
/* ------------------------------------------------------------------ */

export type Detalhe = { titulo: string; corHex: string; itens: any[] };

export function CategoriasInsights({ titulo, dados, total, qtdVisiveis, expandirResto, aoAbrir }: {
  titulo: string; dados: { nome: string; valor: number; itens: any[] }[]; total: number; qtdVisiveis: number; expandirResto: boolean; aoAbrir: (d: Detalhe) => void;
}) {
  const [restoAberto, setRestoAberto] = useState(false);
  const visiveis = dados.slice(0, qtdVisiveis);
  const resto = dados.slice(qtdVisiveis);
  const restoValor = resto.reduce((a, c) => a + c.valor, 0);
  const barra = (pct: number, cor: string) => (
    <div className="w-full h-2 rounded-full bg-[var(--nova-ink-hairline)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} /></div>
  );
  return (
    <Surface className="p-5">
      <h3 className="text-[16px] font-semibold text-[var(--nova-ink)] mb-4">{titulo}</h3>
      {dados.length === 0 ? <p className="text-[13px] text-[var(--nova-ink-faint)] py-6 text-center">Nada neste mês.</p> : (
        <div className="space-y-3.5">
          {visiveis.map((cat, i) => {
            const pct = total > 0 ? (cat.valor / total) * 100 : 0;
            const cor = PALETA.categorias[i % PALETA.categorias.length];
            return (
              <button key={cat.nome} type="button" onClick={() => aoAbrir({ titulo: cat.nome, corHex: cor, itens: cat.itens })} className="w-full text-left cursor-pointer group">
                <div className="flex justify-between items-baseline gap-3 mb-1.5">
                  <span className="text-[14px] font-medium text-[var(--nova-ink)] truncate group-hover:text-[var(--nova-accent)]">{cat.nome}</span>
                  <span className="text-[14px] font-semibold text-[var(--nova-ink)] shrink-0">{brl(cat.valor)} <span className="text-[12px] font-normal text-[var(--nova-ink-faint)]">{pct.toFixed(1)}%</span></span>
                </div>
                {barra(pct, cor)}
              </button>
            );
          })}
          {resto.length > 0 && (
            <div>
              <div className="flex justify-between items-baseline gap-3 mb-1.5">
                <span className="text-[14px] font-medium text-[var(--nova-ink-soft)]">Resto <span className="text-[12px] text-[var(--nova-ink-faint)]">({resto.length} categorias)</span></span>
                <span className="text-[14px] font-semibold text-[var(--nova-ink-soft)]">{brl(restoValor)}</span>
              </div>
              {barra(total > 0 ? (restoValor / total) * 100 : 0, "#94a3b8")}
              {expandirResto && (
                <button type="button" onClick={() => setRestoAberto((v) => !v)} aria-expanded={restoAberto} className="mt-2 min-h-[32px] text-[12px] font-semibold text-[var(--nova-accent)]">
                  {restoAberto ? "Ocultar o resto" : "Ver o resto em detalhe"}
                </button>
              )}
              {expandirResto && restoAberto && (
                <div className="mt-1">
                  {resto.map((cat) => (
                    <button key={cat.nome} type="button" onClick={() => aoAbrir({ titulo: cat.nome, corHex: "#64748b", itens: cat.itens })} className="w-full flex items-center justify-between gap-3 py-1.5 text-left cursor-pointer hover:text-[var(--nova-accent)]">
                      <span className="text-[13px] text-[var(--nova-ink-soft)] truncate">{cat.nome}</span>
                      <span className="text-[13px] font-medium text-[var(--nova-ink)] shrink-0">{brl(cat.valor)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}

/** Lista do detalhe (categoria): cada lançamento abre no Dashboard Novo. */
export function ListaDetalhe({ detalhe, aoAbrirLancamento }: { detalhe: Detalhe; aoAbrirLancamento: (id: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 pr-10">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: detalhe.corHex }} />
        <h3 className="text-[20px] font-semibold text-[var(--nova-ink)] truncate">{detalhe.titulo}</h3>
      </div>
      <p className="text-[13px] text-[var(--nova-ink-faint)] mt-1 mb-3">{detalhe.itens.length} {detalhe.itens.length === 1 ? "lançamento" : "lançamentos"}</p>
      {[...detalhe.itens].sort((a, b) => Number(b.valor) - Number(a.valor)).map((t, i) => (
        <button key={t.id} type="button" onClick={() => aoAbrirLancamento(t.id)} className={`w-full flex items-center gap-3 py-2.5 text-left cursor-pointer hover:opacity-80 ${i === 0 ? "" : "border-t border-[var(--nova-ink-hairline)]"}`}>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-[var(--nova-ink)] truncate">{t.descricao}</p>
            <p className="text-[12px] text-[var(--nova-ink-faint)]">{new Date(t.data + "T00:00:00").toLocaleDateString("pt-BR")} · @{t.autor_nome}</p>
          </div>
          <span className="text-[14px] font-semibold text-[var(--nova-ink)] shrink-0">{brl(Number(t.valor))}</span>
          <span aria-hidden="true" className="text-[var(--nova-ink-faint)]">›</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pesos pesados: maiores gastos do mês                                 */
/* ------------------------------------------------------------------ */

export function PesosPesados({ gastos, qtdInicial, mapPerfis, aoAbrirLancamento }: {
  gastos: any[]; qtdInicial: number; mapPerfis: Record<string, string>; aoAbrirLancamento: (id: string) => void;
}) {
  const [qtd, setQtd] = useState(qtdInicial);
  const stepper = (
    <div className="flex items-center gap-1 rounded-full bg-[var(--nova-ink-hairline)] p-0.5">
      <button type="button" onClick={() => setQtd((c) => Math.max(1, c - 1))} aria-label="Mostrar menos" className="w-8 h-8 rounded-full text-[16px] font-semibold text-[var(--nova-ink)] hover:bg-[var(--nova-glass-1)]">−</button>
      <span className="w-6 text-center text-[13px] font-semibold text-[var(--nova-ink)]" aria-live="polite">{qtd}</span>
      <button type="button" onClick={() => setQtd((c) => Math.min(20, c + 1))} aria-label="Mostrar mais" className="w-8 h-8 rounded-full text-[16px] font-semibold text-[var(--nova-ink)] hover:bg-[var(--nova-glass-1)]">+</button>
    </div>
  );
  return (
    <Secao titulo="Maiores gastos" acao={stepper}>
      <Surface className="p-2">
        {gastos.length === 0 ? <p className="text-[13px] text-[var(--nova-ink-faint)] py-6 text-center">Nenhum gasto neste mês.</p> : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {gastos.slice(0, qtd).map((t, i) => (
              <li key={t.id}>
                <button type="button" onClick={() => aoAbrirLancamento(t.id)} className="w-full flex items-center gap-3 p-3 rounded-[var(--nova-radius-md)] text-left cursor-pointer hover:bg-[var(--nova-ink-hairline)]">
                  <span className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-semibold bg-[var(--nova-ink-hairline)] text-[var(--nova-ink-soft)]">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-[var(--nova-ink)] truncate">{t.descricao}</p>
                    <p className="text-[12px] text-[var(--nova-ink-faint)] truncate flex items-center gap-1.5">
                      <Avatar nome={t.autor_nome || "?"} foto={mapPerfis[t.autor_nome]} tamanho={16} />
                      {t.categorias?.nome || "Sem categoria"} · {new Date(t.data + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="text-[14px] font-semibold text-[var(--nova-ink)] shrink-0">{brl(Number(t.valor))}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </Secao>
  );
}

/* ------------------------------------------------------------------ */
/* Projeção (meses futuros)                                             */
/* ------------------------------------------------------------------ */

export function ProjecaoInsights({ r, nomeDoMes }: { r: ResultadoInsights; nomeDoMes: string }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [explicando, setExplicando] = useState(false);
  const positivo = r.saldoPrevisto >= 0;
  const grupos = [
    { chave: "fixas", titulo: "Despesas fixas", total: r.totalProjFixas, itens: r.projFixas },
    { chave: "variaveis", titulo: "Despesas variáveis", total: r.totalProjVariaveis, itens: r.projVariaveis },
  ];
  return (
    <div className="space-y-6">
      <Surface className="nova-balance p-6">
        <p className="text-[13px] font-medium text-[var(--nova-ink-faint)]">Saldo previsto para {nomeDoMes}</p>
        <p className={positivo ? "text-[var(--nova-ink)]" : "text-[var(--nova-danger)]"} style={{ fontSize: "clamp(2.25rem, 9vw, 3.25rem)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.03em", marginTop: 4 }}>
          {brl(r.saldoPrevisto)}
        </p>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl px-3 py-2 bg-[var(--nova-success-bg)] text-[var(--nova-success)]"><p className="text-[12px] font-medium opacity-80">Receita provável</p><p className="text-[15px] font-semibold">{brl(r.mediaReceita6Meses)}</p><p className="text-[11px] opacity-80">média dos últimos 6 meses</p></div>
          <div className="rounded-2xl px-3 py-2 bg-[var(--nova-ink-hairline)] text-[var(--nova-ink)]"><p className="text-[12px] font-medium text-[var(--nova-ink-soft)]">Despesas fixas</p><p className="text-[15px] font-semibold">{brl(r.totalProjFixas)}</p><p className="text-[11px] text-[var(--nova-ink-faint)]">média, contas fixas e assinaturas</p></div>
          <div className="rounded-2xl px-3 py-2 bg-[var(--nova-ink-hairline)] text-[var(--nova-ink)]"><p className="text-[12px] font-medium text-[var(--nova-ink-soft)]">Despesas variáveis</p><p className="text-[15px] font-semibold">{brl(r.totalProjVariaveis)}</p><p className="text-[11px] text-[var(--nova-ink-faint)]">mediana do dia a dia</p></div>
        </div>
        {r.faturasComprometidas > 0 && <p className="mt-3 text-[12px] text-[var(--nova-ink-soft)]">Deste total, <b>{brl(r.faturasComprometidas)}</b> já está comprometido em faturas e parcelas de cartão que vencem neste mês.</p>}
      </Surface>

      <Surface className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div><h3 className="text-[16px] font-semibold text-[var(--nova-ink)]">De onde vem a previsão</h3><p className="text-[12px] text-[var(--nova-ink-faint)] mt-0.5">Últimos 3 meses, por categoria</p></div>
          <BotaoComoLer aberto={explicando} aoAlternar={() => setExplicando((v) => !v)} />
        </div>
        {explicando ? (
          <p className="text-[13px] leading-relaxed text-[var(--nova-ink-soft)] py-2">A previsão usa o histórico real das despesas dos <b>últimos 3 meses</b>, categoria a categoria. <b>Fixas</b> (contas fixas e assinaturas) usam a <b>média</b>; <b>variáveis</b> usam a <b>mediana</b>, que ignora meses atípicos (um mês com uma compra grande não infla a previsão). Categorias sem lançamento real não entram.</p>
        ) : r.despesasPrevistas === 0 ? <p className="text-[13px] text-[var(--nova-ink-faint)] py-6 text-center">Sem histórico nos últimos 3 meses para projetar.</p> : (
          <div className="space-y-2">
            {grupos.map((g) => (
              <div key={g.chave} className="rounded-[var(--nova-radius-md)] border border-[var(--nova-ink-hairline)] overflow-hidden">
                <button type="button" onClick={() => setAberto(aberto === g.chave ? null : g.chave)} aria-expanded={aberto === g.chave} className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-[var(--nova-ink-hairline)]">
                  <div><p className="text-[14px] font-semibold text-[var(--nova-ink)]">{g.titulo}</p><p className="text-[12px] text-[var(--nova-ink-faint)]">{g.itens.length} {g.itens.length === 1 ? "categoria" : "categorias"}</p></div>
                  <span className="text-[15px] font-semibold text-[var(--nova-ink)]">{brl(g.total)} <span aria-hidden="true" className="text-[var(--nova-ink-faint)]">{aberto === g.chave ? "−" : "+"}</span></span>
                </button>
                {aberto === g.chave && (
                  <div className="px-4 pb-3 border-t border-[var(--nova-ink-hairline)]">
                    {g.itens.map((it, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-2"><span className="text-[13px] text-[var(--nova-ink-soft)] truncate">{it.nome}</span><span className="text-[13px] font-medium text-[var(--nova-ink)]">{brl(it.valor)}</span></div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Raio-X: os gráficos de análise                                       */
/* ------------------------------------------------------------------ */

export function RaioX({ r }: { r: ResultadoInsights }) {
  const futuro = r.modo === "futuro";
  const entradasSaidas = [{ nome: "Entradas", cor: PALETA.receita }, { nome: "Saídas", cor: PALETA.despesa }];
  return (
    <Secao titulo="Raio-X das finanças">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {!futuro && (
          <CartaoGrafico titulo="Saldo do mês, dia a dia" largo explicacao={<>Mostra o <b>saldo acumulado do mês</b> (entradas menos saídas) dia a dia. {r.modo === "corrente" && "A partir de hoje já desconta as contas fixas programadas que ainda vão cair. "}Cada degrau para baixo é uma conta chegando: é a resposta para &ldquo;quanto ainda sobra?&rdquo;.</>}>
            <Linhas labels={r.runway.labels} marcadorIndex={r.runway.hoje} series={[{ nome: "Saldo", valores: r.runway.valores, cor: PALETA.saldo, area: true }]} height={220} />
          </CartaoGrafico>
        )}
        {!futuro && (
          <CartaoGrafico titulo="Fluxo diário" explicacao={<>Total de <b>entradas</b> e <b>saídas</b> em cada dia do mês.</>}>
            <Legenda itens={entradasSaidas} />
            <Linhas labels={r.fluxoDiario.labels} series={[{ nome: "Entradas", valores: r.fluxoDiario.rec, cor: PALETA.receita }, { nome: "Saídas", valores: r.fluxoDiario.desp, cor: PALETA.despesa }]} height={200} />
          </CartaoGrafico>
        )}
        {!futuro && (
          <CartaoGrafico titulo="Fluxo semanal" explicacao={<>O mesmo fluxo agrupado por <b>semana</b>, útil para ver em qual semana o dinheiro aperta mais.</>}>
            <Legenda itens={entradasSaidas} />
            <Barras labels={r.fluxoSemanal.labels} series={[{ nome: "Entradas", valores: r.fluxoSemanal.rec, cor: PALETA.receita }, { nome: "Saídas", valores: r.fluxoSemanal.desp, cor: PALETA.despesa }]} />
          </CartaoGrafico>
        )}
        <CartaoGrafico titulo="Receitas × despesas" sub="Últimos 12 meses" explicacao={<>Barras de <b>entradas</b> e <b>saídas</b> mês a mês, com a linha de <b>saldo</b>. Meses com o saldo abaixo de zero fecharam no vermelho.</>}>
          <Legenda itens={[...entradasSaidas, { nome: "Saldo", cor: PALETA.saldo }]} />
          <Barras labels={r.serie12m.labels} series={[{ nome: "Entradas", valores: r.serie12m.rec, cor: PALETA.receita }, { nome: "Saídas", valores: r.serie12m.desp, cor: PALETA.despesa }]} linha={{ nome: "Saldo", valores: r.serie12m.saldo, cor: PALETA.saldo }} />
        </CartaoGrafico>
        <CartaoGrafico titulo="Fixo × variável" sub="Últimos 6 meses" explicacao={<>Cada barra é o gasto do mês dividido entre <b>fixo</b> (contas fixas e assinaturas) e <b>variável</b> (o dia a dia). Quanto mais variável, mais espaço para ajustar.</>}>
          <Legenda itens={[{ nome: "Fixo", cor: PALETA.fixo }, { nome: "Variável", cor: PALETA.variavel }]} />
          <Barras labels={r.fixoVariavel6m.labels} empilhado series={[{ nome: "Fixo", valores: r.fixoVariavel6m.fixo, cor: PALETA.fixo }, { nome: "Variável", valores: r.fixoVariavel6m.variavel, cor: PALETA.variavel }]} />
        </CartaoGrafico>
        <CartaoGrafico titulo="Evolução por categoria" sub="5 maiores categorias, 6 meses" explicacao={<>A trajetória das suas <b>5 maiores categorias</b> de gasto nos últimos 6 meses. Serve para ver o que está subindo ou já caiu.</>}>
          {r.evolucaoCategorias.series.length === 0 ? <p className="text-[13px] text-[var(--nova-ink-faint)] py-6 text-center">Sem dados.</p> : (
            <>
              <Legenda itens={r.evolucaoCategorias.series.map((s) => ({ nome: s.nome, cor: s.cor }))} />
              <Linhas labels={r.evolucaoCategorias.labels} series={r.evolucaoCategorias.series} height={210} />
            </>
          )}
        </CartaoGrafico>
        {!futuro && (
          <CartaoGrafico titulo="Para onde foi a renda" explicacao={<>Da renda que entrou este mês, quanto foi para <b>despesas fixas</b>, <b>variáveis</b> e quanto <b>sobrou</b>.</>}>
            <Donut segmentos={r.donutSegs} centroLabel="da renda sobrou" centroValor={r.m.receitas > 0 ? `${Math.max(0, Math.round((r.donutSegs[2].valor / r.m.receitas) * 100))}%` : "—"} />
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              {r.donutSegs.map((s) => (
                <div key={s.nome}><p className="text-[11px] font-medium" style={{ color: s.cor }}>{s.nome}</p><p className="text-[13px] font-semibold text-[var(--nova-ink)]">{brl(s.valor)}</p></div>
              ))}
            </div>
          </CartaoGrafico>
        )}
      </div>
    </Secao>
  );
}
