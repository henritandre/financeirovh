"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeContext";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function GraficoEvolucao({ dados }: { dados: any[] }) {
  if (dados.length === 0) {
    return <div className="text-center py-8 text-sm font-bold text-gray-400 dark:text-gray-500">Nenhuma cobrança gerada ainda.</div>;
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

export default function AssinaturasPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, isWaving } = useTheme();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [assinaturas, setAssinaturas] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [formasPagto, setFormasPagto] = useState<any[]>([]);
  const [mapPerfis, setMapPerfis] = useState<Record<string, string>>({});

  const [aba, setAba] = useState<"ativas" | "arquivadas">("ativas");
  const [cardExpandidoId, setCardExpandidoId] = useState<string | null>(null);

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [valor, setValor] = useState("");
  const [recorrencia, setRecorrencia] = useState<"semanal" | "mensal" | "anual">("mensal");
  const [diaCobranca, setDiaCobranca] = useState("");
  const [mesCobranca, setMesCobranca] = useState(1);
  const [formaPagtoId, setFormaPagtoId] = useState("");

  const [confirmacao, setConfirmacao] = useState<{ mensagem: string; onConfirmar: () => void } | null>(null);

  const getDataLocal = (d: Date) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
  };

  // Próxima ocorrência da cobrança a partir de hoje (inclusive), usada no
  // cadastro, na edição e ao desarquivar — nunca gera cobrança retroativa.
  const calcularProximaCobranca = (rec: string, dia: number, mes: number) => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    if (rec === "semanal") {
      const delta = (dia - hoje.getDay() + 7) % 7;
      const d = new Date(hoje); d.setDate(d.getDate() + delta);
      return d;
    }
    const clampMes = (ano: number, mesIdx: number) => {
      const ultimo = new Date(ano, mesIdx + 1, 0).getDate();
      return new Date(ano, mesIdx, Math.min(dia, ultimo));
    };
    if (rec === "mensal") {
      let d = clampMes(hoje.getFullYear(), hoje.getMonth());
      if (d < hoje) d = clampMes(hoje.getFullYear(), hoje.getMonth() + 1);
      return d;
    }
    let d = clampMes(hoje.getFullYear(), mes - 1);
    if (d < hoje) d = clampMes(hoje.getFullYear() + 1, mes - 1);
    return d;
  };

  const processarPendentes = async () => {
    const { data: gerados } = await supabase.rpc("processar_assinaturas");
    if (gerados && gerados > 0) {
      showIsland(`${gerados} lançamento(s) de assinatura gerado(s)!`, "success", "🔁");
      return true;
    }
    return false;
  };

  const carregarDados = async () => {
    setLoading(true);
    const { data: perfisData } = await supabase.from("profiles").select("username, avatar_url");
    if (perfisData) {
      const mapa: Record<string, string> = {};
      perfisData.forEach((p) => { if (p.username && p.avatar_url) mapa[p.username] = p.avatar_url; });
      setMapPerfis(mapa);
    }
    const { data: assData } = await supabase.from("assinaturas").select("*, categorias(nome), contas(nome, tipo, autor_nome)").order("arquivada", { ascending: true }).order("nome", { ascending: true });
    if (assData) setAssinaturas(assData);
    const { data: lancData } = await supabase.from("transacoes").select("id, assinatura_id, valor, data, descricao").not("assinatura_id", "is", null).order("data", { ascending: true });
    if (lancData) setLancamentos(lancData);
    const { data: catsData } = await supabase.from("categorias").select("*").eq("tipo", "despesa").order("nome", { ascending: true });
    if (catsData) setCategorias(catsData);
    const { data: contasData } = await supabase.from("contas").select("id, nome, tipo, autor_nome, ativo").order("nome", { ascending: true });
    if (contasData) setFormasPagto(contasData.filter((c) => c.ativo !== false));
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
        await processarPendentes();
        carregarDados();
      } else {
        router.push("/login");
      }
    };
    loadInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const abrirModalNova = () => {
    setEditandoId(null); setNome(""); setCategoriaId(categorias[0]?.id || ""); setValor("");
    setRecorrencia("mensal"); setDiaCobranca(""); setMesCobranca(1); setFormaPagtoId("");
    setIsModalOpen(true);
  };

  const abrirModalEditar = (a: any) => {
    setEditandoId(a.id); setNome(a.nome); setCategoriaId(a.categoria_id); setValor(String(a.valor).replace(".", ","));
    setRecorrencia(a.recorrencia); setDiaCobranca(String(a.dia_cobranca)); setMesCobranca(a.mes_cobranca || 1); setFormaPagtoId(a.conta_id);
    setIsModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const dia = Number(diaCobranca);
    if (!categoriaId) { showIsland("Selecione uma categoria.", "error", "🛑"); return; }
    if (!formaPagtoId) { showIsland("Selecione a forma de pagamento.", "error", "🛑"); return; }
    if (recorrencia === "semanal" && (dia < 0 || dia > 6 || diaCobranca === "")) { showIsland("Selecione o dia da semana.", "error", "🛑"); return; }
    if (recorrencia !== "semanal" && (dia < 1 || dia > 31)) { showIsland("Dia de cobrança deve ser entre 1 e 31.", "error", "🛑"); return; }

    setIsSubmitting(true);
    const payload = {
      nome,
      categoria_id: categoriaId,
      valor: parseFloat(valor.replace(",", ".")),
      recorrencia,
      dia_cobranca: dia,
      mes_cobranca: recorrencia === "anual" ? mesCobranca : null,
      conta_id: formaPagtoId,
      proxima_cobranca: getDataLocal(calcularProximaCobranca(recorrencia, dia, mesCobranca)),
    };
    let error;
    if (editandoId) {
      ({ error } = await supabase.from("assinaturas").update(payload).eq("id", editandoId));
    } else {
      ({ error } = await supabase.from("assinaturas").insert([{ ...payload, user_id: userId, autor_nome: username || "Usuário" }]));
    }
    if (error) { setIsSubmitting(false); showIsland("Erro ao salvar: " + error.message, "error", "🛑"); return; }
    setIsModalOpen(false);
    showIsland(editandoId ? "Assinatura atualizada!" : "Assinatura cadastrada!", "success", editandoId ? "✏️" : "🎉");
    // se a primeira cobrança é hoje, o lançamento já nasce agora
    await processarPendentes();
    setIsSubmitting(false);
    carregarDados();
  };

  const toggleArquivar = (a: any) => {
    const arquivar = !a.arquivada;
    setConfirmacao({
      mensagem: arquivar
        ? `Pausar "${a.nome}"? Nenhum lançamento novo será gerado enquanto estiver arquivada.`
        : `Reativar "${a.nome}"? As cobranças voltam a ser geradas a partir da próxima data (sem retroativos do período pausado).`,
      onConfirmar: async () => {
        setConfirmacao(null);
        const payload: any = { arquivada: arquivar, arquivada_em: arquivar ? new Date().toISOString() : null };
        if (!arquivar) payload.proxima_cobranca = getDataLocal(calcularProximaCobranca(a.recorrencia, a.dia_cobranca, a.mes_cobranca || 1));
        const { error } = await supabase.from("assinaturas").update(payload).eq("id", a.id);
        if (error) showIsland("Erro: " + error.message, "error", "🛑");
        else { showIsland(arquivar ? "Assinatura pausada." : "Assinatura reativada!", "success", arquivar ? "🗄️" : "♻️"); carregarDados(); }
      },
    });
  };

  // Agrupa os lançamentos gerados por mês (gráfico de evolução do card)
  const lancamentosDaAssinatura = (assinaturaId: string) => lancamentos.filter((l) => l.assinatura_id === assinaturaId);

  const agregarPorMes = (itens: any[]) => {
    const mapa: Record<string, number> = {};
    itens.forEach((t) => {
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

  const custoAnualEstimado = (a: any) => {
    const v = Number(a.valor);
    if (a.recorrencia === "semanal") return v * 52;
    if (a.recorrencia === "mensal") return v * 12;
    return v;
  };

  const labelRecorrencia = (a: any) => {
    if (a.recorrencia === "semanal") return `Semanal · ${DIAS_SEMANA[a.dia_cobranca]}`;
    if (a.recorrencia === "mensal") return `Mensal · dia ${a.dia_cobranca}`;
    return `Anual · ${String(a.dia_cobranca).padStart(2, "0")}/${String(a.mes_cobranca).padStart(2, "0")}`;
  };

  const formatarDataBR = (iso: string) => {
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
  };

  const initialLetterMenu = username ? username.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";
  const assinaturasFiltradas = assinaturas.filter((a) => a.arquivada === (aba === "arquivadas"));
  const totalMensalAtivas = assinaturas.filter((a) => !a.arquivada).reduce((acc, a) => acc + custoAnualEstimado(a) / 12, 0);

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
          <h1 className="text-xl font-black text-teal-600 dark:text-teal-400 tracking-tight flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
            Assinaturas
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
                      <button onClick={() => router.push("/contas-fixas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">📌 Contas Fixas</button>
                      <button onClick={() => router.push("/assinaturas")} className="w-full text-left px-4 py-2.5 text-sm font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 rounded-lg transition-colors">🔁 Assinaturas</button>
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
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">Assinaturas</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold mt-1">
                Lançadas automaticamente no Dashboard na data da cobrança.
                {totalMensalAtivas > 0 && <span className="text-teal-600 dark:text-teal-400"> Custo médio: R$ {totalMensalAtivas.toFixed(2)}/mês.</span>}
              </p>
            </div>
            <button onClick={abrirModalNova} className="flex items-center gap-2 bg-teal-600 dark:bg-teal-500 hover:bg-teal-700 dark:hover:bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap">
              <span className="text-xl leading-none">+</span> Nova assinatura
            </button>
          </div>

          <div className="flex bg-gray-200 dark:bg-gray-800 p-1.5 rounded-xl w-full sm:w-fit mb-6">
            <button onClick={() => setAba("ativas")} className={`flex-1 sm:flex-none px-6 py-2 text-sm font-black rounded-lg transition-all ${aba === "ativas" ? "bg-white dark:bg-gray-700 text-teal-700 dark:text-teal-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Ativas</button>
            <button onClick={() => setAba("arquivadas")} className={`flex-1 sm:flex-none px-6 py-2 text-sm font-black rounded-lg transition-all ${aba === "arquivadas" ? "bg-white dark:bg-gray-700 text-teal-700 dark:text-teal-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>🗄️ Pausadas</button>
          </div>

          {loading ? (
            <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
          ) : (
            <div className="space-y-4">
              {assinaturasFiltradas.map((a) => {
                const expandido = cardExpandidoId === a.id;
                const itens = expandido ? lancamentosDaAssinatura(a.id) : [];
                const dadosGrafico = expandido ? agregarPorMes(itens) : [];
                const totalPago = itens.reduce((acc, t) => acc + Number(t.valor), 0);
                const fotoAutor = mapPerfis[a.autor_nome];

                return (
                  <div key={a.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                    <button onClick={() => setCardExpandidoId(expandido ? null : a.id)} className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-lg text-gray-400 dark:text-gray-500 transition-transform shrink-0 ${expandido ? "rotate-90" : ""}`}>›</span>
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-400 flex items-center justify-center text-xs font-black shrink-0" title={`@${a.autor_nome}`}>
                          {fotoAutor ? <img src={fotoAutor} className="w-full h-full object-cover" alt="" /> : a.autor_nome?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-gray-900 dark:text-gray-100 truncate">{a.nome}</h3>
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 truncate block">
                            {a.categorias?.nome || "Sem categoria"} • {labelRecorrencia(a)} • {a.contas?.nome || "—"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right mr-1">
                          <span className="block text-sm font-black text-gray-900 dark:text-gray-100">R$ {Number(a.valor).toFixed(2)}</span>
                          {!a.arquivada && <span className="block text-[10px] font-bold text-teal-600 dark:text-teal-400">Próx: {formatarDataBR(a.proxima_cobranca)}</span>}
                          {a.arquivada && <span className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">Pausada</span>}
                        </div>
                        <span onClick={(e) => { e.stopPropagation(); abrirModalEditar(a); }} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer" title="Editar assinatura">
                          ✏️
                        </span>
                        <span onClick={(e) => { e.stopPropagation(); toggleArquivar(a); }} className="p-2 text-gray-400 dark:text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors cursor-pointer" title={a.arquivada ? "Reativar" : "Pausar"}>
                          {a.arquivada ? "♻️" : "🗄️"}
                        </span>
                      </div>
                    </button>

                    {expandido && (
                      <div className="px-5 pb-5 pt-1 border-t border-gray-100 dark:border-gray-700 space-y-4 animate-in fade-in duration-200">
                        <div className="pt-4">
                          <GraficoEvolucao dados={dadosGrafico} />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 text-center">
                            <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total pago</span>
                            <span className="block text-sm font-black text-gray-900 dark:text-gray-100 mt-0.5">R$ {totalPago.toFixed(2)}</span>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 text-center">
                            <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Cobranças</span>
                            <span className="block text-sm font-black text-gray-900 dark:text-gray-100 mt-0.5">{itens.length}</span>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 text-center">
                            <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Custo por ano</span>
                            <span className="block text-sm font-black text-teal-600 dark:text-teal-400 mt-0.5">R$ {custoAnualEstimado(a).toFixed(2)}</span>
                          </div>
                        </div>

                        {itens.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Últimas cobranças</span>
                            {[...itens].reverse().slice(0, 6).map((t) => (
                              <div key={t.id} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg px-3 py-2">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{formatarDataBR(t.data)}</span>
                                <span className="text-sm font-black text-gray-900 dark:text-gray-100">R$ {Number(t.valor).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {assinaturasFiltradas.length === 0 && (
                <div className="text-center py-14 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <span className="text-4xl opacity-50 mb-2 block">🔁</span>
                  <p className="font-bold text-gray-500 dark:text-gray-400">{aba === "ativas" ? "Nenhuma assinatura cadastrada ainda." : "Nenhuma assinatura pausada."}</p>
                </div>
              )}
            </div>
          )}
        </main>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80 sticky top-0 z-10">
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">{editandoId ? "Editar Assinatura" : "Nova Assinatura"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-2xl font-bold">&times;</button>
              </div>
              <form onSubmit={handleSalvar} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Nome</label>
                  <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Netflix, Plano Celular, Spotify" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 outline-none transition-all" />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Valor (R$)</label>
                    <input type="text" inputMode="decimal" required value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex: 39,90" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 outline-none transition-all" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Categoria</label>
                    <select required value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20">
                      <option value="" disabled>Selecione...</option>
                      {categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Recorrência</label>
                  <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl gap-1">
                    <button type="button" onClick={() => { setRecorrencia("semanal"); setDiaCobranca(""); }} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${recorrencia === "semanal" ? "bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Semanal</button>
                    <button type="button" onClick={() => { setRecorrencia("mensal"); setDiaCobranca(""); }} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${recorrencia === "mensal" ? "bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Mensal</button>
                    <button type="button" onClick={() => { setRecorrencia("anual"); setDiaCobranca(""); }} className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${recorrencia === "anual" ? "bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Anual</button>
                  </div>
                </div>

                {recorrencia === "semanal" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Dia da semana</label>
                    <select required value={diaCobranca} onChange={(e) => setDiaCobranca(e.target.value)} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20">
                      <option value="" disabled>Selecione...</option>
                      {DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                )}

                {recorrencia === "mensal" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Dia do mês</label>
                    <input type="number" min="1" max="31" required value={diaCobranca} onChange={(e) => setDiaCobranca(e.target.value)} placeholder="Ex: 15" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 outline-none transition-all" />
                  </div>
                )}

                {recorrencia === "anual" && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Dia</label>
                      <input type="number" min="1" max="31" required value={diaCobranca} onChange={(e) => setDiaCobranca(e.target.value)} placeholder="Ex: 15" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 outline-none transition-all" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Mês</label>
                      <select value={mesCobranca} onChange={(e) => setMesCobranca(Number(e.target.value))} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20">
                        {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Forma de pagamento</label>
                  <select required value={formaPagtoId} onChange={(e) => setFormaPagtoId(e.target.value)} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20">
                    <option value="" disabled>Selecione...</option>
                    {formasPagto.map((c) => <option key={c.id} value={c.id}>{c.nome} (@{c.autor_nome})</option>)}
                  </select>
                </div>

                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                  O lançamento entra automaticamente no Dashboard com a categoria "Assinaturas" na data da cobrança. A categoria escolhida acima aparece só nesta tela.
                </p>

                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 rounded-xl text-white font-black uppercase tracking-wide transition-all shadow-md active:scale-95 bg-teal-600 hover:bg-teal-700 disabled:opacity-50">
                  {isSubmitting ? "Salvando..." : editandoId ? "Salvar Alterações" : "Cadastrar Assinatura"}
                </button>
              </form>
            </div>
          </div>
        )}

        {confirmacao && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmacao(null)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-5">{confirmacao.mensagem}</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setConfirmacao(null)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95">Cancelar</button>
                <button type="button" onClick={confirmacao.onConfirmar} className="flex-1 py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all active:scale-95">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
