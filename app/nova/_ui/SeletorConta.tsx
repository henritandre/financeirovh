"use client";

import { useEffect, useRef, useState } from "react";

import { identidadeBanco } from "../_lib/identidadeBanco";

export interface ContaOpcao {
  id: string;
  nome: string;
  tipo: string;
  autor_nome?: string;
  conta_bancaria_id?: string | null;
  subtipo?: string;
  ultimos_digitos?: string;
  chave_pix?: string;
}

export function avatarConta(c: ContaOpcao, mapPerfis: Record<string, string>) {
  if (c.tipo === "dinheiro") return { foto: undefined, letra: "$" };
  return { foto: mapPerfis[c.autor_nome || ""], letra: (c.autor_nome || "?").charAt(0).toUpperCase() };
}

export function subtituloConta(c: ContaOpcao) {
  if (c.tipo === "dinheiro") return "Na Carteira / Cofre";
  if (c.tipo === "corrente" && c.subtipo === "pix") return `PIX · ${c.chave_pix}`;
  if (c.tipo === "credito" || (c.tipo === "corrente" && c.subtipo === "debito")) return `Final ${c.ultimos_digitos || "----"}`;
  return "";
}

function Avatar({ foto, letra }: { foto?: string; letra: string }) {
  return (
    <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 overflow-hidden bg-[var(--nova-accent)]/15 text-[var(--nova-accent)]">
      {foto ? <img src={foto} alt="" draggable={false} className="w-full h-full object-cover" /> : letra}
    </span>
  );
}

function useFecharAoClicarFora(aberto: boolean, fechar: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fechar();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [aberto, fechar]);
  return ref;
}

const gatilho =
  "w-full flex items-center justify-between gap-2 rounded-[var(--nova-radius-md)] border border-[var(--nova-ink-hairline)] bg-[var(--nova-bg-elevated)] px-3 py-2 text-left min-h-[52px]";
const painel =
  "absolute z-30 mt-1.5 w-full max-h-64 overflow-y-auto rounded-[var(--nova-radius-md)] border border-[var(--nova-glass-border)] bg-[var(--nova-glass-3)] shadow-[var(--nova-shadow-2)]";
const rotuloClasse = "block text-[12px] font-semibold text-[var(--nova-ink-faint)] uppercase tracking-wide mb-1.5";

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-[var(--nova-ink-faint)] transition-transform ${aberto ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Escolhe uma conta específica (forma de pagamento) — agrupada por banco, com avatar do dono e o "final" do cartão/débito. */
export function SeletorContaPagamento({
  rotulo,
  valor,
  onSelecionar,
  contas,
  bancos,
  mapPerfis,
  placeholder = "Selecione…",
}: {
  rotulo: string;
  valor: string;
  onSelecionar: (id: string) => void;
  contas: ContaOpcao[];
  bancos: any[];
  mapPerfis: Record<string, string>;
  placeholder?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useFecharAoClicarFora(aberto, () => setAberto(false));

  const selecionada = contas.find((c) => c.id === valor);
  const dinheiro = contas.filter((c) => c.tipo === "dinheiro");
  const grupos = bancos
    .map((b) => ({ banco: b, itens: contas.filter((c) => c.conta_bancaria_id === b.id) }))
    .filter((g) => g.itens.length > 0);
  const idsAgrupados = new Set(grupos.flatMap((g) => g.itens.map((c) => c.id)));
  const semGrupo = contas.filter((c) => c.tipo !== "dinheiro" && !idsAgrupados.has(c.id));

  const Item = ({ conta }: { conta: ContaOpcao }) => {
    const av = avatarConta(conta, mapPerfis);
    return (
      <button
        type="button"
        onClick={() => {
          onSelecionar(conta.id);
          setAberto(false);
        }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[var(--nova-ink-hairline)]"
      >
        <Avatar {...av} />
        <span className="min-w-0">
          <span className="block text-[14px] font-medium text-[var(--nova-ink)] truncate">{conta.nome}</span>
          <span className="block text-[12px] text-[var(--nova-ink-faint)] truncate">{subtituloConta(conta)}</span>
        </span>
      </button>
    );
  };

  return (
    <div ref={ref} className="relative">
      <label className={rotuloClasse}>{rotulo}</label>
      <button type="button" onClick={() => setAberto((v) => !v)} className={gatilho}>
        {selecionada ? (
          <span className="flex items-center gap-2.5 min-w-0">
            <Avatar {...avatarConta(selecionada, mapPerfis)} />
            <span className="min-w-0">
              <span className="block text-[15px] font-medium text-[var(--nova-ink)] truncate">{selecionada.nome}</span>
              <span className="block text-[12px] text-[var(--nova-ink-faint)] truncate">{subtituloConta(selecionada)}</span>
            </span>
          </span>
        ) : (
          <span className="text-[15px] text-[var(--nova-ink-faint)]">{placeholder}</span>
        )}
        <Chevron aberto={aberto} />
      </button>
      {aberto && (
        <div className={painel} style={{ backdropFilter: "var(--nova-blur-sheet)", WebkitBackdropFilter: "var(--nova-blur-sheet)" }}>
          {dinheiro.length > 0 && (
            <div>
              <div className="px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--nova-success)] bg-[var(--nova-success-bg)]">Dinheiro físico</div>
              {dinheiro.map((c) => (
                <Item key={c.id} conta={c} />
              ))}
            </div>
          )}
          {grupos.map(({ banco, itens }) => (
            <div key={banco.id}>
              <div className={`nova-picker-bank nova-bank-${identidadeBanco(banco.banco || banco.nome || "").chave}`}>
                <span className="truncate">{banco.banco || banco.nome}</span>
                {banco.autor_nome && <span className="opacity-70 shrink-0">@{banco.autor_nome}</span>}
              </div>
              {itens.map((c) => (
                <Item key={c.id} conta={c} />
              ))}
            </div>
          ))}
          {semGrupo.map((c) => (
            <Item key={c.id} conta={c} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Escolhe um banco (ou dinheiro) — para "onde caiu" e destino de transferência. */
export function SeletorBanco({
  rotulo,
  valor,
  onSelecionar,
  bancos,
  mapPerfis,
  incluirDinheiro = true,
  placeholder = "Selecione…",
}: {
  rotulo: string;
  valor: string;
  onSelecionar: (id: string) => void;
  bancos: any[];
  mapPerfis: Record<string, string>;
  incluirDinheiro?: boolean;
  placeholder?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useFecharAoClicarFora(aberto, () => setAberto(false));

  const selecionado = valor === "dinheiro" ? { id: "dinheiro", banco: "Dinheiro / Carteira" } : bancos.find((b) => b.id === valor);

  const Item = ({ id, titulo, subtitulo, foto, letra }: { id: string; titulo: string; subtitulo?: string; foto?: string; letra: string }) => (
    <button
      type="button"
      onClick={() => {
        onSelecionar(id);
        setAberto(false);
      }}
      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[var(--nova-ink-hairline)]"
    >
      <Avatar foto={foto} letra={letra} />
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-[var(--nova-ink)] truncate">{titulo}</span>
        {subtitulo && <span className="block text-[12px] text-[var(--nova-ink-faint)] truncate">{subtitulo}</span>}
      </span>
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <label className={rotuloClasse}>{rotulo}</label>
      <button type="button" onClick={() => setAberto((v) => !v)} className={gatilho}>
        {selecionado ? (
          <span className="flex items-center gap-2.5 min-w-0">
            <Avatar foto={valor === "dinheiro" ? undefined : mapPerfis[(selecionado as any).autor_nome]} letra={valor === "dinheiro" ? "$" : ((selecionado as any).autor_nome || "?").charAt(0).toUpperCase()} />
            <span className="min-w-0">
              <span className="block text-[15px] font-medium text-[var(--nova-ink)] truncate">{(selecionado as any).banco || (selecionado as any).nome}</span>
              {valor !== "dinheiro" && <span className="block text-[12px] text-[var(--nova-ink-faint)] truncate">@{(selecionado as any).autor_nome}</span>}
            </span>
          </span>
        ) : (
          <span className="text-[15px] text-[var(--nova-ink-faint)]">{placeholder}</span>
        )}
        <Chevron aberto={aberto} />
      </button>
      {aberto && (
        <div className={painel} style={{ backdropFilter: "var(--nova-blur-sheet)", WebkitBackdropFilter: "var(--nova-blur-sheet)" }}>
          {incluirDinheiro && <Item id="dinheiro" titulo="Dinheiro / Carteira" letra="$" />}
          {bancos.map((b) => (
            <Item key={b.id} id={b.id} titulo={b.banco || b.nome} subtitulo={`@${b.autor_nome}`} foto={mapPerfis[b.autor_nome]} letra={(b.autor_nome || "?").charAt(0).toUpperCase()} />
          ))}
        </div>
      )}
    </div>
  );
}

