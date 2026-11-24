"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useUIVersion } from "../UIVersionContext";
import { estaAtivo, ICONE_SAIR, itensNavegacao, type ItemNavegacao } from "./itens";

/**
 * Menu de navegação da UI Clássica (abre pelo avatar). Substitui o bloco que
 * era repetido em cada página; a página atual fica destacada.
 */
export function MenuClassico({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { versao } = useUIVersion();
  if (!aberto) return null;

  const { principais, conta } = itensNavegacao(versao === "nova");
  const sair = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const item = (it: ItemNavegacao) => {
    const ativo = estaAtivo(pathname, it.href);
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={aoFechar}
        aria-current={ativo ? "page" : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${ativo
          ? "font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
          : "font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400"}`}
      >
        <span className="shrink-0 opacity-80">{it.icone}</span>
        {it.rotulo}
      </Link>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={aoFechar}></div>
      <nav aria-label="Menu principal" className="absolute right-0 top-full mt-3 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
        <div className="p-2 space-y-0.5">
          {principais.map(item)}
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2"></div>
          {conta.map(item)}
          <button type="button" onClick={sair} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
            <span className="shrink-0 opacity-80">{ICONE_SAIR}</span>
            Sair
          </button>
        </div>
      </nav>
    </>
  );
}
