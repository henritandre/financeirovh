/**
 * Histórico completo das faturas de um cartão (pagas e em aberto), para o
 * resumo rápido e o histórico de faturas.
 *
 * Só LÊ as transações: não substitui `obterFaturasDoCartao` (app/dashboard) nem
 * `useFaturasCartao` (UI Nova), que continuam calculando os cards. A regra é a
 * mesma delas, inclusive a conta em ponto flutuante, para o "em aberto" bater
 * com o que o card mostra:
 * - despesa no cartão entra na competência do mês da compra; no dia de
 *   fechamento ou depois, vai para a competência seguinte;
 * - pagamentos (transferência com destino ao cartão) abatem as competências
 *   mais antigas primeiro.
 * Aqui os pagamentos são distribuídos um a um, em ordem de data, só para cada
 * fatura saber quais pagamentos a quitaram.
 */

export type StatusFatura = "paga" | "atrasada" | "fechada" | "atual" | "futura";

export interface PagamentoFatura {
  transacao: any;
  /** Parte desse pagamento usada nesta fatura. */
  valor: number;
}

export interface Fatura {
  /** "AAAA-MM" do mês de vencimento (mesma chave usada nos cards). */
  competencia: string;
  vencimento: Date;
  fechamento: Date;
  total: number;
  pago: number;
  aberto: number;
  status: StatusFatura;
  /** Compras da fatura, mais recentes primeiro. */
  lancamentos: any[];
  pagamentos: PagamentoFatura[];
}

/** Todas as faturas do cartão, da mais antiga para a mais nova. */
export function calcularFaturas(cartao: any, transacoes: any[], hoje: Date = new Date()): Fatura[] {
  if (!cartao) return [];
  const diaFechamento = Number(cartao.dia_fechamento) || 1;
  const diaVencimento = Number(cartao.dia_vencimento) || 10;

  const grupos: Record<string, { total: number; lancamentos: any[] }> = {};
  const pagamentos: any[] = [];
  transacoes.forEach((t) => {
    if (t.tipo === "despesa" && t.conta_id === cartao.id) {
      const [aStr, mStr, dStr] = t.data.split("-");
      let ano = Number(aStr);
      let mes = Number(mStr) - 1;
      const dia = Number(dStr);
      if (dia >= diaFechamento) {
        mes++;
        if (mes > 11) {
          mes = 0;
          ano++;
        }
      }
      const chave = `${ano}-${String(mes + 1).padStart(2, "0")}`;
      if (!grupos[chave]) grupos[chave] = { total: 0, lancamentos: [] };
      grupos[chave].total += Number(t.valor);
      grupos[chave].lancamentos.push(t);
    } else if (t.tipo === "transferencia" && t.conta_destino_id === cartao.id) {
      pagamentos.push(t);
    }
  });

  const porData = (x: any, y: any) =>
    String(x.data).localeCompare(String(y.data)) || String(x.criado_em || "").localeCompare(String(y.criado_em || ""));

  const faturas = Object.keys(grupos)
    .sort()
    .map((chave) => {
      const [aStr, mStr] = chave.split("-");
      const anoNum = Number(aStr);
      const mesNum = Number(mStr) - 1;
      const vencimento = new Date(anoNum, mesNum, diaVencimento);
      let fechamento = new Date(anoNum, mesNum, diaFechamento);
      if (diaVencimento < diaFechamento) fechamento = new Date(anoNum, mesNum - 1, diaFechamento);
      return {
        competencia: chave,
        vencimento,
        fechamento,
        total: grupos[chave].total,
        aberto: grupos[chave].total,
        lancamentos: [...grupos[chave].lancamentos].sort((x, y) => porData(y, x)),
        pagamentos: [] as PagamentoFatura[],
      };
    });

  // Mesma distribuição da tela clássica (mais antiga primeiro), pagamento a pagamento.
  let i = 0;
  for (const p of [...pagamentos].sort(porData)) {
    let resta = Number(p.valor);
    while (resta > 0 && i < faturas.length) {
      const f = faturas[i];
      if (resta >= f.aberto) {
        if (f.aberto > 0) f.pagamentos.push({ transacao: p, valor: f.aberto });
        resta -= f.aberto;
        f.aberto = 0;
        i++;
      } else {
        f.pagamentos.push({ transacao: p, valor: resta });
        f.aberto -= resta;
        resta = 0;
      }
    }
  }

  const dia = new Date(hoje);
  dia.setHours(0, 0, 0, 0);
  let atualDefinida = false;

  return faturas.map((f) => {
    // Mesmo corte da tela clássica: abaixo de 1 centavo conta como quitada.
    let status: StatusFatura;
    if (f.aberto <= 0.01) status = "paga";
    else if (dia > f.vencimento) status = "atrasada";
    else if (dia >= f.fechamento) status = "fechada";
    else if (!atualDefinida) {
      status = "atual";
      atualDefinida = true;
    } else status = "futura";
    return { ...f, pago: f.total - f.aberto, status };
  });
}

export const ROTULO_STATUS: Record<StatusFatura, string> = {
  paga: "Paga",
  atrasada: "Atrasada",
  fechada: "Fechada",
  atual: "Fatura atual",
  futura: "Futura",
};

/** "2026-11" → "11/2026" */
export function mesAno(competencia: string): string {
  const [a, m] = competencia.split("-");
  return `${m}/${a}`;
}

/** Date → "dd/mm/aaaa" */
export function dataNumerica(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Gasto por categoria numa fatura, maior primeiro. */
export function gastoPorCategoria(lancamentos: any[]): { nome: string; valor: number }[] {
  const mapa: Record<string, number> = {};
  lancamentos.forEach((t) => {
    const nome = t.categorias?.nome || "Sem categoria";
    mapa[nome] = (mapa[nome] || 0) + Number(t.valor);
  });
  return Object.entries(mapa)
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Faturas que o histórico mostra: só as pagas, da mais recente para a mais antiga.
 * Sem mês inicial escolhido, mostra as `qtdPadrao` mais recentes; com ele, todas
 * a partir daquele mês. Devolve também o mês inicial padrão, para o filtro.
 */
export function faturasDoHistorico(historico: Fatura[], qtdPadrao: number, mesInicial: string | null) {
  const pagas = historico.filter((f) => f.status === "paga").reverse();
  const qtd = Math.min(Math.max(1, qtdPadrao || 1), pagas.length);
  const inicioPadrao = pagas.length > 0 ? pagas[qtd - 1].competencia : null;
  const inicio = mesInicial ?? inicioPadrao;
  const visiveis = inicio ? pagas.filter((f) => f.competencia >= inicio) : [];
  return { pagas, inicioPadrao, inicio, visiveis };
}
