"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function AuditoriaPage() {
  const router = useRouter();
  const [excluidas, setExcluidas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getDatLocalHoje = () => {
    const hoje = new Date();
    const tzOffset = hoje.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  };

  const [filtroMes, setFiltroMes] = useState(getDatLocalHoje().slice(0, 7));
  const [filtroTipo, setFiltroTipo] = useState("todos");
  
  // PÍLULAS DA AUDITORIA
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<string[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);

  useEffect(() => {
    const carregarAuditoria = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("transacoes_excluidas")
        .select("*, categorias(nome)")
        .order("excluido_em", { ascending: false });

      if (data) {
        setExcluidas(data);
        
        // Descobre quem são os autores das exclusões
        const unicos = Array.from(new Set(data.map(t => t.autor_nome || "Usuário")));
        setUsuariosDisponiveis(unicos);
        setUsuariosSelecionados(unicos); // Marca todas as pílulas por padrão
      }
      setLoading(false);
    };

    carregarAuditoria();
  }, [router]);

  // Função para marcar/desmarcar pílula na auditoria
  const toggleUsuario = (nome: string) => {
    setUsuariosSelecionados(prev => 
      prev.includes(nome) ? prev.filter(u => u !== nome) : [...prev, nome]
    );
  };

  const excluidasFiltradas = excluidas.filter((t) => {
    const matchMes = t.data.startsWith(filtroMes);
    const matchTipo = filtroTipo === "todos" || t.tipo === filtroTipo;
    const matchUsuario = usuariosSelecionados.includes(t.autor_nome || "Usuário");
    
    return matchMes && matchTipo && matchUsuario;
  });

  const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const formatarDataOriginal = (dataString: string) => {
    if (!dataString) return "";
    const [ano, mes, dia] = dataString.split("T")[0].split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const formatarDataHora = (isoString: string) => {
    const data = new Date(isoString);
    return data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2-9 5 18 3-10 4 4"/></svg>
          Auditoria de Exclusões
        </h1>
        <button onClick={() => router.push("/dashboard")} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
          Voltar ao Dashboard
        </button>
      </nav>

      <main className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        
        <div className="border-b border-gray-100 pb-4 mb-6">
          <h2 className="text-2xl font-black text-gray-900">Lançamentos Excluídos</h2>
          <p className="text-gray-500 font-bold mt-1">Histórico completo de tudo que foi apagado.</p>
        </div>

        {/* --- BARRA DE FILTROS --- */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex gap-4 flex-col sm:flex-row flex-1">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Mês da Transação</label>
              <input type="month" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm font-bold text-gray-700 outline-none focus:border-red-500" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Tipo</label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm font-bold text-gray-700 outline-none focus:border-red-500 cursor-pointer">
                <option value="todos">Receitas e Despesas</option>
                <option value="receita">Apenas Receitas</option>
                <option value="despesa">Apenas Despesas</option>
              </select>
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Autor Original</label>
            <div className="flex flex-wrap gap-2">
              {usuariosDisponiveis.length === 0 ? (
                <span className="text-sm text-gray-400 font-medium py-1">Nenhum autor...</span>
              ) : (
                usuariosDisponiveis.map(user => {
                  const isSelected = usuariosSelecionados.includes(user);
                  return (
                    <button
                      key={user}
                      onClick={() => toggleUsuario(user)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      @{user}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
        ) : excluidasFiltradas.length === 0 ? (
          <div className="p-10 text-center text-gray-500 font-bold bg-gray-50 rounded-xl border border-gray-100">Nenhum lançamento foi excluído neste período.</div>
        ) : (
          <ul className="space-y-4">
            {excluidasFiltradas.map((t) => (
              <li key={t.id} className="p-4 bg-red-50/30 border border-red-100 rounded-xl flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="bg-red-100 text-red-700 text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide">Apagado</span>
                    <span className="text-base font-black text-gray-900">{t.descricao}</span>
                    <span className={`text-base font-black ${t.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatarMoeda(t.valor)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-2">
                    <span className="font-black text-gray-900">Motivo:</span> "{t.motivo}"
                  </p>
                </div>
                
                <div className="text-right shrink-0 mt-3 md:mt-0 bg-white p-3 rounded-xl border border-red-100/50 shadow-sm">
                  <p className="text-xs text-gray-600 font-bold mb-1">
                    Criado por: <span className="text-gray-900">@{t.autor_nome || 'Usuário'}</span>
                  </p>
                  <p className="text-xs text-red-600 font-black mb-1">
                    Apagado por: @{t.excluido_por_nome || 'Usuário'}
                  </p>
                  <div className="h-px bg-gray-100 my-1.5"></div>
                  <p className="text-xs text-gray-500 font-bold">Data original: {formatarDataOriginal(t.data)}</p>
                  <p className="text-xs text-gray-500 font-bold">Apagado em: {formatarDataHora(t.excluido_em)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}