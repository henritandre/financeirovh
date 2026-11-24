"use client";

import { useId, useState, type ReactNode } from "react";
import { Surface } from "../_ui/Surface";
import { Button } from "../_ui/Button";
import { SegmentedControl } from "../_ui/SegmentedControl";
import { identidadeBanco } from "../_lib/identidadeBanco";
import {
  ROTULO_CHAVE_PIX, ROTULO_TIPO_CONTA, tipoDaForma, validarForma,
  type DadosBanco, type DadosForma, type TipoChavePix, type TipoContaBancaria, type TipoForma,
} from "../../../lib/contasBancarias";

const campo = "w-full rounded-[var(--nova-radius-md)] border bg-[var(--nova-bg-elevated)] px-4 py-2.5 text-[15px] text-[var(--nova-ink)] outline-none focus:border-[var(--nova-accent)]";
const rotulo = "block text-[13px] font-semibold text-[var(--nova-ink)] mb-1.5";

function Campo({ id, label, ajuda, erro, opcional, children }: { id: string; label: string; ajuda?: string; erro?: string; opcional?: boolean; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={rotulo}>{label}{opcional && <span className="font-normal text-[var(--nova-ink-faint)]"> (opcional)</span>}</label>
      {children}
      {erro ? <p className="mt-1 text-[12px] font-medium text-[var(--nova-danger)]">{erro}</p> : ajuda && <p className="mt-1 text-[12px] text-[var(--nova-ink-faint)]">{ajuda}</p>}
    </div>
  );
}

const borda = (erro?: string) => (erro ? "border-[var(--nova-danger)]" : "border-[var(--nova-ink-hairline)]");

export function Avatar({ nome, foto, tamanho = 22 }: { nome: string; foto?: string; tamanho?: number }) {
  return (
    <span className="rounded-full overflow-hidden shrink-0 bg-[var(--nova-ink-hairline)] inline-flex items-center justify-center text-[10px] font-semibold text-[var(--nova-ink-soft)]" style={{ width: tamanho, height: tamanho }}>
      {foto ? <img src={foto} alt="" className="w-full h-full object-cover" draggable={false} /> : (nome || "?").charAt(0).toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Listagem                                                            */
/* ------------------------------------------------------------------ */

const ICONE: Record<TipoForma, ReactNode> = {
  debito: <path d="M2 10h20M6 15h4" />,
  credito: <><path d="M2 10h20" /><path d="M6 15h2M11 15h3" /></>,
  pix: <path d="M12 3 21 12 12 21 3 12z" />,
  dinheiro: <><circle cx="12" cy="12" r="3" /><path d="M6 12h.01M18 12h.01" /></>,
};

export function descricaoForma(c: any): string {
  const t = tipoDaForma(c);
  if (t === "pix") return `PIX ${ROTULO_CHAVE_PIX[c.tipo_chave_pix as TipoChavePix]?.toLowerCase() || ""}`.trim();
  if (t === "credito") return `Crédito, final ${c.ultimos_digitos} · fecha dia ${c.dia_fechamento}, vence dia ${c.dia_vencimento}`;
  if (t === "debito") return `Débito, final ${c.ultimos_digitos}`;
  return "Compartilhado entre vocês";
}

export function LinhaForma({ forma, aoAbrir, aoCopiarPix }: { forma: any; aoAbrir: () => void; aoCopiarPix: (chave: string) => void }) {
  const t = tipoDaForma(forma);
  return (
    <div className="flex items-center gap-1 border-t border-[var(--nova-ink-hairline)] first:border-t-0">
      <button type="button" onClick={aoAbrir} className="flex-1 min-w-0 flex items-center gap-3 py-2.5 px-1 text-left cursor-pointer rounded-lg hover:bg-[var(--nova-ink-hairline)]">
        <span className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-[var(--nova-ink-hairline)] text-[var(--nova-ink-soft)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {t !== "pix" && t !== "dinheiro" && <rect x="2" y="5" width="20" height="14" rx="2" />}
            {t === "dinheiro" && <rect x="2" y="6" width="20" height="12" rx="2" />}
            {ICONE[t]}
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium text-[var(--nova-ink)] truncate">{forma.nome}</span>
          <span className="block text-[12px] text-[var(--nova-ink-faint)] truncate">{descricaoForma(forma)}{t === "pix" && forma.chave_pix ? `: ${forma.chave_pix}` : ""}</span>
        </span>
      </button>
      {t === "pix" && forma.chave_pix && (
        <button type="button" onClick={() => aoCopiarPix(forma.chave_pix)} className="shrink-0 min-h-[36px] px-3 rounded-full text-[12px] font-semibold text-[var(--nova-accent)] hover:bg-[var(--nova-ink-hairline)]" aria-label={`Copiar chave PIX de ${forma.nome}`}>
          Copiar
        </button>
      )}
    </div>
  );
}

export function CartaoBanco({ banco, formas, foto, podeEditar, aoEditar, aoAdicionar, children }: {
  banco: any; formas: any[]; foto?: string; podeEditar: boolean; aoEditar: () => void; aoAdicionar?: () => void; children: ReactNode;
}) {
  const id = identidadeBanco(banco.banco || banco.nome);
  const dadosConta = [banco.agencia && `Ag. ${banco.agencia}`, banco.numero_conta && `Conta ${banco.numero_conta}`].filter(Boolean).join(" · ");
  return (
    <Surface as="article" className={`p-4 nova-bank-${id.chave}`}>
      <button type="button" onClick={aoEditar} className="w-full flex items-start gap-3 text-left cursor-pointer rounded-lg -m-1 p-1 hover:bg-[var(--nova-ink-hairline)]" aria-label={`${podeEditar ? "Editar" : "Ver"} ${banco.banco}`}>
        <span className="nova-bank-monogram" aria-hidden="true">{id.sigla}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold text-[var(--nova-ink)] truncate">{banco.banco}</span>
          <span className="block text-[12px] text-[var(--nova-ink-faint)] truncate">{banco.nome} · {ROTULO_TIPO_CONTA[banco.tipo_conta as TipoContaBancaria] || "Conta"}{dadosConta ? ` · ${dadosConta}` : ""}</span>
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--nova-ink-soft)] shrink-0"><Avatar nome={banco.autor_nome} foto={foto} />@{banco.autor_nome}</span>
      </button>
      <div className="mt-2">
        {formas.length === 0 && <p className="text-[13px] text-[var(--nova-ink-faint)] py-2 px-1">Nenhum cartão ou PIX neste banco.</p>}
        {children}
      </div>
      {aoAdicionar && (
        <button type="button" onClick={aoAdicionar} className="mt-1 w-full min-h-[40px] rounded-lg text-[13px] font-semibold text-[var(--nova-accent)] hover:bg-[var(--nova-ink-hairline)]">
          Adicionar cartão ou PIX
        </button>
      )}
    </Surface>
  );
}

/* ------------------------------------------------------------------ */
/* Ações de apagar / desativar, com confirmação no próprio painel       */
/* ------------------------------------------------------------------ */

function AcoesRemover({ usos, ativo, oQue, motivo, processando, aoApagar, aoAlternarAtivo }: {
  usos: number | null; ativo: boolean; oQue: string; motivo: string; processando: boolean; aoApagar: () => void; aoAlternarAtivo: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  if (usos === null) return <p className="text-[12px] text-[var(--nova-ink-faint)]">Verificando se {oQue} está em uso…</p>;
  if (usos > 0) {
    return (
      <div className="rounded-[var(--nova-radius-md)] bg-[var(--nova-ink-hairline)] p-3">
        <p className="text-[13px] text-[var(--nova-ink-soft)]">
          {ativo ? `Não dá para apagar: ${motivo}. Desativado, sai das listas de escolha e o histórico continua.` : "Está desativado e não aparece nas listas de escolha."}
        </p>
        <Button type="button" variante="secondary" tamanho="sm" className="mt-2" onClick={aoAlternarAtivo} disabled={processando}>{ativo ? "Desativar" : "Reativar"}</Button>
      </div>
    );
  }
  return confirmando ? (
    <div className="rounded-[var(--nova-radius-md)] bg-[var(--nova-danger-bg)] p-3">
      <p className="text-[13px] font-medium text-[var(--nova-danger)]">Apagar definitivamente? Não dá para desfazer.</p>
      <div className="flex gap-2 mt-2">
        <Button type="button" variante="destructive" tamanho="sm" onClick={aoApagar} disabled={processando}>Apagar</Button>
        <Button type="button" variante="secondary" tamanho="sm" onClick={() => setConfirmando(false)} disabled={processando}>Manter</Button>
      </div>
    </div>
  ) : (
    <button type="button" onClick={() => setConfirmando(true)} className="min-h-[36px] text-[13px] font-semibold text-[var(--nova-danger)]">Apagar {oQue}</button>
  );
}

/* ------------------------------------------------------------------ */
/* Formulário de banco                                                 */
/* ------------------------------------------------------------------ */

export function FormularioBanco({ banco, vinculos, salvando, aoSalvar, aoCancelar, aoApagar, aoAlternarAtivo }: {
  banco: any | null; vinculos: number | null; salvando: boolean;
  aoSalvar: (d: DadosBanco) => void; aoCancelar: () => void; aoApagar: () => void; aoAlternarAtivo: () => void;
}) {
  const uid = useId();
  const [d, setD] = useState<DadosBanco>({
    banco: banco?.banco || "", nome: banco?.nome || "", agencia: banco?.agencia || "", numeroConta: banco?.numero_conta || "",
    tipoConta: (banco?.tipo_conta as TipoContaBancaria) || "corrente",
  });
  const [tentou, setTentou] = useState(false);
  const erros = { banco: !d.banco.trim() ? "Informe o banco ou instituição." : undefined, nome: !d.nome.trim() ? "Dê um nome para reconhecer esta conta." : undefined };
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setTentou(true);
    if (erros.banco || erros.nome) return;
    aoSalvar(d);
  };
  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <h3 className="text-[22px] font-semibold text-[var(--nova-ink)] pr-10">{banco ? "Editar banco" : "Novo banco"}</h3>
      <Campo id={`${uid}-banco`} label="Banco ou instituição" erro={tentou ? erros.banco : undefined}>
        <input id={`${uid}-banco`} className={`${campo} ${borda(tentou ? erros.banco : undefined)}`} value={d.banco} onChange={(e) => setD({ ...d, banco: e.target.value })} placeholder="Nubank, Itaú, Inter…" autoComplete="off" />
      </Campo>
      <Campo id={`${uid}-nome`} label="Nome para exibir" ajuda="Como a conta aparece nas listas do app." erro={tentou ? erros.nome : undefined}>
        <input id={`${uid}-nome`} className={`${campo} ${borda(tentou ? erros.nome : undefined)}`} value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} placeholder="Conta principal" autoComplete="off" />
      </Campo>
      <div>
        <p className={rotulo}>Tipo de conta</p>
        <SegmentedControl opcoes={[{ valor: "corrente", rotulo: "Corrente" }, { valor: "salario", rotulo: "Salário" }, { valor: "poupanca", rotulo: "Poupança" }]} valor={d.tipoConta} aoMudar={(v) => setD({ ...d, tipoConta: v as TipoContaBancaria })} />
      </div>
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-2">
          <Campo id={`${uid}-ag`} label="Agência" opcional>
            <input id={`${uid}-ag`} className={`${campo} ${borda()}`} value={d.agencia} onChange={(e) => setD({ ...d, agencia: e.target.value })} inputMode="numeric" placeholder="0001" autoComplete="off" />
          </Campo>
        </div>
        <div className="col-span-3">
          <Campo id={`${uid}-cc`} label="Conta" opcional>
            <input id={`${uid}-cc`} className={`${campo} ${borda()}`} value={d.numeroConta} onChange={(e) => setD({ ...d, numeroConta: e.target.value })} placeholder="123456-7" autoComplete="off" />
          </Campo>
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <Button type="button" variante="secondary" className="flex-1" onClick={aoCancelar} disabled={salvando}>Cancelar</Button>
        <Button type="submit" className="flex-1" disabled={salvando}>{salvando ? "Salvando…" : banco ? "Salvar alterações" : "Cadastrar banco"}</Button>
      </div>
      {banco && (
        <div className="pt-2 border-t border-[var(--nova-ink-hairline)]">
          <AcoesRemover usos={vinculos} ativo={banco.ativo !== false} oQue="este banco" motivo="há cartões ou PIX ligados a ele" processando={salvando} aoApagar={aoApagar} aoAlternarAtivo={aoAlternarAtivo} />
        </div>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Formulário de forma de pagamento                                     */
/* ------------------------------------------------------------------ */

const ROTULO_TIPO_FORMA: Record<TipoForma, string> = { debito: "débito", pix: "PIX", credito: "crédito", dinheiro: "dinheiro" };

export function FormularioForma({ forma, bancos, bancoInicial, tipoInicial, movimentacoes, salvando, aoSalvar, aoCancelar, aoApagar, aoAlternarAtivo }: {
  forma: any | null; bancos: any[]; bancoInicial?: string; tipoInicial?: TipoForma; movimentacoes: number | null; salvando: boolean;
  aoSalvar: (d: DadosForma) => void; aoCancelar: () => void; aoApagar: () => void; aoAlternarAtivo: () => void;
}) {
  const uid = useId();
  const [d, setD] = useState<DadosForma>({
    tipo: forma ? tipoDaForma(forma) : tipoInicial || "credito",
    nome: forma?.nome || "",
    contaBancariaId: forma?.conta_bancaria_id || bancoInicial || "",
    ultimosDigitos: forma?.ultimos_digitos || "",
    tipoChavePix: (forma?.tipo_chave_pix as TipoChavePix) || "celular",
    chavePix: forma?.chave_pix || "",
    diaFechamento: forma?.dia_fechamento ? String(forma.dia_fechamento) : "",
    diaVencimento: forma?.dia_vencimento ? String(forma.dia_vencimento) : "",
  });
  const [nomeTocado, setNomeTocado] = useState(!!forma);
  const [tentou, setTentou] = useState(false);

  // Nome sugerido a partir do banco e do tipo, enquanto a pessoa não escreve o dela.
  const bancoEscolhido = bancos.find((b) => b.id === d.contaBancariaId);
  const sugestao = d.tipo === "dinheiro" ? "Carteira" : bancoEscolhido ? `${bancoEscolhido.banco} ${ROTULO_TIPO_FORMA[d.tipo]}` : "";
  const dados: DadosForma = { ...d, nome: nomeTocado ? d.nome : sugestao };
  const erros = tentou ? validarForma(dados) : {};

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setTentou(true);
    if (Object.keys(validarForma(dados)).length > 0) return;
    aoSalvar(dados);
  };
  const modoPix = d.tipoChavePix === "cpf" ? "numeric" : d.tipoChavePix === "celular" ? "tel" : d.tipoChavePix === "email" ? "email" : "text";

  // Bancos ativos, agrupados por dono. Se a forma está num banco desativado, ele continua na lista.
  const bancoAtualInativo = forma?.conta_bancaria_id && !bancos.some((b) => b.id === forma.conta_bancaria_id) && forma.banco_vinculado
    ? { ...forma.banco_vinculado, id: forma.conta_bancaria_id }
    : null;
  const donos = Array.from(new Set(bancos.map((b) => b.autor_nome)));

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <h3 className="text-[22px] font-semibold text-[var(--nova-ink)] pr-10">{forma ? "Editar forma de pagamento" : "Nova forma de pagamento"}</h3>
      <div>
        <p className={rotulo}>Tipo</p>
        <SegmentedControl opcoes={[{ valor: "credito", rotulo: "Crédito" }, { valor: "debito", rotulo: "Débito" }, { valor: "pix", rotulo: "PIX" }, { valor: "dinheiro", rotulo: "Dinheiro" }]} valor={d.tipo} aoMudar={(v) => setD({ ...d, tipo: v as TipoForma })} />
        {d.tipo === "dinheiro" && <p className="mt-1.5 text-[12px] text-[var(--nova-ink-faint)]">Dinheiro físico é compartilhado: os dois podem usar e editar.</p>}
      </div>

      {d.tipo !== "dinheiro" && (
        <Campo id={`${uid}-banco`} label="Banco" erro={erros.contaBancariaId}>
          <select id={`${uid}-banco`} className={`${campo} ${borda(erros.contaBancariaId)}`} value={d.contaBancariaId} onChange={(e) => setD({ ...d, contaBancariaId: e.target.value })}>
            <option value="">Escolha um banco</option>
            {bancoAtualInativo && <option value={bancoAtualInativo.id}>{bancoAtualInativo.banco} · {bancoAtualInativo.nome} (desativado)</option>}
            {donos.map((dono) => (
              <optgroup key={dono} label={`@${dono}`}>
                {bancos.filter((b) => b.autor_nome === dono).map((b) => <option key={b.id} value={b.id}>{b.banco} · {b.nome}</option>)}
              </optgroup>
            ))}
          </select>
          {bancos.length === 0 && <p className="mt-1 text-[12px] text-[var(--nova-ink-faint)]">Cadastre um banco primeiro.</p>}
        </Campo>
      )}

      {(d.tipo === "credito" || d.tipo === "debito") && (
        <Campo id={`${uid}-dig`} label="4 últimos números do cartão" erro={erros.ultimosDigitos}>
          <input id={`${uid}-dig`} className={`${campo} ${borda(erros.ultimosDigitos)} tabular-nums tracking-[0.2em]`} value={d.ultimosDigitos} onChange={(e) => setD({ ...d, ultimosDigitos: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" maxLength={4} placeholder="1234" autoComplete="off" />
        </Campo>
      )}

      {d.tipo === "credito" && (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Campo id={`${uid}-fech`} label="Fecha no dia" erro={erros.diaFechamento}>
              <input id={`${uid}-fech`} className={`${campo} ${borda(erros.diaFechamento)}`} value={d.diaFechamento} onChange={(e) => setD({ ...d, diaFechamento: e.target.value.replace(/\D/g, "").slice(0, 2) })} inputMode="numeric" placeholder="5" />
            </Campo>
            <Campo id={`${uid}-venc`} label="Vence no dia" erro={erros.diaVencimento}>
              <input id={`${uid}-venc`} className={`${campo} ${borda(erros.diaVencimento)}`} value={d.diaVencimento} onChange={(e) => setD({ ...d, diaVencimento: e.target.value.replace(/\D/g, "").slice(0, 2) })} inputMode="numeric" placeholder="12" />
            </Campo>
          </div>
          <p className="mt-1.5 text-[12px] text-[var(--nova-ink-faint)]">Compras feitas no dia do fechamento ou depois entram na fatura do mês seguinte.</p>
        </div>
      )}

      {d.tipo === "pix" && (
        <>
          <div>
            <p className={rotulo}>Tipo da chave</p>
            <SegmentedControl opcoes={(Object.keys(ROTULO_CHAVE_PIX) as TipoChavePix[]).map((k) => ({ valor: k, rotulo: k === "cpf" ? "CPF/CNPJ" : ROTULO_CHAVE_PIX[k] }))} valor={d.tipoChavePix || "celular"} aoMudar={(v) => setD({ ...d, tipoChavePix: v as TipoChavePix })} />
            {erros.tipoChavePix && <p className="mt-1 text-[12px] font-medium text-[var(--nova-danger)]">{erros.tipoChavePix}</p>}
          </div>
          <Campo id={`${uid}-pix`} label="Chave PIX" erro={erros.chavePix}>
            <input id={`${uid}-pix`} className={`${campo} ${borda(erros.chavePix)}`} value={d.chavePix} onChange={(e) => setD({ ...d, chavePix: e.target.value })} inputMode={modoPix} placeholder={d.tipoChavePix === "email" ? "nome@email.com" : d.tipoChavePix === "celular" ? "(11) 99999-0000" : ""} autoComplete="off" />
          </Campo>
        </>
      )}

      <Campo id={`${uid}-nome`} label="Nome para exibir" ajuda="Aparece na hora de escolher como pagar." erro={erros.nome}>
        <input id={`${uid}-nome`} className={`${campo} ${borda(erros.nome)}`} value={dados.nome} onChange={(e) => { setNomeTocado(true); setD({ ...d, nome: e.target.value }); }} placeholder={sugestao || "Nubank crédito"} autoComplete="off" />
      </Campo>

      <div className="flex gap-3 pt-1">
        <Button type="button" variante="secondary" className="flex-1" onClick={aoCancelar} disabled={salvando}>Cancelar</Button>
        <Button type="submit" className="flex-1" disabled={salvando}>{salvando ? "Salvando…" : forma ? "Salvar alterações" : "Cadastrar"}</Button>
      </div>

      {forma && (
        <div className="pt-2 border-t border-[var(--nova-ink-hairline)]">
          <AcoesRemover usos={movimentacoes} ativo={forma.ativo !== false} oQue="esta forma de pagamento" motivo="já tem lançamentos" processando={salvando} aoApagar={aoApagar} aoAlternarAtivo={aoAlternarAtivo} />
        </div>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Só leitura (cadastro da outra pessoa)                                */
/* ------------------------------------------------------------------ */

export function DetalheSomenteLeitura({ titulo, linhas, dono }: { titulo: string; linhas: [string, string][]; dono: string }) {
  return (
    <div>
      <h3 className="text-[22px] font-semibold text-[var(--nova-ink)] pr-10">{titulo}</h3>
      <div className="mt-4">
        {linhas.filter(([, v]) => v).map(([k, v], i) => (
          <div key={k} className={`flex items-center justify-between gap-3 py-2.5 ${i === 0 ? "" : "border-t border-[var(--nova-ink-hairline)]"}`}>
            <span className="text-[14px] text-[var(--nova-ink-faint)]">{k}</span>
            <span className="text-[14px] font-medium text-[var(--nova-ink)] text-right break-all">{v}</span>
          </div>
        ))}
      </div>
      <p className="mt-5 text-[13px] text-[var(--nova-ink-faint)]">Cadastrado por @{dono}. Só quem cadastrou pode editar.</p>
    </div>
  );
}
