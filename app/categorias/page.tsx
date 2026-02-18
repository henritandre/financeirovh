"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function CategoriasPage() {
  const router = useRouter();
  
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  // Campos do Formulário
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"receita" | "despesa">("despesa");

  const carregarCategorias = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("categorias")
      .select("*")
      .order("tipo", { ascending: true }) // Agrupa receitas e despesas
      .order("nome", { ascending: true }); // Ordem alfabética
    
    if (data) setCategorias(data);
    setLoading(false);
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");
        setUsername(user.user_metadata?.username || "");
        setFullName(user.user_metadata?.full_name || "");
        carregarCategorias();
      } else {
        router.push("/login");
      }
    };
    loadInit();
  }, [router]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const abrirModalNovo = () => {
    setEditandoId(null);
    setNome("");
    setTipo("despesa");
    setIsModalOpen(true);
  };

  const abrirModalEditar = (cat: any) => {
    setEditandoId(cat.id);
    setNome(cat.nome);
    setTipo(cat.tipo);
    setIsModalOpen(true);
  };

  const handleSalvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (editandoId) {
      // MODO EDIÇÃO
      const { error } = await supabase
        .from("categorias")
        .update({ nome, tipo })
        .eq("id", editandoId);
        
      if (error) {
        showToast("Erro ao editar: " + error.message, "error");
      } else {
        showToast("Categoria atualizada com sucesso!");
        setIsModalOpen(false);
        carregarCategorias();
      }
    } else {
      // MODO CRIAÇÃO
      const { error } = await supabase
        .from("categorias")
        .insert([{ nome, tipo }]);
        
      if (error) {
        showToast("Erro ao criar: " + error.message, "error");
      } else {
        showToast("Nova categoria criada!");
        setIsModalOpen(false);
        carregarCategorias();
      }
    }
    setIsSubmitting(false);
  };

  const initialLetter = username ? username.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : "?");

  // Separa as categorias para exibir em duas colunas bonitinhas
  const receitas = categorias.filter(c => c.tipo === "receita");
  const despesas = categorias.filter(c => c.tipo === "despesa");

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl font-bold text-white flex items-center gap-3 animate-in slide-in-from-right-8 fade-in duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <span className="text-xl">{toast.type === 'success' ? '✓' : '!'}</span>{toast.message}
        </div>
      )}

      {/* Navbar Padrão */}
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center relative z-10">
        <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
          Categorias
        </h1>
        <button onClick={() => router.push("/dashboard")} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
          Voltar ao Dashboard
        </button>
      </nav>

      <main className="max-w-4xl mx-auto mt-10 p-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Gerenciar Categorias</h2>
            <p className="text-gray-500 font-bold mt-1">Crie ou edite os grupos dos seus lançamentos.</p>
          </div>
          <button 
            onClick={abrirModalNovo}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <span className="text-xl leading-none">+</span> Nova Categoria
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Coluna de Despesas */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-red-50/50 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <h3 className="text-lg font-black text-red-900">Despesas</h3>
              </div>
              <ul className="divide-y divide-gray-100">
                {despesas.map((cat) => (
                  <li key={cat.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                    <span className="font-bold text-gray-800">{cat.nome}</span>
                    <button 
                      onClick={() => abrirModalEditar(cat)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                  </li>
                ))}
                {despesas.length === 0 && <li className="p-4 text-gray-400 text-sm font-bold text-center">Nenhuma despesa cadastrada</li>}
              </ul>
            </div>

            {/* Coluna de Receitas */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-green-50/50 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <h3 className="text-lg font-black text-green-900">Receitas</h3>
              </div>
              <ul className="divide-y divide-gray-100">
                {receitas.map((cat) => (
                  <li key={cat.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                    <span className="font-bold text-gray-800">{cat.nome}</span>
                    <button 
                      onClick={() => abrirModalEditar(cat)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                  </li>
                ))}
                {receitas.length === 0 && <li className="p-4 text-gray-400 text-sm font-bold text-center">Nenhuma receita cadastrada</li>}
              </ul>
            </div>

          </div>
        )}
      </main>

      {/* --- MODAL DE CRIAR/EDITAR --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
              <h3 className="text-lg font-black text-gray-900">
                {editandoId ? "Editar Categoria" : "Nova Categoria"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-900 text-2xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleSalvarCategoria} className="p-6 space-y-5">
              <div className="flex p-1 bg-gray-200 rounded-xl">
                <button type="button" onClick={() => setTipo("despesa")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tipo === "despesa" ? "bg-white text-red-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Despesa</button>
                <button type="button" onClick={() => setTipo("receita")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tipo === "receita" ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>Receita</button>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Nome da Categoria</label>
                <input 
                  type="text" 
                  required 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  placeholder="Ex: Assinaturas" 
                  className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" 
                />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-3.5 rounded-xl text-white font-black uppercase tracking-wide transition-all shadow-md active:scale-95 bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? "Salvando..." : "Salvar Categoria"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}