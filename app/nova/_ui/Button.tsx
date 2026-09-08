"use client";

import { useRef, type ButtonHTMLAttributes } from "react";
import { usarPressao } from "./motion";

type Variante = "primary" | "secondary" | "ghost" | "destructive";

const ESTILOS: Record<Variante, string> = {
  primary: "bg-[var(--nova-accent)] text-white shadow-[0_2px_10px_-2px_rgba(10,132,255,0.5)]",
  secondary: "bg-[var(--nova-ink-hairline)] text-[var(--nova-ink)]",
  ghost: "bg-transparent text-[var(--nova-accent)]",
  destructive: "bg-[var(--nova-danger)] text-white",
};

export function Button({
  variante = "primary",
  tamanho = "md",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tamanho?: "sm" | "md" }) {
  const ref = useRef<HTMLButtonElement>(null);
  usarPressao(ref, !props.disabled);
  const altura = tamanho === "sm" ? "h-9 px-4 text-[14px]" : "h-11 px-5 text-[15px]";
  return (
    <button
      ref={ref}
      {...props}
      className={`${altura} rounded-[var(--nova-radius-pill)] font-semibold select-none disabled:opacity-40 disabled:pointer-events-none inline-flex items-center justify-center gap-1.5 ${ESTILOS[variante]} ${className}`}
      style={{ touchAction: "manipulation" }}
    >
      {children}
    </button>
  );
}

/** Botão redondo só com ícone (voltar, fechar, tema...). */
export function BotaoIcone({
  className = "",
  children,
  rotulo,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { rotulo: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  usarPressao(ref);
  return (
    <button
      ref={ref}
      aria-label={rotulo}
      {...props}
      className={`h-9 w-9 rounded-full flex items-center justify-center select-none bg-[var(--nova-ink-hairline)] text-[var(--nova-ink)] ${className}`}
      style={{ touchAction: "manipulation" }}
    >
      {children}
    </button>
  );
}
