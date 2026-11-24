"use client";

import { useMemo, useState, type ReactNode } from "react";
import { dataNumerica, faturasDoHistorico, gastoPorCategoria, mesAno, ROTULO_STATUS, type Fatura, type StatusFatura } from "../../../lib/faturas";
import { brl, dataBR } from "../_lib/formatar";

/**
 * Resumo rápido de uma fatura e histórico das faturas pagas de um cartão.
 * Usado no Sheet da UI Nova e no <dialog> da Clássica (como o DetalheBanco).
 * O mês inicial do filtro vive só enquanto o painel está aberto: ao abrir de
 * novo, o histórico volta para o padrão do parâmetro qtd_faturas_historico.
 */
export function PainelFaturas({
  nomeCartao,
  historico,
  competenciaInicial = null,
  qtdHistorico = 5,
  mapPerfis,
  formatar = brl,
}: {
  nomeCartao: string;
  historico: Fatura[];
  /** Fatura a abrir direto no resumo; nula abre o histórico. */
  competenciaInicial?: string | null;
  qtdHistorico?: number;
  mapPerfis: Record<string, string>;
  /** Formatação de dinheiro (a Clássica passa a sua, que respeita o "ocultar valores"). */
  formatar?: (v: number) => string;
}) {
  const [selecionada, setSelecionada] = useState<string | null>(competenciaInicial);
  const [mesInicial, setMesInicial] = useState<string | null>(null);
  const fatura = selecionada ? historico.find((f) => f.competencia === selecionada) : undefined;

  if (fatura) {
    return <ResumoFatura nomeCartao={nomeCartao} fatura={fatura} mapPerfis={mapPerfis} formatar={formatar} onVoltar={() => setSelecionada(null)} />;
  }
  return (
    <HistoricoFaturas
      nomeCartao={nomeCartao}
      historico={historico}
      qtdPadrao={qtdHistorico}
      mesInicial={mesInicial}
      onMesInicial={setMesInicial}
      onAbrir={setSelecionada}
      formatar={formatar}
    />
  );
}

const COR_STATUS: Record<StatusFatura, string> = {
  paga: "var(--nova-success)",
  atrasada: "var(--nova-danger)",
  fechada: "var(--nova-accent)",
  atual: "var(--nova-accent)",
  futura: "var(--nova-ink-soft)",
};

function Selo({ status }: { status: StatusFatura }) {
  const cor = COR_STATUS[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ color: cor, background: `color-mix(in srgb, ${cor} 14%, transparent)` }}
    >
      {ROTULO_STATUS[status]}
    </span>
  );
}

function Titulo({ sobre, children, selo }: { sobre: string; children: ReactNode; selo?: ReactNode }) {
  return (
    <>
      <p className="text-[13px] font-medium text-[var(--nova-ink-faint)] pr-10">{sobre}</p>
      <div className="flex items-center justify-between gap-3 mt-0.5 pr-10">
        <h3 className="text-[22px] font-semibold text-[var(--nova-ink)] tabular-nums" style={{ letterSpacing: "-0.02em" }}>
          {children}
        </h3>
        {selo}
      </div>
    </>
  );
}

function ResumoFatura({ nomeCartao, fatura, mapPerfis, formatar, onVoltar }: {
  nomeCartao: string; fatura: Fatura; mapPerfis: Record<string, string>; formatar: (v: number) => string; onVoltar: () => void;
}) {
  const [todas, setTodas] = useState(false);
  const categorias = useMemo(() => gastoPorCategoria(fatura.lancamentos), [fatura]);
  const maiorCategoria = categorias[0]?.valor || 1;
  const paga = fatura.status === "paga";
  const progresso = fatura.total > 0 ? Math.min(100, Math.max(0, (fatura.pago / fatura.total) * 100)) : 100;
  const compras = todas ? fatura.lancamentos : fatura.lancamentos.slice(0, 8);

  const linhas: [string, string][] = [
    ["Fecha em", dataNumerica(fatura.fechamento)],
    ["Vence em", dataNumerica(fatura.vencimento)],
    ["Total da fatura", formatar(fatura.total)],
    ["Pago", formatar(fatura.pago)],
  ];

  return (
    <div>
      <button type="button" onClick={onVoltar} className="min-h-[40px] -ml-1 mb-1 px-1 text-[13px] font-semibold text-[var(--nova-accent)] cursor-pointer">
        ‹ Histórico de faturas
      </button>
      <Titulo sobre={nomeCartao} selo={<Selo status={fatura.status} />}>Fatura {mesAno(fatura.competencia)}</Titulo>

      <p className="mt-3 text-[13px] text-[var(--nova-ink-faint)]">{paga ? "Total pago" : "Em aberto"}</p>
      <p className="text-[32px] font-semibold text-[var(--nova-ink)] leading-tight" style={{ letterSpacing: "-0.02em" }}>
        {formatar(paga ? fatura.total : fatura.aberto)}
      </p>
      <div
        className="mt-3 h-1.5 rounded-full bg-[var(--nova-ink-hairline)] overflow-hidden"
        role="progressbar"
        aria-label="Quanto da fatura já foi pago"
        aria-valuenow={Math.round(progresso)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-[var(--nova-success)]" style={{ width: `${progresso}%` }} />
      </div>

      <div className="mt-4">
        {linhas.map(([k, v], i) => (
          <div key={k} className={`flex items-center justify-between gap-3 py-2 ${i === 0 ? "" : "border-t border-[var(--nova-ink-hairline)]"}`}>
            <span className="text-[14px] text-[var(--nova-ink-faint)]">{k}</span>
            <span className="text-[14px] font-medium text-[var(--nova-ink)] tabular-nums">{v}</span>
          </div>
        ))}
      </div>

      {categorias.length > 0 && (
        <>
          <p className="mt-6 mb-2 text-[13px] font-semibold text-[var(--nova-ink-faint)]">Onde foi o dinheiro</p>
          <div className="space-y-2.5">
            {categorias.slice(0, 5).map((c) => (
              <div key={c.nome}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="text-[var(--nova-ink)] truncate">{c.nome}</span>
                  <span className="font-medium text-[var(--nova-ink)] shrink-0">{formatar(c.valor)}</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-[var(--nova-ink-hairline)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--nova-accent)]" style={{ width: `${Math.max(0, (c.valor / maiorCategoria) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-6 mb-1 text-[13px] font-semibold text-[var(--nova-ink-faint)]">
        Compras <span className="font-normal">({fatura.lancamentos.length})</span>
      </p>
      {compras.map((t, i) => {
        const foto = mapPerfis[t.autor_nome];
        return (
          <div key={t.id ?? i} className={`flex items-center gap-3 py-2.5 ${i === 0 ? "" : "border-t border-[var(--nova-ink-hairline)]"}`}>
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-[var(--nova-ink-hairline)] flex items-center justify-center text-[11px] font-semibold text-[var(--nova-ink-faint)]">
              {foto ? <img src={foto} alt="" draggable={false} className="w-full h-full object-cover" /> : (t.autor_nome || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-[var(--nova-ink)] truncate">{t.descricao}</p>
              <p className="text-[12px] text-[var(--nova-ink-faint)] truncate tabular-nums">
                {dataBR(t.data)}
                {t.categorias?.nome ? ` · ${t.categorias.nome}` : ""}
              </p>
            </div>
            <p className="text-[14px] font-semibold shrink-0 text-[var(--nova-ink)]">{formatar(Number(t.valor))}</p>
          </div>
        );
      })}
      {fatura.lancamentos.length > 8 && (
        <button type="button" onClick={() => setTodas((v) => !v)} className="w-full min-h-[44px] text-[13px] font-semibold text-[var(--nova-accent)] cursor-pointer">
          {todas ? "Mostrar menos" : `Ver todas as ${fatura.lancamentos.length} compras`}
        </button>
      )}

      {fatura.pagamentos.length > 0 && (
        <>
          <p className="mt-6 mb-1 text-[13px] font-semibold text-[var(--nova-ink-faint)]">Pagamentos</p>
          {fatura.pagamentos.map((p, i) => (
            <div key={`${p.transacao.id ?? "p"}-${i}`} className={`flex items-center justify-between gap-3 py-2.5 ${i === 0 ? "" : "border-t border-[var(--nova-ink-hairline)]"}`}>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[var(--nova-ink)] truncate">{p.transacao.descricao || "Pagamento"}</p>
                <p className="text-[12px] text-[var(--nova-ink-faint)] tabular-nums">
                  {dataBR(p.transacao.data)}
                  {Math.abs(Number(p.transacao.valor) - p.valor) > 0.009 ? ` · parte de ${formatar(Number(p.transacao.valor))}` : ""}
                </p>
              </div>
              <p className="text-[14px] font-semibold shrink-0 text-[var(--nova-success)]">{formatar(p.valor)}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function HistoricoFaturas({ nomeCartao, historico, qtdPadrao, mesInicial, onMesInicial, onAbrir, formatar }: {
  nomeCartao: string;
  historico: Fatura[];
  qtdPadrao: number;
  mesInicial: string | null;
  onMesInicial: (competencia: string | null) => void;
  onAbrir: (competencia: string) => void;
  formatar: (v: number) => string;
}) {
  const { pagas, inicioPadrao, inicio, visiveis } = useMemo(
    () => faturasDoHistorico(historico, qtdPadrao, mesInicial),
    [historico, qtdPadrao, mesInicial]
  );
  const total = visiveis.reduce((a, f) => a + f.total, 0);

  return (
    <div>
      <Titulo sobre="Histórico de faturas">{nomeCartao}</Titulo>

      {pagas.length === 0 ? (
        <p className="mt-4 text-[13px] text-[var(--nova-ink-faint)]">Nenhuma fatura paga neste cartão ainda.</p>
      ) : (
        <>
          <div className="mt-4 flex items-end justify-between gap-3">
            <label className="flex flex-col gap-1 text-[12px] font-medium text-[var(--nova-ink-faint)]">
              A partir de
              <select
                value={inicio ?? ""}
                onChange={(e) => onMesInicial(e.target.value === inicioPadrao ? null : e.target.value)}
                className="min-h-[40px] rounded-[10px] border border-[var(--nova-ink-hairline)] bg-[var(--nova-glass-1)] px-3 text-[14px] font-medium text-[var(--nova-ink)] tabular-nums cursor-pointer"
              >
                {pagas.map((f) => (
                  <option key={f.competencia} value={f.competencia}>{mesAno(f.competencia)}</option>
                ))}
              </select>
            </label>
            {mesInicial && (
              <button type="button" onClick={() => onMesInicial(null)} className="min-h-[40px] px-1 text-[13px] font-semibold text-[var(--nova-accent)] cursor-pointer">
                Voltar ao padrão
              </button>
            )}
          </div>
          <p className="mt-3 mb-1 text-[12px] text-[var(--nova-ink-faint)]">
            {visiveis.length} {visiveis.length === 1 ? "fatura paga" : "faturas pagas"} · {formatar(total)}
          </p>
          {visiveis.map((f, i) => (
            <button
              key={f.competencia}
              type="button"
              onClick={() => onAbrir(f.competencia)}
              className={`w-full flex items-center justify-between gap-3 py-3 text-left cursor-pointer hover:opacity-80 ${i === 0 ? "" : "border-t border-[var(--nova-ink-hairline)]"}`}
            >
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[var(--nova-ink)] tabular-nums">{mesAno(f.competencia)}</p>
                <p className="text-[12px] text-[var(--nova-ink-faint)] tabular-nums">
                  Venceu {dataNumerica(f.vencimento)} · {f.lancamentos.length} {f.lancamentos.length === 1 ? "compra" : "compras"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-[14px] font-semibold text-[var(--nova-ink)]">{formatar(f.total)}</p>
                  <Selo status={f.status} />
                </div>
                <span aria-hidden="true" className="text-[var(--nova-ink-faint)]">›</span>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
