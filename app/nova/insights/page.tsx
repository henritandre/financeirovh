"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../ThemeContext";
import { useSessao } from "../../../lib/hooks/useSessao";
import { usePerfis } from "../../../lib/hooks/usePerfis";
import { useContasEBancos } from "../../../lib/hooks/useContasEBancos";
import { useTransacoes } from "../../../lib/hooks/useTransacoes";
import { useCategorias } from "../../../lib/hooks/useCategorias";
import { useDadosInsights } from "../../../lib/hooks/useDadosInsights";
import { calcularInsights } from "../../../lib/insights";
import { Cabecalho } from "../_components/Cabecalho";
import { Secao } from "../_components/Secao";
import { Sheet } from "../_ui/Sheet";
import {
  CategoriasInsights, HistoriaInsights, ListaDetalhe, PesosPesados, ProjecaoInsights, RaioX, ResumoInsights, SaudeInsights, type Detalhe,
} from "../_components/InsightsSecoes";

/** Insights na UI Nova: mesmos cálculos da Clássica (lib/insights.ts), visão da casa. */
export default function NovaInsightsPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const sessao = useSessao();
  const mapPerfis = usePerfis();
  const { contas, carregando: carregandoContas } = useContasEBancos();
  const { transacoes, carregando: carregandoTransacoes } = useTransacoes();
  const { categorias } = useCategorias();
  const extras = useDadosInsights(sessao.userId);

  const [mesAtual, setMesAtual] = useState(() => new Date());
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);

  const r = useMemo(
    () => calcularInsights({ transacoes, contas, contasFixas: extras.contasFixas, categoriasLista: categorias, poupancaIds: extras.poupancaIds }, mesAtual),
    [transacoes, contas, extras.contasFixas, categorias, extras.poupancaIds, mesAtual]
  );
  const autores = useMemo(
    () => Array.from(new Set(transacoes.map((t) => t.autor_nome).filter((n) => n && n !== "Família"))) as string[],
    [transacoes]
  );

  const carregando = sessao.carregando || carregandoContas || carregandoTransacoes || extras.carregando;
  const alterarMes = (delta: number) => setMesAtual((p) => new Date(p.getFullYear(), p.getMonth() + delta, 1));
  const abrirLancamento = (id: string) => router.push(`/nova/dashboard?editar=${id}`);
  const nomeDoMes = r.nomeDoMes.charAt(0).toUpperCase() + r.nomeDoMes.slice(1);
  const rotuloModo = r.modo === "futuro" ? "Projeção" : r.modo === "corrente" ? "Ao vivo" : "Retrospectiva";

  return (
    <div className="min-h-screen">
      <Cabecalho isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

      <main className="relative px-4 lg:px-8 pb-16 max-w-2xl lg:max-w-6xl mx-auto pt-5 lg:pt-7">
        <div className="nova-page-intro">
          <h1>Insights</h1>
          <div className="flex items-center gap-1 rounded-full bg-[var(--nova-glass-1)] border border-[var(--nova-glass-border)] p-1 shadow-[var(--nova-shadow-1)]">
            <button type="button" onClick={() => alterarMes(-1)} aria-label="Mês anterior" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--nova-ink)] hover:bg-[var(--nova-ink-hairline)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <div className="min-w-[150px] text-center px-1" aria-live="polite">
              <p className="text-[14px] font-semibold text-[var(--nova-ink)]">{nomeDoMes}</p>
              <p className={`text-[11px] font-medium flex items-center justify-center gap-1 ${r.modo === "corrente" ? "text-[var(--nova-accent)]" : "text-[var(--nova-ink-faint)]"}`}>
                {r.modo === "corrente" && <span className="w-1.5 h-1.5 rounded-full bg-[var(--nova-accent)]" aria-hidden="true" />}
                {rotuloModo}
              </p>
            </div>
            <button type="button" onClick={() => alterarMes(1)} aria-label="Próximo mês" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--nova-ink)] hover:bg-[var(--nova-ink-hairline)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </div>

        {carregando ? (
          <div className="space-y-4">
            <div className="nova-skeleton h-40" />
            <div className="nova-skeleton h-64" />
            <div className="nova-skeleton h-64" />
          </div>
        ) : r.modo === "futuro" ? (
          <div className="space-y-7">
            <ProjecaoInsights r={r} nomeDoMes={nomeDoMes} />
            <RaioX r={r} />
          </div>
        ) : (
          <div className="space-y-7">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
              <div className="lg:col-span-2 space-y-4">
                <ResumoInsights m={r.m} />
                <SaudeInsights autores={autores} computarMes={r.computarMes} mapPerfis={mapPerfis} />
              </div>
              <div className="lg:col-span-3">
                <HistoriaInsights r={r} />
              </div>
            </div>

            <Secao titulo="Fluxo por categoria">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CategoriasInsights titulo="Para onde o dinheiro foi" dados={r.despesasCat} total={r.m.despesas} qtdVisiveis={extras.qtdCategorias} expandirResto={extras.expandirResto} aoAbrir={setDetalhe} />
                <CategoriasInsights titulo="De onde o dinheiro veio" dados={r.receitasCat} total={r.m.receitas} qtdVisiveis={extras.qtdCategorias} expandirResto={extras.expandirResto} aoAbrir={setDetalhe} />
              </div>
            </Secao>

            <PesosPesados key={extras.qtdTop} gastos={r.maioresGastos} qtdInicial={extras.qtdTop} mapPerfis={mapPerfis} aoAbrirLancamento={abrirLancamento} />

            <RaioX r={r} />
          </div>
        )}
      </main>

      <Sheet aberto={detalhe !== null} aoFechar={() => setDetalhe(null)} tituloAcessivel={detalhe?.titulo || "Detalhe"}>
        {detalhe && <ListaDetalhe detalhe={detalhe} aoAbrirLancamento={abrirLancamento} />}
      </Sheet>
    </div>
  );
}
