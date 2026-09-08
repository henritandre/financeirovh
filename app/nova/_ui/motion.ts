"use client";

import { useEffect, useState, type RefObject } from "react";
import { criarMola, SPRING_GESTO } from "../../ui/spring";

/** Realce no pointer-down (não no clique) — mesmo padrão do protótipo original. */
export function usarPressao(ref: RefObject<HTMLElement | null>, ativo = true, escala = 0.96) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !ativo) return;
    const mola = criarMola(1, (v) => {
      el.style.transform = `scale(${v})`;
    });
    const down = () => mola.animarPara(escala, { damping: 1, response: 0.12 });
    const up = () => mola.animarPara(1, SPRING_GESTO);
    // Sem isso, clicar-e-segurar com um mínimo de arrasto inicia um drag nativo
    // (de uma imagem/texto interno) que rouba o pointerup e trava o card na
    // escala reduzida — a mola nunca ouve o "solta".
    const semDrag = (e: DragEvent) => e.preventDefault();
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("dragstart", semDrag);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerleave", up);
      el.removeEventListener("dragstart", semDrag);
      mola.parar();
      el.style.transform = "";
    };
  }, [ref, ativo, escala]);
}

/** No desktop a linguagem muda: ação principal na barra, diálogo centrado em vez de folha. */
export function usarDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const f = () => setDesktop(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return desktop;
}
