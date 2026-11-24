"use client";

import { useMemo, useRef, useState } from "react";
import { useTheme } from "../../ThemeContext";
import { useSessao } from "../../../lib/hooks/useSessao";
import { usePerfis } from "../../../lib/hooks/usePerfis";
import { useContasEBancos } from "../../../lib/hooks/useContasEBancos";
import {
  apagarBanco, apagarForma, contarMovimentacoesForma, contarVinculosBanco, definirAtivoBanco, definirAtivoForma,
  ordenarBancos, podeEditarForma, ROTULO_TIPO_CONTA, type OrdemBancos, salvarBanco, salvarForma, type DadosBanco, type DadosForma, type TipoContaBancaria, type TipoForma,
} from "../../../lib/contasBancarias";
import { Cabecalho } from "../_components/Cabecalho";
import { Secao } from "../_components/Secao";
import { Surface } from "../_ui/Surface";
import { Button } from "../_ui/Button";
import { SegmentedControl } from "../_ui/SegmentedControl";
import { Sheet } from "../_ui/Sheet";
import { Toast, useNovaToast } from "../_ui/Toast";
import { CartaoBanco, DetalheSomenteLeitura, FormularioBanco, FormularioForma, LinhaForma, descricaoForma } from "../_components/GestaoBancaria";

type Overlay =
  | { tipo: "banco"; banco: any | null }
  | { tipo: "forma"; forma: any | null; bancoInicial?: string; tipoInicial?: TipoForma }
  | { tipo: "verBanco"; banco: any }
  | { tipo: "verForma"; forma: any }
  | null;

async function copiarTexto(texto: string) {
  try { await navigator.clipboard.writeText(texto); return true; } catch { return false; }
}

/** Gestão bancária na UI Nova: bancos e, dentro de cada um, seus cartões e chaves PIX. */
export default function NovaContasPage() {
  const { isDarkMode, toggleTheme } = useTheme();
  const { island, mostrar } = useNovaToast();
  const sessao = useSessao();
  const mapPerfis = usePerfis();
  const { contas, bancos, carregando: carregandoDados, recarregar } = useContasEBancos();

  const [filtro, setFiltro] = useState<"todos" | "meus">("todos");
  const [ordem, setOrdem] = useState<OrdemBancos>("usuario");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [usos, setUsos] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const carregando = sessao.carregando || carregandoDados;
  const eu = sessao.userId;
  const meu = (x: any) => filtro === "todos" || x.user_id === eu;

  const grupos = useMemo(() => {
    const formasDe = (bancoId: string, ativas: boolean) => contas.filter((c) => c.conta_bancaria_id === bancoId && c.tipo !== "dinheiro" && (c.ativo !== false) === ativas).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    const qtd = (b: any) => formasDe(b.id, true).length;
    const ativos = ordenarBancos(bancos.filter((b) => b.ativo !== false), ordem, qtd);
    const inativos = ordenarBancos(bancos.filter((b) => b.ativo === false), ordem, qtd);
    const idsBancos = new Set(bancos.map((b) => b.id));
    return {
      ativos,
      inativos,
      formasDe,
      dinheiro: contas.filter((c) => c.tipo === "dinheiro" && c.ativo !== false),
      dinheiroInativo: contas.filter((c) => c.tipo === "dinheiro" && c.ativo === false),
      semBanco: contas.filter((c) => c.tipo !== "dinheiro" && c.ativo !== false && (!c.conta_bancaria_id || !idsBancos.has(c.conta_bancaria_id))),
    };
  }, [bancos, contas, ordem]);

  const qtdInativos = grupos.inativos.filter(meu).length
    + grupos.ativos.reduce((a, b) => a + grupos.formasDe(b.id, false).filter(meu).length, 0)
    + grupos.dinheiroInativo.length;

  // Só vale a contagem de uso do item que ainda está aberto.
  const alvoAtual = useRef<string | null>(null);
  const fechar = () => { alvoAtual.current = null; setOverlay(null); setUsos(null); };
  const contarUso = async (id: string, contar: (id: string) => Promise<number>) => {
    alvoAtual.current = id;
    // Se a contagem falhar, trata como "em uso": nunca apaga por engano.
    const n = await contar(id).catch(() => 1);
    if (alvoAtual.current === id) setUsos(n);
  };

  const abrirBanco = async (banco: any | null) => {
    if (banco && banco.user_id !== eu) { setOverlay({ tipo: "verBanco", banco }); return; }
    setUsos(null);
    setOverlay({ tipo: "banco", banco });
    if (banco) await contarUso(banco.id, contarVinculosBanco);
  };

  const abrirForma = async (forma: any | null, bancoInicial?: string) => {
    if (forma && !podeEditarForma(forma, eu)) { setOverlay({ tipo: "verForma", forma }); return; }
    setUsos(null);
    setOverlay({ tipo: "forma", forma, bancoInicial });
    if (forma) await contarUso(forma.id, contarMovimentacoesForma);
  };

  const executar = async (acao: () => Promise<void>, sucesso: string) => {
    setSalvando(true);
    try {
      await acao();
      mostrar(sucesso, "success");
      fechar();
      recarregar();
    } catch (e: any) {
      mostrar("Não foi possível salvar: " + (e?.message || "erro desconhecido"), "error");
    } finally {
      setSalvando(false);
    }
  };

  const copiarPix = async (chave: string) => {
    const ok = await copiarTexto(chave);
    mostrar(ok ? "Chave PIX copiada." : "Não consegui copiar. Toque e segure na chave.", ok ? "success" : "error");
  };

  const linhas = (formas: any[]) => formas.map((f) => <LinhaForma key={f.id} forma={f} aoAbrir={() => abrirForma(f)} aoCopiarPix={copiarPix} />);
  const bancosAtivosParaEscolha = grupos.ativos;

  return (
    <div className="min-h-screen">
      <Toast island={island} />
      <Cabecalho isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

      <main className="relative px-4 lg:px-8 pb-16 max-w-2xl lg:max-w-6xl mx-auto pt-5 lg:pt-7">
        <div className="nova-page-intro">
          <h1>Gestão bancária</h1>
          <div className="flex flex-wrap gap-2">
            <Button variante="secondary" tamanho="sm" onClick={() => abrirBanco(null)}>Novo banco</Button>
            <Button tamanho="sm" onClick={() => abrirForma(null)} disabled={grupos.ativos.length === 0}>Nova forma de pagamento</Button>
          </div>
        </div>

        {carregando ? (
          <div className="space-y-4"><div className="nova-skeleton h-32" /><div className="nova-skeleton h-32" /></div>
        ) : bancos.length === 0 && contas.length === 0 ? (
          <Surface className="p-6 text-center">
            <p className="text-[16px] font-semibold text-[var(--nova-ink)]">Comece cadastrando um banco</p>
            <p className="text-[14px] text-[var(--nova-ink-soft)] mt-1">Depois você adiciona os cartões e chaves PIX dele.</p>
            <Button className="mt-4" onClick={() => abrirBanco(null)}>Cadastrar banco</Button>
          </Surface>
        ) : (
          <div className="space-y-7">
            <div className="max-w-xs space-y-2">
              <SegmentedControl opcoes={[{ valor: "todos", rotulo: "Todos" }, { valor: "meus", rotulo: "Só meus" }]} valor={filtro} aoMudar={(v) => setFiltro(v as "todos" | "meus")} />
              <div>
                <p className="text-[12px] font-medium text-[var(--nova-ink-faint)] mb-1 px-1">Ordenar por</p>
                <SegmentedControl opcoes={[{ valor: "usuario", rotulo: "Usuário" }, { valor: "banco", rotulo: "Banco" }]} valor={ordem} aoMudar={(v) => setOrdem(v as OrdemBancos)} />
              </div>
            </div>

            <Secao titulo="Bancos">
              {grupos.ativos.filter(meu).length === 0 ? (
                <Surface className="p-5"><p className="text-[14px] text-[var(--nova-ink-soft)]">{filtro === "meus" ? "Você ainda não cadastrou bancos." : "Nenhum banco ativo."}</p></Surface>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  {grupos.ativos.filter(meu).map((b) => {
                    const formas = grupos.formasDe(b.id, true).filter(meu);
                    const proprio = b.user_id === eu;
                    return (
                      <CartaoBanco key={b.id} banco={b} formas={formas} foto={mapPerfis[b.autor_nome]} podeEditar={proprio} aoEditar={() => abrirBanco(b)} aoAdicionar={proprio ? () => abrirForma(null, b.id) : undefined}>
                        {linhas(formas)}
                      </CartaoBanco>
                    );
                  })}
                </div>
              )}
            </Secao>

            <Secao titulo="Dinheiro físico" acao={<Button variante="ghost" tamanho="sm" onClick={() => setOverlay({ tipo: "forma", forma: null, tipoInicial: "dinheiro" })}>Adicionar</Button>}>
              <Surface className="p-3">
                {grupos.dinheiro.length === 0 ? <p className="text-[13px] text-[var(--nova-ink-faint)] px-1 py-2">Nenhuma carteira cadastrada.</p> : linhas(grupos.dinheiro)}
              </Surface>
            </Secao>

            {grupos.semBanco.filter(meu).length > 0 && (
              <Secao titulo="Sem banco">
                <Surface className="p-3">
                  <p className="text-[12px] text-[var(--nova-ink-faint)] px-1 pb-1">Estas formas de pagamento não estão ligadas a um banco. Abra e escolha um.</p>
                  {linhas(grupos.semBanco.filter(meu))}
                </Surface>
              </Secao>
            )}

            {qtdInativos > 0 && (
              <section>
                <button type="button" onClick={() => setMostrarInativos((v) => !v)} aria-expanded={mostrarInativos} className="min-h-[40px] px-1 text-[14px] font-semibold text-[var(--nova-ink-soft)]">
                  {mostrarInativos ? "Ocultar desativados" : `Ver desativados (${qtdInativos})`}
                </button>
                {mostrarInativos && (
                  <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start opacity-80">
                    {grupos.inativos.filter(meu).map((b) => (
                      <CartaoBanco key={b.id} banco={b} formas={grupos.formasDe(b.id, true).concat(grupos.formasDe(b.id, false)).filter(meu)} foto={mapPerfis[b.autor_nome]} podeEditar={b.user_id === eu} aoEditar={() => abrirBanco(b)}>
                        {linhas(grupos.formasDe(b.id, true).concat(grupos.formasDe(b.id, false)).filter(meu))}
                      </CartaoBanco>
                    ))}
                    {(() => {
                      const soltas = grupos.ativos.flatMap((b) => grupos.formasDe(b.id, false)).filter(meu).concat(grupos.dinheiroInativo);
                      return soltas.length > 0 && <Surface className="p-3"><p className="text-[13px] font-semibold text-[var(--nova-ink)] px-1 pb-1">Formas de pagamento desativadas</p>{linhas(soltas)}</Surface>;
                    })()}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      <Sheet aberto={overlay !== null} aoFechar={fechar} tituloAcessivel="Gestão bancária">
        {overlay?.tipo === "banco" && (
          <FormularioBanco
            key={overlay.banco?.id || "novo-banco"}
            banco={overlay.banco}
            vinculos={usos}
            salvando={salvando}
            aoCancelar={fechar}
            aoSalvar={(d: DadosBanco) => executar(() => salvarBanco(overlay.banco?.id || null, d, eu, sessao.username), overlay.banco ? "Banco atualizado." : "Banco cadastrado.")}
            aoApagar={() => executar(() => apagarBanco(overlay.banco.id), "Banco apagado.")}
            aoAlternarAtivo={() => executar(() => definirAtivoBanco(overlay.banco.id, overlay.banco.ativo === false), overlay.banco.ativo === false ? "Banco reativado." : "Banco desativado.")}
          />
        )}
        {overlay?.tipo === "forma" && (
          <FormularioForma
            key={overlay.forma?.id || `nova-${overlay.bancoInicial || overlay.tipoInicial || ""}`}
            forma={overlay.forma}
            bancoInicial={overlay.bancoInicial}
            tipoInicial={overlay.tipoInicial}
            bancos={bancosAtivosParaEscolha}
            movimentacoes={usos}
            salvando={salvando}
            aoCancelar={fechar}
            aoSalvar={(d: DadosForma) => executar(() => salvarForma(overlay.forma?.id || null, d, eu, sessao.username), overlay.forma ? "Forma de pagamento atualizada." : "Forma de pagamento cadastrada.")}
            aoApagar={() => executar(() => apagarForma(overlay.forma.id), "Forma de pagamento apagada.")}
            aoAlternarAtivo={() => executar(() => definirAtivoForma(overlay.forma.id, overlay.forma.ativo === false), overlay.forma.ativo === false ? "Forma de pagamento reativada." : "Forma de pagamento desativada.")}
          />
        )}
        {overlay?.tipo === "verBanco" && (
          <DetalheSomenteLeitura
            titulo={overlay.banco.banco}
            dono={overlay.banco.autor_nome}
            linhas={[["Nome", overlay.banco.nome], ["Tipo", ROTULO_TIPO_CONTA[overlay.banco.tipo_conta as TipoContaBancaria] || ""], ["Agência", overlay.banco.agencia || ""], ["Conta", overlay.banco.numero_conta || ""], ["Situação", overlay.banco.ativo === false ? "Desativado" : "Ativo"]]}
          />
        )}
        {overlay?.tipo === "verForma" && (
          <DetalheSomenteLeitura
            titulo={overlay.forma.nome}
            dono={overlay.forma.autor_nome}
            linhas={[["Tipo", descricaoForma(overlay.forma)], ["Banco", overlay.forma.banco_vinculado?.banco || ""], ["Chave PIX", overlay.forma.chave_pix || ""], ["Situação", overlay.forma.ativo === false ? "Desativada" : "Ativa"]]}
          />
        )}
      </Sheet>
    </div>
  );
}
