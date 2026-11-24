"use client";

import { useEffect } from "react";

/**
 * Easter egg de "Banco Master" no cadastro de banco: barras de cela descem sobre
 * o modal, um giroflex gira no meio e toca uma sirene. Some sozinho (ou ao tocar).
 * Tudo local: o som é gerado pela Web Audio API, sem arquivo nem serviço externo.
 */

const DURACAO_MS = 4200;

/** Sirene "uí-ú": duas notas alternando, com filtro para não ficar estridente. */
export function tocarSirene(duracaoS = 3.2) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const filtro = ctx.createBiquadFilter();
    const volume = ctx.createGain();
    osc.type = "sawtooth";
    filtro.type = "lowpass";
    filtro.frequency.value = 1800;
    const t0 = ctx.currentTime;
    // Entra e sai suave, volume moderado.
    volume.gain.setValueAtTime(0, t0);
    volume.gain.linearRampToValueAtTime(0.07, t0 + 0.08);
    volume.gain.setValueAtTime(0.07, t0 + duracaoS - 0.3);
    volume.gain.linearRampToValueAtTime(0, t0 + duracaoS);
    const meioCiclo = 0.38;
    for (let t = 0, alto = true; t < duracaoS; t += meioCiclo, alto = !alto) {
      osc.frequency.setValueAtTime(alto ? 960 : 700, t0 + t);
    }
    osc.connect(filtro).connect(volume).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duracaoS + 0.05);
    osc.onended = () => ctx.close();
  } catch {
    /* sem áudio, segue só a animação */
  }
}

/**
 * Som da cela: um áudio próprio em public/sons/alo-policia-federal.mp3, se existir
 * (o dono do projeto coloca o arquivo); sem ele, a sirene sintetizada.
 */
export function tocarSomMaster() {
  try {
    const audio = new Audio("/sons/alo-policia-federal.mp3");
    audio.volume = 0.8;
    audio.play().catch(() => tocarSirene());
  } catch {
    tocarSirene();
  }
}

export function EasterEggMaster({ aoTerminar }: { aoTerminar: () => void }) {
  useEffect(() => {
    const t = setTimeout(aoTerminar, DURACAO_MS);
    return () => clearTimeout(t);
  }, [aoTerminar]);

  return (
    <div
      className="nova-cela"
      role="button"
      tabIndex={0}
      aria-label="Fechar"
      onClick={aoTerminar}
      onKeyDown={(e) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); aoTerminar(); } }}
    >
      <div className="nova-cela-barras" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 35}ms` }} />)}
        <i className="nova-cela-trave nova-cela-trave-alta" />
        <i className="nova-cela-trave nova-cela-trave-baixa" />
      </div>
      <div className="nova-giroflex" aria-hidden="true">
        <span className="nova-giroflex-luz" />
        <span className="nova-giroflex-base" />
      </div>
    </div>
  );
}
