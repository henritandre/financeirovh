"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { resolverContaPrincipal, type ModoParcelamento, type TipoLancamento, type VinculoContaFixa } from "../../../lib/hooks/useLancamentos";
import { Button } from "../_ui/Button";
import { SegmentedControl } from "../_ui/SegmentedControl";
import { SeletorContaPagamento, SeletorBanco } from "../_ui/SeletorConta";
import { brl, dataLocal } from "../_lib/formatar";

export interface DadosFormulario {
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
  categoriaId: string | null;
  contaId: string;
  contaDestinoId: string | null;
  parcelas: number;
  modoParcelamento: ModoParcelamento;
  valoresParcelasManual?: number[];
  vinculoContaFixa: VinculoContaFixa | null;
  ocorrenciaOriginalVinculada?: any | null;
}

const campo = "w-full rounded-[var(--nova-radius-md)] border border-[var(--nova-ink-hairline)] bg-[var(--nova-bg-elevated)] px-4 py-2.5 text-[15px] text-[var(--nova-ink)] outline-none focus:border-[var(--nova-accent)]";
const rotulo = "block text-[12px] font-semibold text-[var(--nova-ink-faint)] uppercase tracking-wide mb-1.5";

export function FormularioLancamento({
  modo,
  transacaoBase,
  userId,
  contas,
  bancos,
  categorias,
  mapPerfis,
  onCancelar,
  onSalvarNovo,
  onPedirMotivoEdicao,
  salvando,
}: {
  modo: "novo" | "editar";
  transacaoBase?: any;
  userId: string;
  contas: any[];
  bancos: any[];
  categorias: any[];
  mapPerfis: Record<string, string>;
  onCancelar: () => void;
  onSalvarNovo: (dados: DadosFormulario) => void;
  onPedirMotivoEdicao: (dados: DadosFormulario) => void;
  salvando: boolean;
}) {
  const [tipo, setTipo] = useState<TipoLancamento>(transacaoBase?.tipo ?? "despesa");
  const [descricao, setDescricao] = useState(transacaoBase?.descricao ?? "");
  const [valor, setValor] = useState(transacaoBase ? String(transacaoBase.valor).replace(".", ",") : "");
  const [data, setData] = useState(transacaoBase?.data ?? dataLocal(new Date()));
  const [categoriaId, setCategoriaId] = useState(transacaoBase?.categoria_id ?? "");

  const [somenteMinhas, setSomenteMinhas] = useState(modo === "novo");
  const [parcelas, setParcelas] = useState(1);
  const [modoParcelamento, setModoParcelamento] = useState<ModoParcelamento>("ultima");
  const [valoresParcelasManual, setValoresParcelasManual] = useState<string[]>([]);

  // despesa e transferência (origem) usam o mesmo picker: conta direta
  const [formaPagtoId, setFormaPagtoId] = useState(() => {
    if (!transacaoBase) return "";
    if (transacaoBase.tipo === "despesa" || transacaoBase.tipo === "transferencia") return transacaoBase.conta_id || "";
    return "";
  });
  const podeParcelar = tipo === "despesa" && contas.find(c => c.id === formaPagtoId)?.tipo === "credito";
  const bancosVisiveis = bancos.filter(b => b.ativo !== false && (!somenteMinhas || b.user_id === userId));
  const contasVisiveis = contas.filter(c => !somenteMinhas || c.tipo === "dinheiro" || c.user_id === userId);
  // receita usa "onde caiu": banco (ou dinheiro), resolvido depois
  const [bancoOrigemId, setBancoOrigemId] = useState(() => {
    if (transacaoBase?.tipo === "receita") {
      const c = transacaoBase.conta_origem;
      return c?.tipo === "dinheiro" ? "dinheiro" : c?.conta_bancaria_id || "";
    }
    return "";
  });
  const [isPagamentoFatura, setIsPagamentoFatura] = useState(() => transacaoBase?.conta_destino?.tipo === "credito");
  const [bancoDestinoId, setBancoDestinoId] = useState(() => {
    const c = transacaoBase?.conta_destino;
    if (c && c.tipo !== "credito") return c.tipo === "dinheiro" ? "dinheiro" : c.conta_bancaria_id || "";
    return "";
  });
  const [faturaDestinoId, setFaturaDestinoId] = useState(() => (transacaoBase?.conta_destino?.tipo === "credito" ? transacaoBase.conta_destino.id : ""));

  const [vinculoContaFixa, setVinculoContaFixa] = useState<VinculoContaFixa | null>(null);
  const [ocorrenciaOriginalVinculada, setOcorrenciaOriginalVinculada] = useState<any | null>(null);
  const [sugestoesContasFixas, setSugestoesContasFixas] = useState<any[]>([]);
  const [erro, setErro] = useState("");

  // Ao editar uma despesa, carrega a ocorrência de conta fixa já vinculada (se houver)
  useEffect(() => {
    if (modo !== "editar" || !transacaoBase || transacaoBase.tipo !== "despesa") return;
    (async () => {
      const { data: oc } = await supabase.from("contas_fixas_ocorrencias").select("*").eq("transacao_id", transacaoBase.id).maybeSingle();
      if (oc) {
        setOcorrenciaOriginalVinculada(oc);
        setVinculoContaFixa({ contaFixaId: oc.conta_fixa_id, ocorrenciaId: oc.id });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  // Sugestão de conta fixa: só para despesa avulsa (sem parcelamento), pela categoria + competência da data
  useEffect(() => {
    if (tipo !== "despesa" || !categoriaId || parcelas > 1) {
      setSugestoesContasFixas([]);
      return;
    }
    let cancelado = false;
    (async () => {
      const { data: fixas } = await supabase.from("contas_fixas").select("*").eq("categoria_id", categoriaId).eq("arquivada", false).eq("modo", "unico");
      if (!fixas || fixas.length === 0) {
        if (!cancelado) setSugestoesContasFixas([]);
        return;
      }
      const [ano, mes] = data.split("-").map(Number);
      const { data: ocs } = await supabase
        .from("contas_fixas_ocorrencias")
        .select("*")
        .eq("competencia_ano", ano)
        .eq("competencia_mes", mes)
        .in("conta_fixa_id", fixas.map((f) => f.id));
      if (cancelado) return;
      setSugestoesContasFixas(fixas.map((f) => ({ ...f, ocorrencia: ocs?.find((o) => o.conta_fixa_id === f.id) || null })));
    })();
    return () => {
      cancelado = true;
    };
  }, [tipo, categoriaId, data, parcelas]);

  // Se o tipo deixar de ser despesa, o parcelamento não se aplica mais.
  useEffect(() => {
    if (!podeParcelar && parcelas !== 1) {
      setParcelas(1);
      setModoParcelamento("ultima");
      setValoresParcelasManual([]);
    }
  }, [podeParcelar, parcelas]);

  // Mantém os valores manuais de parcela em sincronia com a quantidade escolhida
  useEffect(() => {
    if (modoParcelamento !== "manual") return;
    setValoresParcelasManual((prev) => {
      const total = parseFloat((valor || "0").replace(",", ".")) || 0;
      const base = parcelas > 0 ? Math.floor((total / parcelas) * 100) / 100 : 0;
      const diferenca = Number((total - base * parcelas).toFixed(2));
      return Array.from({ length: parcelas }, (_, i) => {
        if (prev[i] !== undefined) return prev[i];
        const v = i === parcelas - 1 ? base + diferenca : base;
        return v.toFixed(2).replace(".", ",");
      });
    });
  }, [modoParcelamento, parcelas, valor]);

  const categoriasFiltradas = useMemo(
    () =>
      categorias
        .filter((c) => c.tipo === tipo)
        .sort((a, b) => {
          const aOutros = a.nome.toLowerCase().startsWith("outros");
          const bOutros = b.nome.toLowerCase().startsWith("outros");
          if (aOutros !== bOutros) return aOutros ? 1 : -1;
          return a.nome.localeCompare(b.nome);
        }),
    [categorias, tipo]
  );

  const contasCartao = useMemo(() => contasVisiveis.filter((c) => c.tipo === "credito" && c.ativo !== false), [contasVisiveis]);
  const contasPagamento = useMemo(() => contasVisiveis.filter((c) => c.ativo !== false && (c.tipo === "dinheiro" || c.tipo === "corrente" || c.tipo === "credito")), [contasVisiveis]);

  // Preview do parcelamento: "Nx de R$ B, com a 1ª/última parcela em R$ X" — só em modo automático (não manual).
  const previewParcelas = useMemo(() => {
    if (!podeParcelar || parcelas <= 1 || modoParcelamento === "manual") return null;
    const total = parseFloat((valor || "0").replace(",", ".")) || 0;
    const base = Math.floor((total / parcelas) * 100) / 100;
    const diferenca = Number((total - base * parcelas).toFixed(2));
    const rotuloParcela = modoParcelamento === "primeira" ? "1ª parcela" : "última parcela";
    return `${parcelas}x de ${brl(base)}, com a ${rotuloParcela} em ${brl(base + diferenca)}.`;
  }, [podeParcelar, parcelas, modoParcelamento, valor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    const valorNumerico = parseFloat((valor || "0").replace(",", "."));
    if (!descricao.trim()) return setErro("Descreva o lançamento.");
    if (!valorNumerico || valorNumerico <= 0) return setErro("Informe um valor válido.");
    if (tipo !== "transferencia" && !categoriaId) return setErro("Selecione uma categoria.");

    let contaId: string | null = null;
    let contaDestinoId: string | null = null;

    if (tipo === "despesa") {
      contaId = formaPagtoId || null;
      if (!contaId) return setErro("Selecione a forma de pagamento.");
    } else if (tipo === "receita") {
      if (!bancoOrigemId) return setErro("Selecione onde o dinheiro caiu.");
      contaId = resolverContaPrincipal(contas, bancoOrigemId);
    } else {
      if (!formaPagtoId) return setErro("Selecione de onde saiu.");
      contaId = formaPagtoId;
      if (isPagamentoFatura) {
        if (!faturaDestinoId) return setErro("Selecione a fatura de destino.");
        contaDestinoId = faturaDestinoId;
      } else {
        if (!bancoDestinoId) return setErro("Selecione o banco de destino.");
        contaDestinoId = resolverContaPrincipal(contas, bancoDestinoId);
      }
      if (!isPagamentoFatura && formaPagtoId && contaDestinoId && contas.find((c) => c.id === formaPagtoId)?.conta_bancaria_id === contas.find((c) => c.id === contaDestinoId)?.conta_bancaria_id) {
        return setErro("Origem e destino devem ser diferentes.");
      }
    }

    if (!contaId) return setErro("Conta inválida — verifique bancos e cartões cadastrados.");

    const parcelasFinal = podeParcelar ? parcelas : 1;
    if (tipo === "despesa" && modoParcelamento === "manual" && parcelasFinal > 1) {
      const soma = Number(valoresParcelasManual.reduce((acc, v) => acc + (parseFloat((v || "0").replace(",", ".")) || 0), 0).toFixed(2));
      if (Math.abs(soma - valorNumerico) > 0.01) return setErro(`A soma das parcelas (${soma.toFixed(2)}) não bate com o valor total.`);
    }

    const dados: DadosFormulario = {
      tipo,
      descricao: descricao.trim(),
      valor: valorNumerico,
      data,
      categoriaId: tipo === "transferencia" ? null : categoriaId || null,
      contaId,
      contaDestinoId,
      parcelas: parcelasFinal,
      modoParcelamento,
      valoresParcelasManual: podeParcelar && modoParcelamento === "manual" ? valoresParcelasManual.map((v) => parseFloat((v || "0").replace(",", ".")) || 0) : undefined,
      vinculoContaFixa,
      ocorrenciaOriginalVinculada,
    };

    if (modo === "editar") onPedirMotivoEdicao(dados);
    else onSalvarNovo(dados);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-[22px] font-semibold text-[var(--nova-ink)]" style={{ letterSpacing: "-0.02em" }}>
        {modo === "editar" ? "Editar lançamento" : "Novo lançamento"}
      </h3>

      <SegmentedControl
        valor={tipo}
        aoMudar={(v) => {
          setTipo(v);
          setCategoriaId("");
        }}
        opcoes={[
          { valor: "despesa", rotulo: "Despesa", tom: "perigo" },
          { valor: "receita", rotulo: "Receita", tom: "sucesso" },
          { valor: "transferencia", rotulo: "Transferência", tom: "info" },
        ]}
      />

      <div>
        <label className={rotulo}>Descrição</label>
        <input className={campo} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Mercado, Salário, Aluguel" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={rotulo}>Valor</label>
          <input className={campo} value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" />
        </div>
        <div>
          <label className={rotulo}>Data</label>
          <input type="date" className={campo} value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>

      {tipo !== "transferencia" && (
        <div>
          <label className={rotulo}>Categoria</label>
          <select className={campo} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Selecione…</option>
            {categoriasFiltradas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <label className="nova-account-filter">
        <span>Só minhas contas</span>
        <input type="checkbox" checked={somenteMinhas} onChange={(e) => {
          const ativado = e.target.checked;
          setSomenteMinhas(ativado);
          if (ativado) {
            const permitida = (id: string) => contas.some(c => c.id === id && (c.tipo === "dinheiro" || c.user_id === userId));
            const bancoPermitido = (id: string) => id === "dinheiro" || bancos.some(b => b.id === id && b.user_id === userId);
            if (!permitida(formaPagtoId)) setFormaPagtoId("");
            if (!permitida(faturaDestinoId)) setFaturaDestinoId("");
            if (!bancoPermitido(bancoOrigemId)) setBancoOrigemId("");
            if (!bancoPermitido(bancoDestinoId)) setBancoDestinoId("");
          }
        }} />
        <span className="nova-account-switch" aria-hidden="true" />
      </label>
      {tipo === "despesa" && (
        <SeletorContaPagamento rotulo="Forma de pagamento" valor={formaPagtoId} onSelecionar={setFormaPagtoId} contas={contasPagamento} bancos={bancosVisiveis} mapPerfis={mapPerfis} />
      )}

      {tipo === "receita" && (
        <SeletorBanco rotulo="Onde o dinheiro caiu" valor={bancoOrigemId} onSelecionar={setBancoOrigemId} bancos={bancosVisiveis} mapPerfis={mapPerfis} />
      )}

      {tipo === "transferencia" && (
        <>
          <SeletorContaPagamento rotulo="De onde saiu" valor={formaPagtoId} onSelecionar={setFormaPagtoId} contas={contasPagamento} bancos={bancosVisiveis} mapPerfis={mapPerfis} />

          <SegmentedControl
            valor={isPagamentoFatura ? "fatura" : "banco"}
            aoMudar={(v) => setIsPagamentoFatura(v === "fatura")}
            opcoes={[
              { valor: "banco", rotulo: "Para um banco" },
              { valor: "fatura", rotulo: "Pagar fatura" },
            ]}
          />

          {isPagamentoFatura ? (
            <SeletorContaPagamento rotulo="Fatura do cartão" valor={faturaDestinoId} onSelecionar={setFaturaDestinoId} contas={contasCartao} bancos={bancosVisiveis} mapPerfis={mapPerfis} />
          ) : (
            <SeletorBanco rotulo="Para onde vai" valor={bancoDestinoId} onSelecionar={setBancoDestinoId} bancos={bancosVisiveis} mapPerfis={mapPerfis} />
          )}
        </>
      )}


      {podeParcelar && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={rotulo}>Parcelas</label>
            <input
              type="number"
              min={1}
              max={48}
              className={campo}
              value={parcelas}
              onChange={(e) => setParcelas(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          {parcelas > 1 && (
            <div>
              <label className={rotulo}>Ajuste de centavos</label>
              <select className={campo} value={modoParcelamento} onChange={(e) => setModoParcelamento(e.target.value as ModoParcelamento)}>
                <option value="ultima">Na última parcela</option>
                <option value="primeira">Na primeira parcela</option>
                <option value="manual">Definir manualmente</option>
              </select>
            </div>
          )}
        </div>
      )}

      {previewParcelas && <p className="text-[13px] text-[var(--nova-ink-faint)] -mt-2">{previewParcelas}</p>}

      {podeParcelar && parcelas > 1 && modoParcelamento === "manual" && (
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {valoresParcelasManual.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[13px] text-[var(--nova-ink-faint)] w-16 shrink-0">{i + 1}/{parcelas}</span>
              <input
                className={campo}
                value={v}
                onChange={(e) => {
                  const novo = [...valoresParcelasManual];
                  novo[i] = e.target.value;
                  setValoresParcelasManual(novo);
                }}
                inputMode="decimal"
              />
            </div>
          ))}
        </div>
      )}

      {sugestoesContasFixas.length > 0 && (
        <div className="rounded-[var(--nova-radius-md)] border border-[var(--nova-accent)]/30 bg-[var(--nova-accent)]/[0.08] p-3.5 space-y-2">
          <p className="text-[13px] font-semibold text-[var(--nova-ink)]">Isso é o pagamento de uma conta fixa?</p>
          {sugestoesContasFixas.map((f) => {
            const vinculada = vinculoContaFixa?.contaFixaId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setVinculoContaFixa(vinculada ? null : { contaFixaId: f.id, ocorrenciaId: f.ocorrencia?.id ?? null })}
                className={`w-full flex items-center justify-between rounded-[var(--nova-radius-sm)] px-3 py-2 text-[14px] ${
                  vinculada ? "bg-[var(--nova-accent)] text-white" : "bg-[var(--nova-bg-elevated)] text-[var(--nova-ink)]"
                }`}
              >
                <span>{f.nome}</span>
                <span className="text-[12px] opacity-80">{vinculada ? "Vinculado ✓" : "Vincular"}</span>
              </button>
            );
          })}
        </div>
      )}

      {erro && <p className="text-[13px] font-medium text-[var(--nova-danger)]">{erro}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="button" variante="secondary" className="flex-1" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}


