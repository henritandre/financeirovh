"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function AuditoriaPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]); // Mistura de excluidos e atualizados
  const [loading, setLoading] = useState(true);
  
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<string[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);

  const carregarAuditoria = async () => {
    setLoading(true);
    
    // Puxa as exclusões
    const { data: excluidos } = await supabase.from("transacoes_excluidas").select("*");
    // Puxa as atualizações
    const { data: atualizados } = await supabase.from("transacoes_atualizadas").select("*");

    // Formata e junta as duas listas
    let listaUnificada: any[] = [];
    
    if (excluidos) {
      const excluidosFormatados = excluidos.map(t => ({ ...t, auditoria_tipo: 'exclusao', data_evento: t.excluido_em }));
      listaUnificada = [...listaUnificada, ...excluidosFormatados];
    }
    
    if (atualizados) {
      const atualizadosFormatados = atualizados.map(t => ({ ...t, auditoria_tipo: 'atualizacao', data_evento: t.atualizado_em }));
      listaUnificada = [...listaUnificada, ...atualizadosFormatados];
    }

    // Ordena pela data do acontecimento (mais recente primeiro)
    listaUnificada.sort((a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime());

    if (listaUnificada.length > 0) {
      setLogs(listaUnificada);
      
      const { data: contasData } = await supabase.from("contas").select("autor_nome");
      const autoresLogs = listaUnificada.map(t => t.autor_nome || "Usuário");
      const autoresContas = contasData ? contasData.map(c => c.autor_nome || "Usuário") : [];
      
      const { data: { user } } = await supabase.auth.getUser();
      const euMesmo = user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuário";
      
      const unicos = Array.from(new Set([...autoresLogs, ...autoresContas, euMesmo].filter(n => n && n !== 'Família')));
      setUsuariosDisponiveis(unicos);
      setUsuariosSelecionados(unicos); 
    }
    setLoading(false);
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      carregarAuditoria();
    };
    loadInit();
  }, [router]);

  const toggleUsuario = (nome: string) => { setUsuariosSelecionados(prev => prev.includes(nome) ? prev.filter(u => u !== nome) : [...prev, nome]); };
  const logsFiltrados = logs.filter((t) => t.autor_nome === 'Família' || usuariosSelecionados.includes(t.autor_nome || "Usuário"));

  const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const formatarDataHora = (dStr: string) => { const d = new Date(dStr); return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center relative z-10">
        <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">
          <svg className="text-gray-500" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          Auditoria de Registros
        </h1>
        <button onClick={() => router.push("/dashboard")} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">Voltar ao Dashboard</button>
      </nav>

      <main className="max-w-4xl mx-auto mt-10 p-6">
        <div className="mb-8"><h2 className="text-2xl font-black text-gray-900">Histórico de Exclusões e Edições</h2><p className="text-gray-500 font-bold mt-1">Veja quem apagou ou alterou os lançamentos, e o motivo.</p></div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Filtrar por Autor da Despesa</label>
          <div className="flex flex-wrap gap-2">
            {loading ? (<span className="text-sm text-gray-400 font-medium py-2">Buscando...</span>) : 
             usuariosDisponiveis.length === 0 ? (<span className="text-sm text-gray-400 font-medium py-2">Nenhum usuário</span>) : 
             (usuariosDisponiveis.map(user => { const isSelected = usuariosSelecionados.includes(user); return (<button key={user} onClick={() => toggleUsuario(user)} className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-all active:scale-95 ${isSelected ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>@{user}</button>); }))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? ( <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div></div> ) : 
           logsFiltrados.length === 0 ? ( <div className="p-10 flex flex-col items-center justify-center text-center gap-3"><p className="text-gray-500 font-bold">Nenhum registro encontrado na auditoria.</p></div> ) : (
            <ul className="divide-y divide-gray-100">
              {logsFiltrados.map((t) => (
                <li key={t.id} className={`p-5 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${t.auditoria_tipo === 'exclusao' ? 'hover:bg-red-50/30' : 'hover:bg-blue-50/30'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md text-white uppercase tracking-wider ${t.auditoria_tipo === 'exclusao' ? 'bg-red-600' : 'bg-blue-600'}`}>
                        {t.auditoria_tipo === 'exclusao' ? 'APAGADO' : 'EDITADO'}
                      </span>
                      <span className="font-black text-gray-900">{t.descricao}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${t.tipo === 'receita' ? 'bg-green-50 text-green-700 border-green-200' : t.tipo === 'despesa' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {t.tipo === 'receita' ? 'RECEITA' : t.tipo === 'despesa' ? 'DESPESA' : 'TRANSFERÊNCIA'}
                      </span>
                    </div>
                    
                    <p className={`text-sm font-bold mt-2 p-2.5 rounded-lg border ${t.auditoria_tipo === 'exclusao' ? 'bg-red-50/50 border-red-100 text-red-900' : 'bg-blue-50/50 border-blue-100 text-blue-900'}`}>
                      <span className="opacity-60 mr-1">Motivo:</span> "{t.motivo}"
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[11px] font-bold text-gray-400">
                      <span className="flex items-center gap-1 text-gray-600">💰 {formatarMoeda(t.valor)}</span>
                      <span>📅 Lançamento orig.: {new Date(t.data).toLocaleDateString('pt-BR')}</span>
                      <span>⏱️ Ação em: {formatarDataHora(t.data_evento)}</span>
                      <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">Criador: @{t.autor_nome || 'Usuário'}</span>
                      <span className={`px-2 py-0.5 rounded border ${t.auditoria_tipo === 'exclusao' ? 'text-red-700 bg-red-100 border-red-200' : 'text-blue-700 bg-blue-100 border-blue-200'}`}>
                        {t.auditoria_tipo === 'exclusao' ? 'Apagou' : 'Editou'}: @{t.excluido_por_nome || t.atualizado_por_nome || 'Usuário'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}