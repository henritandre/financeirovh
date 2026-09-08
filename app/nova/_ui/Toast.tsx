"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

type TipoToast = "success" | "error" | "info";
interface EstadoIsland {
  show: boolean;
  isClosing: boolean;
  mensagem: string;
  tipo: TipoToast;
}

export function useNovaToast() {
  const [island, setIsland] = useState<EstadoIsland>({ show: false, isClosing: false, mensagem: "", tipo: "info" });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback((mensagem: string, tipo: TipoToast = "info") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsland({ show: true, isClosing: false, mensagem, tipo });
    timeoutRef.current = setTimeout(() => {
      setIsland((p) => ({ ...p, isClosing: true }));
      closeTimeoutRef.current = setTimeout(() => setIsland((p) => ({ ...p, show: false, isClosing: false })), 400);
    }, 3600);
  }, []);

  return { island, mostrar };
}

const CORES: Record<TipoToast, string> = {
  error: "border-[color-mix(in_srgb,var(--nova-danger)_35%,transparent)] text-[var(--nova-danger)]",
  success: "border-[color-mix(in_srgb,var(--nova-success)_35%,transparent)] text-[var(--nova-success)]",
  info: "border-[color-mix(in_srgb,var(--nova-accent)_35%,transparent)] text-[var(--nova-accent)]",
};

const ICONES: Record<TipoToast, ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
};

export function Toast({ island }: { island: EstadoIsland }) {
  if (!island.show) return null;
  return (
    <div className="fixed top-6 left-0 w-full z-[100] flex justify-center pointer-events-none">
      <div
        className={`pointer-events-auto px-5 py-3 rounded-full border flex items-center justify-center gap-2.5 w-auto min-w-[220px] max-w-[90%] bg-[var(--nova-glass-3)] ${CORES[island.tipo]}`}
        style={{
          backdropFilter: "var(--nova-blur-sheet)",
          WebkitBackdropFilter: "var(--nova-blur-sheet)",
          animation: island.isClosing ? "nova-toast-out 0.4s cubic-bezier(0.36,-0.24,0.86,1.3) forwards" : "nova-toast-in 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        <span aria-hidden className="shrink-0">
          {ICONES[island.tipo]}
        </span>
        <span className="text-[14px] font-semibold text-[var(--nova-ink)] whitespace-nowrap">{island.mensagem}</span>
      </div>
    </div>
  );
}
