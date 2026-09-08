"use function"; // Aviso: o Next.js usa "use client"
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { useUIVersion } from "./UIVersionContext";

export default function Home() {
  const router = useRouter();
  const { versao } = useUIVersion();
  const [mensagem, setMensagem] = useState("Verificando seu acesso...");

  useEffect(() => {
    const destino = versao === "nova" ? "/nova/dashboard" : "/dashboard";

    // Escuta eventos do Supabase (como quando o usuário clica no link do email)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN") {
        setMensagem("Email confirmado! Entrando no painel...");
        setTimeout(() => router.push(destino), 1500);
      }
    });

    // Verifica se já estava logado antes
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push(destino);
      } else {
        // Se não tiver logado e não for um clique de email, vai pro login
        setTimeout(() => router.push("/login"), 1000);
      }
    };

    checkSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, versao]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 font-medium">{mensagem}</p>
      </div>
    </div>
  );
}