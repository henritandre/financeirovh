/** Exclusões são aplicadas somente ao lado da transferência do banco em foco. */
export function incluirPorForma(t: { conta_id: string; conta_destino_id?: string | null }, excluidas: string[], bancoId: string, contas: { id: string; conta_bancaria_id?: string | null }[]) {
  return ![t.conta_id, t.conta_destino_id].some(id => id && excluidas.includes(id) && (!bancoId || contas.some(c => c.id === id && c.conta_bancaria_id === bancoId)));
}
