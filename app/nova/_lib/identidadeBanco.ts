/** Identidade visual local. Prioriza o banco vinculado; apelidos são fallback. */
export function identidadeBanco(nome: string) {
  const texto = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const identidades = [
    { chave: "itau", sigla: "i", padrao: /\bitau\b/ },
    { chave: "nubank", sigla: "nu", padrao: /\b(nubank|nu)\b/ },
    { chave: "inter", sigla: "in", padrao: /\binter\b/ },
    { chave: "caixa", sigla: "cx", padrao: /\bcaixa\b/ },
    { chave: "santander", sigla: "s", padrao: /\bsantander\b/ },
    { chave: "mercantil", sigla: "m", padrao: /\bmercantil\b/ },
    { chave: "bradesco", sigla: "b", padrao: /\bbradesco\b/ },
    { chave: "bb", sigla: "bb", padrao: /\b(banco do brasil|bb)\b/ },
    { chave: "carteira", sigla: "$", padrao: /\b(carteira|casa|dinheiro)\b/ },
  ];
  return identidades.find(item => item.padrao.test(texto)) ?? { chave: "neutro", sigla: nome.trim().charAt(0).toUpperCase() || "◇" };
}
