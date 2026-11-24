"use client";

import { useState } from "react";
import { identidadeBanco } from "../_lib/identidadeBanco";

/** Bancos com logo em public/logos/bancos (ver ORIGEM.md). */
const COM_LOGO = new Set([
  "nubank", "itau", "inter", "caixa", "santander", "mercantil", "bradesco", "bb", "c6", "btg", "picpay", "mercadopago", "pagbank", "neon", "xp", "stone", "cora", "safra", "bmg", "pan", "original", "banrisul", "brb", "bnb", "sicoob", "sicredi", "unicred",
]);

/**
 * Logo do banco a partir do nome da instituição. Sem logo (carteira, banco não
 * reconhecido) ou se a imagem falhar, mostra a sigla com a cor do banco, como antes.
 */
export function LogoBanco({ nome, tamanho = 36 }: { nome: string; tamanho?: number }) {
  const id = identidadeBanco(nome || "");
  const [falhou, setFalhou] = useState(false);
  if (COM_LOGO.has(id.chave) && !falhou) {
    return (
      <img
        src={`/logos/bancos/${id.chave}.svg`}
        alt=""
        aria-hidden="true"
        width={tamanho}
        height={tamanho}
        draggable={false}
        onError={() => setFalhou(true)}
        className="shrink-0 object-contain bg-white border border-[var(--nova-ink-hairline)]"
        style={{ width: tamanho, height: tamanho, borderRadius: Math.round(tamanho / 3) }}
      />
    );
  }
  return (
    <span className={`nova-bank-monogram nova-bank-${id.chave}`} aria-hidden="true" style={{ width: tamanho, height: tamanho }}>
      {id.sigla}
    </span>
  );
}
