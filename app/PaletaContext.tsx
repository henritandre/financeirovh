"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Paleta de cor de destaque, escolhida em Parâmetros > Aparência.
 * Mesmo padrão do UIVersionContext: localStorage para aplicar na hora e a
 * tabela `parametros` (chave "paleta_cor") para valer em todos os aparelhos.
 * A cor em si vem do CSS: html[data-paleta="..."] em globals.css e tokens.css.
 */
export const PALETAS = [
  { id: "azul", nome: "Azul", amostra: "#2563eb" },
  { id: "petroleo", nome: "Azul-petróleo", amostra: "#0f766e" },
  { id: "violeta", nome: "Violeta", amostra: "#7c3aed" },
  { id: "grafite", nome: "Grafite", amostra: "#475569" },
] as const;

export type Paleta = (typeof PALETAS)[number]["id"];

const valida = (v: unknown): v is Paleta => PALETAS.some((p) => p.id === v);

/** Aplica no <html>; "azul" é o padrão e fica sem atributo. */
function aplicar(p: Paleta) {
  if (p === "azul") document.documentElement.removeAttribute("data-paleta");
  else document.documentElement.setAttribute("data-paleta", p);
}

type PaletaContextType = { paleta: Paleta; definirPaleta: (p: Paleta) => void };
const PaletaContext = createContext<PaletaContextType | undefined>(undefined);

function lerPaletaLocal(): Paleta {
  if (typeof window === "undefined") return "azul";
  const salvo = window.localStorage.getItem("paleta_cor");
  return valida(salvo) ? salvo : "azul";
}

export function PaletaProvider({ children }: { children: React.ReactNode }) {
  // Lido no estado inicial (como no UIVersionContext); o <html> já recebeu a
  // paleta pelo script do layout, antes da pintura.
  const [paleta, setPaleta] = useState<Paleta>(lerPaletaLocal);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("parametros").select("valor").eq("user_id", user.id).eq("chave", "paleta_cor").maybeSingle();
      if (valida(data?.valor)) {
        setPaleta(data.valor);
        aplicar(data.valor);
        window.localStorage.setItem("paleta_cor", data.valor);
      }
    })();
  }, []);

  const definirPaleta = useCallback((p: Paleta) => {
    setPaleta(p);
    aplicar(p);
    window.localStorage.setItem("paleta_cor", p);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("parametros").upsert([{ user_id: user.id, chave: "paleta_cor", valor: p }], { onConflict: "user_id, chave" });
    })();
  }, []);

  return <PaletaContext.Provider value={{ paleta, definirPaleta }}>{children}</PaletaContext.Provider>;
}

export function usePaleta() {
  const ctx = useContext(PaletaContext);
  if (ctx === undefined) throw new Error("usePaleta precisa estar dentro de PaletaProvider");
  return ctx;
}
