"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";

export function useContasEBancos() {
  const [contas, setContas] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const { data: c } = await supabase.from("contas").select("*, banco_vinculado:contas_bancarias(*)").order("nome");
    const { data: b } = await supabase.from("contas_bancarias").select("*").order("nome");
    if (c) setContas(c);
    if (b) setBancos(b);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { contas, bancos, carregando, recarregar };
}
