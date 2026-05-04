"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeContext";

export default function InvestimentosPage() {
  const router = useRouter();
  
  // ==========================================
  // CÉREBRO DO TEMA E ANIMAÇÃO DA MOLA
  // ==========================================
  const { isDarkMode, toggleTheme, isWaving } = useTheme();
  
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [caixinhas, setCaixinhas] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);
  const [contasCorrentes, setContasCorrentes] = useState<any[]>([]);
  const [mapPerfis, setMapPerfis] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<string[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);
  const [somenteMinhasContas, setSomenteMinhasContas] = useState(true);

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
      setIsland(prev => ({ ...prev, isClosing: true }));
      islandCloseTimeoutRef.current = setTimeout(() => {
        setIsland(prev => ({ ...prev, show: false, isClosing: false }));
      }, 400);
    }, 3600);
  };

  const getDatLocal = (d: Date) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
  };

  const [isModalCaixinhaOpen, setIsModalCaixinhaOpen] = useState(false);
  const [isModalAcaoOpen, setIsModalAcaoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [caixinhaId, setCaixinhaId] = useState<string | null>(null);
  const [nomeCaixinha, setNomeCaixinha] = useState("");
  const [bancoId, setBancoId] = useState("");
  const [isBancoDropdownOpen, setIsBancoDropdownOpen] = useState(false);

  const [caixinhaAlvo, setCaixinhaAlvo] = useState<any>(null);
  const [tipoAcao, setTipoAcao] = useState<"aporte" | "resgate" | "rendimento">("aporte");
  const [valorAcao, setValorAcao] = useState("");
  const [dataAcao, setDataAcao] = useState(getDatLocal(new Date()));
  const [contaPonteId, setContaPonteId] = useState("");
  const [isContaPonteDropdownOpen, setIsContaPonteDropdownOpen] = useState(false);

  const formatarMoeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const toggleUsuario = (nome: string) => setUsuariosSelecionados((prev) => (prev.includes(nome) ? prev.filter((u) => u !== nome) : [...prev, nome]));

  const carregarDados = async (isInitialLoad = false) => {
    setIsLoading(true);
    const { data: perfisData } = await supabase.from("profiles").select("username, avatar_url");
    if (perfisData) {
      const mapa: Record<string, string> = {};
      perfisData.forEach((p) => { if (p.username && p.avatar_url) mapa[p.username] = p.avatar_url; });
      setMapPerfis(mapa);
    }

    const { data: caixinhasData } = await supabase.from("caixinhas").select("*, banco:contas_bancarias(nome, banco, autor_nome)").order("criado_em", { ascending: false });
    if (caixinhasData) setCaixinhas(caixinhasData);

    const { data: bancosData } = await supabase.from("contas_bancarias").select("*").eq("ativo", true).order("nome");
    if (bancosData) setBancos(bancosData);

    const { data: contasData } = await supabase.from("contas").select("*, banco_vinculado:contas_bancarias(banco)").in("tipo", ["corrente", "dinheiro"]).eq("ativo", true).order("nome");
    if (contasData) setContasCorrentes(contasData);

    const autoresCaixinhas = caixinhasData ? caixinhasData.map((c) => c.autor_nome || "Usuário") : [];
    const autoresBancos = bancosData ? bancosData.map((b) => b.autor_nome || "Usuário") : [];
    const euMesmo = username || "Usuário";
    const unicos = Array.from(new Set([...autoresCaixinhas, ...autoresBancos, euMesmo].filter((n) => n && n !== "Família")));

    setUsuariosDisponiveis(unicos);
    if (isInitialLoad) setUsuariosSelecionados(unicos);

    setIsLoading(false);
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id); setEmail(user.email || "");
        setUsername(user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário");
        setFullName(user.user_metadata?.full_name || ""); setAvatarUrl(user.user_metadata?.avatar_url || "");
        carregarDados(true);
      } else { router.push("/login"); }
    };
    loadInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const caixinhasFiltradas = caixinhas.filter((c) => usuariosSelecionados.includes(c.autor_nome || "Usuário"));
  const totalInvestido = caixinhasFiltradas.reduce((acc, c) => acc + Number(c.saldo), 0);

  const abrirModalNovaCaixinha = () => { setCaixinhaId(null); setNomeCaixinha(""); setBancoId(""); setIsBancoDropdownOpen(false); setIsModalCaixinhaOpen(true); };

  const handleSalvarCaixinha = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    const payload = { user_id: userId, autor_nome: username, nome: nomeCaixinha, banco_id: bancoId === "dinheiro" || !bancoId ? null : bancoId };

    if (caixinhaId) {
      const { error } = await supabase.from("caixinhas").update(payload).eq("id", caixinhaId);
      if (error) showIsland(error.message, "error", "🛑"); else showIsland("Caixinha atualizada!", "success", "✏️");
    } else {
      const { error } = await supabase.from("caixinhas").insert([payload]);
      if (error) showIsland(error.message, "error", "🛑"); else showIsland("Caixinha criada!", "success", "🎉");
    }
    setIsSubmitting(false); setIsModalCaixinhaOpen(false); carregarDados(false);
  };

  const abrirModalAcao = (caixinha: any, tipo: "aporte" | "resgate" | "rendimento") => {
    setCaixinhaAlvo(caixinha); setTipoAcao(tipo); setValorAcao(""); setDataAcao(getDatLocal(new Date())); setContaPonteId(""); setIsContaPonteDropdownOpen(false); setIsModalAcaoOpen(true);
  };

  const handleSalvarAcao = async (e: React.FormEvent) => {
    e.preventDefault();
    const valNumerico = parseFloat(valorAcao.replace(",", "."));
    
    if (valNumerico <= 0) { showIsland("O valor deve ser maior que zero.", "error", "🛑"); return; }
    if (tipoAcao === "resgate" && valNumerico > caixinhaAlvo.saldo) { showIsland("Saldo insuficiente.", "error", "🛑"); return; }
    if (tipoAcao !== "rendimento" && !contaPonteId) { showIsland("Selecione a conta da movimentação.", "error", "🛑"); return; }

    setIsSubmitting(true); let idTransacaoGerada = null;

    if (tipoAcao === "aporte" || tipoAcao === "resgate") {
      const payloadTransacao = { user_id: userId, autor_nome: username, tipo: tipoAcao === "aporte" ? "despesa" : "receita", valor: valNumerico, data: dataAcao, descricao: tipoAcao === "aporte" ? `Guardou: ${caixinhaAlvo.nome}` : `Resgate: ${caixinhaAlvo.nome}`, conta_id: contaPonteId };
      const { data: transacaoSalva, error: errT } = await supabase.from("transacoes").insert([payloadTransacao]).select().single();
      if (errT) { showIsland("Erro no dashboard: " + errT.message, "error", "🛑"); setIsSubmitting(false); return; }
      idTransacaoGerada = transacaoSalva.id;
    }

    const payloadHistorico = { caixinha_id: caixinhaAlvo.id, user_id: userId, tipo: tipoAcao, valor: valNumerico, data: dataAcao, descricao: tipoAcao === "rendimento" ? "Rendimento do período" : (tipoAcao === "aporte" ? "Aporte realizado" : "Resgate realizado"), transacao_id: idTransacaoGerada };
    const { error: errH } = await supabase.from("caixinhas_historico").insert([payloadHistorico]);
    if (errH) { showIsland("Erro no histórico: " + errH.message, "error", "🛑"); setIsSubmitting(false); return; }

    const novoSaldo = tipoAcao === "resgate" ? Number(caixinhaAlvo.saldo) - valNumerico : Number(caixinhaAlvo.saldo) + valNumerico;
    const { error: errC } = await supabase.from("caixinhas").update({ saldo: novoSaldo }).eq("id", caixinhaAlvo.id);
    if (errC) { showIsland("Erro atualizar saldo: " + errC.message, "error", "🛑"); setIsSubmitting(false); return; }

    setIsSubmitting(false); setIsModalAcaoOpen(false); showIsland(tipoAcao === "rendimento" ? "Rendimento aplicado!" : "Movimentação concluída!", "success", tipoAcao === "rendimento" ? "📈" : "💰"); carregarDados(false);
  };

  const initialLetterMenu = username ? username.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";

  return (
    <>
      <style>{`
        /* DYNAMIC ISLAND 2.0 (BALLOON INFLATE/POP) */
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

        /* EFEITO MAC DOCK WAVE */
        @keyframes macDockWave { 
          0% { transform: translateY(0) scale(1); } 
          40% { transform: translateY(-16px) scale(1.03); } 
          70% { transform: translateY(4px) scale(0.98); } 
          100% { transform: translateY(0) scale(1); } 
        }
        .mac-dock-item { will-change: transform; }
        .mac-dock-animate { animation: macDockWave 0.6s cubic-bezier(0.25, 1, 0.5, 1) both; }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative pb-20 overflow-x-hidden transition-colors duration-300">
        
        {/* DYNAMIC ISLAND CENTRALIZADA (LIQUID GLASS + EMOJI) */}
        {island.show && (
          <div className="fixed top-6 left-0 w-full z-[100] flex justify-center pointer-events-none">
            <div className={`pointer-events-auto px-5 py-3 rounded-full backdrop-blur-3xl border flex items-center justify-center gap-3 w-auto min-w-[250px] max-w-[90%] transition-colors duration-300 ${island.isClosing ? 'animate-balloon-pop' : 'animate-balloon-inflate'} ${
              island.type === 'error' ? 'bg-white/70 dark:bg-black/60 border-red-200 dark:border-red-900/50 shadow-[0_8px_32px_rgba(239,68,68,0.25)] text-red-800 dark:text-red-300' :
              island.type === 'success' ? 'bg-white/70 dark:bg-black/60 border-emerald-200 dark:border-emerald-900/50 shadow-[0_8px_32px_rgba(16,185,129,0.25)] text-emerald-800 dark:text-emerald-300' :
              'bg-white/70 dark:bg-black/60 border-blue-200 dark:border-blue-900/50 shadow-[0_8px_32px_rgba(59,130,246,0.25)] text-blue-800 dark:text-blue-300'
            }`}>
              <span className={`text-xl shrink-0 drop-shadow-md ${island.type === 'error' ? 'animate-[islandShake_0.5s_ease-in-out]' : island.type === 'success' ? 'animate-[islandExplode_0.6s_ease-out_forwards]' : ''}`}>
                {island.icon}
              </span>
              <span className="text-sm font-black tracking-tight whitespace-nowrap">{island.message}</span>
            </div>
          </div>
        )}

        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center relative z-10 transition-colors">
          <h1 className="text-xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 tracking-tight">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Investimentos
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
                      <button onClick={() => router.push("/contas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🏦 Gestão Bancária</button>
                      <button onClick={() => router.push("/categorias")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🏷️ Categorias</button>
                      <button onClick={() => router.push("/auditoria")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🗑️ Lançamentos Excluídos</button>
                      <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2"></div>
                      <button onClick={() => router.push("/perfil")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">⚙️ Meu Perfil</button>
                      <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">Sair do Sistema</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>

        <main className="p-6 max-w-5xl mx-auto space-y-6 mt-4">
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0s' }}>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">Gestão de Patrimônio</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold mt-1">O dinheiro que trabalha para você, isolado do dia a dia.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-2">Visão de:</span>
              {usuariosDisponiveis.map((user) => {
                const isSelected = usuariosSelecionados.includes(user);
                const fotoUser = mapPerfis[user];
                return (
                  <button key={user} onClick={() => toggleUsuario(user)} className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center gap-2 ${isSelected ? "bg-gray-900 dark:bg-gray-700 text-white border-gray-900 dark:border-gray-600 shadow-md" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center text-[9px]">{fotoUser ? <img src={fotoUser} className="w-full h-full object-cover" alt="" /> : user.charAt(0).toUpperCase()}</div>
                    {user}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`bg-gradient-to-tr from-blue-900 to-indigo-900 dark:from-blue-950 dark:to-indigo-950 p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center text-white relative overflow-hidden gap-6 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.1s' }}>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
            <div>
              <h3 className="text-sm font-bold text-blue-200 dark:text-blue-300 uppercase tracking-widest mb-2">Patrimônio Total Acumulado</h3>
              <p className="text-5xl font-black">{formatarMoeda(totalInvestido)}</p>
            </div>
            <button onClick={abrirModalNovaCaixinha} className="bg-white text-blue-900 px-6 py-3.5 rounded-xl font-black shadow-md active:scale-95 transition-all w-full sm:w-auto relative z-10 hover:bg-gray-50">
              + Nova Caixinha
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600"></div></div>
          ) : caixinhasFiltradas.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 text-center transition-colors">
              <span className="text-5xl opacity-30 mb-3 block">🏦</span>
              <p className="text-lg font-bold text-gray-600 dark:text-gray-400">Nenhum investimento encontrado para este filtro.</p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.2s' }}>
              {caixinhasFiltradas.map((c) => {
                const fotoAutor = mapPerfis[c.autor_nome];
                return (
                  <div key={c.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden hover:shadow-md transition-shadow group">
                    <div className="p-6 border-b border-gray-50 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                          🏦 {c.banco?.banco || "Cofre Físico"}
                        </span>
                        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          <div className="w-4 h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 flex items-center justify-center text-[8px] font-black">
                            {fotoAutor ? <img src={fotoAutor} alt="" className="w-full h-full object-cover" /> : c.autor_nome?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">@{c.autor_nome}</span>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 truncate mb-1">{c.nome}</h3>
                      <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-3">{formatarMoeda(c.saldo)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-between gap-2">
                      <button onClick={() => abrirModalAcao(c, 'aporte')} className="flex-1 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-green-700 dark:text-green-400 font-bold text-xs rounded-xl hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-200 dark:hover:border-green-800 transition-colors shadow-sm flex flex-col items-center gap-1">
                        <span className="text-lg">📥</span> Guardar
                      </button>
                      <button onClick={() => abrirModalAcao(c, 'resgate')} className="flex-1 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-200 dark:hover:border-red-800 transition-colors shadow-sm flex flex-col items-center gap-1">
                        <span className="text-lg">📤</span> Resgatar
                      </button>
                      <button onClick={() => abrirModalAcao(c, 'rendimento')} className="flex-1 py-2.5 bg-blue-600 dark:bg-blue-500 text-white font-bold text-xs rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm flex flex-col items-center gap-1">
                        <span className="text-lg">📈</span> Render
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>

        
        {isModalCaixinhaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalCaixinhaOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Nova Caixinha / Fundo</h3>
                <button type="button" onClick={() => setIsModalCaixinhaOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 text-2xl font-bold">&times;</button>
              </div>
              
              <form onSubmit={handleSalvarCaixinha} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Nome da Reserva</label>
                  <input type="text" required value={nomeCaixinha} onChange={(e) => setNomeCaixinha(e.target.value)} placeholder="Ex: Viagem Chile 2026..." className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all" />
                </div>

                <div className={`relative ${isBancoDropdownOpen ? "z-50" : "z-30"}`}>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Onde este dinheiro vai ficar?</label>
                  <button type="button" onClick={() => setIsBancoDropdownOpen(!isBancoDropdownOpen)} className="flex items-center justify-between w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-2.5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all h-[55px]">
                    {bancoId ? (
                      bancoId === "dinheiro" ? (
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">💵</div>
                          <div className="flex flex-col items-start truncate text-left">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate w-full">Cofre Físico</span>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate w-full mt-0.5">Em casa / Na Carteira</span>
                          </div>
                        </div>
                      ) : (
                        () => {
                          const b = bancos.find((x) => x.id === bancoId);
                          if (!b) return <span className="text-gray-400 font-bold text-sm ml-1">Selecione o banco...</span>;
                          const fotoBanco = mapPerfis[b.autor_nome];
                          return (
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 overflow-hidden">
                                {fotoBanco ? <img src={fotoBanco} className="w-full h-full object-cover" alt="" /> : b.autor_nome?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col items-start truncate text-left">
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate w-full flex items-center gap-1">
                                  {b.banco} <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">@{b.autor_nome}</span>
                                </span>
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate w-full mt-0.5">{b.nome}</span>
                              </div>
                            </div>
                          );
                        }
                      )()
                    ) : (
                      <span className="text-gray-400 font-bold text-sm ml-1">Selecione a instituição...</span>
                    )}
                    <svg className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isBancoDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </button>

                  {isBancoDropdownOpen && (
                    <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                      <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border-y border-white/50 dark:border-gray-700/50 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">🏦 Bancos Cadastrados</div>
                      <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                        {bancos.filter((b) => !somenteMinhasContas || b.user_id === userId).map((banco) => {
                          const fotoBanco = mapPerfis[banco.autor_nome];
                          return (
                            <li key={banco.id}>
                              <button type="button" onClick={() => { setBancoId(banco.id); setIsBancoDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 active:bg-gray-100 dark:active:bg-gray-600 bg-white dark:bg-gray-800">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 overflow-hidden">
                                  {fotoBanco ? <img src={fotoBanco} className="w-full h-full object-cover" alt="" /> : banco.autor_nome?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col truncate">
                                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                                    {banco.banco} <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">@{banco.autor_nome}</span>
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mt-0.5">{banco.nome}</span>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                        <li key="dinheiro_caixinha">
                          <button type="button" onClick={() => { setBancoId("dinheiro"); setIsBancoDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 active:bg-gray-100 dark:active:bg-gray-600 bg-white dark:bg-gray-800">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">💵</div>
                            <div className="flex flex-col truncate">
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">Cofre Físico</span>
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mt-0.5">Dinheiro em espécie</span>
                            </div>
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 flex items-center gap-2 relative z-0">
                  <input type="checkbox" id="filtroBancosCaix" checked={somenteMinhasContas} onChange={(e) => setSomenteMinhasContas(e.target.checked)} className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 cursor-pointer" />
                  <label htmlFor="filtroBancosCaix" className="text-xs font-bold text-gray-500 dark:text-gray-400 cursor-pointer select-none">Mostrar apenas os meus bancos</label>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={isSubmitting} className="w-full py-3.5 rounded-xl text-white bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 font-black uppercase tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-50">
                    {isSubmitting ? "Criando..." : "Salvar Caixinha"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        
        {isModalAcaoOpen && caixinhaAlvo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalAcaoOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
              
              <div className={`px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center ${tipoAcao === 'rendimento' ? 'bg-blue-50 dark:bg-blue-900/20' : tipoAcao === 'aporte' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <div>
                  <h3 className={`text-lg font-black flex items-center gap-2 ${tipoAcao === 'rendimento' ? 'text-blue-700 dark:text-blue-400' : tipoAcao === 'aporte' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {tipoAcao === 'rendimento' ? '📈 Atualizar Rendimento' : tipoAcao === 'aporte' ? '📥 Guardar Dinheiro' : '📤 Resgatar Dinheiro'}
                  </h3>
                  <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-wider">{caixinhaAlvo.nome} • Saldo atual: {formatarMoeda(caixinhaAlvo.saldo)}</p>
                </div>
                <button type="button" onClick={() => setIsModalAcaoOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 text-2xl font-bold self-start">&times;</button>
              </div>
              
              <form onSubmit={handleSalvarAcao} className="p-6 space-y-5">
                {tipoAcao === 'rendimento' && (
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 text-xs font-bold text-blue-800 dark:text-blue-400 leading-relaxed">💡 <strong>Nota:</strong> O rendimento não altera o saldo do seu Dashboard diário. Ele apenas multiplica o valor desta caixinha.</div>
                )}
                {tipoAcao === 'aporte' && (
                  <div className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/50 text-xs font-bold text-green-800 dark:text-green-400 leading-relaxed">💡 <strong>Nota:</strong> Isso vai gerar uma <u>Despesa</u> no seu Dashboard diário para tirar o dinheiro da sua conta corrente.</div>
                )}
                {tipoAcao === 'resgate' && (
                  <div className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/50 text-xs font-bold text-red-800 dark:text-red-400 leading-relaxed">💡 <strong>Nota:</strong> Isso vai gerar uma <u>Receita</u> no seu Dashboard diário simulando o dinheiro voltando para a sua conta.</div>
                )}

                <div className="flex gap-4">
                  <div className="flex-[2]">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Qual o valor? (R$)</label>
                    <input type="number" step="0.01" required value={valorAcao} onChange={(e) => setValorAcao(e.target.value)} placeholder="0.00" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-lg font-black text-gray-900 dark:text-gray-100 focus:ring-4 focus:border-blue-500 focus:ring-blue-500/20 transition-all" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Data</label>
                    <input type="date" required value={dataAcao} onChange={(e) => setDataAcao(e.target.value)} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:ring-4 focus:border-blue-500 focus:ring-blue-500/20 transition-all" />
                  </div>
                </div>

                {tipoAcao !== 'rendimento' && (
                  <div className={`relative ${isContaPonteDropdownOpen ? "z-50" : "z-30"}`}>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">{tipoAcao === 'aporte' ? 'O dinheiro vai sair de qual conta sua?' : 'O dinheiro vai cair em qual conta sua?'}</label>
                    <button type="button" onClick={() => setIsContaPonteDropdownOpen(!isContaPonteDropdownOpen)} className="flex items-center justify-between w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-2.5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all h-[55px]">
                      {contaPonteId ? (() => {
                        const selected = contasCorrentes.find((c) => c.id === contaPonteId);
                        if (!selected) return <span className="text-gray-400 font-bold text-sm ml-1">Selecione...</span>;
                        const fotoConta = mapPerfis[selected.autor_nome];
                        const isDinheiro = selected.tipo === "dinheiro";
                        return (
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ${isDinheiro ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                              {isDinheiro ? "💵" : (fotoConta ? <img src={fotoConta} className="w-full h-full object-cover" alt="" /> : selected.autor_nome?.charAt(0).toUpperCase())}
                            </div>
                            <div className="flex flex-col items-start truncate text-left">
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate w-full">{selected.nome}</span>
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate w-full mt-0.5">{isDinheiro ? "Dinheiro Físico" : `🏦 ${selected.banco_vinculado?.banco} • @${selected.autor_nome}`}</span>
                            </div>
                          </div>
                        );
                      })() : (<span className="text-gray-400 font-bold text-sm ml-1">Selecione a conta corrente/física...</span>)}
                      <svg className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isContaPonteDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </button>

                    {isContaPonteDropdownOpen && (
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                        <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border-y border-white/50 dark:border-gray-700/50 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">💳 Contas Disponíveis</div>
                        <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                          {contasCorrentes.filter(c => !somenteMinhasContas || c.user_id === userId).map((c) => {
                            const fotoConta = mapPerfis[c.autor_nome];
                            const isDinheiro = c.tipo === "dinheiro";
                            return (
                              <li key={c.id}>
                                <button type="button" onClick={() => { setContaPonteId(c.id); setIsContaPonteDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 active:bg-gray-100 dark:active:bg-gray-600 bg-white dark:bg-gray-800">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 overflow-hidden ${isDinheiro ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                                    {isDinheiro ? "💵" : (fotoConta ? <img src={fotoConta} className="w-full h-full object-cover" alt="" /> : c.autor_nome?.charAt(0).toUpperCase())}
                                  </div>
                                  <div className="flex flex-col truncate">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{c.nome}</span>
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mt-0.5">{isDinheiro ? "Dinheiro Físico" : `🏦 ${c.banco_vinculado?.banco} • @${c.autor_nome}`}</span>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <input type="checkbox" id="filtroContasPonte" checked={somenteMinhasContas} onChange={(e) => setSomenteMinhasContas(e.target.checked)} className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 cursor-pointer" />
                      <label htmlFor="filtroContasPonte" className="text-xs font-bold text-gray-500 dark:text-gray-400 cursor-pointer select-none">Mostrar apenas as minhas contas</label>
                    </div>
                  </div>
                )}

                <div className="pt-2 relative z-0">
                  <button type="submit" disabled={isSubmitting} className={`w-full py-4 rounded-xl text-white font-black uppercase tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-50 ${tipoAcao === 'rendimento' ? 'bg-blue-600 hover:bg-blue-700' : tipoAcao === 'aporte' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    {isSubmitting ? "Processando..." : "Confirmar Movimentação"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}