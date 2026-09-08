export const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const dataLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];

export const dataBR = (dStr: string) => {
  const [a, m, d] = dStr.split("-");
  return `${d}/${m}/${a}`;
};

/** Nome de exibição de uma conta (forma de pagamento) — banco + final do cartão/débito. */
export function nomeConta(c: any): string {
  if (c.tipo === "dinheiro") return "Dinheiro / Carteira";
  const banco = c.banco_vinculado?.banco || c.nome || "Conta";
  if (c.tipo === "credito") return `${banco} · crédito${c.ultimos_digitos ? ` final ${c.ultimos_digitos}` : ""}`;
  if (c.subtipo === "debito" && c.ultimos_digitos) return `${banco} · final ${c.ultimos_digitos}`;
  return banco;
}

/** Nome de exibição de um banco/cofre (para escolher "onde o dinheiro caiu"). */
export function nomeBanco(b: any): string {
  return b.banco || b.nome || "Banco";
}
