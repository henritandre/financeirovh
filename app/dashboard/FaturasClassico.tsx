"use client";
import { useEffect, useRef } from "react";
import { PainelFaturas } from "../nova/_components/PainelFaturas";
import type { Fatura } from "../../lib/faturas";

/** Resumo e histórico de faturas na UI Clássica: o painel da UI Nova num <dialog>, como o DetalheBancoClassico. */
export function FaturasClassico({ nomeCartao, historico, competenciaInicial, qtdHistorico, mapPerfis, formatar, aoFechar }: {
  nomeCartao: string; historico: Fatura[]; competenciaInicial: string | null; qtdHistorico: number;
  mapPerfis: Record<string, string>; formatar: (v: number) => string; aoFechar: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { el?.close(); document.body.style.overflow = anterior; };
  }, []);
  return <dialog ref={dialog} className="classic-bank-dialog" aria-label={`Faturas de ${nomeCartao}`} onCancel={aoFechar} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) aoFechar(); } }}>
    <button type="button" onClick={aoFechar} className="float-right rounded-lg px-3 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Fechar faturas">✕</button>
    <PainelFaturas nomeCartao={nomeCartao} historico={historico} competenciaInicial={competenciaInicial} qtdHistorico={qtdHistorico} mapPerfis={mapPerfis} formatar={formatar} />
  </dialog>;
}
