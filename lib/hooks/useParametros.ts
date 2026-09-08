"use client";

import { supabase } from "../supabase";

/** Leitura genérica da tabela chave/valor `parametros`, para um conjunto de chaves. */
export async function buscarParametros(userId: string, chaves: string[]): Promise<Record<string, any>> {
  const { data, error } = await supabase.from("parametros").select("chave, valor").eq("user_id", userId).in("chave", chaves);
  if (error) throw error;
  const mapa: Record<string, any> = {};
  data?.forEach((p) => {
    mapa[p.chave] = p.valor;
  });
  return mapa;
}

/** Upsert genérico na tabela `parametros`, mesmo padrão usado em app/parametros/page.tsx. */
export async function salvarParametros(userId: string, valores: Record<string, any>): Promise<void> {
  const payload = Object.entries(valores).map(([chave, valor]) => ({ user_id: userId, chave, valor }));
  const { error } = await supabase.from("parametros").upsert(payload, { onConflict: "user_id, chave" });
  if (error) throw error;
}
