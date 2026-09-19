"use client";
import { useEffect, useRef, useState } from "react";
import { identidadeBanco } from "../nova/_lib/identidadeBanco";
import { subtituloConta } from "../nova/_ui/SeletorConta";

export function FiltrosContas({ bancos, contas, mapPerfis, bancoId, aoBanco, excluidas, aoExcluir }: {
  bancos: any[]; contas: any[]; mapPerfis: Record<string, string>; bancoId: string;
  aoBanco: (id: string) => void; excluidas: string[]; aoExcluir: (ids: string[]) => void;
}) {
  const [aberto, setAberto] = useState<"banco" | "pagamento" | null>(null);
  const [busca, setBusca] = useState("");
  const raiz = useRef<HTMLDivElement>(null);
  const gatilhos = useRef<Partial<Record<"banco" | "pagamento", HTMLButtonElement | null>>>({});
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(null); };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);
  const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const bancoDe = (c: any) => bancos.find(b => b.id === c.conta_bancaria_id);
  const autorDe = (c: any) => c.tipo === "dinheiro" ? "Família" : bancoDe(c)?.autor_nome || c.autor_nome || "Sem titular";
  const visiveis = contas.filter(c => !bancoId || c.conta_bancaria_id === bancoId);
  const opcoes = aberto === "banco" ? bancos.map(b => ({ id: b.id, nome: b.banco || b.nome, autor: b.autor_nome || "Sem titular", banco: b.banco || b.nome, grupo: b.id, sub: b.nome !== b.banco ? b.nome : "Conta bancária" })) : visiveis.map(c => ({ id: c.id, nome: c.nome, autor: autorDe(c), banco: c.tipo === "dinheiro" ? "Dinheiro físico" : bancoDe(c)?.banco || bancoDe(c)?.nome || "Sem banco vinculado", grupo: c.conta_bancaria_id || "sem-banco", sub: `${c.tipo === "credito" ? "Crédito" : c.subtipo === "pix" ? "PIX" : c.subtipo === "debito" ? "Débito" : c.tipo === "dinheiro" ? "Dinheiro" : "Conta"} · ${subtituloConta(c).replace(/^PIX · /, "")}` }));
  const resultados = opcoes.filter(o => normalizar(`${o.autor} ${o.banco} ${o.nome} ${o.sub}`).includes(normalizar(busca))).sort((a,b) => a.autor.localeCompare(b.autor) || a.banco.localeCompare(b.banco) || a.nome.localeCompare(b.nome));
  const excluidasVisiveis = visiveis.filter(c => excluidas.includes(c.id)).length;
  const selecionado = bancos.find(b => b.id === bancoId);
  return <div ref={raiz} className="classic-filter-pair" onKeyDown={e => { if (e.key === "Escape" && aberto) { e.stopPropagation(); gatilhos.current[aberto]?.focus(); setAberto(null); } }}>
    {(["banco", "pagamento"] as const).map(modo => <div key={modo} className="relative min-w-0 flex-1">
      <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">{modo === "banco" ? "Filtrar por banco / instituição" : "Formas de pagamento incluídas"}</span>
      <button ref={el => { gatilhos.current[modo] = el; }} type="button" aria-expanded={aberto === modo} aria-controls={`filtro-${modo}`} onClick={() => { setAberto(aberto === modo ? null : modo); setBusca(""); }} className="classic-filter-trigger">
        <span className="truncate">{modo === "banco" ? selecionado ? `@${selecionado.autor_nome} · ${selecionado.banco || selecionado.nome}` : "Todos os bancos" : excluidasVisiveis ? `${visiveis.length - excluidasVisiveis} de ${visiveis.length} incluídas` : "Todas as formas incluídas"}</span><span aria-hidden="true">⌄</span>
      </button>
      {aberto === modo && <div id={`filtro-${modo}`} className="classic-filter-menu" role="region" aria-label={modo === "banco" ? "Escolher banco" : "Incluir ou excluir formas de pagamento"}>
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
          <input autoFocus aria-label="Pesquisar no filtro" placeholder="Pesquisar usuário, banco ou forma…" value={busca} onChange={e => setBusca(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2 text-sm" />
          {modo === "banco" ? <button type="button" className="text-sm font-bold text-blue-600 dark:text-blue-400" onClick={() => { aoBanco(""); setAberto(null); gatilhos.current.banco?.focus(); }}>Todos os bancos</button> : <>
            <p className="text-xs text-gray-500 dark:text-gray-400">Desmarque as formas que deseja excluir.</p>
            <div className="flex gap-4 text-xs font-bold text-blue-600 dark:text-blue-400"><button type="button" onClick={() => aoExcluir(excluidas.filter(id => !visiveis.some(c => c.id === id)))}>Incluir todas</button><button type="button" onClick={() => aoExcluir([...new Set([...excluidas, ...visiveis.map(c => c.id)])])}>Excluir todas</button></div>
          </>}
        </div>
        <div className="max-h-72 overflow-y-auto overscroll-contain">
          {resultados.map((o,i) => <div key={o.id}>
            {(i === 0 || resultados[i-1].autor !== o.autor) && <div className="classic-filter-user">{mapPerfis[o.autor] ? <img src={mapPerfis[o.autor]} alt="" /> : <span className="classic-filter-initial">{o.autor.charAt(0)}</span>}<span>{o.autor === "Família" ? "Família" : `@${o.autor}`}</span></div>}
            {modo === "pagamento" && (i === 0 || resultados[i-1].grupo !== o.grupo || resultados[i-1].autor !== o.autor) && <div className={`nova-picker-bank nova-bank-${identidadeBanco(o.banco).chave}`}>{o.banco}</div>}
            <label className={`classic-filter-option nova-bank-${identidadeBanco(o.banco).chave}`}>
              <input aria-label={`${o.autor} · ${o.banco} · ${o.nome}`} type={modo === "banco" ? "radio" : "checkbox"} name={modo === "banco" ? "banco-filtro" : undefined} checked={modo === "banco" ? bancoId === o.id : !excluidas.includes(o.id)} onChange={() => {
                if (modo === "banco") { aoBanco(o.id); setAberto(null); gatilhos.current.banco?.focus(); }
                else aoExcluir(excluidas.includes(o.id) ? excluidas.filter(id => id !== o.id) : [...excluidas, o.id]);
              }} />
              <span className="min-w-0"><span className="block text-sm font-semibold truncate">{o.nome}</span><span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{o.sub}</span></span>
            </label>
          </div>)}
          {resultados.length === 0 && <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Nenhuma opção encontrada.</p>}
        </div>
      </div>}
    </div>)}
  </div>;
}
