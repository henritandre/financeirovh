"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeContext";

export default function ParametrosPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, isWaving } = useTheme();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados dos Parâmetros
  const [notificarRendimento, setNotificarRendimento] = useState(true);
  const [diasAlerta, setDiasAlerta] = useState(15);
  const [qtdFaturasVisiveis, setQtdFaturasVisiveis] = useState(3);

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

  useEffect(() => {
    const carregarParametros = async (uid: string) => {
      const { data, error } = await supabase
        .from("parametros")
        .select("chave, valor")
        .eq("user_id", uid)
        .in("chave", ["notificar_rendimento", "dias_alerta_rendimento", "qtd_faturas_visiveis"]);

      if (error) {
        showIsland("Erro ao carregar configurações", "error", "🛑");
      } else if (data) {
        data.forEach(p => {
          if (p.chave === "notificar_rendimento") setNotificarRendimento(p.valor);
          if (p.chave === "dias_alerta_rendimento") setDiasAlerta(Number(p.valor));
          if (p.chave === "qtd_faturas_visiveis") setQtdFaturasVisiveis(Number(p.valor));
        });
      }
      setIsLoading(false);
    };

    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");
        setUsername(user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário");
        setFullName(user.user_metadata?.full_name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
        
        carregarParametros(user.id);
      } else {
        router.push("/login");
      }
    };
    loadInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (diasAlerta < 1) {
      showIsland("O número de dias deve ser maior que zero", "error", "🛑");
      setIsSaving(false);
      return;
    }

    if (qtdFaturasVisiveis < 1) {
      showIsland("A quantidade de faturas visíveis deve ser maior que zero", "error", "🛑");
      setIsSaving(false);
      return;
    }

    const payload = [
      { user_id: userId, chave: "notificar_rendimento", valor: notificarRendimento },
      { user_id: userId, chave: "dias_alerta_rendimento", valor: diasAlerta },
      { user_id: userId, chave: "qtd_faturas_visiveis", valor: qtdFaturasVisiveis }
    ];

    // O upsert insere se não existir ou atualiza se já existir a chave para este usuário
    const { error } = await supabase
      .from("parametros")
      .upsert(payload, { onConflict: 'user_id, chave' });

    if (error) {
      showIsland(`Erro ao salvar: ${error.message}`, "error", "🛑");
    } else {
      showIsland("Configurações salvas com sucesso!", "success", "💾");
    }
    
    setIsSaving(false);
  };

  const initialLetterMenu = username ? username.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";

  return (
    <>
      <style>{`
        /* DYNAMIC ISLAND 2.0 (BALLOON INFLATE/POP) */
        @keyframes balloonInflate { 0% { transform: translateY(-50px) scale(0.3); opacity: 0; filter: blur(10px); } 60% { transform: translateY(5px) scale(1.05); opacity: 1; filter: blur(0px); } 100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0px); } }
        @keyframes balloonPop { 0% { transform: scale(1); opacity: 1; filter: blur(0px); } 40% { transform: scale(1.15); opacity: 0.8; filter: blur(2px); } 100% { transform: scale(0); opacity: 0; filter: blur(10px); } }
        .animate-balloon-inflate { animation: balloonInflate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-balloon-pop { animation: balloonPop 0.4s cubic-bezier(0.36, -0.24, 0.86, 1.3) forwards; }
        @keyframes islandShake { 0%, 100% { transform: translateX(0); } 25%, 75% { transform: translateX(-4px); } 50% { transform: translateX(4px); } }
        @keyframes islandExplode { 0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255,255,255,0.7); } 50% { transform: scale(1.5); opacity: 0.8; box-shadow: 0 0 10px 5px rgba(255,255,255,0); } 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255,255,255,0); } }

        /* EFEITO MAC DOCK WAVE */
        @keyframes macDockWave { 0% { transform: translateY(0) scale(1); } 40% { transform: translateY(-16px) scale(1.03); } 70% { transform: translateY(4px) scale(0.98); } 100% { transform: translateY(0) scale(1); } }
        .mac-dock-item { will-change: transform; }
        .mac-dock-animate { animation: macDockWave 0.6s cubic-bezier(0.25, 1, 0.5, 1) both; }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative pb-20 overflow-x-hidden transition-colors duration-300">
        
        {/* DYNAMIC ISLAND */}
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

        {/* NAVBAR */}
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center relative z-10 transition-colors">
          <h1 className="text-xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 tracking-tight">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            Parâmetros
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
                      <button onClick={() => router.push("/contas-fixas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">📌 Contas Fixas</button>
                      <button onClick={() => router.push("/assinaturas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🔁 Assinaturas</button>
                      <button onClick={() => router.push("/categorias")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🏷️ Categorias</button>
                      <button onClick={() => router.push("/auditoria")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🗑️ Auditoria de Lançamentos</button>
                      <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2"></div>
                      <button onClick={() => router.push("/parametros")} className="w-full text-left px-4 py-2.5 text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg transition-colors">⚙️ Parâmetros do Sistema</button>
                      <button onClick={() => router.push("/perfil")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">👤 Meu Perfil</button>
                      <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">Sair do Sistema</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>

        <main className="p-6 max-w-4xl mx-auto space-y-6 mt-4 relative z-0">
          <div className={`flex flex-col mb-8 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0s' }}>
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Preferências</h2>
            <p className="text-gray-500 dark:text-gray-400 font-bold mt-1">Ajuste o comportamento do sistema para a sua conta.</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600"></div></div>
          ) : (
            <form onSubmit={handleSalvar} className={`bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.1s' }}>
              
              <div className="p-6 sm:p-8 space-y-8">
                
                {/* BLOCO 1: GESTÃO DE PATRIMÔNIO (CAIXINHAS) */}
                <div>
                  <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700 pb-2 mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Gestão de Patrimônio
                  </h3>

                  <div className="space-y-6">
                    {/* TOGGLE: ALERTAS DE RENDIMENTO */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">Lembrete de Rendimentos</h4>
                        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">O sistema te avisa caso você esqueça de atualizar o saldo das suas caixinhas e fundos de investimento.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotificarRendimento(!notificarRendimento)}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${notificarRendimento ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                        role="switch"
                        aria-checked={notificarRendimento}
                      >
                        <span className="sr-only">Ativar lembrete</span>
                        <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notificarRendimento ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* INPUT: DIAS DE ALERTA (Só aparece se o toggle estiver ligado) */}
                    <div className={`transition-all duration-300 overflow-hidden ${notificarRendimento ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">Intervalo de tolerância</label>
                          <p className="text-xs font-medium text-blue-700/70 dark:text-blue-400/70">Aviso aparece se uma caixinha ficar sem rendimento por quantos dias seguidos?</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <input
                            type="number"
                            min="1"
                            max="365"
                            required={notificarRendimento}
                            value={diasAlerta}
                            onChange={(e) => setDiasAlerta(Number(e.target.value))}
                            className="w-20 text-center rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 p-2.5 text-lg font-black text-blue-900 dark:text-blue-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                          />
                          <span className="text-sm font-bold text-blue-800 dark:text-blue-300">dias</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO 2: CARTÕES DE CRÉDITO */}
                <div>
                  <h3 className="text-sm font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700 pb-2 mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    Cartões de Crédito
                  </h3>

                  <div className="bg-purple-50/50 dark:bg-purple-900/10 p-5 rounded-2xl border border-purple-100 dark:border-purple-900/50 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-purple-900 dark:text-purple-300 mb-1">Faturas visíveis por padrão</label>
                      <p className="text-xs font-medium text-purple-700/70 dark:text-purple-400/70">No Dashboard, cada cartão vem com a lista de faturas colapsada, mostrando só as mais recentes. Escolha quantas aparecem antes de precisar clicar em "Ver mais".</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <input
                        type="number"
                        min="1"
                        max="24"
                        required
                        value={qtdFaturasVisiveis}
                        onChange={(e) => setQtdFaturasVisiveis(Number(e.target.value))}
                        className="w-20 text-center rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 p-2.5 text-lg font-black text-purple-900 dark:text-purple-100 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20"
                      />
                      <span className="text-sm font-bold text-purple-800 dark:text-purple-300">faturas</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    "Salvar Configurações"
                  )}
                </button>
              </div>

            </form>
          )}
        </main>
      </div>
    </>
  );
}