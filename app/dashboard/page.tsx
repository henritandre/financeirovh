"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  const getDatLocal = (d: Date) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  };

  const hojeData = new Date();

  const [tipo, setTipo] = useState<"receita" | "despesa">("despesa");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(getDatLocal(new Date()));
  const [categoriaId, setCategoriaId] = useState("");
  const [contaId, setContaId] = useState(""); 

  const [dataInicio, setDataInicio] = useState(getDatLocal(new Date(hojeData.getFullYear(), hojeData.getMonth(), 1)));
  const [dataFim, setDataFim] = useState(getDatLocal(hojeData)); 
  const [atalhoAtivo, setAtalhoAtivo] = useState("m"); 
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [textoInputData, setTextoInputData] = useState("");

  const [filtroTipo, setFiltroTipo] = useState<string[]>(["receita", "despesa"]);
  
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<string[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transacaoParaApagar, setTransacaoParaApagar] = useState<any>(null);
  const [motivoExclusao, setMotivoExclusao] = useState("");
  const [palavraConfirmacao, setPalavraConfirmacao] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [motivosFrequentes, setMotivosFrequentes] = useState<string[]>([]);

  const carregarDados = async (isInitialLoad = false) => {
    const { data: historico } = await supabase
      .from("transacoes")
      .select("*, categorias(nome), contas(nome)")
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false });

    if (historico) {
      setTransacoes(historico);
      const unicos = Array.from(new Set(historico.map(t => t.autor_nome || "Usuário")));
      setUsuariosDisponiveis(unicos);
      if (isInitialLoad) setUsuariosSelecionados(unicos);
    }
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id); setEmail(user.email || ""); 
        // MÁGICA DO NOME: Tenta pegar o username, se não tiver, pega a primeira parte do email!
        const nomeExtraido = user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || "Usuário";
        setUsername(nomeExtraido); 
        setFullName(user.user_metadata?.full_name || "");
        carregarDados(true);
      } else { router.push("/login"); return; }
      
      const { data: categoriasData } = await supabase.from("categorias").select("*").order("nome");
      if (categoriasData) setCategorias(categoriasData);

      const { data: contasData } = await supabase.from("contas").select("*").order("nome");
      if (contasData) setContas(contasData);
    };
    loadInit();
  }, [router]);

  const nomesAtalhos: Record<string, string> = {
    h: "Hoje", o: "Ontem", s: "Acumulado da Semana", sa: "Semana Anterior",
    m: "Acumulado do Mês", ma: "Mês Anterior", a: "Acumulado do Ano", aa: "Ano Anterior"
  };

  const aplicarAtalho = (atalho: string) => {
    const d = new Date(); let inicio = new Date(); let fim = new Date(); let reconhecido = true;
    switch(atalho.toLowerCase().trim()) {
      case 'h': break;
      case 'o': inicio.setDate(d.getDate() - 1); fim.setDate(d.getDate() - 1); break;
      case 's': const diaSemana = d.getDay(); inicio.setDate(d.getDate() - diaSemana); break;
      case 'sa': const diaSemanaAnt = d.getDay(); inicio.setDate(d.getDate() - diaSemanaAnt - 7); fim.setDate(d.getDate() + (6 - diaSemanaAnt) - 7); break;
      case 'm': inicio = new Date(d.getFullYear(), d.getMonth(), 1); break;
      case 'ma': inicio = new Date(d.getFullYear(), d.getMonth() - 1, 1); fim = new Date(d.getFullYear(), d.getMonth(), 0); break;
      case 'a': inicio = new Date(d.getFullYear(), 0, 1); break;
      case 'aa': inicio = new Date(d.getFullYear() - 1, 0, 1); fim = new Date(d.getFullYear() - 1, 11, 31); break;
      default: reconhecido = false; break;
    }
    if (reconhecido) { setDataInicio(getDatLocal(inicio)); setDataFim(getDatLocal(fim)); setAtalhoAtivo(atalho.toLowerCase().trim()); } else { setAtalhoAtivo(""); }
  };

  const handleInputDataChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.target.value; setTextoInputData(val); aplicarAtalho(val); };
  const formatarDataNormal = (dStr: string) => { const [a, m, d] = dStr.split("-"); return `${d}/${m}/${a}`; };

  const getDisplayPeriodo = () => {
    if (isDatePickerOpen) return textoInputData;
    if (atalhoAtivo && nomesAtalhos[atalhoAtivo]) return `${nomesAtalhos[atalhoAtivo]} (${formatarDataNormal(dataInicio)} a ${formatarDataNormal(dataFim)})`;
    return `De ${formatarDataNormal(dataInicio)} a ${formatarDataNormal(dataFim)}`;
  };

  const toggleTipo = (t: string) => { setFiltroTipo(prev => prev.includes(t) ? prev.filter(item => item !== t) : [...prev, t]); };

  const transacoesFiltradas = transacoes.filter((t) => {
    const matchData = t.data >= dataInicio && t.data <= dataFim;
    const matchTipo = filtroTipo.includes(t.tipo);
    const matchUsuario = usuariosSelecionados.includes(t.autor_nome || "Usuário");
    return matchData && matchTipo && matchUsuario;
  });

  const resumoFiltrado = transacoesFiltradas.reduce((acc, t) => {
    if (t.tipo === "receita") acc.receitas += Number(t.valor);
    if (t.tipo === "despesa") acc.despesas += Number(t.valor);
    acc.saldo = acc.receitas - acc.despesas;
    return acc;
  }, { saldo: 0, receitas: 0, despesas: 0 });

  const toggleUsuario = (nome: string) => { setUsuariosSelecionados(prev => prev.includes(nome) ? prev.filter(u => u !== nome) : [...prev, nome]); };
  const showToast = (msg: string, t: "success" | "error" = "success") => { setToast({ show: true, message: msg, type: t }); setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000); };

  const handleSalvarTransacao = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true); const valorNumerico = parseFloat(valor.replace(",", "."));
    
    const payload = {
      user_id: userId, 
      autor_nome: username || "Usuário", 
      descricao, 
      valor: valorNumerico, 
      data, 
      tipo, 
      categoria_id: categoriaId,
      conta_id: contaId || null 
    };

    const { error } = await supabase.from("transacoes").insert([payload]);
    setIsSubmitting(false);
    
    if (error) { 
      showToast("Erro ao salvar: " + error.message, "error"); 
    } else { 
      setDescricao(""); setValor(""); setCategoriaId(""); setContaId(""); setIsModalOpen(false); 
      showToast("Lançamento salvo!"); carregarDados(false); 
    }
  };

  const abrirModalDeExclusao = async (transacao: any) => {
    if (transacao.user_id !== userId) { showToast("Apenas o autor pode excluir.", "error"); return; }
    setTransacaoParaApagar(transacao); setMotivoExclusao(""); setPalavraConfirmacao(""); setIsDeleteModalOpen(true);
    const trintaDiasAtras = new Date(); trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    const { data: excluidas } = await supabase.from("transacoes_excluidas").select("motivo").eq("user_id", userId).gte("excluido_em", trintaDiasAtras.toISOString());
    if (excluidas && excluidas.length > 0) { const contagem: Record<string, number> = {}; excluidas.forEach(t => { contagem[t.motivo] = (contagem[t.motivo] || 0) + 1; }); const top3 = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 3).map(item => item[0]); setMotivosFrequentes(top3); } else { setMotivosFrequentes([]); }
  };

  const confirmarExclusaoComAuditoria = async (e: React.FormEvent) => {
    e.preventDefault(); if (palavraConfirmacao.toLowerCase() !== "excluir") return; setIsDeleting(true);
    const { error: erroInsert } = await supabase.from("transacoes_excluidas").insert([{ transacao_id: transacaoParaApagar.id, descricao: transacaoParaApagar.descricao, valor: transacaoParaApagar.valor, data: transacaoParaApagar.data, tipo: transacaoParaApagar.tipo, categoria_id: transacaoParaApagar.categoria_id, user_id: transacaoParaApagar.user_id, autor_nome: transacaoParaApagar.autor_nome, excluido_por_nome: username || "Usuário", motivo: motivoExclusao }]);
    if (erroInsert) { showToast("Erro ao gravar auditoria.", "error"); setIsDeleting(false); return; }
    const { error: erroDelete } = await supabase.from("transacoes").delete().eq("id", transacaoParaApagar.id);
    setIsDeleting(false);
    if (erroDelete) { showToast("Erro ao apagar.", "error"); } else { showToast("Arquivado!"); setIsDeleteModalOpen(false); carregarDados(false); }
  };

  const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const initialLetter = username ? username.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : "?");
  
  const categoriasFiltradas = categorias.filter(c => c.tipo === tipo);

  return (
    <div className="min-h-screen bg-gray-50 relative pb-20 overflow-x-hidden">
      {toast.show && (<div className={`fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl font-bold text-white flex items-center gap-3 animate-in slide-in-from-right-8 fade-in duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}><span className="text-xl">{toast.type === 'success' ? '✓' : '!'}</span>{toast.message}</div>)}

      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center relative z-10">
        <h1 className="text-xl font-black text-blue-600 tracking-tight">Controle Financeiro</h1>
        <div className="flex items-center">
          <div className="flex flex-col items-end mr-4"><span className="text-base font-bold text-gray-900 leading-tight">@{username || "usuario"}</span>{fullName && <span className="text-sm font-medium text-gray-500 leading-tight mt-0.5">{fullName}</span>}</div>
          <div className="relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-11 w-11 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-lg font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95">{initialLetter}</button>
            {isMenuOpen && (
              <><div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div><div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"><div className="p-2 space-y-1"><button onClick={() => router.push("/perfil")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Meu Perfil</button><button onClick={() => router.push("/categorias")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Categorias</button><button onClick={() => router.push("/contas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Contas e Cartões</button><button onClick={() => router.push("/auditoria")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">Lançamentos Excluídos</button><div className="h-px bg-gray-100 my-1 mx-2"></div><button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">Sair do Sistema</button></div></div></>
            )}
          </div>
        </div>
      </nav>

      <main className="p-6 max-w-6xl mx-auto space-y-6 mt-4 relative z-0">
        <div className="flex justify-between items-end"><h2 className="text-2xl font-bold text-gray-800 tracking-tight">Visão Geral</h2><button onClick={() => setIsModalOpen(true)} className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95"><span className="text-xl leading-none">+</span> Novo Lançamento</button></div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><h3 className="text-sm text-gray-500 font-bold uppercase tracking-wider">Saldo do Período</h3><p className={`text-3xl font-black mt-2 ${resumoFiltrado.saldo >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatarMoeda(resumoFiltrado.saldo)}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><h3 className="text-sm text-gray-500 font-bold uppercase tracking-wider">Receitas</h3><p className="text-3xl font-black text-green-500 mt-2">{formatarMoeda(resumoFiltrado.receitas)}</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><h3 className="text-sm text-gray-500 font-bold uppercase tracking-wider">Despesas</h3><p className="text-3xl font-black text-red-500 mt-2">{formatarMoeda(resumoFiltrado.despesas)}</p></div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-5 mt-8 items-start lg:items-center">
          <div className="relative w-full lg:w-1/3 shrink-0"><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Período (Digite o Atalho)</label><input type="text" value={getDisplayPeriodo()} onFocus={() => { setIsDatePickerOpen(true); setTextoInputData(atalhoAtivo); }} onChange={handleInputDataChange} placeholder="Ex: m, h, sa..." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer" />
            {isDatePickerOpen && (
              <><div className="fixed inset-0 z-40" onClick={() => {setIsDatePickerOpen(false); setTextoInputData("");}}></div><div className="absolute top-[100%] mt-2 left-0 w-full sm:w-[450px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50"><p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Atalhos Rápidos</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                {Object.entries(nomesAtalhos).map(([key, name]) => (<button key={key} type="button" onClick={() => { aplicarAtalho(key); setIsDatePickerOpen(false); setTextoInputData(""); }} className={`text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${atalhoAtivo === key ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><span className={`px-2 py-0.5 rounded-md font-mono text-[10px] ${atalhoAtivo === key ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{key}</span> <span className="text-center">{name}</span></button>))}
              </div><div className="h-px bg-gray-100 mb-4"></div><p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Ou Selecione no Calendário</p><div className="flex gap-3"><div className="flex-1"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Inicial</label><input type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setAtalhoAtivo(""); }} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-500" /></div><div className="flex-1"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Final</label><input type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setAtalhoAtivo(""); }} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-500" /></div></div></div></>
            )}
          </div>
          <div className="hidden lg:block w-px h-12 bg-gray-200 shrink-0"></div><div className="block lg:hidden w-full h-px bg-gray-100 my-1"></div>
          <div className="w-full lg:w-1/4 shrink-0"><label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Tipo</label><div className="flex gap-2"><button onClick={() => toggleTipo("receita")} className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all active:scale-95 border ${filtroTipo.includes("receita") ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Receitas</button><button onClick={() => toggleTipo("despesa")} className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all active:scale-95 border ${filtroTipo.includes("despesa") ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Despesas</button></div></div>
          <div className="hidden lg:block w-px h-12 bg-gray-200 shrink-0"></div><div className="block lg:hidden w-full h-px bg-gray-100 my-1"></div>
          <div className="w-full lg:flex-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Usuários</label><div className="flex flex-wrap gap-2">{usuariosDisponiveis.length === 0 ? (<span className="text-sm text-gray-400 font-medium py-2">Buscando...</span>) : (usuariosDisponiveis.map(user => { const isSelected = usuariosSelecionados.includes(user); return (<button key={user} onClick={() => toggleUsuario(user)} className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-all active:scale-95 ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>@{user}</button>); }))}</div></div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-2">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50"><h3 className="text-lg font-bold text-gray-800">Extrato</h3></div>
          {transacoesFiltradas.length === 0 ? (
             <div className="p-10 flex flex-col items-center justify-center text-center gap-3"><p className="text-gray-500 font-bold">Nenhum lançamento neste período.</p></div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {transacoesFiltradas.map((t) => (
                <li key={t.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4 group">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`hidden sm:flex h-10 w-10 shrink-0 rounded-full items-center justify-center ${t.tipo === 'receita' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{t.tipo === 'receita' ? '↓' : '↑'}</div>
                    <div className="truncate">
                      <p className="text-sm font-bold text-gray-900 truncate">{t.descricao}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] sm:text-xs font-bold text-gray-500 flex-wrap">
                        <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md">{t.categorias?.nome || 'Sem categoria'}</span>
                        
                        {/* PÍLULA NEUTRA PARA A FORMA DE PAGAMENTO */}
                        {t.contas?.nome && (
                          <span className="text-gray-700 bg-gray-200 border border-gray-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                            💳 {t.contas.nome}
                          </span>
                        )}

                        <span className="hidden sm:inline">•</span>
                        <span>{formatarDataNormal(t.data)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">@{t.autor_nome || 'Usuário'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-base sm:text-lg font-black ${t.tipo === 'receita' ? 'text-green-600' : 'text-gray-900'}`}>{t.tipo === 'receita' ? '+' : '-'} {formatarMoeda(t.valor)}</span>
                    <button onClick={() => abrirModalDeExclusao(t)} className={`p-2 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100 ${t.user_id === userId ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-200 cursor-not-allowed'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <button onClick={() => setIsModalOpen(true)} className="md:hidden fixed bottom-6 right-6 h-14 w-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-light hover:bg-blue-700 active:scale-95 z-20">+</button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80"><h3 className="text-lg font-black text-gray-900">Novo Lançamento</h3><button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-900 text-2xl font-bold">&times;</button></div>
            <form onSubmit={handleSalvarTransacao} className="p-6 space-y-4">
              
              <div className="flex p-1 bg-gray-200 rounded-xl">
                {/* MÁGICA: Limpa a contaId se você trocar de despesa para receita e vice-versa */}
                <button type="button" onClick={() => { setTipo("despesa"); setCategoriaId(""); setContaId(""); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tipo === "despesa" ? "bg-white text-red-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Despesa</button>
                <button type="button" onClick={() => { setTipo("receita"); setCategoriaId(""); setContaId(""); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tipo === "receita" ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Receita</button>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1"><label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Valor (R$)</label><input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-lg font-black text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" /></div>
                <div className="flex-1"><label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Data</label><input type="date" required value={data} onChange={(e) => setData(e.target.value)} className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" /></div>
              </div>
              
              <div><label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Descrição</label><input type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Supermercado" className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" /></div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Categoria</label>
                  <select required value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20">
                    <option value="" disabled>Selecione...</option>{categoriasFiltradas.map((cat) => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-bold text-purple-700 mb-1 uppercase tracking-wider flex items-center gap-1">💳 Forma Pagto</label>
                  <select required value={contaId} onChange={(e) => setContaId(e.target.value)} className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20">
                    <option value="" disabled>Selecione...</option>
                    
                    {contas.filter(c => c.tipo === "corrente").length > 0 && (
                      <optgroup label="Contas / PIX">
                        {contas.filter(c => c.tipo === "corrente").map(c => <option key={c.id} value={c.id}>🏦 {c.nome} (@{c.autor_nome})</option>)}
                      </optgroup>
                    )}
                    
                    {contas.filter(c => c.tipo === "dinheiro").length > 0 && (
                      <optgroup label="Dinheiro Físico">
                        {contas.filter(c => c.tipo === "dinheiro").map(c => <option key={c.id} value={c.id}>💵 {c.nome} (Compartilhado)</option>)}
                      </optgroup>
                    )}
                    
                    {/* MÁGICA: Cartões de crédito somem se for Receita! */}
                    {tipo === 'despesa' && contas.filter(c => c.tipo === "credito").length > 0 && (
                      <optgroup label="Cartões de Crédito">
                        {contas.filter(c => c.tipo === "credito").map(c => <option key={c.id} value={c.id}>💳 {c.nome} (@{c.autor_nome})</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className={`w-full py-3.5 rounded-xl text-white font-black uppercase tracking-wide transition-all shadow-md active:scale-95 mt-2 ${tipo === 'receita' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>{isSubmitting ? "Salvando..." : `Salvar ${tipo === 'receita' ? 'Receita' : 'Despesa'}`}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Exclusão (MANTIDO) */}
      {isDeleteModalOpen && transacaoParaApagar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}></div><div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100"><div className="px-6 py-5 border-b border-gray-100 bg-red-50/50 flex justify-between items-center"><h3 className="text-lg font-bold text-red-600 flex items-center gap-2">Apagar Lançamento</h3><button onClick={() => setIsDeleteModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div><form onSubmit={confirmarExclusaoComAuditoria} className="p-6 space-y-5"><div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><p className="text-sm text-gray-500 font-bold">Você está prestes a excluir:</p><p className="text-lg font-black text-gray-900 mt-1 truncate">{transacaoParaApagar.descricao}</p><p className={`text-base font-black ${transacaoParaApagar.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>{formatarMoeda(transacaoParaApagar.valor)}</p></div><div><label className="block text-sm font-bold text-gray-700 mb-2">Motivo da Exclusão</label><textarea required rows={2} value={motivoExclusao} onChange={(e) => setMotivoExclusao(e.target.value)} placeholder="Por que está apagando isso?" className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 resize-none" /></div>{motivosFrequentes.length > 0 && (<div className="flex flex-wrap gap-2"><span className="text-xs font-bold text-gray-600 w-full mb-1">Motivos recentes:</span>{motivosFrequentes.map((motivo, idx) => (<button key={idx} type="button" onClick={() => setMotivoExclusao(motivo)} className="text-xs font-bold bg-gray-200 hover:bg-gray-300 text-gray-800 py-1.5 px-3 rounded-full transition-colors">{motivo}</button>))}</div>)}<div><label className="block text-sm font-bold text-gray-700 mb-2">Digite <span className="text-red-600 font-black uppercase">EXCLUIR</span> para confirmar</label><input type="text" required value={palavraConfirmacao} onChange={(e) => setPalavraConfirmacao(e.target.value)} placeholder="excluir" className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-black text-gray-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-center tracking-widest uppercase" /></div><button type="submit" disabled={isDeleting || palavraConfirmacao.toLowerCase() !== "excluir" || motivoExclusao.trim() === ""} className="w-full py-3.5 rounded-xl text-white font-black transition-all active:scale-95 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">{isDeleting ? "Apagando..." : "Confirmar Exclusão"}</button></form></div></div>
      )}
    </div>
  );
}