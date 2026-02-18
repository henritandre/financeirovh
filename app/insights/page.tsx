"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function InsightsPage() {
  const router = useRouter();

  // ==========================================
  // ESTADOS DO USUÁRIO
  // ==========================================
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ==========================================
  // ESTADOS DE DADOS E FILTROS
  // ==========================================
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [mapPerfis, setMapPerfis] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [mesAtual, setMesAtual] = useState(new Date());
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<string[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);

  const formatarMoeda = (v: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  };

  // ==========================================
  // CARREGAMENTO DE DADOS MESTRE
  // ==========================================
  const carregarDados = async () => {
    setIsLoading(true);

    const { data: perfisData } = await supabase.from("profiles").select("username, avatar_url");
    if (perfisData) {
      const mapa: Record<string, string> = {};
      perfisData.forEach((p) => {
        if (p.username && p.avatar_url) mapa[p.username] = p.avatar_url;
      });
      setMapPerfis(mapa);
    }

    const { data: historico, error } = await supabase
      .from("transacoes")
      .select("*, categorias(nome), conta_origem:contas!conta_id(nome, tipo, autor_nome)")
      .order("data", { ascending: false });

    if (error) {
      console.error("Erro ao puxar dados para os Insights:", error);
    }

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
        setUserId(user.id);
        setEmail(user.email || "");
        const nomeExtraido = user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário";
        setUsername(nomeExtraido);
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

  const alterarMes = (delta: number) => {
    setMesAtual((prev) => {
      const novo = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      return novo;
    });
  };

  const toggleUsuario = (nome: string) => {
    setUsuariosSelecionados((prev) => 
      prev.includes(nome) ? prev.filter((u) => u !== nome) : [...prev, nome]
    );
  };

  // ==========================================
  // MOTOR DE CÁLCULO (OS INSIGHTS AVANÇADOS)
  // ==========================================
  const hojeData = new Date();
  
  // 1. DADOS DO MÊS ATUAL SELECIONADO
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

  // 2. DADOS DO MÊS ANTERIOR (PARA COMPARAÇÃO)
  const mesAnterior = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1);
  const transacoesMesAnterior = transacoes.filter((t) => {
    const dataT = new Date(t.data + "T00:00:00"); 
    const isMesAnterior = dataT.getMonth() === mesAnterior.getMonth() && dataT.getFullYear() === mesAnterior.getFullYear();
    const isUsuarioSelecionado = t.autor_nome === "Família" || usuariosSelecionados.includes(t.autor_nome || "Usuário");
    return isMesAnterior && isUsuarioSelecionado && t.tipo !== "transferencia";
  });
  
  const despesasAnteriores = transacoesMesAnterior.filter((t) => t.tipo === "despesa").reduce((acc, t) => acc + Number(t.valor), 0);
  const variacaoDespesa = despesasAnteriores > 0 ? (((despesas - despesasAnteriores) / despesasAnteriores) * 100) : 0;

  // 3. GASTO MÉDIO DIÁRIO
  const isMesmoMesAtualReais = hojeData.getMonth() === mesAtual.getMonth() && hojeData.getFullYear() === mesAtual.getFullYear();
  // Se for o mês atual, divide pelos dias que já passaram. Se for um mês passado, divide pelo total de dias do mês.
  const diasDivisor = isMesmoMesAtualReais ? hojeData.getDate() : new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate();
  const gastoDiario = despesas / diasDivisor;

  // 4. AGRUPAMENTO: DESPESAS POR CATEGORIA
  const gastosPorCategoria = transacoesDoMes.filter((t) => t.tipo === "despesa").reduce((acc: any, t) => {
    const cat = t.categorias?.nome || "Sem categoria";
    acc[cat] = (acc[cat] || 0) + Number(t.valor);
    return acc;
  }, {});
  const categoriasOrdenadas = Object.entries(gastosPorCategoria).map(([nome, valor]) => ({ nome, valor: valor as number })).sort((a, b) => b.valor - a.valor);

  // 5. AGRUPAMENTO: RECEITAS POR CATEGORIA
  const receitasPorCategoria = transacoesDoMes.filter((t) => t.tipo === "receita").reduce((acc: any, t) => {
    const cat = t.categorias?.nome || "Sem categoria";
    acc[cat] = (acc[cat] || 0) + Number(t.valor);
    return acc;
  }, {});
  const receitasOrdenadas = Object.entries(receitasPorCategoria).map(([nome, valor]) => ({ nome, valor: valor as number })).sort((a, b) => b.valor - a.valor);

  // 6. AGRUPAMENTO: HÁBITOS DE PAGAMENTO (COMO O DINHEIRO SAI)
  const gastosPorPagamento = transacoesDoMes.filter((t) => t.tipo === "despesa").reduce((acc: any, t) => {
    let tipoPag = "Débito / PIX";
    if (t.conta_origem?.tipo === "credito") tipoPag = "Cartão de Crédito";
    if (t.conta_origem?.tipo === "dinheiro") tipoPag = "Dinheiro Físico";
    acc[tipoPag] = (acc[tipoPag] || 0) + Number(t.valor);
    return acc;
  }, {});
  const pagamentosOrdenados = Object.entries(gastosPorPagamento).map(([nome, valor]) => ({ nome, valor: valor as number })).sort((a, b) => b.valor - a.valor);

  // 7. TOP 3 MAIORES GASTOS
  const maioresGastos = transacoesDoMes.filter((t) => t.tipo === "despesa").sort((a, b) => Number(b.valor) - Number(a.valor)).slice(0, 3);

  const nomeDoMes = mesAtual.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const initialLetterMenu = username ? username.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-gray-50 relative pb-20 overflow-x-hidden">
      
      {/* NAVBAR */}
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center relative z-10">
        <h1 className="text-xl font-black text-blue-600 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          Insights Avançados
        </h1>
        <div className="flex items-center">
          <div className="flex flex-col items-end mr-4">
            <span className="text-base font-bold text-gray-900 leading-tight">@{username || "usuario"}</span>
            {fullName && <span className="text-sm font-medium text-gray-500 leading-tight mt-0.5">{fullName}</span>}
          </div>
          <div className="relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-11 w-11 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-lg font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95 overflow-hidden border-2 border-white">
              {avatarUrl ? <img src={avatarUrl} alt="Perfil" className="w-full h-full object-cover" /> : initialLetterMenu}
            </button>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="p-2 space-y-1">
                    <button onClick={() => router.push("/dashboard")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Dashboard</button>
                    <button onClick={() => router.push("/perfil")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Meu perfil</button>
                    <button onClick={() => router.push("/contas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Gestão bancária</button>
                    <button onClick={() => router.push("/auditoria")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Auditoria lançamentos</button>
                    <div className="h-px bg-gray-100 my-1 mx-2"></div>
                    <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">Sair do Sistema</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="p-6 max-w-6xl mx-auto space-y-6 mt-4">
        
        {/* CABEÇALHO COM FILTROS DE MÊS E USUÁRIO */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-200">
            <button onClick={() => alterarMes(-1)} className="p-3 bg-white rounded-xl shadow-sm text-gray-600 hover:text-blue-600 hover:scale-105 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
            <span className="w-40 text-center text-sm font-black text-gray-800 uppercase tracking-wider capitalize-first">{nomeDoMes}</span>
            <button onClick={() => alterarMes(1)} className="p-3 bg-white rounded-xl shadow-sm text-gray-600 hover:text-blue-600 hover:scale-105 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {usuariosDisponiveis.map((user) => {
              const isSelected = usuariosSelecionados.includes(user);
              const fotoUser = mapPerfis[user];
              return (
                <button key={user} onClick={() => toggleUsuario(user)} className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center gap-2 ${isSelected ? "bg-gray-900 text-white border-gray-900 shadow-md" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 text-gray-500 flex items-center justify-center text-[9px]">{fotoUser ? <img src={fotoUser} className="w-full h-full object-cover" alt="" /> : user.charAt(0).toUpperCase()}</div>
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
            
            {/* 1ª LINHA: OS 3 CARDS DE BALANÇO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-3xl border border-green-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-green-800 uppercase tracking-wider">Entradas</h3>
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></div>
                </div>
                <p className="text-3xl font-black text-green-600">{formatarMoeda(receitas)}</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-3xl border border-red-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-red-800 uppercase tracking-wider">Saídas</h3>
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg></div>
                </div>
                <p className="text-3xl font-black text-red-600">{formatarMoeda(despesas)}</p>
              </div>

              <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between ${saldoMes >= 0 ? "bg-gradient-to-br from-blue-50 to-white border-blue-100" : "bg-gradient-to-br from-orange-50 to-white border-orange-100"}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-xs font-black uppercase tracking-wider ${saldoMes >= 0 ? "text-blue-800" : "text-orange-800"}`}>Sobrou (Balanço)</h3>
                  <div className={`px-2 py-1 rounded-md text-[10px] font-black ${saldoMes >= 0 ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                    {Number(taxaPoupanca) >= 0 ? `GUARDOU ${taxaPoupanca}%` : "DÉFICIT"}
                  </div>
                </div>
                <p className={`text-3xl font-black ${saldoMes >= 0 ? "text-blue-700" : "text-orange-600"}`}>{formatarMoeda(saldoMes)}</p>
              </div>
            </div>

            {/* 2ª LINHA: OS NOVOS KPIs RÁPIDOS (Taxa de Queima e Mês Anterior) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl">⏱️</div>
                 <div>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Média de Gasto Diário</p>
                   <p className="text-xl font-black text-gray-900 mt-0.5">{formatarMoeda(gastoDiario)} <span className="text-xs text-gray-400 font-medium">/dia</span></p>
                 </div>
               </div>
               
               <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${variacaoDespesa <= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                     {variacaoDespesa <= 0 ? '📉' : '📈'}
                   </div>
                   <div>
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">vs. Mês Anterior</p>
                     <p className="text-xl font-black text-gray-900 mt-0.5">
                       {variacaoDespesa === 0 ? "Mesmo gasto" : `${Math.abs(variacaoDespesa).toFixed(1)}%`}
                       {variacaoDespesa !== 0 && <span className="text-xs text-gray-400 font-medium ml-1">{variacaoDespesa > 0 ? "a mais" : "a menos"}</span>}
                     </p>
                   </div>
                 </div>
               </div>
            </div>

            {/* 3ª LINHA: RAIO-X DE CATEGORIAS (DESPESAS E RECEITAS LADO A LADO) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* DESPESAS */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-900 mb-1">Para onde o dinheiro foi?</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6">Despesas por Categoria</p>
                {categoriasOrdenadas.length === 0 ? ( <p className="text-sm font-bold text-gray-400 text-center py-10">Nenhum gasto neste mês.</p> ) : (
                  <div className="space-y-5">
                    {categoriasOrdenadas.map((cat, index) => {
                      const percentual = ((cat.valor / despesas) * 100).toFixed(1);
                      const corBarra = index === 0 ? "bg-red-500" : index === 1 ? "bg-orange-500" : index === 2 ? "bg-blue-500" : "bg-gray-400";
                      return (
                        <div key={cat.nome}>
                          <div className="flex justify-between items-end mb-1.5"><span className="text-sm font-bold text-gray-700 truncate pr-4">{cat.nome}</span><div className="flex flex-col items-end"><span className="text-sm font-black text-gray-900">{formatarMoeda(cat.valor)}</span><span className="text-[10px] font-bold text-gray-400">{percentual}%</span></div></div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden"><div className={`h-2.5 rounded-full transition-all duration-1000 ${corBarra}`} style={{ width: `${percentual}%` }}></div></div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RECEITAS */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-900 mb-1">De onde o dinheiro veio?</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6">Receitas por Categoria</p>
                {receitasOrdenadas.length === 0 ? ( <p className="text-sm font-bold text-gray-400 text-center py-10">Nenhuma entrada neste mês.</p> ) : (
                  <div className="space-y-5">
                    {receitasOrdenadas.map((cat, index) => {
                      const percentual = ((cat.valor / receitas) * 100).toFixed(1);
                      const corBarra = index === 0 ? "bg-green-500" : index === 1 ? "bg-emerald-400" : "bg-teal-300";
                      return (
                        <div key={cat.nome}>
                          <div className="flex justify-between items-end mb-1.5"><span className="text-sm font-bold text-gray-700 truncate pr-4">{cat.nome}</span><div className="flex flex-col items-end"><span className="text-sm font-black text-gray-900">{formatarMoeda(cat.valor)}</span><span className="text-[10px] font-bold text-gray-400">{percentual}%</span></div></div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden"><div className={`h-2.5 rounded-full transition-all duration-1000 ${corBarra}`} style={{ width: `${percentual}%` }}></div></div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 4ª LINHA: TOP GASTOS E HÁBITOS DE PAGAMENTO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* TOP 3 MAIORES GASTOS */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-lg font-black text-gray-900 mb-1">Top 3 Pesos Pesados</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6">As maiores compras do mês</p>
                {maioresGastos.length === 0 ? ( <p className="text-sm font-bold text-gray-400 text-center py-10 my-auto">Nenhum gasto neste mês.</p> ) : (
                  <ul className="space-y-4">
                    {maioresGastos.map((t, index) => {
                      const fotoUsuario = mapPerfis[t.autor_nome];
                      return (
                        <li key={t.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${index === 0 ? "bg-red-100 text-red-600" : index === 1 ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>#{index + 1}</div>
                          <div className="flex-1 truncate">
                            <p className="text-sm font-bold text-gray-900 truncate">{t.descricao}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-black text-gray-500 bg-gray-200 px-2 py-0.5 rounded uppercase tracking-wider">{t.categorias?.nome || "Sem Categoria"}</span>
                              <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[8px] font-black overflow-hidden" title={t.autor_nome}>{fotoUsuario ? <img src={fotoUsuario} alt="" className="w-full h-full object-cover"/> : t.autor_nome?.charAt(0).toUpperCase()}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-black text-gray-900">{formatarMoeda(t.valor)}</p>
                            <p className="text-[10px] font-bold text-gray-400">{new Date(t.data).toLocaleDateString("pt-BR")}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* HÁBITOS DE PAGAMENTO */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-900 mb-1">Hábitos de Pagamento</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6">Como você paga suas contas</p>
                {pagamentosOrdenados.length === 0 ? ( <p className="text-sm font-bold text-gray-400 text-center py-10">Nenhum gasto neste mês.</p> ) : (
                  <div className="space-y-4">
                    {pagamentosOrdenados.map((pag, index) => {
                      const percentual = ((pag.valor / despesas) * 100).toFixed(1);
                      const icon = pag.nome === 'Cartão de Crédito' ? '💳' : pag.nome === 'Dinheiro Físico' ? '💵' : '📱';
                      return (
                         <div key={pag.nome} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg">{icon}</div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{pag.nome}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">{percentual}% do total</p>
                              </div>
                            </div>
                            <span className="text-base font-black text-gray-900">{formatarMoeda(pag.valor)}</span>
                         </div>
                      )
                    })}

                    <div className="mt-4 bg-purple-50 p-4 rounded-2xl border border-purple-100 flex gap-3 items-start">
                      <span className="text-xl">💡</span>
                      <div>
                        <h4 className="text-xs font-black text-purple-800 uppercase tracking-wider mb-1">Análise de Risco</h4>
                        <p className="text-xs font-bold text-purple-600/80 leading-relaxed">
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
  );
}