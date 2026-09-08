"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../ThemeContext";
import { useUIVersion } from "../../UIVersionContext";
import { useSessao } from "../../../lib/hooks/useSessao";
import { usePerfis } from "../../../lib/hooks/usePerfis";
import { useContasEBancos } from "../../../lib/hooks/useContasEBancos";
import { useTransacoes } from "../../../lib/hooks/useTransacoes";
import { useCategorias } from "../../../lib/hooks/useCategorias";
import { useSaldos } from "../../../lib/hooks/useSaldos";
import { useResumoPeriodo } from "../../../lib/hooks/useResumoPeriodo";
import { useFaturasCartao } from "../../../lib/hooks/useFaturasCartao";
import { buscarParametros } from "../../../lib/hooks/useParametros";
import { criarLancamento, editarLancamento, excluirLancamento, buscarMotivosFrequentes } from "../../../lib/hooks/useLancamentos";
import { usarPressao } from "../_ui/motion";
import { Sheet } from "../_ui/Sheet";
import { useNovaToast, Toast } from "../_ui/Toast";
import { Cabecalho } from "../_components/Cabecalho";
import { SaldoHero } from "../_components/SaldoHero";
import { Bancos } from "../_components/Bancos";
import { Cartoes } from "../_components/Cartoes";
import { ResumoPeriodo } from "../_components/ResumoPeriodo";
import { Extrato } from "../_components/Extrato";
import { DetalheLancamento } from "../_components/DetalheLancamento";
import { FormularioLancamento, type DadosFormulario } from "../_components/FormularioLancamento";
import { ModalAuditoria } from "../_components/ModalAuditoria";
import { PixSheet } from "../_components/PixSheet";
import { DetalheBanco } from "../_components/DetalheBanco";

type Overlay =
  | { tipo: "novo" }
  | { tipo: "detalhe"; transacao: any }
  | { tipo: "editar"; transacao: any }
  | { tipo: "confirmarEdicao"; transacao: any; dados: DadosFormulario }
  | { tipo: "confirmarExclusao"; transacao: any }
  | { tipo: "pix" }
  | { tipo: "detalheBanco"; nome: string; contaIds: string[] }
  | null;

export default function NovaDashboardPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const { definirVersao } = useUIVersion();
  const { island, mostrar } = useNovaToast();

  const sessao = useSessao();
  const mapPerfis = usePerfis();
  const { contas, bancos, carregando: carregandoContas, recarregar: recarregarContas } = useContasEBancos();
  const { transacoes, carregando: carregandoTransacoes, recarregar: recarregarTransacoes } = useTransacoes();
  const { categorias } = useCategorias();
  const { saldosBancarios, saldoDinheiro, saldoTotal } = useSaldos(contas, transacoes, bancos);
  const { resumo, doPeriodo } = useResumoPeriodo(transacoes);
  const { cartoes, totalCartoes } = useFaturasCartao(contas, transacoes);
  const extrato = doPeriodo.slice(0, 12);

  const [qtdFaturasVisiveis, setQtdFaturasVisiveis] = useState(3);
  const [bancoEvolucaoDias, setBancoEvolucaoDias] = useState(30);
  const [bancoLancamentosQtd, setBancoLancamentosQtd] = useState(5);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [salvando, setSalvando] = useState(false);
  const [motivosFrequentes, setMotivosFrequentes] = useState<string[]>([]);

  useEffect(() => {
    if (!sessao.userId) return;
    buscarParametros(sessao.userId, ["qtd_faturas_visiveis", "banco_evolucao_dias", "banco_lancamentos_qtd"])
      .then((p) => {
        if (p.qtd_faturas_visiveis) setQtdFaturasVisiveis(Number(p.qtd_faturas_visiveis));
        if (p.banco_evolucao_dias) setBancoEvolucaoDias(Number(p.banco_evolucao_dias));
        if (p.banco_lancamentos_qtd) setBancoLancamentosQtd(Number(p.banco_lancamentos_qtd));
      })
      .catch(() => {});
  }, [sessao.userId]);

  const carregando = sessao.carregando || carregandoContas || carregandoTransacoes;

  const fecharOverlay = () => setOverlay(null);
  const abrirDetalhe = (t: any) => setOverlay({ tipo: "detalhe", transacao: t });

  const abrirDetalheBanco = (id: string, nome: string) => {
    const contaIds =
      id === "dinheiro"
        ? contas.filter((c) => c.tipo === "dinheiro").map((c) => c.id)
        : contas.filter((c) => c.conta_bancaria_id === id && c.tipo === "corrente").map((c) => c.id);
    setOverlay({ tipo: "detalheBanco", nome, contaIds });
  };

  const abrirEditar = (t: any) => {
    if (t.user_id !== sessao.userId) {
      mostrar("Apenas o autor pode editar este lançamento.", "error");
      return;
    }
    setOverlay({ tipo: "editar", transacao: t });
  };

  const pedirExclusao = async (t: any) => {
    const motivos = await buscarMotivosFrequentes(sessao.userId, "transacoes_excluidas").catch(() => []);
    setMotivosFrequentes(motivos);
    setOverlay({ tipo: "confirmarExclusao", transacao: t });
  };

  const pedirMotivoEdicao = async (dados: DadosFormulario) => {
    if (overlay?.tipo !== "editar") return;
    const transacao = overlay.transacao;
    const motivos = await buscarMotivosFrequentes(sessao.userId, "transacoes_atualizadas").catch(() => []);
    setMotivosFrequentes(motivos);
    setOverlay({ tipo: "confirmarEdicao", transacao, dados });
  };

  const salvarNovo = async (dados: DadosFormulario) => {
    setSalvando(true);
    try {
      await criarLancamento({ ...dados, userId: sessao.userId, autorNome: sessao.username });
      mostrar(dados.parcelas > 1 ? `${dados.parcelas} parcelas salvas!` : "Lançamento salvo com sucesso!", "success");
      fecharOverlay();
      recarregarTransacoes();
      recarregarContas();
    } catch (e: any) {
      mostrar("Erro ao salvar: " + e.message, "error");
    } finally {
      setSalvando(false);
    }
  };

  const confirmarEdicao = async (motivo: string) => {
    if (overlay?.tipo !== "confirmarEdicao") return;
    setSalvando(true);
    try {
      await editarLancamento(
        overlay.transacao.id,
        overlay.transacao,
        { ...overlay.dados, userId: sessao.userId, autorNome: sessao.username },
        motivo,
        overlay.dados.ocorrenciaOriginalVinculada
      );
      mostrar("Atualizado com sucesso!", "success");
      fecharOverlay();
      recarregarTransacoes();
      recarregarContas();
    } catch (e: any) {
      mostrar("Erro ao atualizar: " + e.message, "error");
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async (motivo: string) => {
    if (overlay?.tipo !== "confirmarExclusao") return;
    setSalvando(true);
    try {
      await excluirLancamento(overlay.transacao, sessao.username, motivo);
      mostrar("Excluído com sucesso!", "success");
      fecharOverlay();
      recarregarTransacoes();
      recarregarContas();
    } catch (e: any) {
      mostrar("Erro ao excluir: " + e.message, "error");
    } finally {
      setSalvando(false);
    }
  };

  const voltarParaClassica = () => {
    definirVersao("classica");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen">
      <Toast island={island} />
      <Cabecalho isDarkMode={isDarkMode} toggleTheme={toggleTheme} onVoltarClassica={voltarParaClassica} onNovo={() => setOverlay({ tipo: "novo" })} onPix={() => setOverlay({ tipo: "pix" })} />

      <main className="relative px-4 lg:px-8 pb-32 lg:pb-16 max-w-2xl lg:max-w-6xl mx-auto pt-5 lg:pt-7">
        <div className="nova-page-intro">
          <div>
            <h1>Visão geral</h1>
          </div>
          <a href="/insights" className="nova-text-link">Explorar insights <span aria-hidden="true">↗</span></a>
        </div>
        {carregando ? (
          <div className="space-y-4">
            <div className="nova-skeleton h-32" />
            <div className="nova-skeleton h-24" />
            <div className="nova-skeleton h-24" />
          </div>
        ) : (
          <div className="nova-dashboard-grid grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-7 items-start">
            <div className="lg:col-span-3 space-y-7">
              <SaldoHero saldo={saldoTotal} receitas={resumo.receitas} despesas={resumo.despesas} />
              <Bancos bancos={saldosBancarios} dinheiro={saldoDinheiro} mapPerfis={mapPerfis} usuarioAtual={sessao.username} onAbrir={abrirDetalheBanco} />
              <Cartoes cartoes={cartoes} total={totalCartoes} qtdFaturasVisiveis={qtdFaturasVisiveis} mapPerfis={mapPerfis} />
            </div>
            <div className="lg:col-span-2 space-y-7 lg:sticky lg:top-20">
              <ResumoPeriodo resumo={resumo} />
              <Extrato itens={extrato} onAbrir={abrirDetalhe} mapPerfis={mapPerfis} />
            </div>
          </div>
        )}
      </main>

      <div className="lg:hidden">
        <BotaoFlutuante onClick={() => setOverlay({ tipo: "novo" })} />
      </div>

      <Sheet aberto={overlay !== null} aoFechar={fecharOverlay} tituloAcessivel="Lançamento">
        {overlay?.tipo === "novo" && (
          <FormularioLancamento userId={sessao.userId}
            key="novo"
            modo="novo"
            contas={contas}
            bancos={bancos}
            categorias={categorias}
            mapPerfis={mapPerfis}
            onCancelar={fecharOverlay}
            onSalvarNovo={salvarNovo}
            onPedirMotivoEdicao={() => {}}
            salvando={salvando}
          />
        )}
        {overlay?.tipo === "detalhe" && (
          <DetalheLancamento
            transacao={overlay.transacao}
            podeEditar={overlay.transacao.user_id === sessao.userId}
            onEditar={() => abrirEditar(overlay.transacao)}
            onExcluir={() => pedirExclusao(overlay.transacao)}
          />
        )}
        {overlay?.tipo === "editar" && (
          <FormularioLancamento userId={sessao.userId}
            key={overlay.transacao.id}
            modo="editar"
            transacaoBase={overlay.transacao}
            contas={contas}
            bancos={bancos}
            categorias={categorias}
            mapPerfis={mapPerfis}
            onCancelar={fecharOverlay}
            onSalvarNovo={() => {}}
            onPedirMotivoEdicao={pedirMotivoEdicao}
            salvando={salvando}
          />
        )}
        {overlay?.tipo === "confirmarEdicao" && (
          <ModalAuditoria acao="editar" motivosFrequentes={motivosFrequentes} onConfirmar={confirmarEdicao} onCancelar={fecharOverlay} processando={salvando} />
        )}
        {overlay?.tipo === "confirmarExclusao" && (
          <ModalAuditoria acao="excluir" motivosFrequentes={motivosFrequentes} onConfirmar={confirmarExclusao} onCancelar={fecharOverlay} processando={salvando} />
        )}
        {overlay?.tipo === "pix" && (
          <PixSheet contas={contas} onCopiado={(ok) => mostrar(ok ? "Chave PIX copiada!" : "Não consegui copiar — toque e segure na chave.", ok ? "success" : "error")} />
        )}
        {overlay?.tipo === "detalheBanco" && (
          <DetalheBanco nome={overlay.nome} contaIds={overlay.contaIds} transacoes={transacoes} dias={bancoEvolucaoDias} qtdLancamentos={bancoLancamentosQtd} mapPerfis={mapPerfis} />
        )}
      </Sheet>
    </div>
  );
}

function BotaoFlutuante({ onClick }: { onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  usarPressao(ref, true, 0.9);
  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-label="Novo lançamento"
      className="fixed bottom-6 right-5 z-40 h-14 w-14 rounded-full flex items-center justify-center text-white select-none bg-[var(--nova-accent)] shadow-[0_8px_24px_-6px_rgba(10,132,255,0.6)]"
      style={{ touchAction: "manipulation" }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}


