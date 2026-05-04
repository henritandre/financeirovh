"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeContext";

export default function ContasPage() {
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
  const [loading, setLoading] = useState(true);

  const [bancos, setBancos] = useState<any[]>([]);
  const [chaves, setChaves] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<"bancos" | "chaves">("bancos");

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

  const [isBancoModalOpen, setIsBancoModalOpen] = useState(false);
  const [bancoId, setBancoId] = useState<string | null>(null);
  const [nomeBanco, setNomeBanco] = useState("");
  const [instituicaoBanco, setInstituicaoBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [numeroConta, setNumeroConta] = useState("");
  const [tipoContaBancaria, setTipoContaBancaria] = useState<"corrente" | "salario" | "poupanca">("corrente");
  const [bancoIsAtivo, setBancoIsAtivo] = useState(true);
  const [bancoTemVinculo, setBancoTemVinculo] = useState(false);

  const [isChaveModalOpen, setIsChaveModalOpen] = useState(false);
  const [chaveId, setChaveId] = useState<string | null>(null);
  const [nomeChave, setNomeChave] = useState("");
  const [tipoChavePagto, setTipoChavePagto] = useState<"corrente" | "credito" | "dinheiro">("corrente");
  const [contaBancariaId, setContaBancariaId] = useState(""); 
  const [ultimosDigitos, setUltimosDigitos] = useState("");
  const [subtipo, setSubtipo] = useState<"debito" | "pix">("debito");
  const [tipoChavePix, setTipoChavePix] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [diaFechamento, setDiaFechamento] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");
  const [chaveTemMovimentacao, setChaveTemMovimentacao] = useState(false);
  const [chaveIsAtivo, setChaveIsAtivo] = useState(true);

  const [isBancoDropdownOpen, setIsBancoDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    const { data: bancosData } = await supabase.from("contas_bancarias").select("*").order("nome", { ascending: true });
    if (bancosData) setBancos(bancosData);

    const { data: chavesData } = await supabase.from("contas").select("*, banco_vinculado:contas_bancarias(nome, banco)").order("tipo", { ascending: true }).order("nome", { ascending: true });
    if (chavesData) setChaves(chavesData);
    setLoading(false);
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { 
        setUserId(user.id); 
        setEmail(user.email || "");
        setUsername(user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || "Usuário"); 
        setFullName(user.user_metadata?.full_name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
        carregarDados(); 
      } else { router.push("/login"); }
    };
    loadInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const abrirModalNovoBanco = () => {
    setBancoId(null); setNomeBanco(""); setInstituicaoBanco(""); setAgencia(""); setNumeroConta(""); setTipoContaBancaria("corrente"); setBancoIsAtivo(true); setBancoTemVinculo(false);
    setIsBancoModalOpen(true);
  };

  const abrirModalEditarBanco = async (banco: any) => {
    if (banco.user_id !== userId) { showIsland("Você só pode editar as suas próprias contas.", "error", "🛑"); return; }
    setBancoId(banco.id); setNomeBanco(banco.nome); setInstituicaoBanco(banco.banco); setAgencia(banco.agencia || ""); setNumeroConta(banco.numero_conta || ""); setTipoContaBancaria(banco.tipo_conta); setBancoIsAtivo(banco.ativo);
    const { count } = await supabase.from("contas").select("*", { count: 'exact', head: true }).eq("conta_bancaria_id", banco.id);
    setBancoTemVinculo((count || 0) > 0);
    setIsBancoModalOpen(true);
  };

  const handleSalvarBanco = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    const payload = { user_id: userId, autor_nome: username, nome: nomeBanco, banco: instituicaoBanco, agencia, numero_conta: numeroConta, tipo_conta: tipoContaBancaria };
    if (bancoId) {
      const { error } = await supabase.from("contas_bancarias").update(payload).eq("id", bancoId);
      if (error) showIsland("Erro: " + error.message, "error", "🛑"); else { showIsland("Banco atualizado!", "success", "✏️"); setIsBancoModalOpen(false); carregarDados(); }
    } else {
      const { error } = await supabase.from("contas_bancarias").insert([payload]);
      if (error) showIsland("Erro: " + error.message, "error", "🛑"); else { showIsland("Banco cadastrado!", "success", "🎉"); setIsBancoModalOpen(false); carregarDados(); }
    }
    setIsSubmitting(false);
  };

  const handleExcluirBanco = async () => {
    if (bancoTemVinculo) {
      const acao = bancoIsAtivo ? "inativar" : "reativar";
      if (!confirm(`Deseja ${acao} esta instituição?`)) return;
      setIsSubmitting(true);
      const { error } = await supabase.from("contas_bancarias").update({ ativo: !bancoIsAtivo }).eq("id", bancoId);
      setIsSubmitting(false);
      if (error) showIsland("Erro: " + error.message, "error", "🛑"); else { showIsland(`Instituição ${acao}da!`, "success", "✏️"); setIsBancoModalOpen(false); carregarDados(); }
    } else {
      if (!confirm("Deseja apagar definitivamente este banco?")) return;
      setIsSubmitting(true);
      const { error } = await supabase.from("contas_bancarias").delete().eq("id", bancoId);
      setIsSubmitting(false);
      if (error) showIsland("Erro: " + error.message, "error", "🛑"); else { showIsland("Banco apagado!", "success", "🗑️"); setIsBancoModalOpen(false); carregarDados(); }
    }
  };

  const abrirModalNovaChave = () => {
    setChaveId(null); setNomeChave(""); setTipoChavePagto("corrente"); setContaBancariaId(""); setUltimosDigitos(""); setSubtipo("debito"); setTipoChavePix(""); setChavePix(""); setDiaFechamento(""); setDiaVencimento(""); setChaveTemMovimentacao(false); setChaveIsAtivo(true); setIsBancoDropdownOpen(false);
    setIsChaveModalOpen(true);
  };

  const abrirModalEditarChave = async (chave: any) => {
    if (chave.tipo !== "dinheiro" && chave.user_id !== userId) { showIsland("Edite apenas as suas contas.", "error", "🛑"); return; }
    setChaveId(chave.id); setNomeChave(chave.nome); setTipoChavePagto(chave.tipo); setContaBancariaId(chave.conta_bancaria_id || ""); setUltimosDigitos(chave.ultimos_digitos || ""); setSubtipo(chave.subtipo || "debito"); setTipoChavePix(chave.tipo_chave_pix || ""); setChavePix(chave.chave_pix || ""); setDiaFechamento(chave.dia_fechamento || ""); setDiaVencimento(chave.dia_vencimento || ""); setChaveIsAtivo(chave.ativo !== false); setIsBancoDropdownOpen(false);
    const { count } = await supabase.from("transacoes").select("*", { count: 'exact', head: true }).eq("conta_id", chave.id);
    setChaveTemMovimentacao((count || 0) > 0);
    setIsChaveModalOpen(true);
  };

  const handleSalvarChave = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    if (tipoChavePagto === "credito" && (!diaFechamento || !diaVencimento)) { showIsland("Preencha os dias da fatura!", "error", "🛑"); setIsSubmitting(false); return; }
    if (tipoChavePagto === "corrente" && subtipo === "pix" && (!tipoChavePix || !chavePix)) { showIsland("Preencha a chave PIX!", "error", "🛑"); setIsSubmitting(false); return; }
    if (tipoChavePagto !== 'dinheiro' && !contaBancariaId) { showIsland("Vincule a uma Instituição Bancária!", "error", "🛑"); setIsSubmitting(false); return; }

    const payload = {
      nome: nomeChave, tipo: tipoChavePagto,
      conta_bancaria_id: tipoChavePagto !== 'dinheiro' ? contaBancariaId : null,
      ultimos_digitos: (tipoChavePagto === 'credito' || (tipoChavePagto === 'corrente' && subtipo === 'debito')) ? ultimosDigitos : null,
      subtipo: tipoChavePagto === 'corrente' ? subtipo : null,
      tipo_chave_pix: (tipoChavePagto === 'corrente' && subtipo === 'pix') ? tipoChavePix : null,
      chave_pix: (tipoChavePagto === 'corrente' && subtipo === 'pix') ? chavePix : null,
      dia_fechamento: tipoChavePagto === "credito" ? Number(diaFechamento) : null,
      dia_vencimento: tipoChavePagto === "credito" ? Number(diaVencimento) : null,
      user_id: userId, autor_nome: tipoChavePagto === "dinheiro" ? "Família" : username 
    };

    if (chaveId) {
      const { error } = await supabase.from("contas").update(payload).eq("id", chaveId);
      if (error) showIsland("Erro: " + error.message, "error", "🛑"); else { showIsland("Forma de pagamento atualizada!", "success", "✏️"); setIsChaveModalOpen(false); carregarDados(); }
    } else {
      const { error } = await supabase.from("contas").insert([payload]);
      if (error) showIsland("Erro: " + error.message, "error", "🛑"); else { showIsland("Cadastrado com sucesso!", "success", "🎉"); setIsChaveModalOpen(false); carregarDados(); }
    }
    setIsSubmitting(false);
  };

  const handleExcluirChave = async () => {
    if (chaveTemMovimentacao) {
      const acao = chaveIsAtivo ? "inativar" : "reativar";
      if (!confirm(`Deseja ${acao} esta forma de pagamento?`)) return;
      setIsSubmitting(true);
      const { error } = await supabase.from("contas").update({ ativo: !chaveIsAtivo }).eq("id", chaveId);
      setIsSubmitting(false);
      if (error) showIsland("Erro: " + error.message, "error", "🛑"); else { showIsland(`Sucesso!`, "success", "✏️"); setIsChaveModalOpen(false); carregarDados(); }
    } else {
      if (!confirm("Apagar definitivamente?")) return;
      setIsSubmitting(true);
      const { error } = await supabase.from("contas").delete().eq("id", chaveId);
      setIsSubmitting(false);
      if (error) showIsland("Erro: " + error.message, "error", "🛑"); else { showIsland("Apagado!", "success", "🗑️"); setIsChaveModalOpen(false); carregarDados(); }
    }
  };

  const chavesCorrentes = chaves.filter(c => c.tipo === "corrente");
  const chavesCredito = chaves.filter(c => c.tipo === "credito");
  const chavesDinheiro = chaves.filter(c => c.tipo === "dinheiro");
  const bancosAtivos = bancos.filter(b => b.ativo !== false);
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

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-10 transition-colors duration-300 relative">
        
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
          <h1 className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            Gestão Bancária
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

        <main className="max-w-5xl mx-auto mt-8 p-6">
          
          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0s' }}>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">Arquitetura de Contas</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold mt-1">Crie seus Bancos e depois conecte seus Cartões e PIX a eles.</p>
            </div>
            
            <div className="flex bg-gray-200 dark:bg-gray-800 p-1.5 rounded-xl w-full sm:w-auto">
              <button onClick={() => setActiveTab("bancos")} className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-black rounded-lg transition-all ${activeTab === "bancos" ? "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>🏦 Bancos</button>
              <button onClick={() => setActiveTab("chaves")} className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-black rounded-lg transition-all ${activeTab === "chaves" ? "bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>💳 Pagamentos</button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : (
            <div className={`animate-in fade-in duration-300 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.1s' }}>
              
              {activeTab === 'bancos' && (
                <div className="space-y-6">
                  <div className="flex justify-end"><button onClick={abrirModalNovoBanco} className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm active:scale-95 transition-all">+ Novo Banco / Instituição</button></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {bancos.map(banco => (
                      <div key={banco.id} className={`bg-white dark:bg-gray-800 rounded-2xl border ${banco.ativo === false ? 'border-gray-200 dark:border-gray-700 opacity-60' : 'border-blue-100 dark:border-blue-900/50 shadow-sm hover:border-blue-300 dark:hover:border-blue-700'} p-5 flex flex-col justify-between transition-all group`}>
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${banco.tipo_conta === 'corrente' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : banco.tipo_conta === 'salario' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>
                              CONTA {banco.tipo_conta}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">@{banco.autor_nome}</span>
                          </div>
                          <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">{banco.nome}</h3>
                          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{banco.banco}</p>
                          
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                            <span>Ag: {banco.agencia || '---'}</span>
                            <span>Cc: {banco.numero_conta || '---'}</span>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-between items-center">
                          {banco.ativo === false ? <span className="text-[10px] font-black text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">INATIVA</span> : <span />}
                          <button onClick={() => abrirModalEditarBanco(banco)} className="p-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                        </div>
                      </div>
                    ))}
                    {bancos.length === 0 && <div className="col-span-full text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700"><span className="text-4xl opacity-50 mb-2 block">🏦</span><p className="font-bold text-gray-500 dark:text-gray-400">Nenhum banco cadastrado.</p></div>}
                  </div>
                </div>
              )}

              {activeTab === 'chaves' && (
                <div className="space-y-6">
                  <div className="flex justify-end"><button onClick={abrirModalNovaChave} className="bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm active:scale-95 transition-all">+ Nova Forma de Pagto</button></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-emerald-50/50 dark:bg-emerald-900/20 flex items-center gap-2"><svg className="text-emerald-600 dark:text-emerald-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg><h3 className="text-lg font-black text-emerald-900 dark:text-emerald-400">Dinheiro Físico</h3></div>
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                          {chavesDinheiro.map((conta) => (
                            <li key={conta.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center group ${conta.ativo === false ? 'opacity-60 bg-gray-50/50 dark:bg-gray-800/50' : ''}`}>
                              <div>
                                <div className="flex items-center gap-2"><span className="font-bold text-gray-800 dark:text-gray-200">{conta.nome}</span><span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Compartilhado</span>{conta.ativo === false && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">INATIVA</span>}</div>
                                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mt-0.5">Sem vínculo bancário</span>
                              </div>
                              <button onClick={() => abrirModalEditarChave(conta)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/20 flex items-center gap-2"><svg className="text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10h20"/><path d="M12 2v20"/><path d="M20 16a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/><path d="M8 8a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/></svg><h3 className="text-lg font-black text-blue-900 dark:text-blue-400">Débito / PIX</h3></div>
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                          {chavesCorrentes.map((conta) => (
                            <li key={conta.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center group ${conta.ativo === false ? 'opacity-60 bg-gray-50/50 dark:bg-gray-800/50' : ''}`}>
                              <div>
                                <div className="flex items-center gap-2"><span className="font-bold text-gray-800 dark:text-gray-200">{conta.nome}</span><span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide ${conta.user_id === userId ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>@{conta.autor_nome}</span>{conta.ativo === false && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">INATIVA</span>}</div>
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded block mt-1 w-fit">🏦 {conta.banco_vinculado?.banco || 'Banco não vinculado'}</span>
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mt-1">
                                  {conta.subtipo === 'pix' ? `PIX: ${conta.chave_pix}` : `DÉBITO • FINAL ${conta.ultimos_digitos}`}
                                </span>
                              </div>
                              <button onClick={() => abrirModalEditarChave(conta)} className={`p-2 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${conta.user_id === userId ? 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30' : 'text-gray-200 dark:text-gray-700 cursor-not-allowed'}`}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-fit">
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-purple-50/50 dark:bg-purple-900/20 flex items-center gap-2"><svg className="text-purple-600 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg><h3 className="text-lg font-black text-purple-900 dark:text-purple-400">Cartões de Crédito</h3></div>
                      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {chavesCredito.map((conta) => (
                          <li key={conta.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center group ${conta.ativo === false ? 'opacity-60 bg-gray-50/50 dark:bg-gray-800/50' : ''}`}>
                            <div>
                              <div className="flex items-center gap-2"><span className="font-bold text-gray-800 dark:text-gray-200">{conta.nome}</span><span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide ${conta.user_id === userId ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>@{conta.autor_nome}</span>{conta.ativo === false && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">INATIVO</span>}</div>
                              {conta.banco_vinculado && <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded block mt-1 w-fit">🏦 Vinculado: {conta.banco_vinculado.banco}</span>}
                              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mt-1">FINAL {conta.ultimos_digitos}</span>
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5 block uppercase tracking-wider">Fecha dia {conta.dia_fechamento} • Vence dia {conta.dia_vencimento}</span>
                            </div>
                            <button onClick={() => abrirModalEditarChave(conta)} className={`p-2 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${conta.user_id === userId ? 'text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30' : 'text-gray-200 dark:text-gray-700 cursor-not-allowed'}`}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        
        {isBancoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsBancoModalOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80"><h3 className="text-lg font-black text-gray-900 dark:text-gray-100">{bancoId ? "Editar Banco" : "Novo Banco / Instituição"}</h3><button onClick={() => setIsBancoModalOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-2xl font-bold">&times;</button></div>
              <form onSubmit={handleSalvarBanco} className="p-6 space-y-4">
                <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl gap-1">
                  <button type="button" onClick={() => setTipoContaBancaria("corrente")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipoContaBancaria === "corrente" ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Corrente</button>
                  <button type="button" onClick={() => setTipoContaBancaria("salario")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipoContaBancaria === "salario" ? "bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Salário</button>
                  <button type="button" onClick={() => setTipoContaBancaria("poupanca")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipoContaBancaria === "poupanca" ? "bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Poupança</button>
                </div>
                <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Apelido do Cofre</label><input type="text" required value={nomeBanco} onChange={(e) => setNomeBanco(e.target.value)} placeholder="Ex: Conta Principal Nubank" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" /></div>
                <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Nome da Instituição</label><input type="text" required value={instituicaoBanco} onChange={(e) => setInstituicaoBanco(e.target.value)} placeholder="Ex: Nubank, Itaú, Bradesco" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" /></div>
                <div className="flex gap-4">
                  <div className="flex-1"><label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Agência</label><input type="text" value={agencia} onChange={(e) => setAgencia(e.target.value)} placeholder="0001" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" /></div>
                  <div className="flex-[2]"><label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Número da Conta</label><input type="text" value={numeroConta} onChange={(e) => setNumeroConta(e.target.value)} placeholder="123456-7" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" /></div>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  {bancoId && bancoTemVinculo && (<p className={`text-[10px] font-bold text-center leading-tight p-2.5 rounded-xl border ${bancoIsAtivo ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800' : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800'}`}>{bancoIsAtivo ? "Possui cartões/PIX vinculados. O banco será apenas inativado." : "Banco inativo. Deseja reativar?"}</p>)}
                  <div className="flex gap-3">
                    {bancoId && (
                      <button type="button" onClick={handleExcluirBanco} disabled={isSubmitting} className={`px-4 py-3.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center shrink-0 ${bancoTemVinculo ? (bancoIsAtivo ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800' : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800') : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800'}`}>
                        {bancoTemVinculo ? (bancoIsAtivo ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>) : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>}
                      </button>
                    )}
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-50">{isSubmitting ? "Salvando..." : "Salvar Banco"}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        
        {isChaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsChaveModalOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-700">
              <div className="sticky top-0 z-[60] px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md"><h3 className="text-lg font-black text-gray-900 dark:text-gray-100">{chaveId ? "Editar Pagamento" : "Nova Forma de Pagto"}</h3><button type="button" onClick={() => setIsChaveModalOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-2xl font-bold">&times;</button></div>
              <form onSubmit={handleSalvarChave} className="p-6 space-y-5">
                
                <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl gap-1">
                  <button type="button" onClick={() => setTipoChavePagto("corrente")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipoChavePagto === "corrente" ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Débito/PIX</button>
                  <button type="button" onClick={() => setTipoChavePagto("credito")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipoChavePagto === "credito" ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Cartão Créd</button>
                  <button type="button" onClick={() => setTipoChavePagto("dinheiro")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipoChavePagto === "dinheiro" ? "bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Físico</button>
                </div>

                <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Apelido do Pagamento</label><input type="text" required value={nomeChave} onChange={(e) => setNomeChave(e.target.value)} placeholder={tipoChavePagto === 'dinheiro' ? "Ex: Carteira, Cofre..." : "Ex: Cartão Black, PIX Pessoal..."} className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" /></div>

                {tipoChavePagto !== 'dinheiro' && (
                  <div className={`bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 animate-in fade-in relative ${isBancoDropdownOpen ? 'z-50' : 'z-20'}`}>
                    <label className="block text-xs font-bold text-blue-800 dark:text-blue-400 mb-2 uppercase tracking-wider flex items-center gap-1">🏦 Vincular a qual Banco?</label>
                    
                    <button type="button" onClick={() => setIsBancoDropdownOpen(!isBancoDropdownOpen)} className="flex items-center justify-between w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 p-2.5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all min-h-[55px]">
                      {contaBancariaId ? (() => {
                        const b = bancosAtivos.find(x => x.id === contaBancariaId);
                        if (!b) return <span className="text-gray-400 font-bold text-sm ml-1">Selecione um banco...</span>;
                        return (
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-sm font-black shrink-0">
                              {b.autor_nome?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col items-start truncate text-left">
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate w-full flex items-center gap-1">
                                {b.banco} <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">@{b.autor_nome}</span>
                              </span>
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate w-full mt-0.5">
                                {b.nome} • Ag: {b.agencia || '--'} Cc: {b.numero_conta || '--'}
                              </span>
                            </div>
                          </div>
                        );
                      })() : (<span className="text-gray-400 font-bold text-sm ml-1">Selecione um banco...</span>)}
                      <svg className={`w-5 h-5 text-blue-400 transition-transform shrink-0 ${isBancoDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </button>

                    {isBancoDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsBancoDropdownOpen(false)}></div>
                        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                          {bancosAtivos.length === 0 ? (
                            <div className="p-4 text-center text-sm font-bold text-gray-500 dark:text-gray-400">Nenhum banco ativo cadastrado.</div>
                          ) : (
                            <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                              {bancosAtivos.map(b => (
                                <li key={b.id}>
                                  <button type="button" onClick={() => { setContaBancariaId(b.id); setIsBancoDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 active:bg-blue-100 dark:active:bg-gray-600 bg-white dark:bg-gray-800">
                                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-sm font-black shrink-0">
                                      {b.autor_nome?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col truncate">
                                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                                        {b.banco} <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">@{b.autor_nome}</span>
                                      </span>
                                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mt-0.5">
                                        {b.nome} • Ag: {b.agencia || '--'} Cc: {b.numero_conta || '--'}
                                      </span>
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {tipoChavePagto !== 'dinheiro' && (tipoChavePagto === 'credito' || (tipoChavePagto === 'corrente' && subtipo === 'debito')) && (
                    <div className="relative z-0"><label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Últimos 4 Dígitos</label><input type="text" maxLength={4} required value={ultimosDigitos} onChange={(e) => setUltimosDigitos(e.target.value.replace(/\D/g, ''))} placeholder="1234" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 text-center tracking-widest focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" /></div>
                )}

                {tipoChavePagto === 'corrente' && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl space-y-4 animate-in zoom-in-95 relative z-0">
                    <div className="flex p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg gap-1"><button type="button" onClick={() => setSubtipo("debito")} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${subtipo === "debito" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>Cartão Débito</button><button type="button" onClick={() => setSubtipo("pix")} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${subtipo === "pix" ? "bg-green-600 text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>Chave PIX</button></div>
                    {subtipo === 'pix' && (
                      <div className="flex gap-3 animate-in fade-in">
                        <div className="flex-1"><label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Tipo</label><select required value={tipoChavePix} onChange={(e) => setTipoChavePix(e.target.value)} className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2.5 text-xs font-bold text-gray-900 dark:text-gray-100 focus:border-green-500"><option value="" disabled>Selecione...</option><option value="cpf">CPF/CNPJ</option><option value="celular">Celular</option><option value="email">E-mail</option><option value="aleatoria">Aleatória</option></select></div>
                        <div className="flex-[2]"><label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Chave PIX</label><input type="text" required value={chavePix} onChange={(e) => setChavePix(e.target.value)} placeholder="Sua chave..." className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2.5 text-xs font-bold text-gray-900 dark:text-gray-100 focus:border-green-500" /></div>
                      </div>
                    )}
                  </div>
                )}

                {tipoChavePagto === 'credito' && (
                  <div className="flex gap-4 p-4 bg-purple-50/50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl animate-in zoom-in-95 relative z-0">
                    <div className="flex-1"><label className="block text-[10px] font-bold text-purple-700 dark:text-purple-400 mb-1 uppercase tracking-wider">Dia Fechamento</label><input type="number" min="1" max="31" required value={diaFechamento} onChange={(e) => setDiaFechamento(e.target.value)} placeholder="Ex: 10" className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2.5 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20" /></div>
                    <div className="flex-1"><label className="block text-[10px] font-bold text-purple-700 dark:text-purple-400 mb-1 uppercase tracking-wider">Dia Vencimento</label><input type="number" min="1" max="31" required value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} placeholder="Ex: 17" className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2.5 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20" /></div>
                  </div>
                )}
                
                <div className="flex flex-col gap-2 pt-2 relative z-0">
                  {chaveId && chaveTemMovimentacao && (<p className={`text-[10px] font-bold text-center leading-tight p-2.5 rounded-xl border ${chaveIsAtivo ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800' : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800'}`}>{chaveIsAtivo ? "Existem movimentações. A conta não será apagada, apenas inativada." : "Esta conta está inativa e oculta. Deseja reativá-la?"}</p>)}
                  <div className="flex gap-3">
                    {chaveId && (
                      <button type="button" onClick={handleExcluirChave} disabled={isSubmitting} className={`px-4 py-3.5 rounded-xl font-bold transition-all active:scale-95 shrink-0 flex items-center justify-center ${chaveTemMovimentacao ? (chaveIsAtivo ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800' : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800') : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800'}`}>
                        {chaveTemMovimentacao ? (chaveIsAtivo ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>) : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>}
                      </button>
                    )}
                    <button type="submit" disabled={isSubmitting} className={`flex-1 py-3.5 rounded-xl text-white font-black uppercase tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-50 ${tipoChavePagto === 'credito' ? 'bg-purple-600 hover:bg-purple-700' : tipoChavePagto === 'dinheiro' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{isSubmitting ? "Carregando..." : "Salvar"}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}