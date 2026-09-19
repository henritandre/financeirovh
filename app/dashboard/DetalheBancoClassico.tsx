"use client";
import { useEffect, useRef } from "react";
import { DetalheBanco } from "../nova/_components/DetalheBanco";

export function DetalheBancoClassico({ nome, contaIds, transacoes, mapPerfis, aoFechar }: {
  nome: string; contaIds: string[]; transacoes: any[]; mapPerfis: Record<string, string>; aoFechar: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { el?.close(); document.body.style.overflow = anterior; };
  }, []);
  return <dialog ref={dialog} className="classic-bank-dialog" aria-label={`Detalhes de ${nome}`} onCancel={aoFechar} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) aoFechar(); } }}>
    <button type="button" onClick={aoFechar} className="float-right rounded-lg px-3 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Fechar detalhes">✕</button>
    <DetalheBanco nome={nome} contaIds={contaIds} transacoes={transacoes} dias={30} qtdLancamentos={10} mapPerfis={mapPerfis} />
  </dialog>;
}
