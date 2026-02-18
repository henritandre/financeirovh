"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function ContasPage() {
  const router = useRouter();
  
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  // Estados do Formulário
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"corrente" | "credito" | "dinheiro">("corrente");
  
  // Novos Estados
  const [banco, setBanco] = useState("");
  const [ultimosDigitos, setUltimosDigitos] = useState("");
  const [subtipo, setSubtipo] = useState<"debito" | "pix">("debito");
  const [tipoChave, setTipoChave] = useState("");
  const [chavePix, setChavePix] = useState("");
  
  // Antigos
  const [diaFechamento, setDiaFechamento] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");

  const carregarContas = async () => {
    setLoading(true);
    const { data } = await supabase.from("contas").select("*").order("tipo", { ascending: true }).order("nome", { ascending: true });
    if (data) setContas(data);
    setLoading(false);
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { 
        setUserId(user.id); 
        const nomeExtraido = user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || "Usuário";
        setUsername(nomeExtraido); 
        carregarContas(); 
      } else { router.push("/login"); }
    };
    loadInit();
  }, [router]);

  const showToast = (message: string, type: "success" | "error" = "success") => { setToast({ show: true, message, type }); setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000); };

  const abrirModalNovo = () => { 
    setEditandoId(null); setNome(""); setTipo("corrente"); 
    setBanco(""); setUltimosDigitos(""); setSubtipo("debito"); setTipoChave(""); setChavePix("");
    setDiaFechamento(""); setDiaVencimento(""); 
    setIsModalOpen(true); 
  };

  const abrirModalEditar = (conta: any) => {
    if (conta.tipo !== "dinheiro" && conta.user_id !== userId) { showToast("Você só pode editar e apagar as suas contas.", "error"); return; }
    setEditandoId(conta.id); 
    setNome(conta.nome); 
    setTipo(conta.tipo); 
    setBanco(conta.banco || "");
    setUltimosDigitos(conta.ultimos_digitos || "");
    setSubtipo(conta.subtipo || "debito");
    setTipoChave(conta.tipo_chave_pix || "");
    setChavePix(conta.chave_pix || "");
    setDiaFechamento(conta.dia_fechamento || ""); 
    setDiaVencimento(conta.dia_vencimento || ""); 
    setIsModalOpen(true);
  };

  const handleSalvarConta = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    
    // Validações
    if (tipo === "credito" && (!diaFechamento || !diaVencimento)) { showToast("Preencha os dias da fatura!", "error"); setIsSubmitting(false); return; }
    if (tipo === "corrente" && subtipo === "pix" && (!tipoChave || !chavePix)) { showToast("Preencha os dados do PIX!", "error"); setIsSubmitting(false); return; }

    const payload = {
      nome, tipo, 
      banco: tipo !== 'dinheiro' ? banco : null,
      // MÁGICA: Só salva os dígitos se for Cartão de Crédito ou Débito!
      ultimos_digitos: (tipo === 'credito' || (tipo === 'corrente' && subtipo === 'debito')) ? ultimosDigitos : null,
      subtipo: tipo === 'corrente' ? subtipo : null,
      tipo_chave_pix: (tipo === 'corrente' && subtipo === 'pix') ? tipoChave : null,
      chave_pix: (tipo === 'corrente' && subtipo === 'pix') ? chavePix : null,
      dia_fechamento: tipo === "credito" ? Number(diaFechamento) : null,
      dia_vencimento: tipo === "credito" ? Number(diaVencimento) : null,
      user_id: userId,
      autor_nome: tipo === "dinheiro" ? "Família" : username 
    };

    if (editandoId) {
      const { error } = await supabase.from("contas").update(payload).eq("id", editandoId);
      if (error) showToast("Erro: " + error.message, "error"); else { showToast("Conta atualizada!"); setIsModalOpen(false); carregarContas(); }
    } else {
      const { error } = await supabase.from("contas").insert([payload]);
      if (error) showToast("Erro: " + error.message, "error"); else { showToast("Conta cadastrada!"); setIsModalOpen(false); carregarContas(); }
    }
    setIsSubmitting(false);
  };

  const handleExcluirConta = async () => {
    if (!confirm("Tem certeza que deseja apagar esta conta?")) return;
    setIsSubmitting(true);
    const { error } = await supabase.from("contas").delete().eq("id", editandoId);
    setIsSubmitting(false);
    if (error) {
      if (error.code === '23503') { showToast("Você não pode apagar uma conta que já possui gastos. Mude o nome ou apague os lançamentos antes.", "error"); } 
      else { showToast("Erro ao excluir: " + error.message, "error"); }
    } else { showToast("Conta excluída com sucesso!"); setIsModalOpen(false); carregarContas(); }
  };

  const contasCorrentes = contas.filter(c => c.tipo === "corrente");
  const cartoesCredito = contas.filter(c => c.tipo === "credito");
  const dinheiroFisico = contas.filter(c => c.tipo === "dinheiro");

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {toast.show && (<div className={`fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl font-bold text-white flex items-center gap-3 animate-in slide-in-from-right-8 fade-in duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}><span className="text-xl">{toast.type === 'success' ? '✓' : '!'}</span>{toast.message}</div>)}

      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center relative z-10"><h1 className="text-xl font-black text-blue-600 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> Contas e Cartões</h1><button onClick={() => router.push("/dashboard")} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">Voltar ao Dashboard</button></nav>

      <main className="max-w-4xl mx-auto mt-10 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4"><div><h2 className="text-2xl font-black text-gray-900">Gerenciar Formas de Pagamento</h2><p className="text-gray-500 font-bold mt-1">Cadastre seus bancos, cartões e dinheiro físico.</p></div><button onClick={abrirModalNovo} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"><span className="text-xl leading-none">+</span> Nova Forma de Pagto</button></div>

        {loading ? (
          <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-emerald-50/50 flex items-center gap-2"><svg className="text-emerald-600" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg><h3 className="text-lg font-black text-emerald-900">Dinheiro Físico</h3></div>
                <ul className="divide-y divide-gray-100">
                  {dinheiroFisico.map((conta) => (
                    <li key={conta.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                      <div>
                        <div className="flex items-center gap-2"><span className="font-bold text-gray-800">{conta.nome}</span><span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide bg-emerald-100 text-emerald-700">Compartilhado</span></div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mt-0.5">Na Carteira / Cofre</span>
                      </div>
                      <button onClick={() => abrirModalEditar(conta)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                    </li>
                  ))}
                  {dinheiroFisico.length === 0 && <li className="p-4 text-gray-400 text-sm font-bold text-center">Nenhum caixa físico cadastrado</li>}
                </ul>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex items-center gap-2"><svg className="text-blue-600" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10h20"/><path d="M12 2v20"/><path d="M20 16a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/><path d="M8 8a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/></svg><h3 className="text-lg font-black text-blue-900">Conta Corrente / PIX</h3></div>
                <ul className="divide-y divide-gray-100">
                  {contasCorrentes.map((conta) => (
                    <li key={conta.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                      <div>
                        <div className="flex items-center gap-2"><span className="font-bold text-gray-800">{conta.nome}</span><span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide ${conta.user_id === userId ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>@{conta.autor_nome || 'Usuário'}</span></div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mt-1">
                          {conta.banco} {conta.ultimos_digitos && `• FINAL ${conta.ultimos_digitos}`}
                        </span>
                        {conta.subtipo === 'pix' ? (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 mt-1 inline-block">PIX: {conta.chave_pix}</span>
                        ) : (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 mt-1 inline-block">DÉBITO NA CONTA</span>
                        )}
                      </div>
                      <button onClick={() => abrirModalEditar(conta)} className={`p-2 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${conta.user_id === userId ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50' : 'text-gray-200 cursor-not-allowed'}`}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                    </li>
                  ))}
                  {contasCorrentes.length === 0 && <li className="p-4 text-gray-400 text-sm font-bold text-center">Nenhuma conta cadastrada</li>}
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
              <div className="p-4 border-b border-gray-100 bg-purple-50/50 flex items-center gap-2"><svg className="text-purple-600" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg><h3 className="text-lg font-black text-purple-900">Cartões de Crédito</h3></div>
              <ul className="divide-y divide-gray-100">
                {cartoesCredito.map((conta) => (
                  <li key={conta.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                    <div>
                      <div className="flex items-center gap-2"><span className="font-bold text-gray-800">{conta.nome}</span><span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide ${conta.user_id === userId ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>@{conta.autor_nome || 'Usuário'}</span></div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mt-1">
                          {conta.banco} {conta.ultimos_digitos && `• FINAL ${conta.ultimos_digitos}`}
                      </span>
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 mt-1 inline-block">
                        FECHA DIA {conta.dia_fechamento} • VENCE DIA {conta.dia_vencimento}
                      </span>
                    </div>
                    <button onClick={() => abrirModalEditar(conta)} className={`p-2 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${conta.user_id === userId ? 'text-gray-400 hover:text-purple-600 hover:bg-purple-50' : 'text-gray-200 cursor-not-allowed'}`}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                  </li>
                ))}
                {cartoesCredito.length === 0 && <li className="p-4 text-gray-400 text-sm font-bold text-center">Nenhum cartão cadastrado</li>}
              </ul>
            </div>

          </div>
        )}
      </main>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            <div className="sticky top-0 z-10 px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/90 backdrop-blur-md">
              <h3 className="text-lg font-black text-gray-900">{editandoId ? "Editar Pagamento" : "Nova Forma de Pagto"}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-900 text-2xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleSalvarConta} className="p-6 space-y-5">
              
              <div className="flex p-1 bg-gray-200 rounded-xl gap-1">
                <button type="button" onClick={() => setTipo("corrente")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipo === "corrente" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Conta/PIX</button>
                <button type="button" onClick={() => setTipo("credito")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipo === "credito" ? "bg-white text-purple-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Cartão Créd</button>
                <button type="button" onClick={() => setTipo("dinheiro")} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${tipo === "dinheiro" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Físico</button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Apelido (Nome)</label>
                <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder={tipo === 'dinheiro' ? "Ex: Carteira, Cofre..." : "Ex: Nubank Pessoal, Black Itaú..."} className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" />
              </div>

              {/* MÁGICA DE ESCONDER: Se for Dinheiro não mostra nada. Se for PIX, mostra só o Banco! */}
              {tipo !== 'dinheiro' && (
                <div className="flex gap-4 animate-in fade-in duration-200">
                  <div className="flex-[2]">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Instituição / Banco</label>
                    <input type="text" required value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Ex: Inter, Itaú, Nubank" className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" />
                  </div>
                  
                  {/* Pede os dígitos SÓ SE FOR Crédito ou Débito (PIX é travado) */}
                  {(tipo === 'credito' || (tipo === 'corrente' && subtipo === 'debito')) && (
                    <div className="flex-1 animate-in slide-in-from-right-4 fade-in duration-200">
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Últimos 4</label>
                      <input type="text" maxLength={4} required value={ultimosDigitos} onChange={(e) => setUltimosDigitos(e.target.value.replace(/\D/g, ''))} placeholder="1234" className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-center tracking-widest" />
                    </div>
                  )}
                </div>
              )}

              {tipo === 'corrente' && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex p-1 bg-white border border-gray-200 rounded-lg gap-1">
                    <button type="button" onClick={() => setSubtipo("debito")} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${subtipo === "debito" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>Débito</button>
                    <button type="button" onClick={() => setSubtipo("pix")} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${subtipo === "pix" ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>Chave PIX</button>
                  </div>
                  
                  {subtipo === 'pix' && (
                    <div className="flex gap-3 animate-in fade-in duration-300">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Tipo</label>
                        <select required value={tipoChave} onChange={(e) => setTipoChave(e.target.value)} className="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-bold text-gray-900 focus:border-green-500 outline-none">
                          <option value="" disabled>Selecione...</option><option value="cpf">CPF/CNPJ</option><option value="celular">Celular</option><option value="email">E-mail</option><option value="aleatoria">Aleatória</option>
                        </select>
                      </div>
                      <div className="flex-[2]">
                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Chave PIX</label>
                        <input type="text" required value={chavePix} onChange={(e) => setChavePix(e.target.value)} placeholder="Sua chave..." className="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-bold text-gray-900 focus:border-green-500 outline-none" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tipo === 'credito' && (
                <div className="flex gap-4 p-4 bg-purple-50/50 border border-purple-100 rounded-xl animate-in zoom-in-95 duration-200">
                  <div className="flex-1"><label className="block text-[10px] font-bold text-purple-700 mb-1 uppercase tracking-wider">Dia Fechamento</label><input type="number" min="1" max="31" required value={diaFechamento} onChange={(e) => setDiaFechamento(e.target.value)} placeholder="Ex: 10" className="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm font-bold text-gray-900 focus:border-purple-500" /></div>
                  <div className="flex-1"><label className="block text-[10px] font-bold text-purple-700 mb-1 uppercase tracking-wider">Dia Vencimento</label><input type="number" min="1" max="31" required value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} placeholder="Ex: 17" className="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm font-bold text-gray-900 focus:border-purple-500" /></div>
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                {editandoId && (
                  <button type="button" onClick={handleExcluirConta} disabled={isSubmitting} className="px-4 py-3.5 rounded-xl text-red-600 font-bold bg-red-50 hover:bg-red-100 border border-red-200 transition-all active:scale-95 shrink-0" title="Apagar Conta">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                )}
                <button type="submit" disabled={isSubmitting} className={`flex-1 py-3.5 rounded-xl text-white font-black uppercase tracking-wide transition-all shadow-md active:scale-95 ${tipo === 'credito' ? 'bg-purple-600 hover:bg-purple-700' : tipo === 'dinheiro' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {isSubmitting ? "Carregando..." : "Salvar"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}