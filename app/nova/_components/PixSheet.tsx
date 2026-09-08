"use client";

import { useState } from "react";

const LABEL_TIPO_PIX: Record<string, string> = { cpf: "CPF/CNPJ", celular: "Celular", email: "E-mail", aleatoria: "Aleatória" };

async function copiarTexto(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function PixSheet({ contas, onCopiado }: { contas: any[]; onCopiado: (ok: boolean) => void }) {
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const chaves = [...contas]
    .filter((c) => c.subtipo === "pix" && c.chave_pix && c.ativo !== false)
    .sort((a, b) => {
      const autorA = a.autor_nome || "";
      const autorB = b.autor_nome || "";
      if (autorA !== autorB) return autorA.localeCompare(autorB, "pt-BR");
      const bancoA = a.banco_vinculado?.banco || a.nome || "";
      const bancoB = b.banco_vinculado?.banco || b.nome || "";
      return bancoA.localeCompare(bancoB, "pt-BR");
    });

  const handleCopiar = async (c: any) => {
    const ok = await copiarTexto(c.chave_pix);
    if (ok) {
      setCopiadoId(c.id);
      setTimeout(() => setCopiadoId((id) => (id === c.id ? null : id)), 2000);
    }
    onCopiado(ok);
  };

  return (
    <div>
      <h3 className="text-[22px] font-semibold text-[var(--nova-ink)] mb-4" style={{ letterSpacing: "-0.02em" }}>
        Chaves PIX
      </h3>
      {chaves.length === 0 ? (
        <p className="text-[14px] text-[var(--nova-ink-faint)]">Nenhuma chave PIX cadastrada ainda.</p>
      ) : (
        <div className="space-y-2">
          {chaves.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCopiar(c)}
              className="w-full flex items-center justify-between gap-3 rounded-[var(--nova-radius-md)] border border-[var(--nova-ink-hairline)] px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[var(--nova-ink)] truncate">{c.banco_vinculado?.banco || c.nome}</p>
                <p className="text-[13px] text-[var(--nova-ink-faint)] truncate">
                  {LABEL_TIPO_PIX[c.tipo_pix] || "PIX"} · {c.chave_pix} {c.autor_nome ? `· @${c.autor_nome}` : ""}
                </p>
              </div>
              <span className="text-[13px] font-semibold text-[var(--nova-accent)] shrink-0">{copiadoId === c.id ? "Copiado!" : "Copiar"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
