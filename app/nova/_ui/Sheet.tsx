"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  criarMola,
  criarRastreador,
  elastico,
  prefereMenosMovimento,
  projetar,
  SPRING_GESTO,
  SPRING_PADRAO,
} from "../../ui/spring";
import { usarDesktop } from "./motion";

/**
 * No celular sobe como folha e se arrasta para fechar (com arremesso);
 * no desktop materializa como diálogo centrado, porque é o gesto certo
 * para quem tem ponteiro. Generaliza o PainelArrastavel do protótipo.
 */
export function Sheet({
  aberto,
  aoFechar,
  children,
  tituloAcessivel,
  largura = "max-w-md",
}: {
  aberto: boolean;
  aoFechar: () => void;
  children: ReactNode;
  tituloAcessivel?: string;
  largura?: string;
}) {
  const desktop = usarDesktop();
  const [reduzido, setReduzido] = useState(false);
  const painel = useRef<HTMLDivElement>(null);
  const fundo = useRef<HTMLDivElement>(null);
  const mola = useRef<ReturnType<typeof criarMola> | null>(null);
  const rastro = useRef(criarRastreador());
  const arrastando = useRef(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setReduzido(prefereMenosMovimento());
  }, []);

  const altura = () => painel.current?.getBoundingClientRect().height || 400;
  const aplicar = (v: number) => {
    if (painel.current) {
      painel.current.style.transform = desktop ? `scale(${0.96 + 0.04 * (1 - v)})` : `translate3d(0, ${v}px, 0)`;
      if (desktop) painel.current.style.opacity = String(1 - v);
    }
    if (fundo.current) fundo.current.style.opacity = String(1 - Math.min(Math.max(desktop ? v : v / altura(), 0), 1));
  };
  const fechado = () => (desktop ? 1 : altura());

  useEffect(() => {
    if (aberto) setMontado(true);
  }, [aberto]);

  // Se a janela muda de PC para celular (ou o aparelho gira), a mola antiga
  // fica com o closure do modo errado — recriamos ao trocar.
  useEffect(() => {
    mola.current?.parar();
    mola.current = null;
  }, [desktop]);

  useEffect(() => {
    if (!montado || !painel.current) return;
    if (!mola.current) mola.current = criarMola(fechado(), aplicar);
    if (aberto) {
      mola.current.animarPara(0, reduzido ? { damping: 1, response: 0.01 } : desktop ? { damping: 1, response: 0.3 } : { damping: 0.8, response: 0.35 });
    } else {
      mola.current.animarPara(fechado(), reduzido ? { damping: 1, response: 0.01 } : { damping: 1, response: 0.25 });
      const t = setTimeout(() => setMontado(false), reduzido ? 60 : 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, montado, reduzido, desktop]);

  useEffect(() => {
    if (!montado) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [montado, aoFechar]);

  useEffect(() => {
    const el = painel.current;
    if (!el || !montado || desktop) return; // arrastar é gesto de toque
    let agarre = 0;
    const down = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest("[data-alca]")) return;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* segue sem captura */
      }
      arrastando.current = true;
      const atual = mola.current?.valor() ?? 0;
      mola.current?.definir(atual);
      agarre = e.clientY - atual;
      rastro.current.limpar();
      rastro.current.registrar(e.clientY);
    };
    const move = (e: PointerEvent) => {
      if (!arrastando.current) return;
      let y = e.clientY - agarre;
      if (y < 0) y = -elastico(-y, altura());
      mola.current?.definir(y);
      rastro.current.registrar(e.clientY);
    };
    const up = () => {
      if (!arrastando.current) return;
      arrastando.current = false;
      const v = rastro.current.velocidade();
      const y = mola.current?.valor() ?? 0;
      if (y + projetar(v) > altura() * 0.4) {
        mola.current?.animarPara(altura(), { ...SPRING_PADRAO, velocidade: v });
        aoFechar();
      } else mola.current?.animarPara(0, { ...SPRING_GESTO, velocidade: v });
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [montado, aoFechar, desktop]);

  if (!montado) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center ${desktop ? "items-center p-6" : "items-end"}`}
      style={{ pointerEvents: aberto ? "auto" : "none" }}
      role="dialog"
      aria-modal="true"
      aria-label={tituloAcessivel}
    >
      <div ref={fundo} onClick={aoFechar} className="absolute inset-0 bg-black/35" style={{ opacity: 0, backdropFilter: "blur(2px)" }} />
      <div
        ref={painel}
        className={`relative w-full bg-[var(--nova-glass-3)] border-[var(--nova-glass-border)] ${
          desktop ? `${largura} rounded-[var(--nova-radius-xl)] border max-h-[85vh] overflow-y-auto` : "sm:max-w-lg rounded-t-[var(--nova-radius-xl)] border-t max-h-[90vh] overflow-y-auto"
        }`}
        style={{
          transform: desktop ? "scale(0.96)" : "translate3d(0,100%,0)",
          opacity: desktop ? 0 : 1,
          willChange: "transform, opacity",
          touchAction: desktop ? "auto" : "none",
          backdropFilter: "var(--nova-blur-sheet)",
          WebkitBackdropFilter: "var(--nova-blur-sheet)",
          boxShadow: desktop ? "var(--nova-shadow-3)" : "var(--nova-shadow-2)",
        }}
      >
        {desktop ? (
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="absolute right-4 top-4 h-8 w-8 rounded-full flex items-center justify-center bg-[var(--nova-ink-hairline)] text-[var(--nova-ink-soft)] hover:brightness-95 z-10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <div data-alca className="pt-3 pb-2 cursor-grab active:cursor-grabbing sticky top-0 bg-inherit z-10">
            <div className="mx-auto w-10 h-1.5 rounded-full bg-[var(--nova-ink-hairline)]" />
          </div>
        )}
        <div className={`px-6 ${desktop ? "pt-6 pb-7" : "pb-10 pt-2"}`}>{children}</div>
      </div>
    </div>
  );
}
