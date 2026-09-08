"use client";

import { useRef } from "react";
import { Secao } from "./Secao";
import { usarPressao } from "../_ui/motion";
import { identidadeBanco } from "../_lib/identidadeBanco";
import { brl, nomeBanco } from "../_lib/formatar";

type Banco = { id: string; banco?: string; nome?: string; saldo: number; autor_nome?: string };

export function Bancos({ bancos, dinheiro, mapPerfis, usuarioAtual, onAbrir }: {
  bancos: Banco[]; dinheiro: number; mapPerfis: Record<string, string>;
  usuarioAtual: string; onAbrir: (id: string, nome: string) => void;
}) {
  const lista = [...bancos].sort((a, b) => {
    const aEu = a.autor_nome === usuarioAtual;
    const bEu = b.autor_nome === usuarioAtual;
    if (aEu !== bEu) return aEu ? -1 : 1;
    return (a.autor_nome || "").localeCompare(b.autor_nome || "", "pt-BR") ||
      (a.banco || a.nome || "").localeCompare(b.banco || b.nome || "", "pt-BR");
  });
  if (lista.length === 0 && dinheiro === 0) return null;
  return (
    <Secao titulo="Bancos e cofres">
      <div className="nova-bank-pills">
        {dinheiro !== 0 && <PilulaBanco nome="Carteira / Casa" detalhe="Dinheiro físico" valor={dinheiro} onClick={() => onAbrir("dinheiro", "Carteira / Casa")} />}
        {lista.map((b) => <PilulaBanco key={b.id} nome={nomeBanco(b)}
          detalhe={[b.nome && b.nome !== b.banco ? b.nome : "", b.autor_nome ? `@${b.autor_nome}` : ""].filter(Boolean).join(" · ")}
          valor={b.saldo} foto={mapPerfis[b.autor_nome || ""]} onClick={() => onAbrir(b.id, nomeBanco(b))} />)}
      </div>
    </Secao>
  );
}

function PilulaBanco({ nome, detalhe, valor, foto, onClick }: {
  nome: string; detalhe: string; valor: number; foto?: string; onClick: () => void;
}) {
  const identidade = identidadeBanco(nome);
  const ref = useRef<HTMLButtonElement>(null);
  usarPressao(ref, true, 0.97);
  return (
    <button ref={ref} type="button" onClick={onClick} className={`nova-bank-pill nova-bank-${identidade.chave}`} title={[nome, detalhe, brl(valor)].join(" · ")}>
      <span className="nova-bank-avatar" aria-hidden="true">
        {foto ? <img src={foto} alt="" draggable={false} /> : nome.charAt(0)}
      </span>
      <span className="nova-bank-copy">
        <span className="nova-bank-name">{nome}</span>
        <span className="nova-bank-owner">{detalhe}</span>
      </span>
      <span className={`nova-bank-value ${valor < 0 ? "text-[var(--nova-danger)]" : ""}`}>{brl(valor)}</span>
    </button>
  );
}

