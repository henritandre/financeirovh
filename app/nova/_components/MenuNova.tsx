"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { estaAtivo, ICONE_SAIR, itensNavegacao, type ItemNavegacao } from "../../_navegacao/itens";

/** Menu de navegação da UI Nova: as mesmas páginas da Clássica, com ícones. */
export function MenuNova() {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const id = useId();
  const { principais, conta } = itensNavegacao(true);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto]);

  const sair = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const item = (it: ItemNavegacao) => {
    const ativo = estaAtivo(pathname, it.href);
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={() => setAberto(false)}
        aria-current={ativo ? "page" : undefined}
        className={`nova-menu-item${ativo ? " nova-menu-item-ativo" : ""}`}
      >
        {it.icone}
        {it.rotulo}
      </Link>
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label="Menu"
        aria-expanded={aberto}
        aria-controls={id}
        className="h-9 w-9 rounded-full flex items-center justify-center bg-[var(--nova-ink-hairline)] text-[var(--nova-ink)] hover:brightness-95"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <nav id={id} aria-label="Menu principal" className="nova-menu">
            {principais.map(item)}
            <div className="nova-menu-divisor" />
            {conta.map(item)}
            <button type="button" onClick={sair} className="nova-menu-item nova-menu-sair">
              {ICONE_SAIR}
              Sair
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
