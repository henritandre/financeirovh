"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { identidadeBanco } from "../_lib/identidadeBanco";

export interface ContaOpcao {
  id: string; nome: string; tipo: string; autor_nome?: string;
  conta_bancaria_id?: string | null; subtipo?: string;
  ultimos_digitos?: string; chave_pix?: string;
}
export function avatarConta(c: ContaOpcao, perfis: Record<string, string>) {
  return { foto: c.tipo === "dinheiro" ? undefined : perfis[c.autor_nome || ""], letra: c.tipo === "dinheiro" ? "$" : (c.autor_nome || "?").charAt(0).toUpperCase() };
}
export function subtituloConta(c: ContaOpcao) {
  if (c.tipo === "dinheiro") return "Na Carteira / Cofre";
  if (c.subtipo === "pix") return `PIX · ${c.chave_pix || ""}`;
  if (c.tipo === "credito" || c.subtipo === "debito") return `Final ${c.ultimos_digitos || "----"}`;
  return "";
}
type Meio = "credito" | "debito" | "pix" | "dinheiro" | "banco";
const nomesMeio = { credito: "Crédito", debito: "Débito", pix: "PIX", dinheiro: "Dinheiro", banco: "Conta bancária" };
function IconeMeio({ meio }: { meio: Meio }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {meio === "pix" ? <><path d="m12 3 9 9-9 9-9-9Z" /><path d="m6 9 3 3 3-3 3 3 3-3M6 15l3-3 3 3 3-3 3 3" /></> : meio === "dinheiro" ? <><rect x="2" y="5" width="20" height="14" rx="3" /><circle cx="12" cy="12" r="3" /><path d="M5 12h1m12 0h1" /></> : meio === "banco" ? <><path d="m3 8 9-5 9 5H3Zm2 3v6m7-6v6m7-6v6M3 21h18M4 18h16" /></> : <><rect x="2" y="4" width="20" height="16" rx="3" /><path d="M2 9h20" />{meio === "credito" ? <rect x="6" y="13" width="4" height="3" rx=".5" /> : <path d="m14 15 2 2 4-4M6 15h3" />}</>}
  </svg>;
}
type Opcao = { id: string; nome: string; sub: string; grupo: string; grupoId: string; autor?: string; busca: string; foto?: string; letra: string; meio?: Meio };
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function SeletorPesquisavel({ rotulo, valor, onSelecionar, opcoes, placeholder = "Digite ou selecione…" }: {
  rotulo: string; valor: string; onSelecionar: (id: string) => void; opcoes: Opcao[]; placeholder?: string;
}) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(0);
  const [posicao, setPosicao] = useState({ left: 0, top: 0, width: 0, maxHeight: 280, transform: "none" });
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const selecionada = opcoes.find(o => o.id === valor);
  const termos = normalizar(busca).trim().split(/\s+/).filter(Boolean);
  const resultados = opcoes.filter(o => termos.every(t => normalizar(`${o.nome} ${o.sub} ${o.grupo} ${o.autor || ""} ${o.busca}`).includes(t)));
  const indice = Math.min(ativo, Math.max(0, resultados.length - 1));
  const abrir = () => { if (!aberto) { setBusca(""); setAtivo(0); setAberto(true); } };
  const escolher = (opcao: Opcao) => { onSelecionar(opcao.id); setAberto(false); setBusca(""); };

  useLayoutEffect(() => {
    if (!aberto) return;
    let frame: number;
    // Acompanha a animação do sheet, rolagem e teclado virtual.
    const atualizar = () => {
      const r = campo.current?.getBoundingClientRect();
      if (r) {
        const view = window.visualViewport;
        const topo = view?.offsetTop || 0;
        const abaixo = topo + (view?.height || window.innerHeight) - r.bottom - 12;
        const acima = r.top - topo - 12;
        const subir = abaixo < 220 && acima > abaixo;
        const maxHeight = Math.max(0, Math.min(280, subir ? acima : abaixo));
        const next = { left: Math.max(8, r.left), width: Math.min(r.width, window.innerWidth - 16), top: subir ? r.top - 6 : r.bottom + 6, maxHeight, transform: subir ? "translateY(-100%)" : "none" };
        setPosicao(p => p.left === next.left && p.top === next.top && p.width === next.width && p.maxHeight === next.maxHeight && p.transform === next.transform ? p : next);
      }
      frame = requestAnimationFrame(atualizar);
    };
    atualizar();
    return () => cancelAnimationFrame(frame);
  }, [aberto]);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!campo.current?.parentElement?.contains(e.target as Node) && !lista.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);
  useEffect(() => {
    if (aberto) lista.current?.querySelector(`[data-index="${indice}"]`)?.scrollIntoView({ block: "nearest" });
  }, [indice, aberto, busca]);

  return <div className="relative">
    <label htmlFor={id} className="block text-[12px] font-semibold text-[var(--nova-ink-faint)] uppercase tracking-wide mb-1.5">{rotulo}</label>
    <div className={`nova-search-field ${selecionada && !aberto ? `nova-search-selected nova-bank-${identidadeBanco(selecionada.grupo).chave}` : ""}`}>
      <input ref={campo} id={id} role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={aberto}
        aria-controls={aberto ? `${id}-list` : undefined} aria-activedescendant={aberto && resultados[indice] ? `${id}-option-${indice}` : undefined}
        placeholder={placeholder} value={aberto ? busca : selecionada ? `${selecionada.nome}${selecionada.sub ? ` · ${selecionada.sub}` : ""}` : ""}
        onFocus={abrir} onClick={abrir} onBlur={() => setAberto(false)}
        onChange={e => { setBusca(e.target.value); setAtivo(0); setAberto(true); }}
        onKeyDown={e => {
          if (!aberto && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key.length === 1 || e.key === "Backspace")) {
            e.preventDefault(); setBusca(e.key === "Backspace" ? "" : e.key); setAtivo(0); setAberto(true);
          }
          if (e.key === "Escape" && aberto) { e.preventDefault(); e.stopPropagation(); setAberto(false); }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!aberto) abrir();
            else setAtivo(Math.max(0, Math.min(resultados.length - 1, indice + (e.key === "ArrowDown" ? 1 : -1))));
          }
          if (e.key === "Enter" && aberto) { e.preventDefault(); if (resultados[indice]) escolher(resultados[indice]); }
        }} />
      {selecionada && !aberto && <div className="nova-payment-selection" aria-hidden="true">
        <span className="nova-payment-icon"><IconeMeio meio={selecionada.meio || "banco"} /></span>
        <div className="nova-payment-copy">
          <span className="nova-payment-name">{selecionada.nome}</span>
          <span className="nova-payment-detail">{nomesMeio[selecionada.meio || "banco"]}{selecionada.autor ? ` · @${selecionada.autor}` : selecionada.sub ? ` · ${selecionada.sub}` : ""}</span>
        </div>
      </div>}
      <span aria-hidden="true">{aberto ? "⌃" : "⌄"}</span>
    </div>
    {aberto && campo.current && createPortal(
      <div ref={lista} id={`${id}-list`} role="listbox" aria-label={rotulo} className="nova-search-results" style={posicao} onMouseDown={e => e.preventDefault()}>
        {resultados.length === 0 && <p className="p-4 text-sm text-[var(--nova-ink-soft)]" role="status">Nenhuma conta encontrada. Tente o banco, PIX ou final do cartão.</p>}
        {resultados.map((o, i) => <div key={o.id} role="presentation">
          {(i === 0 || resultados[i - 1].grupoId !== o.grupoId) && <div role="presentation" className={`nova-picker-bank nova-bank-${identidadeBanco(o.grupo).chave}`}><span>{o.grupo}</span><span>{o.autor ? `@${o.autor}` : ""}</span></div>}
          <div role="option" id={`${id}-option-${i}`} aria-selected={valor === o.id} data-index={i}
            className={`nova-search-option ${i === indice ? "nova-search-option-active" : ""}`} onClick={() => escolher(o)}>
            <span className="nova-bank-avatar">{o.foto ? <img src={o.foto} alt="" draggable={false} /> : o.letra}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{o.nome}</span><span className="block truncate text-xs text-[var(--nova-ink-soft)]">{o.sub}</span></span>
            {valor === o.id && <span aria-hidden="true">✓</span>}
          </div>
        </div>)}
      </div>, campo.current.closest(".nova-root, .classic-root") || document.body)}
  </div>;
}

export function SeletorContaPagamento({ contas, bancos, mapPerfis, ...props }: {
  rotulo: string; valor: string; onSelecionar: (id: string) => void; contas: ContaOpcao[]; bancos: any[]; mapPerfis: Record<string, string>; placeholder?: string;
}) {
  const ordem = new Map(bancos.map((b, i) => [b.id, i]));
  const ordenadas = [...contas].sort((a, b) => (a.tipo === "dinheiro" ? -1 : ordem.get(a.conta_bancaria_id) ?? bancos.length) - (b.tipo === "dinheiro" ? -1 : ordem.get(b.conta_bancaria_id) ?? bancos.length));
  const opcoes: Opcao[] = ordenadas.map(c => {
    const banco = bancos.find(b => b.id === c.conta_bancaria_id);
    return { id: c.id, nome: c.nome, sub: subtituloConta(c), grupo: c.tipo === "dinheiro" ? "Dinheiro físico" : banco?.banco || banco?.nome || "Outras contas", grupoId: c.tipo === "dinheiro" ? "dinheiro" : banco?.id || "outros", autor: banco?.autor_nome || c.autor_nome, busca: `${c.tipo} ${c.subtipo || ""}`, ...avatarConta(c, mapPerfis) };
  });
  opcoes.forEach((o, i) => { const c = ordenadas[i]; o.meio = c.tipo === "dinheiro" ? "dinheiro" : c.tipo === "credito" ? "credito" : c.subtipo === "pix" ? "pix" : c.subtipo === "debito" || c.tipo === "debito" ? "debito" : "banco"; });
  return <SeletorPesquisavel {...props} opcoes={opcoes} />;
}

export function SeletorBanco({ bancos, mapPerfis, incluirDinheiro = true, ...props }: {
  rotulo: string; valor: string; onSelecionar: (id: string) => void; bancos: any[]; mapPerfis: Record<string, string>; incluirDinheiro?: boolean; placeholder?: string;
}) {
  const opcoes: Opcao[] = bancos.map(b => ({ id: b.id, nome: b.banco || b.nome, grupo: b.banco || b.nome, grupoId: b.id, sub: b.autor_nome ? `@${b.autor_nome}` : "", autor: b.autor_nome, busca: b.nome || "", foto: mapPerfis[b.autor_nome], letra: (b.autor_nome || "?").charAt(0).toUpperCase() }));
  if (incluirDinheiro) opcoes.unshift({ id: "dinheiro", nome: "Dinheiro / Carteira", sub: "Na Carteira / Cofre", grupo: "Dinheiro físico", grupoId: "dinheiro", busca: "casa", letra: "$" });
  return <SeletorPesquisavel {...props} opcoes={opcoes} />;
}
