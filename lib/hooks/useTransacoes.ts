"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";

export function useTransacoes() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const { data } = await supabase
      .from("transacoes")
      .select(
        "*, categorias(nome), conta_origem:contas!conta_id(*, banco_vinculado:contas_bancarias(*)), conta_destino:contas!conta_destino_id(*, banco_vinculado:contas_bancarias(*))"
      )
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false });
    if (data) setTransacoes(data);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { transacoes, carregando, recarregar };
}
