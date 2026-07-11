"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeContext";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function GraficoEvolucao({ dados }: { dados: any[] }) {
  if (dados.length === 0) {
    return <div className="text-center py-8 text-sm font-bold text-gray-400 dark:text-gray-500">Sem valores registrados neste período.</div>;
  }
  const valores = dados.map((d) => Number(d.valor));
  const max = Math.max(...valores, 0.01);
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const w = 600, h = 160, padding = 24;
  const barW = (w - padding * 2) / dados.length;
  const escala = (v: number) => (v / max) * (h - padding * 2);
  const yMedia = h - padding - escala(media);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40" preserveAspectRatio="none">
      <line x1={padding} y1={yMedia} x2={w - padding} y2={yMedia} strokeDasharray="4 3" strokeWidth="1" className="stroke-blue-400 dark:stroke-blue-500" />
      {dados.map((d, i) => {
        const barH = escala(Number(d.valor));
        const x = padding + i * barW + barW * 0.2;
        const y = h - padding - barH;
        return (
          <g key={d.id}>
            <rect x={x} y={y} width={barW * 0.6} height={Math.max(barH, 1)} rx="2" className="fill-blue-500 dark:fill-blue-400" />
            <title>{`${String(d.competencia_mes).padStart(2, "0")}/${d.competencia_ano}: R$ ${Number(d.valor).toFixed(2)}`}</title>
            {dados.length <= 12 && (
              <text x={x + barW * 0.3} y={h - 6} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "8px", fontWeight: 700 }}>
                {MESES[d.competencia_mes - 1]}/{String(d.competencia_ano).slice(-2)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function ContasFixasPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, isWaving } = useTheme();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [contasFixas, setContasFixas] = useState<any[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [transacoesDespesa, setTransacoesDespesa] = useState<any[]>([]);
  const [cartoesCredito, setCartoesCredito] = useState<any[]>([]);
  const [transferenciasCartao, setTransferenciasCartao] = useState<any[]>([]);

  const [aba, setAba] = useState<"ativas" | "arquivadas">("ativas");
  const [cardExpandidoId, setCardExpandidoId] = useState<string | null>(null);
  const [periodoPorConta, setPeriodoPorConta] = useState<Record<string, "ano" | "trimestre" | "semestre" | "tudo">>({});

  // ==========================================
  // DYNAMIC ISLAND 2.0 (LIQUID GLASS + BALLOON)
  // ==========================================
  const [island, setIsland] = useState({ show: false, isClosing: false, message: "", type: "info", icon: "✨" });
  const islandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const islandCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showIsland = (message: string, type: "success" | "error" | "info" = "info", icon: string = "✨") => {
    if (islandTimeoutRef.current) clearTimeout(islandTimeoutRef.current);
    if (islandCloseTimeoutRef.current) clearTimeout(islandCloseTimeoutRef.current);
    setIsland({ show: true, isClosing: false, message, type, icon });
    islandTimeoutRef.current = setTimeout(() => {
      setIsland((prev) => ({ ...prev, isClosing: true }));
      islandCloseTimeoutRef.current = setTimeout(() => {
        setIsland((prev) => ({ ...prev, show: false, isClosing: false }));
      }, 400);
    }, 3600);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isModalContaOpen, setIsModalContaOpen] = useState(false);
  const [contaEditandoId, setContaEditandoId] = useState<string | null>(null);
  const [nomeConta, setNomeConta] = useState("");
  const [categoriaIdConta, setCategoriaIdConta] = useState("");
  const [modoConta, setModoConta] = useState<"unico" | "agregado" | "cartao">("unico");

  const [isModalPendenciaOpen, setIsModalPendenciaOpen] = useState(false);
  const [contaFixaAlvo, setContaFixaAlvo] = useState<any | null>(null);
  const [mesPendencia, setMesPendencia] = useState(1);
  const [anoPendencia, setAnoPendencia] = useState(2026);
  const [statusPendencia, setStatusPendencia] = useState<"pendente" | "pago">("pendente");
  const [valorPendencia, setValorPendencia] = useState("");
  const [observacaoPendencia, setObservacaoPendencia] = useState("");
  const [ocorrenciaEditandoId, setOcorrenciaEditandoId] = useState<string | null>(null);
  const [ocorrenciaEditandoVinculo, setOcorrenciaEditandoVinculo] = useState<any | null>(null);

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  const getDataLocalHoje = () => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
  };

  const carregarDados = async () => {
    setLoading(true);
    const { data: contasData } = await supabase.from("contas_fixas").select("*, categorias(nome, tipo)").order("arquivada", { ascending: true }).order("nome", { ascending: true });
    if (contasData) setContasFixas(contasData);
    const { data: ocsData } = await supabase.from("contas_fixas_ocorrencias").select("*").order("competencia_ano", { ascending: true }).order("competencia_mes", { ascending: true });
    if (ocsData) setOcorrencias(ocsData);
    const { data: catsData } = await supabase.from("categorias").select("*").eq("tipo", "despesa").order("nome", { ascending: true });
    if (catsData) setCategorias(catsData);
    const { data: transData } = await supabase.from("transacoes").select("categoria_id, valor, data").eq("tipo", "despesa");
    if (transData) setTransacoesDespesa(transData);
    const { data: cartoesData } = await supabase.from("contas").select("id, nome, autor_nome, ativo").eq("tipo", "credito");
    if (cartoesData) setCartoesCredito(cartoesData);
    const { data: transfData } = await supabase.from("transacoes").select("conta_destino_id, valor, data").eq("tipo", "transferencia").not("conta_destino_id", "is", null);
    if (transfData) setTransferenciasCartao(transfData);
    setLoading(false);
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");
        setUsername(user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário");
        setFullName(user.user_metadata?.full_name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
        carregarDados();
      } else {
        router.push("/login");
      }
    };
    loadInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Ao trocar o mês/ano dentro do modal, procura se já existe uma ocorrência
  // para aquela competência e pré-carrega os campos (vira modo edição).
  useEffect(() => {
    if (!isModalPendenciaOpen || !contaFixaAlvo) return;
    const existente = ocorrencias.find((o) => o.conta_fixa_id === contaFixaAlvo.id && o.competencia_ano === anoPendencia && o.competencia_mes === mesPendencia);
    if (existente) {
      setOcorrenciaEditandoId(existente.id);
      setStatusPendencia(existente.status);
      setValorPendencia(existente.valor != null ? String(existente.valor) : "");
      setObservacaoPendencia(existente.observacao || "");
      setOcorrenciaEditandoVinculo(existente.transacao_id ? existente : null);
    } else {
      setOcorrenciaEditandoId(null);
      setStatusPendencia("pendente");
      setValorPendencia("");
      setObservacaoPendencia("");
      setOcorrenciaEditandoVinculo(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalPendenciaOpen, mesPendencia, anoPendencia, contaFixaAlvo]);

  const abrirModalNovaConta = () => {
    setContaEditandoId(null); setNomeConta(""); setCategoriaIdConta(categorias[0]?.id || ""); setModoConta("unico");
    setIsModalContaOpen(true);
  };

  const abrirModalEditarConta = (conta: any) => {
    setContaEditandoId(conta.id); setNomeConta(conta.nome); setCategoriaIdConta(conta.categoria_id); setModoConta(conta.modo || "unico");
    setIsModalContaOpen(true);
  };

  const handleSalvarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modoConta !== "cartao" && !categoriaIdConta) { showIsland("Selecione uma categoria.", "error", "🛑"); return; }
    setIsSubmitting(true);
    const categoriaFinal = modoConta === "cartao" ? null : categoriaIdConta;
    let error;
    if (contaEditandoId) {
      ({ error } = await supabase.from("contas_fixas").update({ nome: nomeConta, categoria_id: categoriaFinal, modo: modoConta }).eq("id", contaEditandoId));
    } else {
      ({ error } = await supabase.from("contas_fixas").insert([{ nome: nomeConta, categoria_id: categoriaFinal, modo: modoConta, user_id: userId, autor_nome: username || "Usuário" }]));
    }
    setIsSubmitting(false);
    if (error) showIsland("Erro ao salvar: " + error.message, "error", "🛑");
    else { showIsland(contaEditandoId ? "Conta atualizada!" : "Conta fixa cadastrada!", "success", contaEditandoId ? "✏️" : "🎉"); setIsModalContaOpen(false); carregarDados(); }
  };

  const toggleArquivar = async (conta: any) => {
    const arquivar = !conta.arquivada;
    if (!confirm(arquivar ? `Arquivar "${conta.nome}"? Ela vai para a aba de arquivadas.` : `Desarquivar "${conta.nome}"?`)) return;
    const { error } = await supabase.from("contas_fixas").update({ arquivada: arquivar, arquivada_em: arquivar ? new Date().toISOString() : null }).eq("id", conta.id);
    if (error) showIsland("Erro: " + error.message, "error", "🛑");
    else { showIsland(arquivar ? "Conta arquivada." : "Conta reativada!", "success", arquivar ? "🗄️" : "♻️"); carregarDados(); }
  };

  const abrirModalPendencia = (conta: any) => {
    setContaFixaAlvo(conta); setMesPendencia(mesAtual); setAnoPendencia(anoAtual);
    setIsModalPendenciaOpen(true);
  };

  const handleSalvarPendencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (statusPendencia === "pago" && !valorPendencia) { showIsland("Informe o valor pago.", "error", "🛑"); return; }
    setIsSubmitting(true);
    const payload: any = {
      status: statusPendencia,
      valor: valorPendencia ? parseFloat(valorPendencia.replace(",", ".")) : null,
      observacao: observacaoPendencia || null,
      data_pagamento: statusPendencia === "pago" ? getDataLocalHoje() : null,
    };
    let error;
    if (ocorrenciaEditandoId) {
      ({ error } = await supabase.from("contas_fixas_ocorrencias").update(payload).eq("id", ocorrenciaEditandoId));
    } else {
      ({ error } = await supabase.from("contas_fixas_ocorrencias").insert([{ conta_fixa_id: contaFixaAlvo.id, competencia_ano: anoPendencia, competencia_mes: mesPendencia, user_id: userId, autor_nome: username || "Usuário", ...payload }]));
    }
    setIsSubmitting(false);
    if (error) {
      if (error.code === "23505") showIsland("Já existe uma ocorrência para esse mês nessa conta.", "error", "🛑");
      else showIsland("Erro: " + error.message, "error", "🛑");
    } else { showIsland("Salvo com sucesso!", "success", "🎉"); setIsModalPendenciaOpen(false); carregarDados(); }
  };

  const handleExcluirOcorrencia = async () => {
    if (!ocorrenciaEditandoId) return;
    if (!confirm("Excluir o registro deste mês?")) return;
    setIsSubmitting(true);
    const { error } = await supabase.from("contas_fixas_ocorrencias").delete().eq("id", ocorrenciaEditandoId);
    setIsSubmitting(false);
    if (error) showIsland("Erro: " + error.message, "error", "🛑");
    else { showIsland("Registro excluído.", "success", "🗑️"); setIsModalPendenciaOpen(false); carregarDados(); }
  };

  const ocorrenciaDoMes = (contaId: string) => ocorrencias.find((o) => o.conta_fixa_id === contaId && o.competencia_ano === anoAtual && o.competencia_mes === mesAtual);

  // Agrupa os lançamentos de despesa da categoria por mês de competência (modo "agregado").
  const agregarPorMes = (categoriaId: string) => {
    const mapa: Record<string, number> = {};
    transacoesDespesa.filter((t) => t.categoria_id === categoriaId).forEach((t) => {
      const [ano, mes] = t.data.split("-").map(Number);
      const chave = `${ano}-${mes}`;
      mapa[chave] = (mapa[chave] || 0) + Number(t.valor);
    });
    return Object.entries(mapa)
      .map(([chave, valor]) => {
        const [ano, mes] = chave.split("-").map(Number);
        return { id: chave, competencia_ano: ano, competencia_mes: mes, valor };
      })
      .sort((a, b) => a.competencia_ano - b.competencia_ano || a.competencia_mes - b.competencia_mes);
  };

  // Agrupa os pagamentos de fatura (transferências com destino num cartão de
  // crédito) por mês. Sem cartaoId, soma todos os cartões (card "guarda-chuva").
  const agregarPagamentosCartao = (cartaoId?: string) => {
    const idsValidos = cartaoId ? [cartaoId] : cartoesCredito.map((c) => c.id);
    const mapa: Record<string, number> = {};
    transferenciasCartao.filter((t) => idsValidos.includes(t.conta_destino_id)).forEach((t) => {
      const [ano, mes] = t.data.split("-").map(Number);
      const chave = `${ano}-${mes}`;
      mapa[chave] = (mapa[chave] || 0) + Number(t.valor);
    });
    return Object.entries(mapa)
      .map(([chave, valor]) => {
        const [ano, mes] = chave.split("-").map(Number);
        return { id: chave, competencia_ano: ano, competencia_mes: mes, valor };
      })
      .sort((a, b) => a.competencia_ano - b.competencia_ano || a.competencia_mes - b.competencia_mes);
  };

  const dadosMensais = (conta: any) => {
    if (conta.modo === "agregado") return agregarPorMes(conta.categoria_id);
    if (conta.modo === "cartao") return agregarPagamentosCartao();
    return ocorrencias.filter((o) => o.conta_fixa_id === conta.id && o.status === "pago" && o.valor != null);
  };

  const aplicarFiltroPeriodo = (dados: any[], contaId: string) => {
    const periodo = periodoPorConta[contaId] || "ano";
    if (periodo === "tudo") return dados;
    if (periodo === "ano") return dados.filter((d) => d.competencia_ano === anoAtual);
    if (periodo === "trimestre") {
      const trimAtual = Math.floor((mesAtual - 1) / 3);
      return dados.filter((d) => d.competencia_ano === anoAtual && Math.floor((d.competencia_mes - 1) / 3) === trimAtual);
    }
    const semAtual = mesAtual <= 6 ? 1 : 2;
    return dados.filter((d) => d.competencia_ano === anoAtual && (d.competencia_mes <= 6 ? 1 : 2) === semAtual);
  };

  const calcularEstatisticas = (dados: any[]) => {
    if (dados.length === 0) return null;
    const media = dados.reduce((acc, d) => acc + Number(d.valor), 0) / dados.length;
    let maior = dados[0], menor = dados[0];
    dados.forEach((d) => {
      if (Number(d.valor) - media > Number(maior.valor) - media) maior = d;
      if (Number(d.valor) - media < Number(menor.valor) - media) menor = d;
    });
    return { media, maior, menor };
  };

  const initialLetterMenu = username ? username.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";
  const contasFiltradas = contasFixas.filter((c) => c.arquivada === (aba === "arquivadas"));

  return (
    <>
      <style>{`
        @keyframes balloonInflate {
          0% { transform: translateY(-50px) scale(0.3); opacity: 0; filter: blur(10px); }
          60% { transform: translateY(5px) scale(1.05); opacity: 1; filter: blur(0px); }
          100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0px); }
        }
        @keyframes balloonPop {
          0% { transform: scale(1); opacity: 1; filter: blur(0px); }
          40% { transform: scale(1.15); opacity: 0.8; filter: blur(2px); }
          100% { transform: scale(0); opacity: 0; filter: blur(10px); }
        }
        .animate-balloon-inflate { animation: balloonInflate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-balloon-pop { animation: balloonPop 0.4s cubic-bezier(0.36, -0.24, 0.86, 1.3) forwards; }

        @keyframes islandShake {
          0%, 100% { transform: translateX(0); }
          25%, 75% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
        }
        @keyframes islandExplode {
          0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
          50% { transform: scale(1.5); opacity: 0.8; box-shadow: 0 0 10px 5px rgba(255,255,255,0); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }

        @keyframes macDockWave {
          0% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-16px) scale(1.03); }
          70% { transform: translateY(4px) scale(0.98); }
          100% { transform: translateY(0) scale(1); }
        }
        .mac-dock-item { will-change: transform; }
        .mac-dock-animate { animation: macDockWave 0.6s cubic-bezier(0.25, 1, 0.5, 1) both; }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-10 transition-colors duration-300 relative">

        {island.show && (
          <div className="fixed top-6 left-0 w-full z-[100] flex justify-center pointer-events-none">
            <div className={`pointer-events-auto px-5 py-3 rounded-full backdrop-blur-3xl border flex items-center justify-center gap-3 w-auto min-w-[250px] max-w-[90%] transition-colors duration-300 ${island.isClosing ? "animate-balloon-pop" : "animate-balloon-inflate"} ${
              island.type === "error" ? "bg-white/70 dark:bg-black/60 border-red-200 dark:border-red-900/50 shadow-[0_8px_32px_rgba(239,68,68,0.25)] text-red-800 dark:text-red-300" :
              island.type === "success" ? "bg-white/70 dark:bg-black/60 border-emerald-200 dark:border-emerald-900/50 shadow-[0_8px_32px_rgba(16,185,129,0.25)] text-emerald-800 dark:text-emerald-300" :
              "bg-white/70 dark:bg-black/60 border-blue-200 dark:border-blue-900/50 shadow-[0_8px_32px_rgba(59,130,246,0.25)] text-blue-800 dark:text-blue-300"
            }`}>
              <span className={`text-xl shrink-0 drop-shadow-md ${island.type === "error" ? "animate-[islandShake_0.5s_ease-in-out]" : island.type === "success" ? "animate-[islandExplode_0.6s_ease-out_forwards]" : ""}`}>{island.icon}</span>
              <span className="text-sm font-black tracking-tight whitespace-nowrap">{island.message}</span>
            </div>
          </div>
        )}

        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center relative z-10 transition-colors">
          <h1 className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>
            Contas Fixas
          </h1>
          <div className="flex items-center">
            <button onClick={toggleTheme} className="relative inline-flex items-center h-7 w-14 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors mr-4 focus:outline-none">
              <span className="absolute left-2 text-[10px]">🌙</span><span className="absolute right-2 text-[10px]">☀️</span>
              <span className={`inline-block w-5 h-5 transform rounded-full bg-white shadow-sm transition-transform z-10 ${isDarkMode ? "translate-x-8" : "translate-x-1"}`} />
            </button>
            <div className="flex flex-col items-end mr-4 hidden sm:flex">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">@{username || "usuario"}</span>
              {fullName && <span className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight mt-0.5">{fullName}</span>}
            </div>
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-11 w-11 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-lg font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95 overflow-hidden border-2 border-white dark:border-gray-800">
                {avatarUrl ? <img src={avatarUrl} alt="Perfil" className="w-full h-full object-cover" /> : initialLetterMenu}
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-3 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                    <div className="p-2 space-y-1">
                      <button onClick={() => router.push("/dashboard")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">📊 Dashboard</button>
                      <button onClick={() => router.push("/insights")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">💡 Insights</button>
                      <button onClick={() => router.push("/investimentos")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">💰 Gestão de Patrimônio</button>
                      <button onClick={() => router.push("/contas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🏦 Gestão Bancária</button>
                      <button onClick={() => router.push("/contas-fixas")} className="w-full text-left px-4 py-2.5 text-sm font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded-lg transition-colors">📌 Contas Fixas</button>
                      <button onClick={() => router.push("/categorias")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🏷️ Categorias</button>
                      <button onClick={() => router.push("/auditoria")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🗑️ Auditoria de Lançamentos</button>
                      <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2"></div>
                      <button onClick={() => router.push("/perfil")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">⚙️ Meu Perfil</button>
                      <button onClick={() => router.push("/parametros")} className="w-full text-left px-4 py-2.5 text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg transition-colors">⚙️ Parâmetros do Sistema</button>
                      <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">Sair do Sistema</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto mt-8 p-6">

          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4 mac-dock-item ${isWaving ? "mac-dock-animate" : ""}`} style={{ animationDelay: "0s" }}>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">Contas Fixas</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold mt-1">Acompanhe o que já foi pago e o que ainda está pendente, mês a mês.</p>
            </div>
            <button onClick={abrirModalNovaConta} className="flex items-center gap-2 bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap">
              <span className="text-xl leading-none">+</span> Cadastrar nova conta
            </button>
          </div>

          <div className="flex bg-gray-200 dark:bg-gray-800 p-1.5 rounded-xl w-full sm:w-fit mb-6">
            <button onClick={() => setAba("ativas")} className={`flex-1 sm:flex-none px-6 py-2 text-sm font-black rounded-lg transition-all ${aba === "ativas" ? "bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Ativas</button>
            <button onClick={() => setAba("arquivadas")} className={`flex-1 sm:flex-none px-6 py-2 text-sm font-black rounded-lg transition-all ${aba === "arquivadas" ? "bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>🗄️ Arquivadas</button>
          </div>

          {loading ? (
            <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div></div>
          ) : (
            <div className="space-y-4">
              {contasFiltradas.map((conta) => {
                const agregado = conta.modo === "agregado";
                const cartao = conta.modo === "cartao";
                const somatorio = agregado || cartao;
                const oc = !somatorio ? ocorrenciaDoMes(conta.id) : null;
                const totalMesSomatorio = somatorio
                  ? (cartao ? agregarPagamentosCartao() : agregarPorMes(conta.categoria_id)).find((d) => d.competencia_ano === anoAtual && d.competencia_mes === mesAtual)?.valor || 0
                  : 0;
                const statusLabel = somatorio ? "Total do mês" : (!oc ? "Sem registro" : oc.status === "pago" ? "Pago" : "Pendente");
                const statusValor = somatorio ? totalMesSomatorio : oc?.valor;
                const statusColor = cartao ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : agregado ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : (!oc ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" : oc.status === "pago" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400");
                const expandido = cardExpandidoId === conta.id;
                const periodo = periodoPorConta[conta.id] || "ano";
                const dadosGrafico = expandido ? aplicarFiltroPeriodo(dadosMensais(conta), conta.id) : [];
                const stats = expandido ? calcularEstatisticas(dadosGrafico) : null;

                return (
                  <div key={conta.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                    <button onClick={() => setCardExpandidoId(expandido ? null : conta.id)} className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-lg text-gray-400 dark:text-gray-500 transition-transform shrink-0 ${expandido ? "rotate-90" : ""}`}>›</span>
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                            {conta.nome}
                            {agregado && <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">Soma</span>}
                            {cartao && <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800">Cartões</span>}
                          </h3>
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{cartao ? `${cartoesCredito.length} cartão(ões) de crédito` : (conta.categorias?.nome || "Sem categoria")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wide whitespace-nowrap ${statusColor}`}>{statusLabel}{statusValor != null ? ` · R$ ${Number(statusValor).toFixed(2)}` : ""}</span>
                        <span onClick={(e) => { e.stopPropagation(); abrirModalEditarConta(conta); }} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer" title="Editar conta">
                          ✏️
                        </span>
                        <span onClick={(e) => { e.stopPropagation(); toggleArquivar(conta); }} className="p-2 text-gray-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors cursor-pointer" title={conta.arquivada ? "Desarquivar" : "Arquivar"}>
                          {conta.arquivada ? "♻️" : "🗄️"}
                        </span>
                      </div>
                    </button>

                    {expandido && (
                      <div className="px-5 pb-5 pt-1 border-t border-gray-100 dark:border-gray-700 space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between flex-wrap gap-3 pt-4">
                          <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl gap-1 overflow-x-auto">
                            {([["ano", "Ano atual"], ["trimestre", "Trimestre atual"], ["semestre", "Semestre atual"], ["tudo", "Todo período"]] as const).map(([val, label]) => (
                              <button key={val} onClick={() => setPeriodoPorConta((prev) => ({ ...prev, [conta.id]: val }))} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap ${periodo === val ? "bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>{label}</button>
                            ))}
                          </div>
                          {!somatorio && !conta.arquivada && (
                            <button onClick={() => abrirModalPendencia(conta)} className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors whitespace-nowrap">📋 Gerenciar mês</button>
                          )}
                        </div>

                        {agregado && (
                          <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-lg px-3 py-2">
                            ℹ️ O valor de cada mês é somado automaticamente a partir dos lançamentos de "{conta.categorias?.nome}" no Dashboard. Não precisa vincular nada aqui.
                          </p>
                        )}

                        {cartao && (
                          <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/50 rounded-lg px-3 py-2">
                            ℹ️ Soma automática das transferências de pagamento de fatura de todos os cartões de crédito. Veja o detalhe por cartão logo abaixo.
                          </p>
                        )}

                        <GraficoEvolucao dados={dadosGrafico} />

                        {stats && (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 text-center">
                              <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Média</span>
                              <span className="block text-sm font-black text-gray-900 dark:text-gray-100 mt-0.5">R$ {stats.media.toFixed(2)}</span>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 text-center">
                              <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Maior desvio</span>
                              <span className="block text-sm font-black text-red-600 dark:text-red-400 mt-0.5">R$ {Number(stats.maior.valor).toFixed(2)}</span>
                              <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500">Ref. {String(stats.maior.competencia_mes).padStart(2, "0")}/{stats.maior.competencia_ano}</span>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 text-center">
                              <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Menor desvio</span>
                              <span className="block text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">R$ {Number(stats.menor.valor).toFixed(2)}</span>
                              <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500">Ref. {String(stats.menor.competencia_mes).padStart(2, "0")}/{stats.menor.competencia_ano}</span>
                            </div>
                          </div>
                        )}

                        {cartao && (
                          <div className="space-y-3 pt-2">
                            <span className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Por cartão</span>
                            {cartoesCredito.length === 0 && (
                              <p className="text-xs font-bold text-gray-400 dark:text-gray-500">Nenhum cartão de crédito cadastrado em "Gestão Bancária".</p>
                            )}
                            {cartoesCredito.map((c) => {
                              const dadosCartao = aplicarFiltroPeriodo(agregarPagamentosCartao(c.id), conta.id);
                              const totalMesCartao = agregarPagamentosCartao(c.id).find((d) => d.competencia_ano === anoAtual && d.competencia_mes === mesAtual)?.valor || 0;
                              return (
                                <div key={c.id} className={`rounded-xl border p-3 ${c.ativo === false ? "border-gray-100 dark:border-gray-700 opacity-60" : "border-purple-100 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-900/10"}`}>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">{c.nome}</span>
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 shrink-0">@{c.autor_nome}</span>
                                      {c.ativo === false && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shrink-0">INATIVO</span>}
                                    </div>
                                    <span className="text-xs font-black text-gray-700 dark:text-gray-300 whitespace-nowrap shrink-0">R$ {totalMesCartao.toFixed(2)} <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">este mês</span></span>
                                  </div>
                                  <GraficoEvolucao dados={dadosCartao} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {contasFiltradas.length === 0 && (
                <div className="text-center py-14 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <span className="text-4xl opacity-50 mb-2 block">📌</span>
                  <p className="font-bold text-gray-500 dark:text-gray-400">{aba === "ativas" ? "Nenhuma conta fixa cadastrada ainda." : "Nenhuma conta arquivada."}</p>
                </div>
              )}
            </div>
          )}
        </main>

        {isModalContaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalContaOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80">
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">{contaEditandoId ? "Editar Conta Fixa" : "Nova Conta Fixa"}</h3>
                <button onClick={() => setIsModalContaOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-2xl font-bold">&times;</button>
              </div>
              <form onSubmit={handleSalvarConta} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Nome</label>
                  <input type="text" required value={nomeConta} onChange={(e) => setNomeConta(e.target.value)} placeholder="Ex: Água, Aluguel, Mercado" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Como acompanhar</label>
                  <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl gap-1">
                    <button type="button" onClick={() => setModoConta("unico")} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${modoConta === "unico" ? "bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Pagamento único</button>
                    <button type="button" onClick={() => setModoConta("agregado")} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${modoConta === "agregado" ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Soma de lançamentos</button>
                    <button type="button" onClick={() => setModoConta("cartao")} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${modoConta === "cartao" ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Cartões de crédito</button>
                  </div>
                  <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-1.5">
                    {modoConta === "unico" && "Um valor por mês: você marca como pago direto aqui, ou vincula um lançamento do Dashboard. Ideal pra água, aluguel, internet."}
                    {modoConta === "agregado" && "O valor de cada mês é a soma automática de tudo que for lançado nessa categoria no Dashboard. Ideal pra mercado, combustível etc."}
                    {modoConta === "cartao" && "Soma automática dos pagamentos de fatura (transferências) de todos os cartões de crédito, com sub-cards individuais por cartão."}
                  </p>
                </div>
                {modoConta !== "cartao" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Categoria</label>
                    <select required value={categoriaIdConta} onChange={(e) => setCategoriaIdConta(e.target.value)} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20">
                      <option value="" disabled>Selecione...</option>
                      {categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                    </select>
                    {categorias.length === 0 && <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 mt-1">Nenhuma categoria de despesa cadastrada — crie uma em "Categorias" primeiro.</p>}
                  </div>
                )}
                <button type="submit" disabled={isSubmitting || (modoConta !== "cartao" && !categoriaIdConta)} className="w-full py-3.5 rounded-xl text-white font-black uppercase tracking-wide transition-all shadow-md active:scale-95 bg-amber-600 hover:bg-amber-700 disabled:opacity-50">
                  {isSubmitting ? "Salvando..." : contaEditandoId ? "Salvar Alterações" : "Cadastrar Conta"}
                </button>
              </form>
            </div>
          </div>
        )}

        {isModalPendenciaOpen && contaFixaAlvo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalPendenciaOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80">
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">{contaFixaAlvo.nome}</h3>
                <button onClick={() => setIsModalPendenciaOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-2xl font-bold">&times;</button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Mês</label>
                    <select value={mesPendencia} onChange={(e) => setMesPendencia(Number(e.target.value))} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20">
                      {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Ano</label>
                    <input type="number" required value={anoPendencia} onChange={(e) => setAnoPendencia(Number(e.target.value))} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20" />
                  </div>
                </div>

                {ocorrenciaEditandoVinculo ? (
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-400">🔗 Este mês está vinculado a um lançamento do Dashboard (R$ {Number(ocorrenciaEditandoVinculo.valor).toFixed(2)}).</p>
                    <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Para alterar valor ou desfazer, edite ou exclua o lançamento por lá.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSalvarPendencia} className="space-y-4">
                    <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl gap-1">
                      <button type="button" onClick={() => setStatusPendencia("pendente")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${statusPendencia === "pendente" ? "bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Pendente</button>
                      <button type="button" onClick={() => setStatusPendencia("pago")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${statusPendencia === "pago" ? "bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Já paguei</button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">{statusPendencia === "pago" ? "Valor pago" : "Valor esperado (opcional)"}</label>
                      <input type="text" inputMode="decimal" required={statusPendencia === "pago"} value={valorPendencia} onChange={(e) => setValorPendencia(e.target.value)} placeholder="Ex: 50,00" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Observação (opcional)</label>
                      <input type="text" value={observacaoPendencia} onChange={(e) => setObservacaoPendencia(e.target.value)} placeholder="Ex: Pago com Vale Home Office" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all" />
                    </div>

                    <div className="flex gap-3">
                      {ocorrenciaEditandoId && (
                        <button type="button" onClick={handleExcluirOcorrencia} disabled={isSubmitting} className="px-4 py-3.5 rounded-xl font-bold transition-all active:scale-95 shrink-0 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800" title="Excluir registro deste mês">
                          🗑️
                        </button>
                      )}
                      <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl text-white font-black uppercase tracking-wide transition-all shadow-md active:scale-95 bg-amber-600 hover:bg-amber-700 disabled:opacity-50">
                        {isSubmitting ? "Salvando..." : ocorrenciaEditandoId ? "Salvar Alterações" : "Registrar"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
