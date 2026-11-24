"use client";

import { useEffect } from "react";

/**
 * Easter egg de "Banco Master" no cadastro de banco: barras de cela descem sobre
 * o modal, um giroflex gira no meio e toca um som. O som é sorteado entre os
 * áudios listados em public/sons/lista.json (sem repetir o anterior) e toca 2 vezes;
 * a cela fica na tela o tempo exato das 2 execuções. Sem áudio, toca uma sirene
 * gerada pela Web Audio API. Tudo local, sem serviço externo.
 */

const SIRENE_S = 3.2;
const RESPIRO_MS = 300;
const SAIDA_MS = 400;

/** Sirene "uí-ú": duas notas alternando, com filtro para não ficar estridente. */
export function tocarSirene(duracaoS = SIRENE_S) {
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

// Lista de áudios, carregada uma vez quando o formulário abre: assim, na hora do
// easter egg o som começa ainda dentro do gesto de digitar (exigência do navegador).
let lista: string[] | null = null;
let ultimo: string | null = null;

export function precarregarSonsMaster() {
  if (lista) return;
  lista = [];
  fetch("/sons/lista.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((l) => { lista = Array.isArray(l) ? l.filter((x): x is string => typeof x === "string" && x.length > 0) : []; })
    .catch(() => { lista = []; });
}

/** Sorteia um áudio, evitando repetir o da vez anterior quando há mais de um. */
export function sortearSom(opcoes: string[], anterior: string | null, aleatorio = Math.random): string | null {
  if (opcoes.length === 0) return null;
  const candidatos = opcoes.length > 1 ? opcoes.filter((o) => o !== anterior) : opcoes;
  return candidatos[Math.floor(aleatorio() * candidatos.length)] ?? candidatos[0];
}

/**
 * Toca o som sorteado 2 vezes. `aoDuracao` recebe quanto tempo a cela deve ficar
 * (2× o áudio + respiro) assim que a duração é conhecida. Devolve uma função que para o som.
 */
export function tocarSomMaster(aoDuracao: (ms: number) => void): () => void {
  const arquivo = sortearSom(lista ?? [], ultimo);
  const usarSirene = () => { tocarSirene(); aoDuracao(SIRENE_S * 1000 + RESPIRO_MS); };
  if (!arquivo) { usarSirene(); return () => {}; }
  ultimo = arquivo;

  const audio = new Audio(`/sons/${encodeURIComponent(arquivo)}`);
  audio.volume = 0.8;
  let execucoes = 0;
  let encerrado = false;
  const falhou = () => { if (encerrado) return; encerrado = true; usarSirene(); };

  audio.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) aoDuracao(audio.duration * 2 * 1000 + RESPIRO_MS);
  });
  audio.addEventListener("ended", () => {
    execucoes += 1;
    if (execucoes < 2 && !encerrado) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  });
  audio.addEventListener("error", falhou);
  audio.play().catch(falhou);

  return () => { encerrado = true; audio.pause(); };
}

/** `duracaoMs` nula: ainda lendo o áudio, a cela fica até a duração chegar. */
export function EasterEggMaster({ duracaoMs, aoTerminar }: { duracaoMs: number | null; aoTerminar: () => void }) {
  useEffect(() => {
    if (duracaoMs == null) return;
    const t = setTimeout(aoTerminar, duracaoMs);
    return () => clearTimeout(t);
  }, [duracaoMs, aoTerminar]);

  return (
    <div
      className="nova-cela"
      style={{ animation: duracaoMs == null ? "none" : `nova-cela-sai ${SAIDA_MS}ms ease-in ${Math.max(0, duracaoMs - SAIDA_MS)}ms forwards` }}
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
