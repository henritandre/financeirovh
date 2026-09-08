"use client";

import { supabase } from "../supabase";

export type TipoLancamento = "receita" | "despesa" | "transferencia";
export type ModoParcelamento = "ultima" | "primeira" | "manual";

export interface VinculoContaFixa {
  contaFixaId: string;
  ocorrenciaId: string | null;
}

export interface DadosLancamento {
  userId: string;
  autorNome: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string; // YYYY-MM-DD
  categoriaId: string | null;
  contaId: string; // conta de origem já resolvida (débito/crédito/dinheiro)
  contaDestinoId?: string | null; // transferência: banco destino ou fatura de cartão
  parcelas?: number;
  modoParcelamento?: ModoParcelamento;
  valoresParcelasManual?: number[];
  vinculoContaFixa?: VinculoContaFixa | null;
}

/** Resolve o id de conta interna a partir do banco (ou "dinheiro") escolhido no formulário. */
export function resolverContaPrincipal(contas: any[], bancoOuDinheiroId: string): string | null {
  if (bancoOuDinheiroId === "dinheiro") {
    const din = contas.find((c) => c.tipo === "dinheiro" && c.ativo !== false);
    return din ? din.id : null;
  }
  const chave = contas.find((c) => c.conta_bancaria_id === bancoOuDinheiroId && c.tipo === "corrente" && c.ativo !== false);
  return chave ? chave.id : null;
}

function calcularValoresParcelas(dados: DadosLancamento): number[] {
  const parcelas = dados.parcelas ?? 1;
  if (dados.modoParcelamento === "manual" && dados.valoresParcelasManual) {
    return dados.valoresParcelasManual;
  }
  const vBase = Math.floor((dados.valor / parcelas) * 100) / 100;
  const diferenca = Number((dados.valor - vBase * parcelas).toFixed(2));
  return Array.from({ length: parcelas }, (_, i) => {
    if (dados.modoParcelamento === "primeira" && i === 0) return Number((vBase + diferenca).toFixed(2));
    if ((dados.modoParcelamento ?? "ultima") === "ultima" && i === parcelas - 1) return Number((vBase + diferenca).toFixed(2));
    return vBase;
  });
}

async function vincularContaFixa(dados: DadosLancamento, transacaoId: string) {
  if (dados.tipo !== "despesa" || !dados.vinculoContaFixa) return;
  const [ano, mes] = dados.data.split("-").map(Number);
  if (dados.vinculoContaFixa.ocorrenciaId) {
    await supabase
      .from("contas_fixas_ocorrencias")
      .update({ status: "pago", transacao_id: transacaoId, valor: dados.valor, data_pagamento: dados.data })
      .eq("id", dados.vinculoContaFixa.ocorrenciaId);
  } else {
    await supabase.from("contas_fixas_ocorrencias").insert([
      {
        conta_fixa_id: dados.vinculoContaFixa.contaFixaId,
        competencia_ano: ano,
        competencia_mes: mes,
        status: "pago",
        valor: dados.valor,
        transacao_id: transacaoId,
        data_pagamento: dados.data,
        user_id: dados.userId,
        autor_nome: dados.autorNome,
      },
    ]);
  }
}

/** Cria um lançamento: simples, parcelado (gera N transações) ou transferência. */
export async function criarLancamento(dados: DadosLancamento): Promise<string | null> {
  const payloadBase = {
    user_id: dados.userId,
    autor_nome: dados.autorNome,
    tipo: dados.tipo,
    categoria_id: dados.tipo === "transferencia" ? null : dados.categoriaId,
    conta_id: dados.contaId,
    conta_destino_id: dados.contaDestinoId ?? null,
  };

  let novoTransacaoId: string | null = null;

  if (dados.tipo !== "transferencia" && (dados.parcelas ?? 1) > 1) {
    const parcelas = dados.parcelas!;
    const valoresParcelas = calcularValoresParcelas(dados);
    const [a, m, d] = dados.data.split("-").map(Number);
    const payloadsMultiplos = Array.from({ length: parcelas }, (_, i) => {
      const dP = new Date(a, m - 1 + i, d);
      if (dP.getMonth() !== (m - 1 + i) % 12) dP.setDate(0);
      return {
        ...payloadBase,
        descricao: `${dados.descricao} (${i + 1}/${parcelas})`,
        valor: valoresParcelas[i],
        data: `${dP.getFullYear()}-${String(dP.getMonth() + 1).padStart(2, "0")}-${String(dP.getDate()).padStart(2, "0")}`,
      };
    });
    const { error } = await supabase.from("transacoes").insert(payloadsMultiplos);
    if (error) throw error;
  } else {
    const { data: inserida, error } = await supabase
      .from("transacoes")
      .insert([{ ...payloadBase, descricao: dados.descricao, valor: dados.valor, data: dados.data }])
      .select("id")
      .single();
    if (error) throw error;
    novoTransacaoId = inserida?.id ?? null;
  }

  if ((dados.parcelas ?? 1) === 1 && novoTransacaoId) {
    await vincularContaFixa(dados, novoTransacaoId);
  }

  return novoTransacaoId;
}

/** Edita um lançamento existente, registrando o valor anterior em transacoes_atualizadas (auditoria). */
export async function editarLancamento(
  id: string,
  anterior: any,
  dados: DadosLancamento,
  motivo: string,
  ocorrenciaOriginalVinculada?: any | null
): Promise<void> {
  await supabase.from("transacoes_atualizadas").insert([
    {
      transacao_id: id,
      descricao: anterior.descricao,
      valor: anterior.valor,
      data: anterior.data,
      tipo: anterior.tipo,
      categoria_id: anterior.categoria_id,
      conta_id: anterior.conta_id,
      conta_destino_id: anterior.conta_destino_id,
      user_id: anterior.user_id,
      autor_nome: anterior.autor_nome,
      atualizado_por_nome: dados.autorNome,
      motivo,
    },
  ]);

  const payloadBase = {
    user_id: dados.userId,
    autor_nome: dados.autorNome,
    tipo: dados.tipo,
    categoria_id: dados.tipo === "transferencia" ? null : dados.categoriaId,
    conta_id: dados.contaId,
    conta_destino_id: dados.contaDestinoId ?? null,
  };
  const { error } = await supabase
    .from("transacoes")
    .update({ ...payloadBase, descricao: dados.descricao, valor: dados.valor, data: dados.data })
    .eq("id", id);
  if (error) throw error;

  if (ocorrenciaOriginalVinculada) {
    const mantemMesmoVinculo = dados.tipo === "despesa" && dados.vinculoContaFixa?.ocorrenciaId === ocorrenciaOriginalVinculada.id;
    if (!mantemMesmoVinculo) {
      await supabase.from("contas_fixas_ocorrencias").update({ status: "pendente", transacao_id: null }).eq("id", ocorrenciaOriginalVinculada.id);
    }
  }

  const jaVinculadaAntes = ocorrenciaOriginalVinculada?.id && dados.vinculoContaFixa?.ocorrenciaId === ocorrenciaOriginalVinculada.id;
  if (!jaVinculadaAntes) {
    await vincularContaFixa(dados, id);
  }
}

/** Motivos de auditoria mais usados pelo usuário nos últimos 30 dias — sugestões rápidas no modal. */
export async function buscarMotivosFrequentes(userId: string, tabela: "transacoes_atualizadas" | "transacoes_excluidas"): Promise<string[]> {
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const colunaData = tabela === "transacoes_atualizadas" ? "atualizado_em" : "excluido_em";
  const { data } = await supabase.from(tabela).select("motivo").eq("user_id", userId).gte(colunaData, trintaDiasAtras.toISOString());
  if (!data || data.length === 0) return [];
  const contagem: Record<string, number> = {};
  data.forEach((t: any) => {
    contagem[t.motivo] = (contagem[t.motivo] || 0) + 1;
  });
  return Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((i) => i[0]);
}

/** Exclui um lançamento, registrando em transacoes_excluidas (auditoria) e liberando a ocorrência de conta fixa vinculada. */
export async function excluirLancamento(transacao: any, autorNome: string, motivo: string): Promise<void> {
  await supabase.from("transacoes_excluidas").insert([
    {
      transacao_id: transacao.id,
      descricao: transacao.descricao,
      valor: transacao.valor,
      data: transacao.data,
      tipo: transacao.tipo,
      categoria_id: transacao.categoria_id,
      conta_id: transacao.conta_id,
      conta_destino_id: transacao.conta_destino_id,
      user_id: transacao.user_id,
      autor_nome: transacao.autor_nome,
      excluido_por_nome: autorNome,
      motivo,
    },
  ]);
  await supabase.from("contas_fixas_ocorrencias").update({ status: "pendente", transacao_id: null }).eq("transacao_id", transacao.id);
  const { error } = await supabase.from("transacoes").delete().eq("id", transacao.id);
  if (error) throw error;
}
