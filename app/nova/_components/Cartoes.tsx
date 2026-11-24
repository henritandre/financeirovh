"use client";

import { useId, useState } from "react";
import { Surface } from "../_ui/Surface";
import { Secao } from "./Secao";
import { identidadeBanco } from "../_lib/identidadeBanco";
import { brl } from "../_lib/formatar";

interface FaturaAberta { competencia: string; venc: Date; aberto: number }
interface CartaoComFatura { id: string; nome: string; total: number; aberta: number; faturas: FaturaAberta[]; autor_nome?: string; banco_vinculado?: { banco?: string; nome?: string } | null }

/** Abre o resumo de uma fatura; `competencia` nula abre o histórico do cartão. */
type AbrirFatura = (cartaoId: string, competencia: string | null) => void;

export function Cartoes({ cartoes, total, qtdFaturasVisiveis = 3, mapPerfis, onAbrirFatura }: {
  cartoes: CartaoComFatura[]; total: number; qtdFaturasVisiveis?: number; mapPerfis: Record<string, string>; onAbrirFatura?: AbrirFatura;
}) {
  if (cartoes.length === 0) return null;
  return (
    <Secao titulo="Cartões de crédito" acao={<span className="nova-credit-total">Total em aberto <strong>{brl(total)}</strong></span>}>
      <div className="nova-credit-grid">
        {cartoes.map((c) => <Cartao key={c.id} cartao={c} qtdFaturasVisiveis={qtdFaturasVisiveis} foto={mapPerfis[c.autor_nome || ""]} onAbrirFatura={onAbrirFatura} />)}
      </div>
    </Secao>
  );
}

function Cartao({ cartao, qtdFaturasVisiveis, foto, onAbrirFatura }: {
  cartao: CartaoComFatura; qtdFaturasVisiveis: number; foto?: string; onAbrirFatura?: AbrirFatura;
}) {
  const [expandido, setExpandido] = useState(false);
  const id = useId();
  const identidade = identidadeBanco(cartao.banco_vinculado?.banco || cartao.banco_vinculado?.nome || cartao.nome);
  const quantidade = Math.max(1, qtdFaturasVisiveis);
  const faturas = expandido ? cartao.faturas : cartao.faturas.slice(0, quantidade);
  const temMais = cartao.faturas.length > quantidade;
  // Frente do cartão abre a fatura atual (a primeira em aberto); sem nenhuma, o histórico.
  const abrirFrente = onAbrirFatura ? () => onAbrirFatura(cartao.id, cartao.faturas[0]?.competencia ?? null) : undefined;
  return (
    <Surface as="article" className={`nova-credit-card nova-bank-${identidade.chave}`}>
      <div
        className={`nova-credit-face${abrirFrente ? " nova-credit-face-clicavel" : ""}`}
        {...(abrirFrente && {
          role: "button",
          tabIndex: 0,
          "aria-label": cartao.faturas[0] ? `Ver resumo da fatura atual de ${cartao.nome}` : `Ver histórico de faturas de ${cartao.nome}`,
          onClick: abrirFrente,
          onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirFrente(); } },
        })}
      >
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
          {faturas.map((f) => onAbrirFatura
            ? <button type="button" key={f.competencia} className="nova-invoice nova-invoice-button" onClick={() => onAbrirFatura(cartao.id, f.competencia)} aria-label={`Ver resumo da fatura com vencimento em ${f.venc.toLocaleDateString("pt-BR")}`}>
                <span>{f.venc.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span><strong>{brl(f.aberto)} <span aria-hidden="true">›</span></strong>
              </button>
            : <div key={f.competencia} className="nova-invoice">
                <span>{f.venc.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span><strong>{brl(f.aberto)}</strong>
              </div>)}
        </div>
        {temMais && <button type="button" className="nova-invoice-toggle" aria-expanded={expandido} aria-controls={id} onClick={() => setExpandido(v => !v)}>
          {expandido ? "Mostrar menos" : `Ver todas as ${cartao.faturas.length} faturas`} <span aria-hidden="true">{expandido ? "−" : "+"}</span>
        </button>}
        {onAbrirFatura && <button type="button" className="nova-invoice-toggle" onClick={() => onAbrirFatura(cartao.id, null)}>
          Histórico de faturas <span aria-hidden="true">›</span>
        </button>}
      </div>
    </Surface>
  );
}

