"use client";

// ============================================================================
// MOTOR DE MOLAS (sem dependências)
// ----------------------------------------------------------------------------
// Molas, e não transições CSS, porque só elas são interrompíveis de verdade:
// partem sempre do valor que está NA TELA e absorvem a velocidade do gesto.
// Parâmetros no vocabulário da Apple (damping + response), não mass/stiffness:
//   damping  1.0 = sem overshoot (padrão da UI) · ~0.8 = quica (pós-gesto)
//   response      tempo até alcançar o alvo, em segundos (menor = mais seco)
// ============================================================================

export type SpringConfig = { damping?: number; response?: number };

export const SPRING_PADRAO: SpringConfig = { damping: 1.0, response: 0.35 };
export const SPRING_GESTO: SpringConfig = { damping: 0.8, response: 0.3 };

export function criarMola(valorInicial: number, aoAtualizar: (v: number) => void) {
  let x = valorInicial;
  let v = 0;
  let alvo = valorInicial;
  let cfg: Required<SpringConfig> = { damping: 1.0, response: 0.35 };
  let raf: number | null = null;
  let ultimo = 0;
  let aoParar: (() => void) | null = null;

  const passo = (agora: number) => {
    // dt limitado: aba em segundo plano não pode explodir a integração
    const dt = Math.min((agora - ultimo) / 1000, 1 / 30);
    ultimo = agora;

    const w = (2 * Math.PI) / cfg.response; // frequência angular
    const z = cfg.damping;                  // razão de amortecimento

    // integração semi-implícita de Euler: estável e barata
    const a = -w * w * (x - alvo) - 2 * z * w * v;
    v += a * dt;
    x += v * dt;

    aoAtualizar(x);

    const parado = Math.abs(x - alvo) < 0.05 && Math.abs(v) < 0.05;
    if (parado) {
      x = alvo; v = 0; aoAtualizar(x);
      raf = null;
      aoParar?.(); aoParar = null;
      return;
    }
    raf = requestAnimationFrame(passo);
  };

  return {
    // Redireciona a mola. NÃO zera a velocidade: é isso que evita o "muro"
    // quando o usuário inverte o gesto no meio do caminho.
    animarPara(novoAlvo: number, config?: SpringConfig & { velocidade?: number; aoTerminar?: () => void }) {
      alvo = novoAlvo;
      cfg = { damping: config?.damping ?? 1.0, response: config?.response ?? 0.35 };
      if (config?.velocidade !== undefined) v = config.velocidade;
      if (config?.aoTerminar) aoParar = config.aoTerminar;
      if (raf === null) { ultimo = performance.now(); raf = requestAnimationFrame(passo); }
    },
    // Usado durante o arrasto: a posição é ditada pelo dedo, não pela física.
    definir(valor: number, velocidade = 0) {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      x = valor; v = velocidade; alvo = valor;
      aoAtualizar(x);
    },
    valor: () => x,
    velocidade: () => v,
    parar() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } v = 0; },
  };
}

// Onde o gesto vai parar se for solto agora (mesma curva da rolagem do iOS).
// Serve para escolher o destino a partir do arremesso, não do ponto de soltura.
export function projetar(velocidade: number, desaceleracao = 0.998) {
  return ((velocidade / 1000) * desaceleracao) / (1 - desaceleracao);
}

// Resistência progressiva ao passar do limite — em vez de travar seco.
export function elastico(excesso: number, dimensao: number, constante = 0.55) {
  return (excesso * dimensao * constante) / (dimensao + constante * Math.abs(excesso));
}

// Histórico curto de posições para estimar a velocidade na soltura.
export function criarRastreador() {
  const amostras: { t: number; p: number }[] = [];
  return {
    registrar(p: number) {
      const t = performance.now();
      amostras.push({ t, p });
      while (amostras.length > 6 || (amostras.length > 2 && t - amostras[0].t > 100)) amostras.shift();
    },
    // px/s considerando só a janela recente (~100ms)
    velocidade() {
      if (amostras.length < 2) return 0;
      const a = amostras[0]; const b = amostras[amostras.length - 1];
      const dt = (b.t - a.t) / 1000;
      return dt > 0 ? (b.p - a.p) / dt : 0;
    },
    limpar() { amostras.length = 0; },
  };
}

export function prefereMenosMovimento() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
