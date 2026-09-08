"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";

type Elevacao = "card" | "sheet" | "flat";

const BLUR: Record<Elevacao, string | undefined> = {
  card: "var(--nova-blur-card)",
  sheet: "var(--nova-blur-sheet)",
  flat: undefined,
};

const CLASSE: Record<Elevacao, string> = {
  card: "bg-[var(--nova-glass-1)] border border-[var(--nova-glass-border)] shadow-[var(--nova-shadow-1)]",
  sheet: "bg-[var(--nova-glass-3)] border border-[var(--nova-glass-border)] shadow-[var(--nova-shadow-3)]",
  flat: "bg-transparent",
};

/** Superfície translúcida base ("vidro"). Uma peça de material, não decoração. */
export function Surface({
  children,
  as,
  elevacao = "card",
  className = "",
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  elevacao?: Elevacao;
  className?: string;
  style?: CSSProperties;
}) {
  const Tag = as ?? "div";
  const blur = BLUR[elevacao];
  return (
    <Tag
      className={`rounded-[var(--nova-radius-lg)] ${CLASSE[elevacao]} ${className}`}
      style={{ ...(blur ? { backdropFilter: blur, WebkitBackdropFilter: blur } : {}), ...style }}
    >
      {children}
    </Tag>
  );
}
