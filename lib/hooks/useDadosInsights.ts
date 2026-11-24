"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { buscarParametros } from "./useParametros";

/**
 * O que só a Insights lê além dos hooks comuns (transações, contas, categorias):
 * contas fixas, ids de movimentações de caixinha (que não contam como gasto real)
 * e os parâmetros da tela. Mesmas consultas da Insights Clássica.
 */
export function useDadosInsights(userId: string) {
  const [contasFixas, setContasFixas] = useState<any[]>([]);
  const [poupancaIds, setPoupancaIds] = useState<string[]>([]);
  const [qtdCategorias, setQtdCategorias] = useState(5);
  const [expandirResto, setExpandirResto] = useState(true);
  const [qtdTop, setQtdTop] = useState(3);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;
    (async () => {
      const [{ data: fixas }, { data: histCaix }, params] = await Promise.all([
        supabase.from("contas_fixas").select("*, categorias(nome)").order("nome"),
        supabase.from("caixinhas_historico").select("transacao_id").not("transacao_id", "is", null),
        buscarParametros(userId, ["insights_qtd_categorias", "insights_expandir_resto", "insights_qtd_top"]).catch(() => ({} as Record<string, any>)),
      ]);
      if (cancelado) return;
      if (fixas) setContasFixas(fixas);
      if (histCaix) setPoupancaIds(histCaix.map((h) => h.transacao_id).filter(Boolean));
      if (params.insights_qtd_categorias !== undefined) setQtdCategorias(Number(params.insights_qtd_categorias));
      if (params.insights_expandir_resto !== undefined) setExpandirResto(params.insights_expandir_resto);
      if (params.insights_qtd_top !== undefined) setQtdTop(Number(params.insights_qtd_top));
      setCarregando(false);
    })();
    return () => { cancelado = true; };
  }, [userId]);

  return { contasFixas, poupancaIds, qtdCategorias, expandirResto, qtdTop, carregando };
}
