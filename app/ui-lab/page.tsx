"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeContext";
import { criarMola, criarRastreador, projetar, elastico, prefereMenosMovimento, SPRING_PADRAO, SPRING_GESTO } from "../ui/spring";

// ============================================================================
// LABORATÓRIO DE UI — proposta da "UI Nova" ao lado da atual ("Clássica").
// Rota isolada: nenhuma tela existente é alterada. O seletor no topo é a
// prova de conceito do parâmetro que depois vai para o ThemeContext.
// ============================================================================

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const CONTAS = [
  { nome: "Itaú", sub: "Conta corrente", valor: 342.92, cor: "#f59e0b" },
  { nome: "Nubank", sub: "Conta corrente", valor: 118.81, cor: "#8b5cf6" },
  { nome: "Inter", sub: "Conta corrente", valor: 256.20, cor: "#f97316" },
  { nome: "Mercantil", sub: "Conta corrente", valor: 2371.24, cor: "#10b981" },
];

const LANCAMENTOS = [
  { desc: "Financiamento Casa 103/420", cat: "Financiamento", valor: -1732.12, dia: "12/07" },
  { desc: "Salário", cat: "Renda", valor: 7602.49, dia: "05/07" },
  { desc: "Mercado do mês", cat: "Mercado", valor: -612.40, dia: "08/07" },
  { desc: "Celular novo (3/10)", cat: "Telefonia", valor: -434.00, dia: "22/07" },
];

export default function UILabPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const [versao, setVersao] = useState<"classica" | "nova">("nova");
  const [sheetAberto, setSheetAberto] = useState(false);
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    setReduzido(prefereMenosMovimento());
    const salvo = localStorage.getItem("ui_versao");
    if (salvo === "classica" || salvo === "nova") setVersao(salvo);
  }, []);

  const trocarVersao = (v: "classica" | "nova") => { setVersao(v); localStorage.setItem("ui_versao", v); };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${versao === "nova" ? "bg-[#f2f2f7] dark:bg-[#000000]" : "bg-gray-50 dark:bg-gray-900"}`}>
      {/* Fundo com brilho — só na versão nova, para o material translúcido ter o que filtrar */}
      {versao === "nova" && (
        <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-30 dark:opacity-25" style={{ background: "radial-gradient(circle, #3b82f6, transparent 70%)" }} />
          <div className="absolute top-40 -right-24 w-[26rem] h-[26rem] rounded-full blur-3xl opacity-25 dark:opacity-20" style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)" }} />
        </div>
      )}

      <Cabecalho versao={versao} isDarkMode={isDarkMode} toggleTheme={toggleTheme} onVoltar={() => router.push("/dashboard")} />

      <main className="relative px-5 pb-28 max-w-2xl mx-auto pt-6 space-y-8">
        <SeletorVersao versao={versao} onTrocar={trocarVersao} reduzido={reduzido} />

        <Hero versao={versao} />
        <ListaContas versao={versao} />
        <ListaLancamentos versao={versao} />

        <div>
          <Rotulo versao={versao}>Gesto contínuo</Rotulo>
          <BotaoPrimario versao={versao} onClick={() => setSheetAberto(true)}>
            Abrir painel arrastável
          </BotaoPrimario>
          <p className={`mt-2 text-[13px] leading-relaxed ${versao === "nova" ? "text-black/50 dark:text-white/50" : "text-gray-500 dark:text-gray-400"}`}>
            Arraste devagar (ele cola no dedo), arremesse (ele projeta onde vai parar) e tente
            agarrá-lo no meio do movimento — ele obedece na hora, sem terminar a animação antes.
          </p>
        </div>

        <NotasDeDesign versao={versao} />
      </main>

      <PainelArrastavel aberto={sheetAberto} aoFechar={() => setSheetAberto(false)} versao={versao} reduzido={reduzido} />
    </div>
  );
}

// ============================================================================
// CABEÇALHO — material translúcido com o conteúdo passando por baixo
// ============================================================================
function Cabecalho({ versao, isDarkMode, toggleTheme, onVoltar }: any) {
  const nova = versao === "nova";
  return (
    <header
      className={`sticky top-0 z-30 px-5 py-3 flex items-center justify-between ${
        nova
          ? "bg-white/60 dark:bg-[#1c1c1e]/60 border-b border-white/40 dark:border-white/10"
          : "bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"
      }`}
      style={nova ? { backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)" } : undefined}
    >
      <div className="flex items-center gap-2.5">
        <BotaoIcone versao={versao} onClick={onVoltar} rotulo="Voltar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </BotaoIcone>
        <h1
          className={nova ? "text-[19px] font-semibold text-black dark:text-white" : "text-xl font-black text-blue-600 dark:text-blue-400"}
          style={nova ? { letterSpacing: "-0.02em" } : undefined}
        >
          Laboratório de UI
        </h1>
      </div>
      <BotaoIcone versao={versao} onClick={toggleTheme} rotulo="Alternar tema">
        <span className="text-sm">{isDarkMode ? "☀️" : "🌙"}</span>
      </BotaoIcone>
    </header>
  );
}

function BotaoIcone({ versao, onClick, children, rotulo }: any) {
  const nova = versao === "nova";
  const ref = useRef<HTMLButtonElement>(null);
  usarPressao(ref, nova);
  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={rotulo}
      className={`h-9 w-9 rounded-full flex items-center justify-center ${
        nova
          ? "bg-black/[0.06] dark:bg-white/10 text-black dark:text-white"
          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
      }`}
      style={{ touchAction: "manipulation" }}
    >
      {children}
    </button>
  );
}

// Resposta no pointer-DOWN (não no clique): é o que separa "vivo" de "morto".
function usarPressao(ref: React.RefObject<HTMLElement | null>, ativo = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !ativo) return;
    const molaRef = criarMola(1, (v) => { el.style.transform = `scale(${v})`; });
    const down = () => molaRef.animarPara(0.94, { damping: 1.0, response: 0.12 });
    const up = () => molaRef.animarPara(1, SPRING_GESTO);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerleave", up);
      molaRef.parar();
      el.style.transform = "";
    };
  }, [ref, ativo]);
}

// ============================================================================
// SELETOR DE VERSÃO — o indicador é uma mola, não uma transição CSS
// ============================================================================
function SeletorVersao({ versao, onTrocar, reduzido }: any) {
  const nova = versao === "nova";
  const indicador = useRef<HTMLDivElement>(null);
  const mola = useRef<ReturnType<typeof criarMola> | null>(null);

  useEffect(() => {
    if (!indicador.current) return;
    if (!mola.current) mola.current = criarMola(versao === "nova" ? 1 : 0, (v) => {
      if (indicador.current) indicador.current.style.transform = `translateX(${v * 100}%)`;
    });
    mola.current.animarPara(versao === "nova" ? 1 : 0, reduzido ? { damping: 1, response: 0.01 } : SPRING_PADRAO);
  }, [versao, reduzido]);

  return (
    <div>
      <Rotulo versao={versao}>Versão da interface</Rotulo>
      <div
        className={`relative flex p-1 rounded-2xl ${nova ? "bg-black/[0.05] dark:bg-white/[0.08]" : "bg-gray-200 dark:bg-gray-800"}`}
        style={nova ? { backdropFilter: "blur(10px)" } : undefined}
      >
        <div className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] pointer-events-none" ref={indicador}>
          <div className={`h-full w-full rounded-xl ${nova ? "bg-white dark:bg-[#2c2c2e] shadow-[0_2px_8px_rgba(0,0,0,0.12)]" : "bg-white dark:bg-gray-700 shadow-sm"}`} />
        </div>
        {(["classica", "nova"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onTrocar(v)}
            className={`relative flex-1 py-2 text-[14px] rounded-xl transition-colors duration-200 select-none ${
              versao === v
                ? nova ? "text-black dark:text-white font-semibold" : "text-blue-700 dark:text-blue-400 font-black"
                : nova ? "text-black/45 dark:text-white/45 font-medium" : "text-gray-500 dark:text-gray-400 font-bold"
            }`}
            style={{ touchAction: "manipulation" }}
          >
            {v === "classica" ? "Clássica" : "Nova"}
          </button>
        ))}
      </div>
      <p className={`mt-2 text-[13px] ${nova ? "text-black/50 dark:text-white/50" : "text-gray-500 dark:text-gray-400"}`}>
        A escolha fica salva no aparelho — é a mesma chave que viraria o parâmetro do app.
      </p>
    </div>
  );
}

// ============================================================================
// PEÇAS DE CONTEÚDO — mesmas informações nas duas versões
// ============================================================================
function Rotulo({ versao, children }: any) {
  const nova = versao === "nova";
  return (
    <h2
      className={`mb-2.5 ${nova ? "text-[13px] font-semibold text-black/45 dark:text-white/45" : "text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest"}`}
      style={nova ? { letterSpacing: "0.01em" } : undefined}
    >
      {children}
    </h2>
  );
}

function Cartao({ versao, children, className = "" }: any) {
  const nova = versao === "nova";
  return (
    <div
      className={`${
        nova
          ? "bg-white/70 dark:bg-[#1c1c1e]/70 border border-white/50 dark:border-white/[0.08] rounded-[22px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]"
          : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm"
      } ${className}`}
      style={nova ? { backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)" } : undefined}
    >
      {children}
    </div>
  );
}

function Hero({ versao }: any) {
  const nova = versao === "nova";
  return (
    <div>
      <Rotulo versao={versao}>Patrimônio</Rotulo>
      <Cartao versao={versao} className="p-6">
        <p className={nova ? "text-[13px] font-medium text-black/45 dark:text-white/45" : "text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest"}>
          Total acumulado
        </p>
        <p
          className={`mt-1 ${nova ? "text-black dark:text-white" : "text-blue-600 dark:text-blue-400"}`}
          style={
            nova
              ? { fontSize: "clamp(2.25rem, 9vw, 3.25rem)", fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", fontOpticalSizing: "auto" }
              : { fontSize: "2.5rem", fontWeight: 900, lineHeight: 1.1 }
          }
        >
          {brl(7355.36)}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-semibold ${nova ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"}`}>
            ↑ {brl(75.90)}
          </span>
          <span className={`text-[13px] ${nova ? "text-black/45 dark:text-white/45" : "text-gray-500 dark:text-gray-400 font-bold"}`}>rendeu no total</span>
        </div>
      </Cartao>
    </div>
  );
}

function ListaContas({ versao }: any) {
  const nova = versao === "nova";
  return (
    <div>
      <Rotulo versao={versao}>Contas</Rotulo>
      {nova ? (
        // Lista agrupada: um material só, linhas divididas por dentro
        <Cartao versao={versao} className="overflow-hidden">
          {CONTAS.map((c, i) => (
            <LinhaConta key={c.nome} conta={c} primeira={i === 0} nova />
          ))}
        </Cartao>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {CONTAS.map((c) => (
            <div key={c.nome} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm p-5">
              <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{c.nome}</p>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-2">{brl(c.valor)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LinhaConta({ conta, primeira }: any) {
  const ref = useRef<HTMLDivElement>(null);
  usarPressao(ref, true);
  return (
    <div ref={ref} className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none ${primeira ? "" : "border-t border-black/[0.06] dark:border-white/[0.06]"}`} style={{ touchAction: "manipulation" }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0" style={{ background: conta.cor }}>
        {conta.nome.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-black dark:text-white truncate" style={{ letterSpacing: "-0.01em" }}>{conta.nome}</p>
        <p className="text-[13px] text-black/45 dark:text-white/45 truncate">{conta.sub}</p>
      </div>
      <p className="text-[15px] font-semibold text-black dark:text-white shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>{brl(conta.valor)}</p>
    </div>
  );
}

function ListaLancamentos({ versao }: any) {
  const nova = versao === "nova";
  return (
    <div>
      <Rotulo versao={versao}>Últimos lançamentos</Rotulo>
      <Cartao versao={versao} className={nova ? "overflow-hidden" : "p-4 space-y-3"}>
        {LANCAMENTOS.map((l, i) => (
          <div
            key={l.desc}
            className={
              nova
                ? `flex items-center gap-3 px-4 py-3.5 ${i === 0 ? "" : "border-t border-black/[0.06] dark:border-white/[0.06]"}`
                : "flex items-center gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-700"
            }
          >
            <div className={`min-w-0 flex-1`}>
              <p className={nova ? "text-[15px] font-medium text-black dark:text-white truncate" : "text-sm font-bold text-gray-900 dark:text-gray-100 truncate"}>{l.desc}</p>
              <p className={nova ? "text-[13px] text-black/45 dark:text-white/45" : "text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider"}>{l.cat} · {l.dia}</p>
            </div>
            <p
              className={`shrink-0 ${nova ? "text-[15px] font-semibold" : "text-sm font-black"} ${
                l.valor > 0 ? "text-emerald-600 dark:text-emerald-400" : nova ? "text-black dark:text-white" : "text-gray-900 dark:text-gray-100"
              }`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {l.valor > 0 ? "+" : "−"}{brl(Math.abs(l.valor)).replace("R$", "R$")}
            </p>
          </div>
        ))}
      </Cartao>
    </div>
  );
}

function BotaoPrimario({ versao, children, onClick }: any) {
  const nova = versao === "nova";
  const ref = useRef<HTMLButtonElement>(null);
  usarPressao(ref, true);
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`w-full py-3.5 rounded-2xl text-white select-none ${nova ? "text-[16px] font-semibold bg-[#0a84ff] shadow-[0_4px_16px_-4px_rgba(10,132,255,0.5)]" : "text-sm font-black uppercase tracking-wide bg-blue-600"}`}
      style={{ touchAction: "manipulation", letterSpacing: nova ? "-0.01em" : undefined }}
    >
      {children}
    </button>
  );
}

// ============================================================================
// PAINEL ARRASTÁVEL — a peça que mostra a diferença de verdade
// 1:1 com o dedo · elástico no topo · projeção do arremesso · entrega de
// velocidade para a mola · interrompível a qualquer instante
// ============================================================================
function PainelArrastavel({ aberto, aoFechar, versao, reduzido }: any) {
  const nova = versao === "nova";
  const painel = useRef<HTMLDivElement>(null);
  const fundo = useRef<HTMLDivElement>(null);
  const mola = useRef<ReturnType<typeof criarMola> | null>(null);
  const rastro = useRef(criarRastreador());
  const arrastando = useRef(false);
  const [montado, setMontado] = useState(false);

  const altura = () => painel.current?.getBoundingClientRect().height || 400;

  // y = 0 (aberto) … altura (fechado)
  const aplicar = (y: number) => {
    if (painel.current) painel.current.style.transform = `translate3d(0, ${y}px, 0)`;
    if (fundo.current) {
      const p = 1 - Math.min(Math.max(y / altura(), 0), 1);
      fundo.current.style.opacity = String(p);
    }
  };

  useEffect(() => {
    if (aberto) setMontado(true);
  }, [aberto]);

  useEffect(() => {
    if (!montado || !painel.current) return;
    if (!mola.current) mola.current = criarMola(altura(), aplicar);

    if (aberto) {
      mola.current.animarPara(0, reduzido ? { damping: 1, response: 0.01 } : { damping: 0.8, response: 0.35 });
    } else {
      mola.current.animarPara(altura(), reduzido ? { damping: 1, response: 0.01 } : SPRING_PADRAO, );
      const t = setTimeout(() => setMontado(false), reduzido ? 60 : 450);
      return () => clearTimeout(t);
    }
  }, [aberto, montado, reduzido]);

  useEffect(() => {
    const el = painel.current;
    if (!el || !montado) return;

    let offsetAgarre = 0;

    const down = (e: PointerEvent) => {
      // Só a alça arrasta — assim o conteúdo continua rolável
      if (!(e.target as HTMLElement).closest("[data-alca]")) return;
      // capture pode falhar (ponteiro já liberado, etc.); se estourar aqui o
      // arrasto inteiro morre — o rastreio funciona mesmo sem ele.
      try { el.setPointerCapture(e.pointerId); } catch { /* segue sem captura */ }
      arrastando.current = true;
      // Interrompe a mola no valor que está NA TELA (sem salto)
      const atual = mola.current?.valor() ?? 0;
      mola.current?.definir(atual);
      offsetAgarre = e.clientY - atual; // respeita onde ele pegou
      rastro.current.limpar();
      rastro.current.registrar(e.clientY);
    };

    const move = (e: PointerEvent) => {
      if (!arrastando.current) return;
      let y = e.clientY - offsetAgarre;
      // Passar do topo resiste progressivamente, em vez de travar seco
      if (y < 0) y = -elastico(-y, altura());
      mola.current?.definir(y);
      rastro.current.registrar(e.clientY);
    };

    const up = (e: PointerEvent) => {
      if (!arrastando.current) return;
      arrastando.current = false;
      const v = rastro.current.velocidade();               // px/s do dedo
      const y = mola.current?.valor() ?? 0;
      const destinoProjetado = y + projetar(v);            // onde ia parar sozinho
      // Decide pelo destino projetado, não pelo ponto de soltura
      const fechar = destinoProjetado > altura() * 0.4;
      if (fechar) {
        mola.current?.animarPara(altura(), { ...SPRING_PADRAO, velocidade: v, aoTerminar: () => setMontado(false) });
        aoFechar();
      } else {
        // devolve ao topo carregando a velocidade do gesto (sem emenda visível)
        mola.current?.animarPara(0, { ...SPRING_GESTO, velocidade: v });
      }
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [montado, aoFechar]);

  if (!montado) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ pointerEvents: aberto ? "auto" : "none" }}>
      <div ref={fundo} onClick={aoFechar} className="absolute inset-0 bg-black/35" style={{ opacity: 0, backdropFilter: "blur(2px)" }} />
      <div
        ref={painel}
        className={`relative w-full sm:max-w-lg ${
          nova
            ? "bg-white/85 dark:bg-[#1c1c1e]/85 rounded-t-[28px] border-t border-white/60 dark:border-white/10"
            : "bg-white dark:bg-gray-800 rounded-t-3xl border-t border-gray-200 dark:border-gray-700"
        }`}
        style={{
          transform: "translate3d(0, 100%, 0)",
          willChange: "transform",
          touchAction: "none",
          ...(nova ? { backdropFilter: "blur(30px) saturate(180%)", WebkitBackdropFilter: "blur(30px) saturate(180%)", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" } : { boxShadow: "0 -4px 20px rgba(0,0,0,0.12)" }),
        }}
      >
        <div data-alca className="pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className={`mx-auto w-10 h-1.5 rounded-full ${nova ? "bg-black/20 dark:bg-white/25" : "bg-gray-300 dark:bg-gray-600"}`} />
        </div>
        <div className="px-6 pb-8 pt-2">
          <h3 className={nova ? "text-[22px] font-semibold text-black dark:text-white" : "text-lg font-black text-gray-900 dark:text-gray-100"} style={nova ? { letterSpacing: "-0.02em" } : undefined}>
            Painel arrastável
          </h3>
          <p className={`mt-1.5 text-[15px] leading-relaxed ${nova ? "text-black/55 dark:text-white/55" : "text-sm font-bold text-gray-500 dark:text-gray-400"}`}>
            Puxe pela alça. Ele acompanha o dedo exatamente, resiste ao passar do topo,
            e ao soltar decide pelo <b>destino projetado</b> do arremesso — não pela posição.
            A animação sai na velocidade em que seu dedo estava.
          </p>
          <div className={`mt-5 grid grid-cols-3 gap-3 ${nova ? "" : ""}`}>
            {[["Entradas", 10460.23], ["Saídas", 8970.47], ["Sobrou", 1489.76]].map(([k, v]) => (
              <div key={k as string} className={nova ? "rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] p-3" : "rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-3"}>
                <p className={nova ? "text-[12px] text-black/45 dark:text-white/45 font-medium" : "text-[10px] font-black text-gray-400 uppercase"}>{k as string}</p>
                <p className={nova ? "text-[15px] font-semibold text-black dark:text-white mt-0.5" : "text-sm font-black text-gray-900 dark:text-gray-100 mt-0.5"} style={{ fontVariantNumeric: "tabular-nums" }}>{brl(v as number)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NOTAS — o que cada detalhe demonstra
// ============================================================================
function NotasDeDesign({ versao }: any) {
  const nova = versao === "nova";
  const itens = [
    ["Resposta no toque", "O realce sai no pointer-down, não no clique. Toque em qualquer conta ou botão e compare com a versão clássica."],
    ["Molas, não transições", "Toda animação parte do valor que está na tela e absorve a velocidade do gesto — por isso pode ser agarrada e revertida no meio."],
    ["Material translúcido", "Cabeçalho, cartões e painel são camadas que filtram o que passa por baixo, em vez de faixas opacas. Dá hierarquia sem roubar atenção."],
    ["Tipografia por tamanho", "Números grandes usam tracking negativo e peso 600; textos pequenos ficam neutros. Valores em tabular-nums para não dançar."],
    ["Listas agrupadas", "Um material só com linhas divididas por dentro, no lugar de vários quadradinhos soltos — menos ruído, mesma informação."],
    ["Movimento reduzido", "Com 'reduzir movimento' ligado no sistema, as molas viram trocas quase instantâneas, sem perder o retorno visual."],
  ];
  return (
    <div>
      <Rotulo versao={versao}>O que mudou, e por quê</Rotulo>
      <Cartao versao={versao} className="overflow-hidden">
        {itens.map(([t, d], i) => (
          <div key={t} className={`px-4 py-3.5 ${i === 0 ? "" : nova ? "border-t border-black/[0.06] dark:border-white/[0.06]" : "border-t border-gray-100 dark:border-gray-700"}`}>
            <p className={nova ? "text-[15px] font-semibold text-black dark:text-white" : "text-sm font-black text-gray-900 dark:text-gray-100"} style={nova ? { letterSpacing: "-0.01em" } : undefined}>{t}</p>
            <p className={nova ? "text-[13px] text-black/50 dark:text-white/50 leading-relaxed mt-0.5" : "text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 leading-relaxed"}>{d}</p>
          </div>
        ))}
      </Cartao>
    </div>
  );
}
