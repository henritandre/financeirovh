"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeContext";

export default function CategoriasPage() {
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

  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
  
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"receita" | "despesa">("despesa");

  const carregarCategorias = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("categorias")
      .select("*")
      .order("tipo", { ascending: true })
      .order("nome", { ascending: true });
    
    if (data) setCategorias(data);
    setLoading(false);
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");
        setUsername(user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário");
        setFullName(user.user_metadata?.full_name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
        carregarCategorias();
      } else {
        router.push("/login");
      }
    };
    loadInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const abrirModalNovo = () => {
    setEditandoId(null); setNome(""); setTipo("despesa"); setIsModalOpen(true);
  };

  const abrirModalEditar = (cat: any) => {
    setEditandoId(cat.id); setNome(cat.nome); setTipo(cat.tipo); setIsModalOpen(true);
  };

  const handleSalvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (editandoId) {
      const { error } = await supabase.from("categorias").update({ nome, tipo }).eq("id", editandoId);
      if (error) showIsland("Erro ao editar: " + error.message, "error", "🛑");
      else { showIsland("Categoria atualizada com sucesso!", "success", "✏️"); setIsModalOpen(false); carregarCategorias(); }
    } else {
      const { error } = await supabase.from("categorias").insert([{ nome, tipo }]);
      if (error) showIsland("Erro ao criar: " + error.message, "error", "🛑");
      else { showIsland("Nova categoria criada!", "success", "🎉"); setIsModalOpen(false); carregarCategorias(); }
    }
    setIsSubmitting(false);
  };

  const initialLetterMenu = username ? username.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";
  const receitas = categorias.filter(c => c.tipo === "receita");
  const despesas = categorias.filter(c => c.tipo === "despesa");

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
          <h1 className="text-xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-2 tracking-tight">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
            Categorias
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
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-11 w-11 rounded-full bg-gradient-to-tr from-gray-700 to-gray-500 flex items-center justify-center text-lg font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95 overflow-hidden border-2 border-white dark:border-gray-800">
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

        <main className="max-w-4xl mx-auto mt-10 p-6">
          
          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0s' }}>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">Gerenciar Categorias</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold mt-1">Crie ou edite os grupos dos seus lançamentos.</p>
            </div>
            <button onClick={abrirModalNovo} className="flex items-center gap-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap">
              <span className="text-xl leading-none">+</span> Nova Categoria
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.1s' }}>
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-red-50/50 dark:bg-red-900/20 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <h3 className="text-lg font-black text-red-900 dark:text-red-400">Despesas</h3>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {despesas.map((cat) => (
                    <li key={cat.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center group">
                      <span className="font-bold text-gray-800 dark:text-gray-200">{cat.nome}</span>
                      <button onClick={() => abrirModalEditar(cat)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                    </li>
                  ))}
                  {despesas.length === 0 && <li className="p-4 text-gray-400 dark:text-gray-500 text-sm font-bold text-center">Nenhuma despesa cadastrada</li>}
                </ul>
              </div>

              <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.2s' }}>
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-green-50/50 dark:bg-green-900/20 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <h3 className="text-lg font-black text-green-900 dark:text-green-400">Receitas</h3>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {receitas.map((cat) => (
                    <li key={cat.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center group">
                      <span className="font-bold text-gray-800 dark:text-gray-200">{cat.nome}</span>
                      <button onClick={() => abrirModalEditar(cat)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                    </li>
                  ))}
                  {receitas.length === 0 && <li className="p-4 text-gray-400 dark:text-gray-500 text-sm font-bold text-center">Nenhuma receita cadastrada</li>}
                </ul>
              </div>

            </div>
          )}
        </main>

        
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80">
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">{editandoId ? "Editar Categoria" : "Nova Categoria"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-2xl font-bold">&times;</button>
              </div>
              
              <form onSubmit={handleSalvarCategoria} className="p-6 space-y-5">
                <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl">
                  <button type="button" onClick={() => setTipo("despesa")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tipo === "despesa" ? "bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Despesa</button>
                  <button type="button" onClick={() => setTipo("receita")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tipo === "receita" ? "bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}>Receita</button>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">Nome da Categoria</label>
                  <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Assinaturas" className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all" />
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 rounded-xl text-white font-black uppercase tracking-wide transition-all shadow-md active:scale-95 bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? "Salvando..." : "Salvar Categoria"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}