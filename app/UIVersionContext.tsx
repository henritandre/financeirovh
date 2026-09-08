"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type VersaoUI = "classica" | "nova";

type UIVersionContextType = {
  versao: VersaoUI;
  definirVersao: (v: VersaoUI) => void;
  carregado: boolean;
};

const UIVersionContext = createContext<UIVersionContextType | undefined>(undefined);

function lerVersaoLocal(): VersaoUI {
  if (typeof window === "undefined") return "classica";
  const salvo = window.localStorage.getItem("ui_versao");
  return salvo === "nova" ? "nova" : "classica";
}

export function UIVersionProvider({ children }: { children: React.ReactNode }) {
  // Lido de forma síncrona no estado inicial (não em efeito) para que o
  // primeiro render já reflita a preferência salva, sem corrida com quem
  // decide o redirecionamento pós-login em app/page.tsx.
  const [versao, setVersaoState] = useState<VersaoUI>(lerVersaoLocal);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCarregado(true);
        return;
      }
      const { data } = await supabase.from("parametros").select("valor").eq("user_id", user.id).eq("chave", "ui_versao").maybeSingle();
      if (data?.valor === "classica" || data?.valor === "nova") {
        setVersaoState(data.valor);
        window.localStorage.setItem("ui_versao", data.valor);
      }
      setCarregado(true);
    })();
  }, []);

  const definirVersao = useCallback((v: VersaoUI) => {
    setVersaoState(v);
    window.localStorage.setItem("ui_versao", v);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("parametros").upsert([{ user_id: user.id, chave: "ui_versao", valor: v }], { onConflict: "user_id, chave" });
    })();
  }, []);

  return <UIVersionContext.Provider value={{ versao, definirVersao, carregado }}>{children}</UIVersionContext.Provider>;
}

export function useUIVersion() {
  const ctx = useContext(UIVersionContext);
  if (ctx === undefined) {
    throw new Error("useUIVersion deve ser usado dentro de UIVersionProvider");
  }
  return ctx;
}
