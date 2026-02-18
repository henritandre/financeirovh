"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Campos do formulário
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email || "");
      // Puxa os dados salvos no "bolso" do Supabase (metadata)
      setUsername(user.user_metadata?.username || "");
      setFullName(user.user_metadata?.full_name || "");
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    // Atualiza os metadados do usuário logado
    const { error } = await supabase.auth.updateUser({
      data: { 
        username: username,
        full_name: fullName 
      }
    });

    if (error) {
      setMessage({ text: "Erro ao salvar: " + error.message, type: "error" });
    } else {
      setMessage({ text: "Perfil atualizado com sucesso!", type: "success" });
      // Limpa a mensagem de sucesso depois de 3 segundos
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Pega a primeira letra do username ou email para fazer um Avatar falso
  const initialLetter = username ? username.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Barra de Navegação Simples */}
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Meu Perfil</h1>
        <button 
          onClick={() => router.push("/dashboard")}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          Voltar ao Dashboard
        </button>
      </nav>

      <main className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        
        {/* Cabeçalho do Perfil com Avatar */}
        <div className="flex items-center gap-6 border-b border-gray-100 pb-8 mb-8">
          <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
            {initialLetter}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{fullName || "Sem nome"}</h2>
            <p className="text-gray-500">@{username || "usuario"}</p>
          </div>
        </div>

        {/* Formulário de Edição */}
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email (Não editável)</label>
            <input
              type="email"
              disabled
              value={email}
              className="block w-full rounded-xl border border-gray-200 bg-gray-100 p-3 text-gray-500 cursor-not-allowed sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/20 sm:text-sm"
              placeholder="Ex: henricadas"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/20 sm:text-sm"
              placeholder="Seu nome e sobrenome"
            />
          </div>

          {message.text && (
            <div className={`p-4 rounded-xl text-sm font-medium transition-all ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {message.text}
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-blue-600 text-white font-bold transition-all hover:bg-blue-700 hover:shadow-lg active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}