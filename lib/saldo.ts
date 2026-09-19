/** Soma valores monetários em centavos para evitar resíduos de ponto flutuante. */
export const centavos = (valor: number | string) => Math.round(Number(valor) * 100);

export function calcularSaldo(transacoes: { tipo: string; valor: number | string; conta_id: string; conta_destino_id?: string | null; data: string }[], ids: string[], ate?: string): number {
  let total = 0;
  for (const t of transacoes) {
    if (ate && t.data > ate) continue;
    const v = centavos(t.valor);
    if (t.tipo === "receita" && ids.includes(t.conta_id)) total += v;
    if (t.tipo === "despesa" && ids.includes(t.conta_id)) total -= v;
    if (t.tipo === "transferencia") {
      if (ids.includes(t.conta_id)) total -= v;
      if (ids.includes(t.conta_destino_id || "")) total += v;
    }
  }
  return total / 100;
}
