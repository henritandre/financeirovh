"use client";

import type { ReactNode } from "react";

export function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-2.5 px-1">
        <h2 className="text-[15px] font-semibold tracking-tight text-[var(--nova-ink)]">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}
