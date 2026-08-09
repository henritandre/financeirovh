"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../ThemeContext";
import { criarMola, criarRastreador, projetar, elastico, prefereMenosMovimento, SPRING_PADRAO, SPRING_GESTO } from "../ui/spring";

// ============================================================================
// DASHBOARD — UI NOVA (rota de avaliação)
// Mesma tela do app, mesmos dados reais, linguagem visual nova.
// O seletor no topo alterna para o visual atual, para comparação direta.
// Nenhuma tela existente é alterada.
// ============================================================================

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const dataLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];

export default function UILabPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const [versao, setVersao] = useState<"classica" | "nova">("nova");
  const [reduzido, setReduzido] = useState(false);

  const [carregando, setCarregando] = useState(true);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);
  const [mapPerfis, setMapPerfis] = useState<Record<string, string>>({});
  const [detalhe, setDetalhe] = useState<any | null>(null);

  useEffect(() => {
    setReduzido(prefereMenosMovimento());
    const salvo = localStorage.getItem("ui_versao");
    if (salvo === "classica" || salvo === "nova") setVersao(salvo);

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: perfis } = await supabase.from("profiles").select("username, avatar_url");
      if (perfis) {
        const m: Record<string, string> = {};
        perfis.forEach((p) => { if (p.username && p.avatar_url) m[p.username] = p.avatar_url; });
        setMapPerfis(m);
      }
      const { data: t } = await supabase.from("transacoes").select("*, categorias(nome), conta_origem:contas!conta_id(*), conta_destino:contas!conta_destino_id(*)").order("data", { ascending: false });
      const { data: c } = await supabase.from("contas").select("*, banco_vinculado:contas_bancarias(*)");
      const { data: b } = await supabase.from("contas_bancarias").select("*").order("nome");
      if (t) setTransacoes(t);
      if (c) setContas(c);
      if (b) setBancos(b);
      setCarregando(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const trocarVersao = (v: "classica" | "nova") => { setVersao(v); localStorage.setItem("ui_versao", v); };

  // ---------------------------------------------------------------- cálculos
  const hoje = new Date();
  const inicioMes = dataLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const fimHoje = dataLocal(hoje);
  const doPeriodo = transacoes.filter((t) => t.data >= inicioMes && t.data <= fimHoje);

  const resumo = doPeriodo.reduce(
    (acc, t) => {
      const v = Number(t.valor);
      if (t.tipo === "receita") { acc.receitas += v; acc.saldo += v; }
      else if (t.tipo === "despesa") { if (t.conta_origem?.tipo === "credito") acc.cartao += v; else { acc.despesas += v; acc.saldo -= v; } }
      else if (t.tipo === "transferencia") {
        if (t.conta_origem?.tipo !== "credito") acc.saldo -= v;
        if (t.conta_destino?.tipo === "credito") { acc.cartao -= v; acc.despesas += v; }
        else if (t.conta_destino) acc.saldo += v;
      }
      return acc;
    },
    { saldo: 0, receitas: 0, despesas: 0, cartao: 0 }
  );

  const saldosBancarios = bancos.map((banco) => {
    const ids = contas.filter((c) => c.conta_bancaria_id === banco.id && c.tipo === "corrente").map((c) => c.id);
    let saldo = 0;
    transacoes.forEach((t) => {
      const v = Number(t.valor);
      if (t.tipo === "receita" && ids.includes(t.conta_id)) saldo += v;
      if (t.tipo === "despesa" && ids.includes(t.conta_id)) saldo -= v;
      if (t.tipo === "transferencia") { if (ids.includes(t.conta_id)) saldo -= v; if (ids.includes(t.conta_destino_id)) saldo += v; }
    });
    return { ...banco, saldo };
  }).filter((b) => b.ativo !== false);

  const saldoDinheiro = (() => {
    const ids = contas.filter((c) => c.tipo === "dinheiro").map((c) => c.id);
    let s = 0;
    transacoes.forEach((t) => {
      const v = Number(t.valor);
      if (t.tipo === "receita" && ids.includes(t.conta_id)) s += v;
      if (t.tipo === "despesa" && ids.includes(t.conta_id)) s -= v;
      if (t.tipo === "transferencia") { if (ids.includes(t.conta_id)) s -= v; if (ids.includes(t.conta_destino_id)) s += v; }
    });
    return s;
  })();

  const saldoTotal = saldoDinheiro + saldosBancarios.reduce((a, b) => a + b.saldo, 0);

  const faturasDoCartao = (cartaoId: string) => {
    const cartao = contas.find((c) => c.id === cartaoId);
    if (!cartao) return { total: 0, aberta: 0 };
    const fech = Number(cartao.dia_fechamento) || 1;
    const venc = Number(cartao.dia_vencimento) || 10;
    const trans = transacoes.filter((t) => (t.tipo === "despesa" && t.conta_id === cartaoId) || (t.tipo === "transferencia" && t.conta_destino_id === cartaoId));
    const grupos: Record<string, number> = {}; let pagos = 0;
    trans.forEach((t) => {
      const v = Number(t.valor);
      if (t.tipo === "despesa") {
        const [a, m, d] = t.data.split("-").map(Number);
        let ano = a, mes = m - 1;
        if (d >= fech) { mes++; if (mes > 11) { mes = 0; ano++; } }
        const k = `${ano}-${String(mes + 1).padStart(2, "0")}`;
        grupos[k] = (grupos[k] || 0) + v;
      } else pagos += v;
    });
    const arr = Object.keys(grupos).sort().map((k) => {
      const [a, m] = k.split("-").map(Number);
      return { venc: new Date(a, m - 1, venc), aberto: grupos[k] };
    });
    let resta = pagos;
    for (const f of arr) { if (resta >= f.aberto) { resta -= f.aberto; f.aberto = 0; } else { f.aberto -= resta; resta = 0; break; } }
    const abertas = arr.filter((f) => f.aberto > 0.01);
    const proxima = [...abertas].sort((x, y) => x.venc.getTime() - y.venc.getTime())[0];
    return { total: abertas.reduce((a, f) => a + f.aberto, 0), aberta: proxima?.aberto || 0 };
  };

  const cartoes = contas.filter((c) => c.tipo === "credito" && c.ativo !== false).map((c) => ({ ...c, ...faturasDoCartao(c.id) }));
  const totalCartoes = cartoes.reduce((a, c) => a + c.total, 0);
  const extrato = doPeriodo.slice(0, 12);

  const nova = versao === "nova";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${nova ? "bg-[#f2f2f7] dark:bg-black" : "bg-gray-50 dark:bg-gray-900"}`}>
      {nova && (
        <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-32 w-[30rem] h-[30rem] rounded-full blur-3xl opacity-[0.28] dark:opacity-20" style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)" }} />
          <div className="absolute top-64 -right-32 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-[0.22] dark:opacity-[0.18]" style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)" }} />
        </div>
      )}

      <Cabecalho nova={nova} isDarkMode={isDarkMode} toggleTheme={toggleTheme} onVoltar={() => router.push("/dashboard")} />

      <main className="relative px-4 pb-32 max-w-2xl mx-auto pt-5 space-y-7">
        <SeletorVersao versao={versao} onTrocar={trocarVersao} reduzido={reduzido} nova={nova} />

        {carregando ? (
          <div className="flex justify-center py-24">
            <div className={`animate-spin rounded-full h-9 w-9 border-b-2 ${nova ? "border-[#0a84ff]" : "border-blue-600"}`} />
          </div>
        ) : (
          <>
            <SaldoHero nova={nova} saldo={saldoTotal} receitas={resumo.receitas} despesas={resumo.despesas} />
            <Bancos nova={nova} bancos={saldosBancarios} dinheiro={saldoDinheiro} mapPerfis={mapPerfis} />
            <Cartoes nova={nova} cartoes={cartoes} total={totalCartoes} />
            <ResumoPeriodo nova={nova} resumo={resumo} />
            <Extrato nova={nova} itens={extrato} onAbrir={setDetalhe} />
          </>
        )}
      </main>

      <BotaoFlutuante nova={nova} onClick={() => setDetalhe({ novo: true })} />
      <PainelArrastavel item={detalhe} aoFechar={() => setDetalhe(null)} nova={nova} reduzido={reduzido} />
    </div>
  );
}

// ============================================================================
function Cabecalho({ nova, isDarkMode, toggleTheme, onVoltar }: any) {
  return (
    <header
      className={`sticky top-0 z-30 px-4 py-3 flex items-center justify-between ${
        nova ? "bg-white/55 dark:bg-[#1c1c1e]/55 border-b border-white/40 dark:border-white/[0.08]" : "bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"
      }`}
      style={nova ? { backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)" } : undefined}
    >
      <div className="flex items-center gap-2.5">
        <BotaoIcone nova={nova} onClick={onVoltar} rotulo="Voltar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </BotaoIcone>
        <h1 className={nova ? "text-[19px] font-semibold text-black dark:text-white" : "text-xl font-black text-blue-600 dark:text-blue-400"} style={nova ? { letterSpacing: "-0.02em" } : undefined}>
          Visão geral
        </h1>
      </div>
      <BotaoIcone nova={nova} onClick={toggleTheme} rotulo="Alternar tema"><span className="text-sm">{isDarkMode ? "☀️" : "🌙"}</span></BotaoIcone>
    </header>
  );
}

function BotaoIcone({ nova, onClick, children, rotulo }: any) {
  const ref = useRef<HTMLButtonElement>(null);
  usarPressao(ref, nova);
  return (
    <button ref={ref} onClick={onClick} aria-label={rotulo}
      className={`h-9 w-9 rounded-full flex items-center justify-center select-none ${nova ? "bg-black/[0.06] dark:bg-white/10 text-black dark:text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
      style={{ touchAction: "manipulation" }}>{children}</button>
  );
}

// Realce no pointer-down — não no clique.
function usarPressao(ref: React.RefObject<HTMLElement | null>, ativo = true, escala = 0.94) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !ativo) return;
    const mola = criarMola(1, (v) => { el.style.transform = `scale(${v})`; });
    const down = () => mola.animarPara(escala, { damping: 1, response: 0.12 });
    const up = () => mola.animarPara(1, SPRING_GESTO);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
    return () => {
      el.removeEventListener("pointerdown", down); el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up); el.removeEventListener("pointerleave", up);
      mola.parar(); el.style.transform = "";
    };
  }, [ref, ativo, escala]);
}

function SeletorVersao({ versao, onTrocar, reduzido, nova }: any) {
  const ind = useRef<HTMLDivElement>(null);
  const mola = useRef<ReturnType<typeof criarMola> | null>(null);
  useEffect(() => {
    if (!ind.current) return;
    if (!mola.current) mola.current = criarMola(versao === "nova" ? 1 : 0, (v) => { if (ind.current) ind.current.style.transform = `translateX(${v * 100}%)`; });
    mola.current.animarPara(versao === "nova" ? 1 : 0, reduzido ? { damping: 1, response: 0.01 } : SPRING_PADRAO);
  }, [versao, reduzido]);
  return (
    <div className={`relative flex p-1 rounded-2xl ${nova ? "bg-black/[0.05] dark:bg-white/[0.08]" : "bg-gray-200 dark:bg-gray-800"}`}>
      <div className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] pointer-events-none" ref={ind}>
        <div className={`h-full w-full rounded-xl ${nova ? "bg-white dark:bg-[#2c2c2e] shadow-[0_2px_8px_rgba(0,0,0,0.12)]" : "bg-white dark:bg-gray-700 shadow-sm"}`} />
      </div>
      {(["classica", "nova"] as const).map((v) => (
        <button key={v} onClick={() => onTrocar(v)}
          className={`relative flex-1 py-2 text-[14px] rounded-xl select-none transition-colors duration-200 ${
            versao === v ? (nova ? "text-black dark:text-white font-semibold" : "text-blue-700 dark:text-blue-400 font-black")
                         : (nova ? "text-black/45 dark:text-white/45 font-medium" : "text-gray-500 dark:text-gray-400 font-bold")}`}
          style={{ touchAction: "manipulation" }}>
          {v === "classica" ? "UI Clássica" : "UI Nova"}
        </button>
      ))}
    </div>
  );
}

function Secao({ nova, titulo, acao, children }: any) {
  return (
    <section>
      <div className="flex items-end justify-between mb-2.5 px-1">
        <h2 className={nova ? "text-[13px] font-semibold text-black/45 dark:text-white/45" : "text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest"}>{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

function Cartao({ nova, children, className = "" }: any) {
  return (
    <div
      className={`${nova
        ? "bg-white/70 dark:bg-[#1c1c1e]/70 border border-white/50 dark:border-white/[0.08] rounded-[22px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_10px_28px_-10px_rgba(0,0,0,0.12)]"
        : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm"} ${className}`}
      style={nova ? { backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)" } : undefined}
    >{children}</div>
  );
}

function SaldoHero({ nova, saldo, receitas, despesas }: any) {
  return (
    <Cartao nova={nova} className="p-6">
      <p className={nova ? "text-[13px] font-medium text-black/45 dark:text-white/45" : "text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest"}>Saldo total real</p>
      <p className={`mt-1 ${nova ? "text-black dark:text-white" : "text-blue-600 dark:text-blue-400"}`}
        style={nova
          ? { fontSize: "clamp(2.25rem, 9vw, 3.25rem)", fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }
          : { fontSize: "2.5rem", fontWeight: 900, lineHeight: 1.1 }}>
        {brl(saldo)}
      </p>
      <div className="mt-4 flex gap-2">
        <Pilula nova={nova} tom="verde" rotulo="Entrou" valor={receitas} />
        <Pilula nova={nova} tom="vermelho" rotulo="Saiu" valor={despesas} />
      </div>
    </Cartao>
  );
}

function Pilula({ nova, tom, rotulo, valor }: any) {
  const cores = tom === "verde"
    ? (nova ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400")
    : (nova ? "bg-red-500/12 text-red-700 dark:text-red-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400");
  return (
    <div className={`flex-1 rounded-2xl px-3 py-2 ${cores}`}>
      <p className={nova ? "text-[12px] font-medium opacity-70" : "text-[10px] font-black uppercase tracking-wider opacity-80"}>{rotulo}</p>
      <p className={nova ? "text-[15px] font-semibold" : "text-sm font-black"} style={{ fontVariantNumeric: "tabular-nums" }}>{brl(valor)}</p>
    </div>
  );
}

function Bancos({ nova, bancos, dinheiro, mapPerfis }: any) {
  const lista = [...bancos].sort((a: any, b: any) => b.saldo - a.saldo);
  return (
    <Secao nova={nova} titulo="Bancos e cofres">
      {nova ? (
        <Cartao nova className="overflow-hidden">
          {dinheiro !== 0 && <LinhaBanco nome="Carteira / Casa" sub="Dinheiro físico" valor={dinheiro} cor="#10b981" primeira />}
          {lista.map((b: any, i: number) => (
            <LinhaBanco key={b.id} nome={b.banco || b.nome} sub={b.nome} valor={b.saldo} cor="#3b82f6" foto={mapPerfis[b.autor_nome]} autor={b.autor_nome} primeira={i === 0 && dinheiro === 0} />
          ))}
        </Cartao>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {dinheiro !== 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm p-4">
              <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Carteira</p>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1.5">{brl(dinheiro)}</p>
            </div>
          )}
          {lista.map((b: any) => (
            <div key={b.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm p-4">
              <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">{b.banco || b.nome}</p>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1.5">{brl(b.saldo)}</p>
            </div>
          ))}
        </div>
      )}
    </Secao>
  );
}

function LinhaBanco({ nome, sub, valor, cor, foto, autor, primeira }: any) {
  const ref = useRef<HTMLDivElement>(null);
  usarPressao(ref, true, 0.97);
  return (
    <div ref={ref} className={`flex items-center gap-3 px-4 py-3.5 select-none ${primeira ? "" : "border-t border-black/[0.06] dark:border-white/[0.06]"}`} style={{ touchAction: "manipulation" }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0 overflow-hidden" style={{ background: cor }}>
        {foto ? <img src={foto} alt="" className="w-full h-full object-cover" /> : (nome || "?").charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-black dark:text-white truncate" style={{ letterSpacing: "-0.01em" }}>{nome}</p>
        <p className="text-[13px] text-black/45 dark:text-white/45 truncate">{sub}{autor ? ` · @${autor}` : ""}</p>
      </div>
      <p className={`text-[15px] font-semibold shrink-0 ${valor < 0 ? "text-red-600 dark:text-red-400" : "text-black dark:text-white"}`} style={{ fontVariantNumeric: "tabular-nums" }}>{brl(valor)}</p>
    </div>
  );
}

function Cartoes({ nova, cartoes, total }: any) {
  if (cartoes.length === 0) return null;
  return (
    <Secao nova={nova} titulo="Cartões de crédito" acao={
      <span className={nova ? "text-[13px] font-semibold text-black/60 dark:text-white/60" : "text-xs font-black text-purple-600 dark:text-purple-400"} style={{ fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
    }>
      <Cartao nova={nova} className={nova ? "overflow-hidden" : "p-4 space-y-3"}>
        {cartoes.map((c: any, i: number) => (
          <div key={c.id} className={nova
            ? `flex items-center gap-3 px-4 py-3.5 ${i === 0 ? "" : "border-t border-black/[0.06] dark:border-white/[0.06]"}`
            : "flex items-center gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-700"}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${nova ? "bg-purple-500/15 text-purple-600 dark:text-purple-400" : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"}`}>💳</div>
            <div className="min-w-0 flex-1">
              <p className={nova ? "text-[15px] font-medium text-black dark:text-white truncate" : "text-sm font-bold text-gray-900 dark:text-gray-100 truncate"}>{c.nome}</p>
              <p className={nova ? "text-[13px] text-black/45 dark:text-white/45" : "text-[10px] font-black text-gray-500 uppercase tracking-wider"}>
                {c.aberta > 0 ? `Fatura atual ${brl(c.aberta)}` : "Sem fatura aberta"}
              </p>
            </div>
            <p className={nova ? "text-[15px] font-semibold text-black dark:text-white shrink-0" : "text-sm font-black text-gray-900 dark:text-gray-100 shrink-0"} style={{ fontVariantNumeric: "tabular-nums" }}>{brl(c.total)}</p>
          </div>
        ))}
      </Cartao>
    </Secao>
  );
}

function ResumoPeriodo({ nova, resumo }: any) {
  const itens = [
    ["Saldo do mês", resumo.saldo, resumo.saldo >= 0 ? "azul" : "vermelho"],
    ["Receitas", resumo.receitas, "verde"],
    ["Despesas pagas", resumo.despesas, "vermelho"],
  ] as const;
  return (
    <Secao nova={nova} titulo="Resumo do mês">
      <div className="grid grid-cols-3 gap-3">
        {itens.map(([rotulo, valor, tom]) => (
          <Cartao key={rotulo} nova={nova} className="p-4">
            <p className={nova ? "text-[12px] font-medium text-black/45 dark:text-white/45 leading-tight" : "text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-tight"}>{rotulo}</p>
            <p className={`mt-1.5 ${nova ? "text-[16px] font-semibold" : "text-base font-black"} ${
              tom === "verde" ? "text-emerald-600 dark:text-emerald-400" : tom === "vermelho" ? "text-red-600 dark:text-red-400" : nova ? "text-black dark:text-white" : "text-blue-600 dark:text-blue-400"
            }`} style={{ fontVariantNumeric: "tabular-nums" }}>{brl(valor)}</p>
          </Cartao>
        ))}
      </div>
    </Secao>
  );
}

function Extrato({ nova, itens, onAbrir }: any) {
  return (
    <Secao nova={nova} titulo="Últimos lançamentos">
      <Cartao nova={nova} className={nova ? "overflow-hidden" : "p-4 space-y-2"}>
        {itens.length === 0 && <p className={`text-center py-8 text-sm ${nova ? "text-black/45 dark:text-white/45" : "font-bold text-gray-400"}`}>Nada lançado neste mês.</p>}
        {itens.map((t: any, i: number) => <LinhaExtrato key={t.id} t={t} nova={nova} primeira={i === 0} onAbrir={onAbrir} />)}
      </Cartao>
    </Secao>
  );
}

function LinhaExtrato({ t, nova, primeira, onAbrir }: any) {
  const ref = useRef<HTMLDivElement>(null);
  usarPressao(ref, nova, 0.97);
  const receita = t.tipo === "receita";
  const transf = t.tipo === "transferencia";
  return (
    <div ref={ref} onClick={() => onAbrir(t)}
      className={nova
        ? `flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none ${primeira ? "" : "border-t border-black/[0.06] dark:border-white/[0.06]"}`
        : "flex items-center gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 cursor-pointer"}
      style={{ touchAction: "manipulation" }}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${
        nova ? (receita ? "bg-emerald-500/15" : transf ? "bg-blue-500/15" : "bg-black/[0.06] dark:bg-white/10") : "bg-gray-100 dark:bg-gray-700"}`}>
        {receita ? "↓" : transf ? "⇄" : "↑"}
      </div>
      <div className="min-w-0 flex-1">
        <p className={nova ? "text-[15px] font-medium text-black dark:text-white truncate" : "text-sm font-bold text-gray-900 dark:text-gray-100 truncate"} style={nova ? { letterSpacing: "-0.01em" } : undefined}>{t.descricao}</p>
        <p className={nova ? "text-[13px] text-black/45 dark:text-white/45 truncate" : "text-[10px] font-black text-gray-500 uppercase tracking-wider truncate"}>
          {t.categorias?.nome || (transf ? "Transferência" : "Sem categoria")} · {new Date(t.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
        </p>
      </div>
      <p className={`shrink-0 ${nova ? "text-[15px] font-semibold" : "text-sm font-black"} ${receita ? "text-emerald-600 dark:text-emerald-400" : nova ? "text-black dark:text-white" : "text-gray-900 dark:text-gray-100"}`}
        style={{ fontVariantNumeric: "tabular-nums" }}>
        {receita ? "+" : "−"}{brl(Number(t.valor)).replace("R$ ", "R$ ")}
      </p>
    </div>
  );
}

function BotaoFlutuante({ nova, onClick }: any) {
  const ref = useRef<HTMLButtonElement>(null);
  usarPressao(ref, true, 0.9);
  return (
    <button ref={ref} onClick={onClick} aria-label="Novo lançamento"
      className={`fixed bottom-6 right-5 z-40 h-14 w-14 rounded-full flex items-center justify-center text-white select-none ${
        nova ? "bg-[#0a84ff] shadow-[0_8px_24px_-6px_rgba(10,132,255,0.6)]" : "bg-blue-600 shadow-lg"}`}
      style={{ touchAction: "manipulation" }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
    </button>
  );
}

// ============================================================================
// PAINEL ARRASTÁVEL — detalhe do lançamento
// ============================================================================
function PainelArrastavel({ item, aoFechar, nova, reduzido }: any) {
  const painel = useRef<HTMLDivElement>(null);
  const fundo = useRef<HTMLDivElement>(null);
  const mola = useRef<ReturnType<typeof criarMola> | null>(null);
  const rastro = useRef(criarRastreador());
  const arrastando = useRef(false);
  const [montado, setMontado] = useState(false);
  const aberto = !!item;

  const altura = () => painel.current?.getBoundingClientRect().height || 400;
  const aplicar = (y: number) => {
    if (painel.current) painel.current.style.transform = `translate3d(0, ${y}px, 0)`;
    if (fundo.current) fundo.current.style.opacity = String(1 - Math.min(Math.max(y / altura(), 0), 1));
  };

  useEffect(() => { if (aberto) setMontado(true); }, [aberto]);

  useEffect(() => {
    if (!montado || !painel.current) return;
    if (!mola.current) mola.current = criarMola(altura(), aplicar);
    if (aberto) mola.current.animarPara(0, reduzido ? { damping: 1, response: 0.01 } : { damping: 0.8, response: 0.35 });
    else {
      mola.current.animarPara(altura(), reduzido ? { damping: 1, response: 0.01 } : SPRING_PADRAO);
      const t = setTimeout(() => setMontado(false), reduzido ? 60 : 450);
      return () => clearTimeout(t);
    }
  }, [aberto, montado, reduzido]);

  useEffect(() => {
    const el = painel.current;
    if (!el || !montado) return;
    let agarre = 0;
    const down = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest("[data-alca]")) return;
      try { el.setPointerCapture(e.pointerId); } catch { /* segue sem captura */ }
      arrastando.current = true;
      const atual = mola.current?.valor() ?? 0;
      mola.current?.definir(atual);
      agarre = e.clientY - atual;
      rastro.current.limpar(); rastro.current.registrar(e.clientY);
    };
    const move = (e: PointerEvent) => {
      if (!arrastando.current) return;
      let y = e.clientY - agarre;
      if (y < 0) y = -elastico(-y, altura());
      mola.current?.definir(y);
      rastro.current.registrar(e.clientY);
    };
    const up = () => {
      if (!arrastando.current) return;
      arrastando.current = false;
      const v = rastro.current.velocidade();
      const y = mola.current?.valor() ?? 0;
      if (y + projetar(v) > altura() * 0.4) { mola.current?.animarPara(altura(), { ...SPRING_PADRAO, velocidade: v }); aoFechar(); }
      else mola.current?.animarPara(0, { ...SPRING_GESTO, velocidade: v });
    };
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
    };
  }, [montado, aoFechar]);

  if (!montado) return null;
  const novoLanc = item?.novo;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ pointerEvents: aberto ? "auto" : "none" }}>
      <div ref={fundo} onClick={aoFechar} className="absolute inset-0 bg-black/35" style={{ opacity: 0, backdropFilter: "blur(2px)" }} />
      <div ref={painel}
        className={`relative w-full sm:max-w-lg ${nova ? "bg-white/85 dark:bg-[#1c1c1e]/85 rounded-t-[28px] border-t border-white/60 dark:border-white/10" : "bg-white dark:bg-gray-800 rounded-t-3xl border-t border-gray-200 dark:border-gray-700"}`}
        style={{ transform: "translate3d(0,100%,0)", willChange: "transform", touchAction: "none",
          ...(nova ? { backdropFilter: "blur(30px) saturate(180%)", WebkitBackdropFilter: "blur(30px) saturate(180%)", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" } : { boxShadow: "0 -4px 20px rgba(0,0,0,0.12)" }) }}>
        <div data-alca className="pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className={`mx-auto w-10 h-1.5 rounded-full ${nova ? "bg-black/20 dark:bg-white/25" : "bg-gray-300 dark:bg-gray-600"}`} />
        </div>
        <div className="px-6 pb-10 pt-2">
          {novoLanc ? (
            <>
              <h3 className={nova ? "text-[22px] font-semibold text-black dark:text-white" : "text-lg font-black text-gray-900 dark:text-gray-100"} style={nova ? { letterSpacing: "-0.02em" } : undefined}>Novo lançamento</h3>
              <p className={`mt-1.5 text-[15px] leading-relaxed ${nova ? "text-black/55 dark:text-white/55" : "text-sm font-bold text-gray-500"}`}>
                No app real, o formulário entraria aqui. Puxe a alça para baixo para fechar — ou arremesse.
              </p>
            </>
          ) : (
            <>
              <p className={nova ? "text-[13px] font-medium text-black/45 dark:text-white/45" : "text-[10px] font-black text-gray-500 uppercase tracking-wider"}>
                {item?.categorias?.nome || "Lançamento"}
              </p>
              <h3 className={nova ? "text-[22px] font-semibold text-black dark:text-white mt-0.5" : "text-lg font-black text-gray-900 dark:text-gray-100 mt-0.5"} style={nova ? { letterSpacing: "-0.02em" } : undefined}>
                {item?.descricao}
              </h3>
              <p className={`mt-3 ${nova ? "text-[34px] font-semibold text-black dark:text-white" : "text-3xl font-black text-blue-600"}`}
                style={{ letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                {item?.tipo === "receita" ? "+" : "−"}{brl(Number(item?.valor || 0))}
              </p>
              <div className="mt-5 space-y-0">
                {[["Data", item?.data ? new Date(item.data + "T00:00:00").toLocaleDateString("pt-BR") : "—"],
                  ["Conta", item?.conta_origem?.nome || "—"],
                  ["Autor", item?.autor_nome || "—"]].map(([k, v], i) => (
                  <div key={k as string} className={`flex items-center justify-between py-2.5 ${i === 0 ? "" : nova ? "border-t border-black/[0.06] dark:border-white/[0.06]" : "border-t border-gray-100 dark:border-gray-700"}`}>
                    <span className={nova ? "text-[15px] text-black/50 dark:text-white/50" : "text-xs font-black text-gray-500 uppercase"}>{k as string}</span>
                    <span className={nova ? "text-[15px] font-medium text-black dark:text-white" : "text-sm font-bold text-gray-900 dark:text-gray-100"}>{v as string}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
