"use client";

import { useId, useState } from "react";
import { Surface } from "../_ui/Surface";
import { Secao } from "./Secao";
import { identidadeBanco } from "../_lib/identidadeBanco";
import { brl } from "../_lib/formatar";

interface FaturaAberta { competencia: string; venc: Date; aberto: number }
interface CartaoComFatura { id: string; nome: string; total: number; aberta: number; faturas: FaturaAberta[]; autor_nome?: string; banco_vinculado?: { banco?: string; nome?: string } | null }

export function Cartoes({ cartoes, total, qtdFaturasVisiveis = 3, mapPerfis }: {
  cartoes: CartaoComFatura[]; total: number; qtdFaturasVisiveis?: number; mapPerfis: Record<string, string>;
}) {
  if (cartoes.length === 0) return null;
  return (
    <Secao titulo="Cartões de crédito" acao={<span className="nova-credit-total">Total em aberto <strong>{brl(total)}</strong></span>}>
      <div className="nova-credit-grid">
        {cartoes.map((c) => <Cartao key={c.id} cartao={c} qtdFaturasVisiveis={qtdFaturasVisiveis} foto={mapPerfis[c.autor_nome || ""]} />)}
      </div>
    </Secao>
  );
}

function Cartao({ cartao, qtdFaturasVisiveis, foto }: {
  cartao: CartaoComFatura; qtdFaturasVisiveis: number; foto?: string;
}) {
  const [expandido, setExpandido] = useState(false);
  const id = useId();
  const identidade = identidadeBanco(cartao.banco_vinculado?.banco || cartao.banco_vinculado?.nome || cartao.nome);
  const quantidade = Math.max(1, qtdFaturasVisiveis);
  const faturas = expandido ? cartao.faturas : cartao.faturas.slice(0, quantidade);
  const temMais = cartao.faturas.length > quantidade;
  return (
    <Surface as="article" className={`nova-credit-card nova-bank-${identidade.chave}`}>
      <div className="nova-credit-face">
        <div className="nova-credit-heading">
          <h3>{cartao.nome}</h3>
          <span className="nova-bank-monogram" aria-hidden="true">{identidade.sigla}</span>
        </div>
        <p className="nova-credit-label">{cartao.aberta > 0 ? "Fatura atual" : "Sem fatura aberta"}</p>
        <p className="nova-credit-amount">{brl(cartao.aberta)}</p>
        <div className="nova-credit-owner">
          <span>{foto && <img src={foto} alt="" draggable={false} />}{cartao.autor_nome ? `@${cartao.autor_nome}` : "Cartão de crédito"}</span>
          {cartao.faturas[0] && <span>Vence {cartao.faturas[0].venc.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>}
        </div>
      </div>
      <div className="nova-credit-details">
        <div className="nova-credit-committed"><span>Total em aberto</span><strong>{brl(cartao.total)}</strong></div>
        <div id={id} className="nova-invoices">
          {faturas.map((f) => <div key={f.competencia} className="nova-invoice">
            <span>{f.venc.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span><strong>{brl(f.aberto)}</strong>
          </div>)}
        </div>
        {temMais && <button type="button" className="nova-invoice-toggle" aria-expanded={expandido} aria-controls={id} onClick={() => setExpandido(v => !v)}>
          {expandido ? "Mostrar menos" : `Ver todas as ${cartao.faturas.length} faturas`} <span aria-hidden="true">{expandido ? "−" : "+"}</span>
        </button>}
      </div>
    </Surface>
  );
}

