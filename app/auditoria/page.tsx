"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeContext";

export default function AuditoriaPage() {
  const router = useRouter();
  
  // ==========================================
  // CÉREBRO DO TEMA E ANIMAÇÃO DA MOLA
  // ==========================================
  const { isDarkMode, toggleTheme, isWaving } = useTheme();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<string[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);

  const carregarAuditoria = async () => {
    setLoading(true);
    
    // Busca os dados das duas tabelas de log
    const { data: excluidos } = await supabase.from("transacoes_excluidas").select("*");
    const { data: atualizados } = await supabase.from("transacoes_atualizadas").select("*");

    let listaUnificada: any[] = [];
    
    // CORREÇÃO: O banco salva o log usando "criado_em" por padrão.
    // Agora o sistema garante que vai pegar a data correta para não ocultar as edições.
    if (excluidos) {
      const excluidosFormatados = excluidos.map(t => ({ 
        ...t, 
        auditoria_tipo: 'exclusao', 
        data_evento: t.criado_em || t.excluido_em || new Date().toISOString() 
      }));
      listaUnificada = [...listaUnificada, ...excluidosFormatados];
    }
    
    if (atualizados) {
      const atualizadosFormatados = atualizados.map(t => ({ 
        ...t, 
        auditoria_tipo: 'atualizacao', 
        data_evento: t.criado_em || t.atualizado_em || new Date().toISOString() 
      }));
      listaUnificada = [...listaUnificada, ...atualizadosFormatados];
    }

    // Ordena do mais recente para o mais antigo
    listaUnificada.sort((a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime());

    if (listaUnificada.length > 0) {
      setLogs(listaUnificada);
      
      // Monta os botões de filtro de usuários
      const { data: contasData } = await supabase.from("contas").select("autor_nome");
      const autoresLogs = listaUnificada.map(t => t.autor_nome || "Usuário");
      const autoresContas = contasData ? contasData.map(c => c.autor_nome || "Usuário") : [];
      const euMesmo = username || "Usuário";
      
      const unicos = Array.from(new Set([...autoresLogs, ...autoresContas, euMesmo].filter(n => n && n !== 'Família')));
      setUsuariosDisponiveis(unicos);
      setUsuariosSelecionados(unicos); 
    }
    setLoading(false);
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        setUsername(user.user_metadata?.username || user.email?.split('@')[0] || "");
        setFullName(user.user_metadata?.full_name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
        carregarAuditoria();
      } else {
        router.push("/login");
      }
    };
    loadInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const toggleUsuario = (nome: string) => { setUsuariosSelecionados(prev => prev.includes(nome) ? prev.filter(u => u !== nome) : [...prev, nome]); };
  const logsFiltrados = logs.filter((t) => t.autor_nome === 'Família' || usuariosSelecionados.includes(t.autor_nome || "Usuário"));

  const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const formatarDataHora = (dStr: string) => { const d = new Date(dStr); return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };

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

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-10 transition-colors duration-300 relative">
        
        {/* NAVBAR UNIFICADA */}
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center relative z-10 transition-colors">
          <h1 className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight flex items-center gap-2">
            <svg className="text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            Auditoria de Registros
          </h1>
          <div className="flex items-center">
            <button onClick={toggleTheme} className="relative inline-flex items-center h-7 w-14 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors mr-4 focus:outline-none" title="Modo Escuro">
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
                      <button onClick={() => router.push("/categorias")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🏷️ Categorias</button>
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

        <main className="max-w-4xl mx-auto mt-10 p-6">
          <div className={`mb-8 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0s' }}>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Histórico de Exclusões e Edições</h2>
            <p className="text-gray-500 dark:text-gray-400 font-bold mt-1">Veja quem apagou ou alterou os lançamentos, e o motivo.</p>
          </div>

          <div className={`bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 transition-colors mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.1s' }}>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Filtrar por Autor da Despesa</label>
            <div className="flex flex-wrap gap-2">
              {loading ? (<span className="text-sm text-gray-400 font-medium py-2">Buscando...</span>) : 
               usuariosDisponiveis.length === 0 ? (<span className="text-sm text-gray-400 font-medium py-2">Nenhum usuário</span>) : 
               (usuariosDisponiveis.map(user => { const isSelected = usuariosSelecionados.includes(user); return (<button key={user} onClick={() => toggleUsuario(user)} className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-all active:scale-95 ${isSelected ? 'bg-gray-800 dark:bg-gray-600 text-white shadow-md border-transparent' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>@{user}</button>); }))}
            </div>
          </div>

          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.2s' }}>
            {loading ? ( <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div></div> ) : 
             logsFiltrados.length === 0 ? ( <div className="p-10 flex flex-col items-center justify-center text-center gap-3"><p className="text-gray-500 dark:text-gray-400 font-bold">Nenhum registro encontrado na auditoria.</p></div> ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {logsFiltrados.map((t) => (
                  <li key={t.id} className={`p-5 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${t.auditoria_tipo === 'exclusao' ? 'hover:bg-red-50/30 dark:hover:bg-red-900/10' : 'hover:bg-blue-50/30 dark:hover:bg-blue-900/10'}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md text-white uppercase tracking-wider shadow-sm ${t.auditoria_tipo === 'exclusao' ? 'bg-red-600' : 'bg-blue-600'}`}>
                          {t.auditoria_tipo === 'exclusao' ? 'APAGADO' : 'EDITADO'}
                        </span>
                        <span className="font-black text-gray-900 dark:text-white">{t.descricao}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${t.tipo === 'receita' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : t.tipo === 'despesa' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'}`}>
                          {t.tipo === 'receita' ? 'RECEITA' : t.tipo === 'despesa' ? 'DESPESA' : 'TRANSFERÊNCIA'}
                        </span>
                      </div>
                      
                      <p className={`text-sm font-bold mt-2 p-2.5 rounded-lg border ${t.auditoria_tipo === 'exclusao' ? 'bg-red-50/50 dark:bg-red-900/20 border-red-100 dark:border-red-900 text-red-900 dark:text-red-300' : 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900 text-blue-900 dark:text-blue-300'}`}>
                        <span className="opacity-60 mr-1">Motivo:</span> "{t.motivo}"
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[11px] font-bold text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">💰 {formatarMoeda(t.valor)}</span>
                        <span>📅 Lançamento orig.: {new Date(t.data).toLocaleDateString('pt-BR')}</span>
                        <span>⏱️ Ação em: {formatarDataHora(t.data_evento)}</span>
                        <span className="text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 shadow-sm">Criador: @{t.autor_nome || 'Usuário'}</span>
                        <span className={`px-2 py-0.5 rounded border shadow-sm ${t.auditoria_tipo === 'exclusao' ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'}`}>
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
    </>
  );
}