"use client";

import { useState } from "react";
import { Button } from "../_ui/Button";

const campo =
  "w-full rounded-[var(--nova-radius-md)] border border-[var(--nova-ink-hairline)] bg-[var(--nova-bg-elevated)] px-4 py-2.5 text-[15px] text-[var(--nova-ink)] outline-none focus:border-[var(--nova-accent)]";

export function ModalAuditoria({
  acao,
  motivosFrequentes,
  onConfirmar,
  onCancelar,
  processando,
}: {
  acao: "editar" | "excluir";
  motivosFrequentes: string[];
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
  processando: boolean;
}) {
  const [motivo, setMotivo] = useState("");
  const [palavra, setPalavra] = useState("");

  const podeConfirmar = motivo.trim().length > 0 && (acao === "editar" || palavra.trim().toLowerCase() === "excluir");

  return (
    <div className="space-y-4">
      <h3 className="text-[20px] font-semibold text-[var(--nova-ink)]" style={{ letterSpacing: "-0.02em" }}>
        {acao === "editar" ? "Por que essa alteração?" : "Excluir lançamento"}
      </h3>
      <p className="text-[13px] text-[var(--nova-ink-faint)]">
        {acao === "editar" ? "Fica registrado no histórico de auditoria, para o casal saber o que mudou." : "Essa ação não pode ser desfeita. Fica registrada no histórico de auditoria."}
      </p>

      {motivosFrequentes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {motivosFrequentes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMotivo(m)}
              className="px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--nova-ink-hairline)] text-[var(--nova-ink)]"
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <textarea className={`${campo} min-h-20 resize-none`} placeholder="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />

      {acao === "excluir" && (
        <div>
          <label className="block text-[12px] font-semibold text-[var(--nova-ink-faint)] uppercase tracking-wide mb-1.5">
            Digite &quot;excluir&quot; para confirmar
          </label>
          <input className={campo} value={palavra} onChange={(e) => setPalavra(e.target.value)} />
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variante="secondary" className="flex-1" onClick={onCancelar} disabled={processando}>
          Cancelar
        </Button>
        <Button
          type="button"
          variante={acao === "excluir" ? "destructive" : "primary"}
          className="flex-1"
          disabled={!podeConfirmar || processando}
          onClick={() => onConfirmar(motivo.trim())}
        >
          {processando ? "Processando…" : acao === "excluir" ? "Excluir" : "Confirmar"}
        </Button>
      </div>
    </div>
  );
}
