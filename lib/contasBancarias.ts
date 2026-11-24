import { supabase } from "./supabase";

/**
 * Regras de Gestão bancária (bancos e formas de pagamento), na mesma lógica da
 * tela Clássica (app/contas), num lugar só para a UI Nova e telas futuras.
 * A Clássica ainda tem a própria cópia e não foi alterada.
 */

export type TipoContaBancaria = "corrente" | "salario" | "poupanca";
/** Forma de pagamento como o usuário escolhe (o banco guarda tipo + subtipo). */
export type TipoForma = "debito" | "pix" | "credito" | "dinheiro";
export type TipoChavePix = "cpf" | "celular" | "email" | "aleatoria";

export const ROTULO_TIPO_CONTA: Record<TipoContaBancaria, string> = { corrente: "Conta corrente", salario: "Conta salário", poupanca: "Poupança" };
export const ROTULO_CHAVE_PIX: Record<TipoChavePix, string> = { cpf: "CPF ou CNPJ", celular: "Celular", email: "E-mail", aleatoria: "Aleatória" };

export interface DadosBanco {
  nome: string;
  banco: string;
  agencia: string;
  numeroConta: string;
  tipoConta: TipoContaBancaria;
}

export interface DadosForma {
  tipo: TipoForma;
  nome: string;
  contaBancariaId: string;
  ultimosDigitos: string;
  tipoChavePix: TipoChavePix | "";
  chavePix: string;
  diaFechamento: string;
  diaVencimento: string;
}

/** Converte o registro de `contas` para o tipo que o usuário escolhe. */
export function tipoDaForma(c: { tipo: string; subtipo?: string | null }): TipoForma {
  if (c.tipo === "credito") return "credito";
  if (c.tipo === "dinheiro") return "dinheiro";
  return c.subtipo === "pix" ? "pix" : "debito";
}

/** Erros por campo; objeto vazio quando está tudo certo. Mesmas exigências da Clássica. */
export function validarForma(d: DadosForma): Partial<Record<keyof DadosForma, string>> {
  const erros: Partial<Record<keyof DadosForma, string>> = {};
  if (!d.nome.trim()) erros.nome = "Dê um nome para reconhecer esta forma de pagamento.";
  if (d.tipo !== "dinheiro" && !d.contaBancariaId) erros.contaBancariaId = "Escolha o banco desta forma de pagamento.";
  if ((d.tipo === "debito" || d.tipo === "credito") && !/^\d{4}$/.test(d.ultimosDigitos)) erros.ultimosDigitos = "Informe os 4 últimos números do cartão.";
  if (d.tipo === "pix") {
    if (!d.tipoChavePix) erros.tipoChavePix = "Escolha o tipo da chave.";
    if (!d.chavePix.trim()) erros.chavePix = "Informe a chave PIX.";
  }
  if (d.tipo === "credito") {
    const dia = (v: string) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 31;
    if (!dia(d.diaFechamento)) erros.diaFechamento = "Dia entre 1 e 31.";
    if (!dia(d.diaVencimento)) erros.diaVencimento = "Dia entre 1 e 31.";
  }
  return erros;
}

/** O que é gravado em `contas`: mesmo formato da Clássica (campos que não se aplicam vão nulos). */
export function montarForma(d: DadosForma, userId: string, username: string) {
  const tipo = d.tipo === "debito" || d.tipo === "pix" ? "corrente" : d.tipo;
  const subtipo = tipo === "corrente" ? (d.tipo === "pix" ? "pix" : "debito") : null;
  return {
    nome: d.nome.trim(),
    tipo,
    conta_bancaria_id: tipo !== "dinheiro" ? d.contaBancariaId : null,
    ultimos_digitos: d.tipo === "credito" || d.tipo === "debito" ? d.ultimosDigitos : null,
    subtipo,
    tipo_chave_pix: d.tipo === "pix" ? d.tipoChavePix : null,
    chave_pix: d.tipo === "pix" ? d.chavePix.trim() : null,
    dia_fechamento: tipo === "credito" ? Number(d.diaFechamento) : null,
    dia_vencimento: tipo === "credito" ? Number(d.diaVencimento) : null,
    user_id: userId,
    autor_nome: tipo === "dinheiro" ? "Família" : username,
  };
}

export function montarBanco(d: DadosBanco, userId: string, username: string) {
  return { user_id: userId, autor_nome: username, nome: d.nome.trim(), banco: d.banco.trim(), agencia: d.agencia.trim(), numero_conta: d.numeroConta.trim(), tipo_conta: d.tipoConta };
}

/** Quem pode editar: o dono; dinheiro físico é da família (qualquer um). */
export function podeEditarForma(c: { tipo: string; user_id: string }, userId: string) {
  return c.tipo === "dinheiro" || c.user_id === userId;
}

// --------------------------------------------------------------------------
// Banco de dados
// --------------------------------------------------------------------------

export async function salvarBanco(id: string | null, d: DadosBanco, userId: string, username: string) {
  const payload = montarBanco(d, userId, username);
  const { error } = id
    ? await supabase.from("contas_bancarias").update(payload).eq("id", id)
    : await supabase.from("contas_bancarias").insert([payload]);
  if (error) throw error;
}

/** Quantas formas de pagamento estão ligadas ao banco (se houver, ele só pode ser desativado). */
export async function contarVinculosBanco(bancoId: string) {
  const { count, error } = await supabase.from("contas").select("*", { count: "exact", head: true }).eq("conta_bancaria_id", bancoId);
  if (error) throw error;
  return count || 0;
}

export async function definirAtivoBanco(id: string, ativo: boolean) {
  const { error } = await supabase.from("contas_bancarias").update({ ativo }).eq("id", id);
  if (error) throw error;
}

export async function apagarBanco(id: string) {
  const { error } = await supabase.from("contas_bancarias").delete().eq("id", id);
  if (error) throw error;
}

export async function salvarForma(id: string | null, d: DadosForma, userId: string, username: string) {
  const payload = montarForma(d, userId, username);
  const { error } = id
    ? await supabase.from("contas").update(payload).eq("id", id)
    : await supabase.from("contas").insert([payload]);
  if (error) throw error;
}

/**
 * Lançamentos que usam a forma de pagamento, como origem OU destino.
 * (A Clássica olha só a origem; um cartão que só recebeu pagamentos de fatura
 * contaria como "sem uso" e poderia ser apagado com histórico.)
 */
export async function contarMovimentacoesForma(id: string) {
  const [origem, destino] = await Promise.all([
    supabase.from("transacoes").select("*", { count: "exact", head: true }).eq("conta_id", id),
    supabase.from("transacoes").select("*", { count: "exact", head: true }).eq("conta_destino_id", id),
  ]);
  if (origem.error) throw origem.error;
  if (destino.error) throw destino.error;
  return (origem.count || 0) + (destino.count || 0);
}

export async function definirAtivoForma(id: string, ativo: boolean) {
  const { error } = await supabase.from("contas").update({ ativo }).eq("id", id);
  if (error) throw error;
}

export async function apagarForma(id: string) {
  const { error } = await supabase.from("contas").delete().eq("id", id);
  if (error) throw error;
}
