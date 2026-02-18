"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function PerfilPage() {
  const router = useRouter();
  
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");
        setUsername(user.user_metadata?.username || user.email?.split('@')[0] || "");
        setFullName(user.user_metadata?.full_name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
      } else {
        router.push("/login");
      }
      setLoading(false);
    };
    loadInit();
    loadProfile();
  }, [router]);

  const loadInit = async () => {} // Dummy pra não quebrar padrão

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Você deve selecionar uma imagem.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      // Cria um nome único pra imagem não sobrepor de outro usuário sem querer
      const filePath = `${userId}-${Math.random()}.${fileExt}`;

      // 1. Sobe a imagem pro Balde (Bucket) "avatars"
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Pega a URL pública da imagem que acabou de subir
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const newAvatarUrl = data.publicUrl;

      // 3. Atualiza o cadastro do usuário com a nova URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: newAvatarUrl }
      });

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      showToast("Foto de perfil atualizada com sucesso!");
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Atualiza os dados de nome do usuário
    const { error } = await supabase.auth.updateUser({
      data: { 
        full_name: fullName,
        username: username 
      }
    });

    if (error) {
      showToast("Erro ao salvar: " + error.message, "error");
    } else {
      showToast("Perfil atualizado com sucesso!");
    }
    setSaving(false);
  };

  // Pega a inicial pra mostrar caso não tenha foto
  const initialLetter = username ? username.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : "?");

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {toast.show && (<div className={`fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl font-bold text-white flex items-center gap-3 animate-in slide-in-from-right-8 fade-in duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}><span className="text-xl">{toast.type === 'success' ? '✓' : '!'}</span>{toast.message}</div>)}

      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center relative z-10">
        <h1 className="text-xl font-black text-blue-600 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Meu Perfil
        </h1>
        <button onClick={() => router.push("/dashboard")} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">Voltar ao Dashboard</button>
      </nav>

      <main className="max-w-2xl mx-auto mt-10 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
          
          {/* O FUNDO BLUR VIP QUE VOCÊ CURTIU NA TELA DE LOGIN */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-purple-600 opacity-90 blur-sm"></div>

          {loading ? (
            <div className="flex justify-center p-20 relative z-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : (
            <div className="relative z-10 flex flex-col items-center mt-8">
              
              {/* ÁREA DA FOTO DE PERFIL */}
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100 flex items-center justify-center relative">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-black text-blue-600">{initialLetter}</span>
                  )}
                  
                  {/* OVERLAY DE HOVER */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  </div>

                  {uploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                
                {/* INPUT INVISÍVEL */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={uploadAvatar} 
                  className="hidden" 
                  disabled={uploading}
                />
                
                <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 5-3-3H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"/><path d="M8 18h1"/><path d="M18.4 9.6a2 2 0 1 1 3 3L17 17l-4 1 1-4Z"/></svg>
                </div>
              </div>

              <div className="text-center mt-4 mb-8">
                <h2 className="text-2xl font-black text-gray-900">{fullName || username}</h2>
                <p className="text-sm font-bold text-gray-500">{email}</p>
              </div>

              {/* FORMULÁRIO DE DADOS */}
              <form onSubmit={handleSalvarPerfil} className="w-full space-y-5">
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Apelido (Username)</label>
                    <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ex: henricadas" className="block w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all" />
                  </div>
                  <div className="flex-[2]">
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Nome Completo</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" className="block w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all" />
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={saving} className="w-full py-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-wide transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex justify-center items-center gap-2">
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </form>
              
            </div>
          )}
        </div>
      </main>
    </div>
  );
}