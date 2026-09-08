"use client";

import { Button } from "../_ui/Button";
import { brl, dataBR } from "../_lib/formatar";

export function DetalheLancamento({
  transacao,
  podeEditar,
  onEditar,
  onExcluir,
}: {
  transacao: any;
  podeEditar: boolean;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const receita = transacao.tipo === "receita";
  const transf = transacao.tipo === "transferencia";

  const linhas: [string, string][] = [
    ["Data", dataBR(transacao.data)],
    ["Conta", transacao.conta_origem?.nome || "—"],
  ];
  if (transf) linhas.push(["Para", transacao.conta_destino?.nome || "—"]);
  linhas.push(["Autor", transacao.autor_nome || "—"]);

  return (
    <div>
      <p className="text-[13px] font-medium text-[var(--nova-ink-faint)]">{transacao.categorias?.nome || (transf ? "Transferência" : "Lançamento")}</p>
      <h3 className="text-[22px] font-semibold text-[var(--nova-ink)] mt-0.5" style={{ letterSpacing: "-0.02em" }}>
        {transacao.descricao}
      </h3>
      <p className={`mt-3 text-[34px] font-semibold ${receita ? "text-[var(--nova-success)]" : "text-[var(--nova-ink)]"}`} style={{ letterSpacing: "-0.02em" }}>
        {receita ? "+" : "−"}
        {brl(Number(transacao.valor))}
      </p>
      <div className="mt-5">
        {linhas.map(([k, v], i) => (
          <div key={k} className={`flex items-center justify-between py-2.5 ${i === 0 ? "" : "border-t border-[var(--nova-ink-hairline)]"}`}>
            <span className="text-[15px] text-[var(--nova-ink-faint)]">{k}</span>
            <span className="text-[15px] font-medium text-[var(--nova-ink)]">{v}</span>
          </div>
        ))}
      </div>
      {podeEditar ? (
        <div className="mt-6 flex gap-3">
          <Button variante="secondary" className="flex-1" onClick={onEditar}>
            Editar
          </Button>
          <Button variante="destructive" className="flex-1" onClick={onExcluir}>
            Excluir
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-[13px] text-[var(--nova-ink-faint)]">Apenas o autor pode editar este lançamento.</p>
      )}
    </div>
  );
}
