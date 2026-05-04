"use client";

import { useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeContext";

export default function ResetPasswordPage() {
  const router = useRouter();
  
  // ==========================================
  // CÉREBRO DO TEMA E ANIMAÇÃO DA MOLA
  // ==========================================
  const { isDarkMode, toggleTheme, isWaving } = useTheme();
  
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para as animações da Senha
  const [showPassword, setShowPassword] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);

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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setIsTyping(false);
    setTimeout(() => setIsTyping(true), 10);
  };

  const handleTogglePassword = () => {
    if (isRevealing) return;
    setIsRevealing(true);
    
    setTimeout(() => {
      setShowPassword(!showPassword);
    }, 150);
    
    setTimeout(() => {
      setIsRevealing(false);
    }, 300);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Atualiza a senha do usuário que está logado via link do e-mail
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      showIsland("Erro ao atualizar: " + error.message, "error", "🛑");
    } else {
      showIsland("Senha alterada com sucesso!", "success", "🔑");
      setTimeout(() => router.push("/dashboard"), 2000);
    }
    setLoading(false);
  };

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

        /* Pulse tátil ao digitar */
        @keyframes typePulse { 0% { transform: scale(1); } 50% { transform: scale(1.015); } 100% { transform: scale(1); } }
        .animate-type-pulse { animation: typePulse 0.15s ease-out; }

        /* EFEITO GLASS REVEAL (SENHA) */
        @keyframes revealPulse {
          0% { opacity: 1; filter: blur(0px); transform: scale(1); }
          50% { opacity: 0; filter: blur(4px); transform: scale(0.98); }
          100% { opacity: 1; filter: blur(0px); transform: scale(1); }
        }
        .animate-reveal { animation: revealPulse 0.3s ease-in-out; }

        /* EFEITO GIRO DO OLHO */
        @keyframes iconPop {
          0% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(0.5) rotate(-45deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-icon-pop { animation: iconPop 0.3s ease-in-out; }

        /* BOLAS FLUTUANTES */
        @keyframes float1 { 0% { transform: translate(0, 0) scale(1); } 33% { transform: translate(15vw, 15vh) scale(1.2); } 66% { transform: translate(-10vw, 20vh) scale(0.8); } 100% { transform: translate(0, 0) scale(1); } }
        @keyframes float2 { 0% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-15vw, -20vh) scale(1.1); } 66% { transform: translate(15vw, -10vh) scale(0.9); } 100% { transform: translate(0, 0) scale(1); } }
        .animate-float-1 { animation: float1 15s infinite ease-in-out alternate; }
        .animate-float-2 { animation: float2 18s infinite ease-in-out alternate; }
      `}</style>

      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col justify-center py-12 px-6 relative overflow-hidden transition-colors duration-700">
        
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

        {/* BOTÃO DE TEMA */}
        <div className="absolute top-6 right-6 z-50">
          <button onClick={toggleTheme} className="relative inline-flex items-center h-8 w-16 rounded-full bg-white/30 dark:bg-white/10 backdrop-blur-2xl border border-white/50 dark:border-white/20 shadow-lg transition-colors focus:outline-none hover:scale-105 active:scale-95">
            <span className="absolute left-2.5 text-[12px]">🌙</span>
            <span className="absolute right-2.5 text-[12px]">☀️</span>
            <span className={`inline-block w-6 h-6 transform rounded-full bg-white shadow-md transition-transform z-10 ${isDarkMode ? "translate-x-9" : "translate-x-1"}`} />
          </button>
        </div>

        {/* FUNDO ANIMADO */}
        <div className="absolute inset-0 z-0 flex justify-center items-center pointer-events-none overflow-hidden">
          <div className="absolute top-[-5%] left-[-5%] w-[600px] h-[600px] bg-blue-500/40 dark:bg-blue-600/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-float-1"></div>
          <div className="absolute bottom-[-5%] right-[-5%] w-[550px] h-[550px] bg-purple-500/40 dark:bg-purple-600/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-float-2"></div>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
          <h2 className={`text-3xl font-black text-gray-900 dark:text-white tracking-tight mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0s' }}>
            Nova Senha
          </h2>
          <p className={`mt-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.05s' }}>
            Defina seu novo acesso
          </p>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className={`bg-white/40 dark:bg-black/30 backdrop-blur-3xl py-10 px-6 sm:px-12 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] rounded-3xl sm:rounded-[2.5rem] border border-white/60 dark:border-white/10 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.1s' }}>
            <form className="space-y-6" onSubmit={handleReset}>

              <div className={`mac-dock-item ${isWaving ? 'mac-dock-animate' : ''} ${isTyping ? 'animate-type-pulse' : ''}`} style={{ animationDelay: '0.15s' }}>
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-300 mb-2 uppercase tracking-wider ml-1">Digite a nova senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={handlePasswordChange}
                    className={`appearance-none block w-full px-5 py-4 pr-14 bg-white/50 dark:bg-white/5 border border-white/50 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/30 text-gray-900 dark:text-white font-bold transition-all shadow-inner backdrop-blur-md ${isRevealing ? 'animate-reveal text-transparent' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={handleTogglePassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none p-1 transition-colors z-10"
                  >
                    <div className={isRevealing ? 'animate-icon-pop' : ''}>
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div className={`pt-2 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.2s' }}>
                <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-2xl shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] text-sm font-black uppercase tracking-widest text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-4 focus:ring-blue-500/40 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    "Atualizar Senha"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}