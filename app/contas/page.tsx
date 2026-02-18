"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function ContasPage() {
  const router = useRouter();
  
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  const [bancos, setBancos] = useState<any[]>([]);
  const [chaves, setChaves] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<"bancos" | "chaves">("bancos");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // BANCOS (COFRES)
  const [isBancoModalOpen, setIsBancoModalOpen] = useState(false);
  const [bancoId, setBancoId] = useState<string | null>(null);
  const [nomeBanco, setNomeBanco] = useState("");
  const [instituicaoBanco, setInstituicaoBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [numeroConta, setNumeroConta] = useState("");
  const [tipoContaBancaria, setTipoContaBancaria] = useState<"corrente" | "salario" | "poupanca">("corrente");
  const [bancoIsAtivo, setBancoIsAtivo] = useState(true);
  const [bancoTemVinculo, setBancoTemVinculo] = useState(false);

  // FORMAS DE PAGTO (CHAVES)
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

  // NOVO: Controle do Dropdown Customizado de Bancos
  const [isBancoDropdownOpen, setIsBancoDropdownOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => { setToast({ show: true, message, type }); setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000); };

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
        setUsername(user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || "Usuário"); 
        carregarDados(); 
      } else { router.push("/login"); }
    };
    loadInit();
  }, [router]);

  // LÓGICA DE BANCOS
  const abrirModalNovoBanco = () => {
    setBancoId(null); setNomeBanco(""); setInstituicaoBanco(""); setAgencia(""); setNumeroConta(""); setTipoContaBancaria("corrente"); setBancoIsAtivo(true); setBancoTemVinculo(false);
    setIsBancoModalOpen(true);
  };

  const abrirModalEditarBanco = async (banco: any) => {
    if (banco.user_id !== userId) { showToast("Você só pode editar as suas próprias contas.", "error"); return; }
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
      if (error) showToast("Erro: " + error.message, "error"); else { showToast("Banco atualizado!"); setIsBancoModalOpen(false); carregarDados(); }
    } else {
      const { error } = await supabase.from("contas_bancarias").insert([payload]);
      if (error) showToast("Erro: " + error.message, "error"); else { showToast("Banco cadastrado!"); setIsBancoModalOpen(false); carregarDados(); }
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
      if (error) showToast("Erro: " + error.message, "error"); else { showToast(`Instituição ${acao}da!`); setIsBancoModalOpen(false); carregarDados(); }
    } else {
      if (!confirm("Deseja apagar definitivamente este banco?")) return;
      setIsSubmitting(true);
      const { error } = await supabase.from("contas_bancarias").delete().eq("id", bancoId);
      setIsSubmitting(false);
      if (error) showToast("Erro: " + error.message, "error"); else { showToast("Banco apagado!"); setIsBancoModalOpen(false); carregarDados(); }
    }
  };

  // LÓGICA DE FORMAS DE PAGTO
  const abrirModalNovaChave = () => {
    setChaveId(null); setNomeChave(""); setTipoChavePagto("corrente"); setContaBancariaId(""); setUltimosDigitos(""); setSubtipo("debito"); setTipoChavePix(""); setChavePix(""); setDiaFechamento(""); setDiaVencimento(""); setChaveTemMovimentacao(false); setChaveIsAtivo(true); setIsBancoDropdownOpen(false);
    setIsChaveModalOpen(true);
  };

  const abrirModalEditarChave = async (chave: any) => {
    if (chave.tipo !== "dinheiro" && chave.user_id !== userId) { showToast("Edite apenas as suas contas.", "error"); return; }
    setChaveId(chave.id); setNomeChave(chave.nome); setTipoChavePagto(chave.tipo); setContaBancariaId(chave.conta_bancaria_id || ""); setUltimosDigitos(chave.ultimos_digitos || ""); setSubtipo(chave.subtipo || "debito"); setTipoChavePix(chave.tipo_chave_pix || ""); setChavePix(chave.chave_pix || ""); setDiaFechamento(chave.dia_fechamento || ""); setDiaVencimento(chave.dia_vencimento || ""); setChaveIsAtivo(chave.ativo !== false); setIsBancoDropdownOpen(false);

    const { count } = await supabase.from("transacoes").select("*", { count: 'exact', head: true }).eq("conta_id", chave.id);
    setChaveTemMovimentacao((count || 0) > 0);
    setIsChaveModalOpen(true);
  };

  const handleSalvarChave = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    if (tipoChavePagto === "credito" && (!diaFechamento || !diaVencimento)) { showToast("Preencha os dias da fatura!", "error"); setIsSubmitting(false); return; }
    if (tipoChavePagto === "corrente" && subtipo === "pix" && (!tipoChavePix || !chavePix)) { showToast("Preencha a chave PIX!", "error"); setIsSubmitting(false); return; }
    if (tipoChavePagto !== 'dinheiro' && !contaBancariaId) { showToast("Vincule a uma Instituição Bancária!", "error"); setIsSubmitting(false); return; }

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
      if (error) showToast("Erro: " + error.message, "error"); else { showToast("Forma de pagamento atualizada!"); setIsChaveModalOpen(false); carregarDados(); }
    } else {
      const { error } = await supabase.from("contas").insert([payload]);
      if (error) showToast("Erro: " + error.message, "error"); else { showToast("Cadastrado com sucesso!"); setIsChaveModalOpen(false); carregarDados(); }
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
      if (error) showToast("Erro: " + error.message, "error"); else { showToast(`Sucesso!`); setIsChaveModalOpen(false); carregarDados(); }
    } else {
      if (!confirm("Apagar definitivamente?")) return;
      setIsSubmitting(true);
      const { error } = await supabase.from("contas").delete().eq("id", chaveId);
      setIsSubmitting(false);
      if (error) showToast("Erro: " + error.message, "error"); else { showToast("Apagado!"); setIsChaveModalOpen(false); carregarDados(); }
    }
  };

  const chavesCorrentes = chaves.filter(c => c.tipo === "corrente");
  const chavesCredito = chaves.filter(c => c.tipo === "credito");
  const chavesDinheiro = chaves.filter(c => c.tipo === "dinheiro");

  // Filtramos apenas os bancos ativos, mas de todos os usuários, para que vocês saibam exatamente de quem é!
  const bancosAtivos = bancos.filter(b => b.ativo !== false);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {toast.show && (<div className={`fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl font-bold text-white flex items-center gap-3 animate-in slide-in-from-right-8 fade-in duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}><span className="text-xl">{toast.type === 'success' ? '✓' : '!'}</span>{toast.message}</div>)}

      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center relative z-10"><h1 className="text-xl font-black text-blue-600 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> Gestão Bancária</h1><button onClick={() => router.push("/dashboard")} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">Voltar ao Dashboard</button></nav>

      <main className="max-w-5xl mx-auto mt-8 p-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Arquitetura de Contas</h2>
            <p className="text-gray-500 font-bold mt-1">Crie seus Bancos e depois conecte seus Cartões e PIX a eles.</p>
          </div>
          
          <div className="flex bg-gray-200 p-1.5 rounded-xl w-full sm:w-auto">
            <button onClick={() => setActiveTab("bancos")} className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-black rounded-lg transition-all ${activeTab === "bancos" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>🏦 Bancos</button>
            <button onClick={() => setActiveTab("chaves")} className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-black rounded-lg transition-all ${activeTab === "chaves" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>💳 Pagamentos</button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : (
          <div className="animate-in fade-in duration-300">
            
            {/* ABA 1: BANCOS (COFRES) */}
            {activeTab === 'bancos' && (
              <div className="space-y-6">
                <div className="flex justify-end"><button onClick={abrirModalNovoBanco} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm active:scale-95 transition-all">+ Novo Banco / Instituição</button></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {bancos.map(banco => (
                    <div key={banco.id} className={`bg-white rounded-2xl border ${banco.ativo === false ? 'border-gray-200 opacity-60' : 'border-blue-100 shadow-sm hover:border-blue-300'} p-5 flex flex-col justify-between transition-all group`}>
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${banco.tipo_conta === 'corrente' ? 'bg-blue-100 text-blue-700' : banco.tipo_conta === 'salario' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            CONTA {banco.tipo_conta}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">@{banco.autor_nome}</span>
                        </div>
                        <h3 className="text-lg font-black text-gray-900">{banco.nome}</h3>
                        <p className="text-sm font-bold text-gray-500 mt-1">{banco.banco}</p>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs font-bold text-gray-500">
                          <span>Ag: {banco.agencia || '---'}</span>
                          <span>Cc: {banco.numero_conta || '---'}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        {banco.ativo === false ? <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded">INATIVA</span> : <span />}
                        <button onClick={() => abrirModalEditarBanco(banco)} className="p-2 bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                      </div>
                    </div>
                  ))}
                  {bancos.length === 0 && <div className="col-span-full text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200"><span className="text-4xl opacity-50 mb-2 block">🏦</span><p className="font-bold text-gray-500">Nenhum banco cadastrado.</p></div>}
                </div>
              </div>
            )}

            {/* ABA 2: FORMAS DE PAGTO (CHAVES) */}
            {activeTab === 'chaves' && (
              <div className="space-y-6">
                <div className="flex justify-end"><button onClick={abrirModalNovaChave} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm active:scale-95 transition-all">+ Nova Forma de Pagto</button></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* ESQUERDA: Débito, PIX, Dinheiro */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-emerald-50/50 flex items-center gap-2"><svg className="text-emerald-600" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg><h3 className="text-lg font-black text-emerald-900">Dinheiro Físico</h3></div>
                      <ul className="divide-y divide-gray-100">
                        {chavesDinheiro.map((conta) => (
                          <li key={conta.id} className={`p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group ${conta.ativo === false ? 'opacity-60 bg-gray-50/50' : ''}`}>
                            <div>
                              <div className="flex items-center gap-2"><span className="font-bold text-gray-800">{conta.nome}</span><span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide bg-emerald-100 text-emerald-700">Compartilhado</span>{conta.ativo === false && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">INATIVA</span>}</div>
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mt-0.5">Sem vínculo bancário</span>
                            </div>
                            <button onClick={() => abrirModalEditarChave(conta)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex items-center gap-2"><svg className="text-blue-600" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10h20"/><path d="M12 2v20"/><path d="M20 16a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/><path d="M8 8a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/></svg><h3 className="text-lg font-black text-blue-900">Débito / PIX</h3></div>
                      <ul className="divide-y divide-gray-100">
                        {chavesCorrentes.map((conta) => (
                          <li key={conta.id} className={`p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group ${conta.ativo === false ? 'opacity-60 bg-gray-50/50' : ''}`}>
                            <div>
                              <div className="flex items-center gap-2"><span className="font-bold text-gray-800">{conta.nome}</span><span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide ${conta.user_id === userId ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>@{conta.autor_nome}</span>{conta.ativo === false && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">INATIVA</span>}</div>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded block mt-1 w-fit">🏦 {conta.banco_vinculado?.banco || 'Banco não vinculado'}</span>
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mt-1">
                                {conta.subtipo === 'pix' ? `PIX: ${conta.chave_pix}` : `DÉBITO • FINAL ${conta.ultimos_digitos}`}
                              </span>
                            </div>
                            <button onClick={() => abrirModalEditarChave(conta)} className={`p-2 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${conta.user_id === userId ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50' : 'text-gray-200 cursor-not-allowed'}`}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* DIREITA: Crédito */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                    <div className="p-4 border-b border-gray-100 bg-purple-50/50 flex items-center gap-2"><svg className="text-purple-600" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg><h3 className="text-lg font-black text-purple-900">Cartões de Crédito</h3></div>
                    <ul className="divide-y divide-gray-100">
                      {chavesCredito.map((conta) => (
                        <li key={conta.id} className={`p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group ${conta.ativo === false ? 'opacity-60 bg-gray-50/50' : ''}`}>
                          <div>
                            <div className="flex items-center gap-2"><span className="font-bold text-gray-800">{conta.nome}</span><span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide ${conta.user_id === userId ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>@{conta.autor_nome}</span>{conta.ativo === false && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">INATIVO</span>}</div>
                            {conta.banco_vinculado && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded block mt-1 w-fit">🏦 Vinculado: {conta.banco_vinculado.banco}</span>}
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mt-1">FINAL {conta.ultimos_digitos}</span>
                            <span className="text-[10px] font-bold text-gray-400 mt-0.5 block uppercase tracking-wider">Fecha dia {conta.dia_fechamento} • Vence dia {conta.dia_vencimento}</span>
                          </div>
                          <button onClick={() => abrirModalEditarChave(conta)} className={`p-2 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${conta.user_id === userId ? 'text-gray-400 hover:text-purple-600 hover:bg-purple-50' : 'text-gray-200 cursor-not-allowed'}`}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
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

      {/* MODAL 1: BANCOS */}
      {isBancoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsBancoModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80"><h3 className="text-lg font-black text-gray-900">{bancoId ? "Editar Banco" : "Novo Banco / Instituição"}</h3><button onClick={() => setIsBancoModalOpen(false)} className="text-gray-500 hover:text-gray-900 text-2xl font-bold">&times;</button></div>
            <form onSubmit={handleSalvarBanco} className="p-6 space-y-4">
              <div className="flex p-1 bg-gray-200 rounded-xl gap-1">
                <button type="button" onClick={() => setTipoContaBancaria("corrente")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipoContaBancaria === "corrente" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Corrente</button>
                <button type="button" onClick={() => setTipoContaBancaria("salario")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipoContaBancaria === "salario" ? "bg-white text-orange-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Salário</button>
                <button type="button" onClick={() => setTipoContaBancaria("poupanca")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipoContaBancaria === "poupanca" ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Poupança</button>
              </div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Apelido do Cofre</label><input type="text" required value={nomeBanco} onChange={(e) => setNomeBanco(e.target.value)} placeholder="Ex: Conta Principal Nubank" className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" /></div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Nome da Instituição</label><input type="text" required value={instituicaoBanco} onChange={(e) => setInstituicaoBanco(e.target.value)} placeholder="Ex: Nubank, Itaú, Bradesco" className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" /></div>
              <div className="flex gap-4">
                <div className="flex-1"><label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Agência</label><input type="text" value={agencia} onChange={(e) => setAgencia(e.target.value)} placeholder="0001" className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500" /></div>
                <div className="flex-[2]"><label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Número da Conta</label><input type="text" value={numeroConta} onChange={(e) => setNumeroConta(e.target.value)} placeholder="123456-7" className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500" /></div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                {bancoId && bancoTemVinculo && (<p className={`text-[10px] font-bold text-center leading-tight p-2.5 rounded-xl border ${bancoIsAtivo ? 'text-orange-600 bg-orange-50 border-orange-100' : 'text-green-600 bg-green-50 border-green-100'}`}>{bancoIsAtivo ? "Possui cartões/PIX vinculados. O banco será apenas inativado." : "Banco inativo. Deseja reativar?"}</p>)}
                <div className="flex gap-3">
                  {bancoId && (
                    <button type="button" onClick={handleExcluirBanco} disabled={isSubmitting} className={`px-4 py-3.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center shrink-0 ${bancoTemVinculo ? (bancoIsAtivo ? 'text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200' : 'text-green-600 bg-green-50 hover:bg-green-100 border border-green-200') : 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'}`}>
                      {bancoTemVinculo ? (bancoIsAtivo ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>) : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>}
                    </button>
                  )}
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-wide transition-all shadow-md active:scale-95">{isSubmitting ? "Salvando..." : "Salvar Banco"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FORMAS DE PAGTO COM DROPDOWN DE BANCOS CUSTOMIZADO */}
      {isChaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsChaveModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="sticky top-0 z-[60] px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/90 backdrop-blur-md"><h3 className="text-lg font-black text-gray-900">{chaveId ? "Editar Pagamento" : "Nova Forma de Pagto"}</h3><button type="button" onClick={() => setIsChaveModalOpen(false)} className="text-gray-500 hover:text-gray-900 text-2xl font-bold">&times;</button></div>
            <form onSubmit={handleSalvarChave} className="p-6 space-y-5">
              
              <div className="flex p-1 bg-gray-200 rounded-xl gap-1">
                <button type="button" onClick={() => setTipoChavePagto("corrente")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipoChavePagto === "corrente" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Débito/PIX</button>
                <button type="button" onClick={() => setTipoChavePagto("credito")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipoChavePagto === "credito" ? "bg-white text-purple-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Cartão Créd</button>
                <button type="button" onClick={() => setTipoChavePagto("dinheiro")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipoChavePagto === "dinheiro" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Físico</button>
              </div>

              <div><label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Apelido do Pagamento</label><input type="text" required value={nomeChave} onChange={(e) => setNomeChave(e.target.value)} placeholder={tipoChavePagto === 'dinheiro' ? "Ex: Carteira, Cofre..." : "Ex: Cartão Black, PIX Pessoal..."} className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500" /></div>

              {/* MÁGICA: O NOVO COMPONENTE DE SELEÇÃO DE BANCO (NÍVEL NUBANK) */}
              {tipoChavePagto !== 'dinheiro' && (
                <div className={`bg-blue-50/50 p-4 rounded-xl border border-blue-100 animate-in fade-in relative ${isBancoDropdownOpen ? 'z-50' : 'z-20'}`}>
                  <label className="block text-xs font-bold text-blue-800 mb-2 uppercase tracking-wider flex items-center gap-1">🏦 Vincular a qual Banco?</label>
                  
                  <button type="button" onClick={() => setIsBancoDropdownOpen(!isBancoDropdownOpen)} className="flex items-center justify-between w-full rounded-xl border border-blue-200 bg-white p-2.5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all min-h-[55px]">
                    {contaBancariaId ? (() => {
                      const b = bancosAtivos.find(x => x.id === contaBancariaId);
                      if (!b) return <span className="text-gray-400 font-bold text-sm ml-1">Selecione um banco...</span>;
                      return (
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black shrink-0">
                            {b.autor_nome?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col items-start truncate text-left">
                            <span className="text-sm font-bold text-gray-900 leading-tight truncate w-full flex items-center gap-1">
                              {b.banco} <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">@{b.autor_nome}</span>
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate w-full mt-0.5">
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
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[100] max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        {bancosAtivos.length === 0 ? (
                          <div className="p-4 text-center text-sm font-bold text-gray-500">Nenhum banco ativo cadastrado.</div>
                        ) : (
                          <ul className="divide-y divide-gray-50">
                            {bancosAtivos.map(b => (
                              <li key={b.id}>
                                <button type="button" onClick={() => { setContaBancariaId(b.id); setIsBancoDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 active:bg-blue-100 bg-white">
                                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black shrink-0">
                                    {b.autor_nome?.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col truncate">
                                    <span className="text-sm font-bold text-gray-900 truncate flex items-center gap-1">
                                      {b.banco} <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">@{b.autor_nome}</span>
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate mt-0.5">
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
                  <div className="relative z-0"><label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Últimos 4 Dígitos</label><input type="text" maxLength={4} required value={ultimosDigitos} onChange={(e) => setUltimosDigitos(e.target.value.replace(/\D/g, ''))} placeholder="1234" className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 text-center tracking-widest" /></div>
              )}

              {tipoChavePagto === 'corrente' && (
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-4 animate-in zoom-in-95 relative z-0">
                  <div className="flex p-1 bg-white border border-gray-200 rounded-lg gap-1"><button type="button" onClick={() => setSubtipo("debito")} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${subtipo === "debito" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>Cartão Débito</button><button type="button" onClick={() => setSubtipo("pix")} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${subtipo === "pix" ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>Chave PIX</button></div>
                  {subtipo === 'pix' && (
                    <div className="flex gap-3 animate-in fade-in">
                      <div className="flex-1"><label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Tipo</label><select required value={tipoChavePix} onChange={(e) => setTipoChavePix(e.target.value)} className="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-bold text-gray-900 focus:border-green-500"><option value="" disabled>Selecione...</option><option value="cpf">CPF/CNPJ</option><option value="celular">Celular</option><option value="email">E-mail</option><option value="aleatoria">Aleatória</option></select></div>
                      <div className="flex-[2]"><label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Chave PIX</label><input type="text" required value={chavePix} onChange={(e) => setChavePix(e.target.value)} placeholder="Sua chave..." className="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-bold text-gray-900 focus:border-green-500" /></div>
                    </div>
                  )}
                </div>
              )}

              {tipoChavePagto === 'credito' && (
                <div className="flex gap-4 p-4 bg-purple-50/50 border border-purple-100 rounded-xl animate-in zoom-in-95 relative z-0">
                  <div className="flex-1"><label className="block text-[10px] font-bold text-purple-700 mb-1 uppercase tracking-wider">Dia Fechamento</label><input type="number" min="1" max="31" required value={diaFechamento} onChange={(e) => setDiaFechamento(e.target.value)} placeholder="Ex: 10" className="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm font-bold text-gray-900" /></div>
                  <div className="flex-1"><label className="block text-[10px] font-bold text-purple-700 mb-1 uppercase tracking-wider">Dia Vencimento</label><input type="number" min="1" max="31" required value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} placeholder="Ex: 17" className="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm font-bold text-gray-900" /></div>
                </div>
              )}
              
              <div className="flex flex-col gap-2 pt-2 relative z-0">
                {chaveId && chaveTemMovimentacao && (<p className={`text-[10px] font-bold text-center leading-tight p-2.5 rounded-xl border ${chaveIsAtivo ? 'text-orange-600 bg-orange-50 border-orange-100' : 'text-green-600 bg-green-50 border-green-100'}`}>{chaveIsAtivo ? "Existem movimentações. A conta não será apagada, apenas inativada." : "Esta conta está inativa e oculta. Deseja reativá-la?"}</p>)}
                <div className="flex gap-3">
                  {chaveId && (
                    <button type="button" onClick={handleExcluirChave} disabled={isSubmitting} className={`px-4 py-3.5 rounded-xl font-bold transition-all active:scale-95 shrink-0 flex items-center justify-center ${chaveTemMovimentacao ? (chaveIsAtivo ? 'text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200' : 'text-green-600 bg-green-50 hover:bg-green-100 border border-green-200') : 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'}`}>
                      {chaveTemMovimentacao ? (chaveIsAtivo ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>) : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>}
                    </button>
                  )}
                  <button type="submit" disabled={isSubmitting} className={`flex-1 py-3.5 rounded-xl text-white font-black uppercase tracking-wide transition-all shadow-md active:scale-95 ${tipoChavePagto === 'credito' ? 'bg-purple-600 hover:bg-purple-700' : tipoChavePagto === 'dinheiro' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{isSubmitting ? "Carregando..." : "Salvar"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}