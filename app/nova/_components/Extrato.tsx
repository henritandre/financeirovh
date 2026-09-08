"use client";


import { Surface } from "../_ui/Surface";
import { Secao } from "./Secao";

import { brl } from "../_lib/formatar";

export function Extrato({ itens, onAbrir, mapPerfis }: { itens: any[]; onAbrir: (t: any) => void; mapPerfis: Record<string, string> }) {
  return (
    <Secao titulo="Últimos lançamentos">
      <Surface className="overflow-hidden">
        {itens.length === 0 && <p className="text-center py-8 text-sm text-[var(--nova-ink-faint)]">Nada lançado neste mês.</p>}
        {itens.map((t, i) => (
          <LinhaExtrato key={t.id} t={t} primeira={i === 0} onAbrir={onAbrir} foto={mapPerfis[t.autor_nome]} />
        ))}
      </Surface>
    </Secao>
  );
}

function LinhaExtrato({ t, primeira, onAbrir, foto }: { t: any; primeira: boolean; onAbrir: (t: any) => void; foto?: string }) {


  const receita = t.tipo === "receita";
  const transf = t.tipo === "transferencia";

  return (
    <div

      onClick={() => onAbrir(t)}
      className={`nova-extrato-row cursor-pointer select-none transition-colors duration-150 hover:bg-[var(--nova-ink-hairline)] active:bg-[var(--nova-glass-2)] ${
        primeira ? "" : "border-t border-[var(--nova-ink-hairline)]"
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onAbrir(t);
        }
      }}
      style={{ touchAction: "manipulation" }}
    >
      <div className="nova-extrato-content flex items-center gap-3 px-4 py-3.5">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          receita ? "bg-[var(--nova-success-bg)] text-[var(--nova-success)]" : transf ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-[var(--nova-ink-hairline)] text-[var(--nova-ink)]"
        }`}
      >
        {receita ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
        ) : transf ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" /></svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-[var(--nova-ink)] truncate" style={{ letterSpacing: "-0.01em" }}>
          {t.descricao}
        </p>
        <p className="text-[13px] text-[var(--nova-ink-faint)] truncate">
          {t.categorias?.nome || (transf ? "Transferência" : "Sem categoria")} · {new Date(t.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
        </p>
      </div>
      <div
        className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-[var(--nova-ink-hairline)] text-[var(--nova-ink-faint)] flex items-center justify-center text-[11px] font-semibold border border-[var(--nova-glass-border)]"
        title={t.autor_nome ? `@${t.autor_nome}` : undefined}
      >
        {foto ? <img src={foto} alt="" draggable={false} className="w-full h-full object-cover" /> : (t.autor_nome || "?").charAt(0).toUpperCase()}
      </div>
      <p className={`shrink-0 text-[15px] font-semibold ${receita ? "text-[var(--nova-success)]" : "text-[var(--nova-ink)]"}`}>
        {receita ? "+" : "−"}
        {brl(Number(t.valor))}
      </p>
      </div>
    </div>
  );
}



