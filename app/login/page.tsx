"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  
  // Estados do formulário
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // Novo campo de username
  
  // Estados de controle e animação
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    if (!isLogin) {
      // --- MODO CADASTRO ---
      // Salvando o email, senha e mandando o Username para os metadados do Supabase
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            username: username,
          }
        }
      });
      
      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({ text: "Boa! Conta criada com sucesso.", type: "success" });
        // Pequena animação antes de voltar pro modo login
        setTimeout(() => toggleMode(), 2000); 
      }
    } else {
      // --- MODO LOGIN ---
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setMessage({ text: "Email ou senha incorretos. Tenta aí de novo!", type: "error" });
      } else {
        setMessage({ text: "Acesso liberado! Entrando...", type: "success" });
        // Animação de sucesso (espera 800ms antes de jogar pro painel)
        setTimeout(() => router.push("/dashboard"), 800);
      }
    }
    setLoading(false);
  };

  // Função para animar a troca entre Login e Cadastro
  const toggleMode = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsLogin(!isLogin);
      setMessage({ text: "", type: "" });
      setIsAnimating(false);
    }, 300); // Tempo para o form sumir antes de trocar
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-4 transition-colors duration-500">
      
      {/* Container Principal com efeito de flutuação e sombra suave */}
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] transition-all duration-500 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.12)] border border-gray-100/50">
        
        <div className="text-center transform transition-all duration-500">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {isLogin ? "Acesse para gerenciar suas finanças" : "Vamos organizar essa grana juntos"}
          </p>
        </div>

        {/* Formulário com animação de Fade In/Out na troca de telas */}
        <form 
          onSubmit={handleAuth} 
          className={`mt-8 space-y-6 transition-all duration-300 transform ${isAnimating ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}
        >
          <div className="space-y-5">
            
            {/* Campo Username (Aparece com animação só no Cadastro) */}
            <div className={`transition-all duration-500 overflow-hidden ${isLogin ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'}`}>
              <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                required={!isLogin}
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900 transition-all duration-300 focus:-translate-y-1 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/20 sm:text-sm"
                placeholder="Ex: henricadas"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {/* Campo Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900 transition-all duration-300 focus:-translate-y-1 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/20 sm:text-sm"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                required
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900 transition-all duration-300 focus:-translate-y-1 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/20 sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Alertas Animados */}
          {message.text && (
            <div className={`p-4 rounded-xl text-sm font-medium text-center transition-all animate-pulse ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
              {message.text}
            </div>
          )}

          {/* Botão Principal com Efeito de Escala e Brilho */}
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,_99,_235,_0.4)] hover:-translate-y-0.5 active:scale-95 active:translate-y-0 disabled:opacity-70 disabled:hover:scale-100 disabled:hover:translate-y-0 overflow-hidden"
          >
            {/* Efeito de brilho passando no botão (Shine effect) */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
            
            <span className="relative">
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Processando...
                </span>
              ) : isLogin ? "Entrar no Sistema" : "Criar Minha Conta"}
            </span>
          </button>
        </form>

        {/* Botão de Rodapé para Alternar Telas */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm font-semibold text-gray-500 transition-colors hover:text-blue-600 active:scale-95"
          >
            {isLogin ? (
              <span>Ainda não tem conta? <span className="text-blue-600 underline decoration-blue-300 underline-offset-4">Clique aqui para criar</span></span>
            ) : (
              <span>Já tem uma conta? <span className="text-blue-600 underline decoration-blue-300 underline-offset-4">Faça login aqui</span></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}