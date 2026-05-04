"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeContext";

export default function InsightsPage() {
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

  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [mapPerfis, setMapPerfis] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [mesAtual, setMesAtual] = useState(new Date());
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<string[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);

  const formatarMoeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const carregarDados = async () => {
    setIsLoading(true);
    const { data: perfisData } = await supabase.from("profiles").select("username, avatar_url");
    if (perfisData) {
      const mapa: Record<string, string> = {};
      perfisData.forEach((p) => { if (p.username && p.avatar_url) mapa[p.username] = p.avatar_url; });
      setMapPerfis(mapa);
    }

    const { data: historico } = await supabase.from("transacoes").select("*, categorias(nome), conta_origem:contas!conta_id(nome, tipo, autor_nome)").order("data", { ascending: false });

    if (historico) {
      setTransacoes(historico);
      const autoresTransacoes = historico.map((t) => t.autor_nome || "Usuário");
      const unicos = Array.from(new Set([...autoresTransacoes, username || "Usuário"].filter((n) => n && n !== "Família")));
      setUsuariosDisponiveis(unicos);
      setUsuariosSelecionados(unicos); 
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id); setEmail(user.email || "");
        setUsername(user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário");
        setFullName(user.user_metadata?.full_name || ""); setAvatarUrl(user.user_metadata?.avatar_url || "");
        carregarDados();
      } else { router.push("/login"); }
    };
    loadInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const alterarMes = (delta: number) => setMesAtual((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const toggleUsuario = (nome: string) => setUsuariosSelecionados((prev) => prev.includes(nome) ? prev.filter((u) => u !== nome) : [...prev, nome]);

  const hojeData = new Date();
  const transacoesDoMes = transacoes.filter((t) => {
    const dataT = new Date(t.data + "T00:00:00"); 
    const isMesmoMes = dataT.getMonth() === mesAtual.getMonth() && dataT.getFullYear() === mesAtual.getFullYear();
    const isUsuarioSelecionado = t.autor_nome === "Família" || usuariosSelecionados.includes(t.autor_nome || "Usuário");
    return isMesmoMes && isUsuarioSelecionado && t.tipo !== "transferencia";
  });

  const receitas = transacoesDoMes.filter((t) => t.tipo === "receita").reduce((acc, t) => acc + Number(t.valor), 0);
  const despesas = transacoesDoMes.filter((t) => t.tipo === "despesa").reduce((acc, t) => acc + Number(t.valor), 0);
  const saldoMes = receitas - despesas;
  const taxaPoupanca = receitas > 0 ? ((saldoMes / receitas) * 100).toFixed(1) : "0.0";

  const mesAnterior = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1);
  const transacoesMesAnterior = transacoes.filter((t) => {
    const dataT = new Date(t.data + "T00:00:00"); 
    const isMesAnterior = dataT.getMonth() === mesAnterior.getMonth() && dataT.getFullYear() === mesAnterior.getFullYear();
    const isUsuarioSelecionado = t.autor_nome === "Família" || usuariosSelecionados.includes(t.autor_nome || "Usuário");
    return isMesAnterior && isUsuarioSelecionado && t.tipo !== "transferencia";
  });
  
  const despesasAnteriores = transacoesMesAnterior.filter((t) => t.tipo === "despesa").reduce((acc, t) => acc + Number(t.valor), 0);
  const variacaoDespesa = despesasAnteriores > 0 ? (((despesas - despesasAnteriores) / despesasAnteriores) * 100) : 0;

  const isMesmoMesAtualReais = hojeData.getMonth() === mesAtual.getMonth() && hojeData.getFullYear() === mesAtual.getFullYear();
  const diasDivisor = isMesmoMesAtualReais ? hojeData.getDate() : new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate();
  const gastoDiario = despesas / diasDivisor;

  const gastosPorCategoria = transacoesDoMes.filter((t) => t.tipo === "despesa").reduce((acc: any, t) => {
    const cat = t.categorias?.nome || "Sem categoria"; acc[cat] = (acc[cat] || 0) + Number(t.valor); return acc;
  }, {});
  const categoriasOrdenadas = Object.entries(gastosPorCategoria).map(([nome, valor]) => ({ nome, valor: valor as number })).sort((a, b) => b.valor - a.valor);

  const receitasPorCategoria = transacoesDoMes.filter((t) => t.tipo === "receita").reduce((acc: any, t) => {
    const cat = t.categorias?.nome || "Sem categoria"; acc[cat] = (acc[cat] || 0) + Number(t.valor); return acc;
  }, {});
  const receitasOrdenadas = Object.entries(receitasPorCategoria).map(([nome, valor]) => ({ nome, valor: valor as number })).sort((a, b) => b.valor - a.valor);

  const gastosPorPagamento = transacoesDoMes.filter((t) => t.tipo === "despesa").reduce((acc: any, t) => {
    let tipoPag = "Débito / PIX"; if (t.conta_origem?.tipo === "credito") tipoPag = "Cartão de Crédito"; if (t.conta_origem?.tipo === "dinheiro") tipoPag = "Dinheiro Físico";
    acc[tipoPag] = (acc[tipoPag] || 0) + Number(t.valor); return acc;
  }, {});
  const pagamentosOrdenados = Object.entries(gastosPorPagamento).map(([nome, valor]) => ({ nome, valor: valor as number })).sort((a, b) => b.valor - a.valor);

  const maioresGastos = transacoesDoMes.filter((t) => t.tipo === "despesa").sort((a, b) => Number(b.valor) - Number(a.valor)).slice(0, 3);
  const nomeDoMes = mesAtual.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const initialLetterMenu = username ? username.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";

  return (
    <>
      <style>{`
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
        
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center relative z-10 transition-colors">
          <h1 className="text-xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 tracking-tight">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            Insights
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
                      <button onClick={() => router.push("/investimentos")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">💰 Gestão de Patrimônio</button>
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

        <main className="p-6 max-w-6xl mx-auto space-y-6 mt-4">
          
          <div className={`bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-6 transition-colors mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0s' }}>
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 transition-colors">
              <button onClick={() => alterarMes(-1)} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
              <span className="w-40 text-center text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider capitalize-first">{nomeDoMes}</span>
              <button onClick={() => alterarMes(1)} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
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

          {isLoading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600"></div></div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.1s' }}>
                <div className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 p-6 rounded-3xl border border-green-100 dark:border-green-800/50 shadow-sm flex flex-col justify-between transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black text-green-800 dark:text-green-400 uppercase tracking-wider">Entradas</h3>
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></div>
                  </div>
                  <p className="text-3xl font-black text-green-600 dark:text-green-400">{formatarMoeda(receitas)}</p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 p-6 rounded-3xl border border-red-100 dark:border-red-800/50 shadow-sm flex flex-col justify-between transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black text-red-800 dark:text-red-400 uppercase tracking-wider">Saídas</h3>
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg></div>
                  </div>
                  <p className="text-3xl font-black text-red-600 dark:text-red-400">{formatarMoeda(despesas)}</p>
                </div>

                <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-colors ${saldoMes >= 0 ? "bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 border-blue-100 dark:border-blue-800/50" : "bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-800 border-orange-100 dark:border-orange-800/50"}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-xs font-black uppercase tracking-wider ${saldoMes >= 0 ? "text-blue-800 dark:text-blue-400" : "text-orange-800 dark:text-orange-400"}`}>Sobrou (Balanço)</h3>
                    <div className={`px-2 py-1 rounded-md text-[10px] font-black ${saldoMes >= 0 ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300" : "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300"}`}>
                      {Number(taxaPoupanca) >= 0 ? `GUARDOU ${taxaPoupanca}%` : "DÉFICIT"}
                    </div>
                  </div>
                  <p className={`text-3xl font-black ${saldoMes >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>{formatarMoeda(saldoMes)}</p>
                </div>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.15s' }}>
                 <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4 transition-colors">
                   <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl">⏱️</div>
                   <div>
                     <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Média de Gasto Diário</p>
                     <p className="text-xl font-black text-gray-900 dark:text-gray-100 mt-0.5">{formatarMoeda(gastoDiario)} <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">/dia</span></p>
                   </div>
                 </div>
                 
                 <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between transition-colors">
                   <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${variacaoDespesa <= 0 ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                       {variacaoDespesa <= 0 ? '📉' : '📈'}
                     </div>
                     <div>
                       <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">vs. Mês Anterior</p>
                       <p className="text-xl font-black text-gray-900 dark:text-gray-100 mt-0.5">
                         {variacaoDespesa === 0 ? "Mesmo gasto" : `${Math.abs(variacaoDespesa).toFixed(1)}%`}
                         {variacaoDespesa !== 0 && <span className="text-xs text-gray-400 dark:text-gray-500 font-medium ml-1">{variacaoDespesa > 0 ? "a mais" : "a menos"}</span>}
                       </p>
                     </div>
                   </div>
                 </div>
              </div>

              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.2s' }}>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                  <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-1">Para onde o dinheiro foi?</h3>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">Despesas por Categoria</p>
                  {categoriasOrdenadas.length === 0 ? ( <p className="text-sm font-bold text-gray-400 text-center py-10">Nenhum gasto neste mês.</p> ) : (
                    <div className="space-y-5">
                      {categoriasOrdenadas.map((cat, index) => {
                        const percentual = ((cat.valor / despesas) * 100).toFixed(1);
                        const corBarra = index === 0 ? "bg-red-500" : index === 1 ? "bg-orange-500" : index === 2 ? "bg-blue-500" : "bg-gray-400 dark:bg-gray-600";
                        return (
                          <div key={cat.nome}>
                            <div className="flex justify-between items-end mb-1.5"><span className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate pr-4">{cat.nome}</span><div className="flex flex-col items-end"><span className="text-sm font-black text-gray-900 dark:text-gray-100">{formatarMoeda(cat.valor)}</span><span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{percentual}%</span></div></div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden"><div className={`h-2.5 rounded-full transition-all duration-1000 ${corBarra}`} style={{ width: `${percentual}%` }}></div></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                  <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-1">De onde o dinheiro veio?</h3>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">Receitas por Categoria</p>
                  {receitasOrdenadas.length === 0 ? ( <p className="text-sm font-bold text-gray-400 text-center py-10">Nenhuma entrada neste mês.</p> ) : (
                    <div className="space-y-5">
                      {receitasOrdenadas.map((cat, index) => {
                        const percentual = ((cat.valor / receitas) * 100).toFixed(1);
                        const corBarra = index === 0 ? "bg-green-500" : index === 1 ? "bg-emerald-400" : "bg-teal-300";
                        return (
                          <div key={cat.nome}>
                            <div className="flex justify-between items-end mb-1.5"><span className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate pr-4">{cat.nome}</span><div className="flex flex-col items-end"><span className="text-sm font-black text-gray-900 dark:text-gray-100">{formatarMoeda(cat.valor)}</span><span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{percentual}%</span></div></div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden"><div className={`h-2.5 rounded-full transition-all duration-1000 ${corBarra}`} style={{ width: `${percentual}%` }}></div></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.25s' }}>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col transition-colors">
                  <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-1">Top 3 Pesos Pesados</h3>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">As maiores compras do mês</p>
                  {maioresGastos.length === 0 ? ( <p className="text-sm font-bold text-gray-400 text-center py-10 my-auto">Nenhum gasto neste mês.</p> ) : (
                    <ul className="space-y-4">
                      {maioresGastos.map((t, index) => {
                        const fotoUsuario = mapPerfis[t.autor_nome];
                        return (
                          <li key={t.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${index === 0 ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : index === 1 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"}`}>#{index + 1}</div>
                            <div className="flex-1 truncate">
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{t.descricao}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded uppercase tracking-wider">{t.categorias?.nome || "Sem Categoria"}</span>
                                <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[8px] font-black overflow-hidden" title={t.autor_nome}>{fotoUsuario ? <img src={fotoUsuario} alt="" className="w-full h-full object-cover"/> : t.autor_nome?.charAt(0).toUpperCase()}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-base font-black text-gray-900 dark:text-gray-100">{formatarMoeda(t.valor)}</p>
                              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{new Date(t.data).toLocaleDateString("pt-BR")}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                  <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-1">Hábitos de Pagamento</h3>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">Como você paga suas contas</p>
                  {pagamentosOrdenados.length === 0 ? ( <p className="text-sm font-bold text-gray-400 text-center py-10">Nenhum gasto neste mês.</p> ) : (
                    <div className="space-y-4">
                      {pagamentosOrdenados.map((pag, index) => {
                        const percentual = ((pag.valor / despesas) * 100).toFixed(1);
                        const icon = pag.nome === 'Cartão de Crédito' ? '💳' : pag.nome === 'Dinheiro Físico' ? '💵' : '📱';
                        return (
                           <div key={pag.nome} className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-lg">{icon}</div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{pag.nome}</p>
                                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5 uppercase tracking-wider">{percentual}% do total</p>
                                </div>
                              </div>
                              <span className="text-base font-black text-gray-900 dark:text-gray-100">{formatarMoeda(pag.valor)}</span>
                           </div>
                        )
                      })}

                      <div className="mt-4 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-800/50 flex gap-3 items-start">
                        <span className="text-xl">💡</span>
                        <div>
                          <h4 className="text-xs font-black text-purple-800 dark:text-purple-400 uppercase tracking-wider mb-1">Análise de Risco</h4>
                          <p className="text-xs font-bold text-purple-600/80 dark:text-purple-400/80 leading-relaxed">
                            {pagamentosOrdenados.find(p => p.nome === 'Cartão de Crédito') && (pagamentosOrdenados.find(p => p.nome === 'Cartão de Crédito')!.valor / despesas) > 0.6 
                              ? "Cuidado: Mais de 60% das suas despesas estão no Cartão de Crédito. Fique atento à data de fechamento para não se enrolar na fatura."
                              : "Uso de crédito saudável. Você está mesclando bem os pagamentos à vista com o uso do cartão."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}