/**
 * Cálculos da Insights (saúde do mês, ritmo, projeção, narrativa e datasets
 * dos gráficos), compartilhados pela UI Clássica (app/insights) e pela Nova
 * (app/nova/insights). Movidos sem alteração de fórmula da tela Clássica;
 * `hoje` é parâmetro só para poder testar com data fixa.
 */

export const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const PALETA = {
  receita: "#10b981",
  despesa: "#ef4444",
  saldo: "#3b82f6",
  fixo: "#6366f1",
  variavel: "#f59e0b",
  poupanca: "#14b8a6",
  categorias: ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444", "#64748b"],
};

export type Metrica = {
  receitas: number; despesas: number; saldo: number; taxa: number;
  gAteCorte: number; gAntAteCorte: number; paceVar: number; projFech: number;
  ptsPoup: number; ptsRitmo: number; ptsFixas: number; score: number;
  faixa: { label: string; hex: string; texto: string; bg: string };
  serieEste: number[]; serieAnt: number[];
};

export interface DadosInsights {
  transacoes: any[];
  contas: any[];
  contasFixas: any[];
  categoriasLista: any[];
  /** ids de transações que são movimentação de caixinha (não contam como gasto/receita real) */
  poupancaIds: string[];
}

const formatarMoeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function calcularInsights({ transacoes, contas, contasFixas, categoriasLista, poupancaIds }: DadosInsights, mesAtual: Date, hoje: Date = new Date()) {
  const poupSet = new Set(poupancaIds);
  const ehReal = (t: any) => !poupSet.has(t.id);
  const daAutor = (t: any, autor: string | null) => autor == null ? true : t.autor_nome === autor;

  // contexto
  const hojeData = new Date(hoje); hojeData.setHours(0, 0, 0, 0);
  const anoNav = mesAtual.getFullYear();
  const mesIdxNav = mesAtual.getMonth();
  const realY = hojeData.getFullYear();
  const realM = hojeData.getMonth();
  const modo: "futuro" | "corrente" | "passado" =
    new Date(anoNav, mesIdxNav, 1) > new Date(realY, realM, 1) ? "futuro" : (anoNav === realY && mesIdxNav === realM) ? "corrente" : "passado";
  const mesAnt = new Date(anoNav, mesIdxNav - 1, 1);
  const nomeDoMes = mesAtual.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const nomeMesAnterior = mesAnt.toLocaleDateString("pt-BR", { month: "long" });
  const totalDiasMes = new Date(anoNav, mesIdxNav + 1, 0).getDate();
  const diaCorte = modo === "corrente" ? hojeData.getDate() : totalDiasMes;

  // classificação fixo/variável
  const catNome = (id: string | null) => id ? (categoriasLista.find((c) => c.id === id)?.nome || "Sem categoria") : "Sem categoria";
  const fixedCatIds = new Set<string>();
  contasFixas.filter((c) => !c.arquivada && c.categoria_id).forEach((c) => fixedCatIds.add(c.categoria_id));
  categoriasLista.filter((c) => c.tipo === "despesa" && (c.nome || "").toLowerCase().startsWith("assinatura")).forEach((c) => fixedCatIds.add(c.id));
  const ehFixa = (catId: string | null) => !!catId && fixedCatIds.has(catId);

  // helpers parametrizados por autor
  const somaReceitaMes = (ano: number, mesIdx: number, autor: string | null) => {
    let s = 0; transacoes.forEach((t) => { if (t.tipo !== "receita" || !ehReal(t) || !daAutor(t, autor)) return; const dt = new Date(t.data + "T00:00:00"); if (dt.getFullYear() === ano && dt.getMonth() === mesIdx) s += Number(t.valor); }); return s;
  };
  const somaDespesaMes = (ano: number, mesIdx: number, autor: string | null, pred?: (t: any) => boolean) => {
    let s = 0; transacoes.forEach((t) => { if (t.tipo !== "despesa" || !ehReal(t) || !daAutor(t, autor)) return; const dt = new Date(t.data + "T00:00:00"); if (dt.getFullYear() === ano && dt.getMonth() === mesIdx && (!pred || pred(t))) s += Number(t.valor); }); return s;
  };
  const gastoAcumuladoAte = (ano: number, mesIdx: number, dia: number, autor: string | null) => {
    let s = 0; transacoes.forEach((t) => { if (t.tipo !== "despesa" || !ehReal(t) || !daAutor(t, autor)) return; const dt = new Date(t.data + "T00:00:00"); if (dt.getFullYear() === ano && dt.getMonth() === mesIdx && dt.getDate() <= dia) s += Number(t.valor); }); return s;
  };
  const serieAcumulada = (ano: number, mesIdx: number, autor: string | null) => {
    const ud = new Date(ano, mesIdx + 1, 0).getDate(); const arr = new Array(ud).fill(0);
    transacoes.forEach((t) => { if (t.tipo !== "despesa" || !ehReal(t) || !daAutor(t, autor)) return; const dt = new Date(t.data + "T00:00:00"); if (dt.getFullYear() === ano && dt.getMonth() === mesIdx) arr[dt.getDate() - 1] += Number(t.valor); });
    let acc = 0; return arr.map((v) => (acc += v));
  };

  const faixaDe = (score: number) => score >= 80 ? { label: "Ótimo", hex: "#22c55e", texto: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" }
    : score >= 60 ? { label: "Bom", hex: "#3b82f6", texto: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" }
    : score >= 40 ? { label: "Atenção", hex: "#f59e0b", texto: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" }
    : { label: "Ruim", hex: "#ef4444", texto: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" };

  const computarMes = (autor: string | null): Metrica => {
    const receitas = somaReceitaMes(anoNav, mesIdxNav, autor);
    const despesas = somaDespesaMes(anoNav, mesIdxNav, autor);
    const saldo = receitas - despesas;
    const taxa = receitas > 0 ? (saldo / receitas) * 100 : 0;
    const gAteCorte = gastoAcumuladoAte(anoNav, mesIdxNav, diaCorte, autor);
    const gAntAteCorte = gastoAcumuladoAte(mesAnt.getFullYear(), mesAnt.getMonth(), diaCorte, autor);
    const paceVar = gAntAteCorte > 0 ? ((gAteCorte - gAntAteCorte) / gAntAteCorte) * 100 : 0;
    const projFech = modo === "corrente" && diaCorte > 0 ? (gAteCorte / diaCorte) * totalDiasMes : despesas;
    let r6 = 0; for (let i = 1; i <= 6; i++) { const d = new Date(realY, realM - i, 1); r6 += somaReceitaMes(d.getFullYear(), d.getMonth(), autor); }
    const rendaBase = r6 / 6 > 0 ? r6 / 6 : receitas;
    const taxaPoupNum = receitas > 0 ? saldo / receitas : 0;
    const ptsPoup = Math.max(0, Math.min(40, (taxaPoupNum / 0.30) * 40));
    let ptsRitmo: number;
    if (gAntAteCorte <= 0) ptsRitmo = 15; else { const ratio = gAteCorte / gAntAteCorte; ptsRitmo = Math.max(0, Math.min(30, ((1.2 - ratio) / (1.2 - 0.8)) * 30)); }
    const custoFixo = somaDespesaMes(anoNav, mesIdxNav, autor, (t) => ehFixa(t.categoria_id));
    const comprometimento = rendaBase > 0 ? custoFixo / rendaBase : 1;
    const ptsFixas = Math.max(0, Math.min(30, ((1.0 - comprometimento) / (1.0 - 0.5)) * 30));
    const score = Math.round(ptsPoup + ptsRitmo + ptsFixas);
    return { receitas, despesas, saldo, taxa, gAteCorte, gAntAteCorte, paceVar, projFech, ptsPoup, ptsRitmo, ptsFixas, score, faixa: faixaDe(score), serieEste: serieAcumulada(anoNav, mesIdxNav, autor), serieAnt: serieAcumulada(mesAnt.getFullYear(), mesAnt.getMonth(), autor) };
  };

  const m = computarMes(null); // household

  // agregações do mês (household)
  const transacoesDoMes = transacoes.filter((t) => { const dt = new Date(t.data + "T00:00:00"); return dt.getMonth() === mesIdxNav && dt.getFullYear() === anoNav && t.tipo !== "transferencia" && ehReal(t); });
  const agrupaCategoria = (tipo: string) => {
    const mapa: Record<string, { valor: number; itens: any[] }> = {};
    transacoesDoMes.filter((t) => t.tipo === tipo).forEach((t) => { const nome = t.categorias?.nome || "Sem categoria"; if (!mapa[nome]) mapa[nome] = { valor: 0, itens: [] }; mapa[nome].valor += Number(t.valor); mapa[nome].itens.push(t); });
    return Object.entries(mapa).map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.valor - a.valor);
  };
  const despesasCat = agrupaCategoria("despesa");
  const receitasCat = agrupaCategoria("receita");
  const maioresGastos = transacoesDoMes.filter((t) => t.tipo === "despesa").sort((a, b) => Number(b.valor) - Number(a.valor));

  // helpers portados
  const obterFaturasDoCartao = (cartaoId: string) => {
    const cartao = contas.find((c) => c.id === cartaoId);
    if (!cartao) return { faturasAbertas: [] as any[] };
    const diaFechamento = Number(cartao.dia_fechamento) || 1; const diaVencimento = Number(cartao.dia_vencimento) || 10;
    const transCartao = transacoes.filter((t) => (t.tipo === "despesa" && t.conta_id === cartaoId) || (t.tipo === "transferencia" && t.conta_destino_id === cartaoId));
    const fat: Record<string, number> = {}; let pg = 0;
    transCartao.forEach((t) => { const val = Number(t.valor); if (t.tipo === "despesa") { const [aS, mS, dS] = t.data.split("-"); let ano = Number(aS); let mes = Number(mS) - 1; const dia = Number(dS); if (dia >= diaFechamento) { mes++; if (mes > 11) { mes = 0; ano++; } } const k = `${ano}-${String(mes + 1).padStart(2, "0")}`; fat[k] = (fat[k] || 0) + val; } else pg += val; });
    const arr = Object.keys(fat).sort().map((k) => { const [aS, mS] = k.split("-"); return { dataVencimento: new Date(Number(aS), Number(mS) - 1, diaVencimento), valorAberto: fat[k] }; });
    let rest = pg; for (let i = 0; i < arr.length; i++) { if (rest >= arr[i].valorAberto) { rest -= arr[i].valorAberto; arr[i].valorAberto = 0; } else { arr[i].valorAberto -= rest; rest = 0; break; } }
    return { faturasAbertas: arr.filter((f) => f.valorAberto > 0.01) };
  };

  // ==========================================================================
  // PROJEÇÃO FUTURA — fixas (média) e variáveis (mediana), por categoria
  // ==========================================================================
  const mediana = (arr: number[]) => { const s = [...arr].sort((a, b) => a - b); const md = Math.floor(s.length / 2); return s.length % 2 ? s[md] : (s[md - 1] + s[md]) / 2; };
  const media = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const catMensal3 = (() => {
    const refs = [1, 2, 3].map((i) => { const d = new Date(realY, realM - i, 1); return d.getFullYear() * 12 + d.getMonth(); });
    const map: Record<string, number[]> = {};
    transacoes.forEach((t) => { if (t.tipo !== "despesa" || !ehReal(t)) return; const dt = new Date(t.data + "T00:00:00"); const idx = refs.indexOf(dt.getFullYear() * 12 + dt.getMonth()); if (idx < 0) return; const cid = t.categoria_id || "sem"; if (!map[cid]) map[cid] = [0, 0, 0]; map[cid][idx] += Number(t.valor); });
    return map;
  })();
  const projCats = Object.entries(catMensal3).map(([cid, arr]) => { const fixa = ehFixa(cid === "sem" ? null : cid); return { catId: cid, nome: cid === "sem" ? "Sem categoria" : catNome(cid), fixa, valor: fixa ? media(arr) : mediana(arr) }; });
  const projFixas = projCats.filter((c) => c.fixa && c.valor > 0).sort((a, b) => b.valor - a.valor);
  const projVariaveis = projCats.filter((c) => !c.fixa && c.valor > 0).sort((a, b) => b.valor - a.valor);
  const totalProjFixas = projFixas.reduce((a, c) => a + c.valor, 0);
  const totalProjVariaveis = projVariaveis.reduce((a, c) => a + c.valor, 0);
  const cartoesAtivos = contas.filter((c) => c.tipo === "credito" && c.ativo !== false);
  const faturasComprometidas = cartoesAtivos.reduce((acc, c) => acc + obterFaturasDoCartao(c.id).faturasAbertas.filter((f) => f.dataVencimento.getFullYear() === anoNav && f.dataVencimento.getMonth() === mesIdxNav).reduce((a, f) => a + f.valorAberto, 0), 0);
  const mediaReceita6Meses = (() => { let t = 0; for (let i = 1; i <= 6; i++) { const d = new Date(realY, realM - i, 1); t += somaReceitaMes(d.getFullYear(), d.getMonth(), null); } return t / 6; })();
  const despesasPrevistas = totalProjFixas + totalProjVariaveis;
  const saldoPrevisto = mediaReceita6Meses - despesasPrevistas;

  // narrativa (household)
  const narrativa: { icon: string; texto: string; tom: "bom" | "ruim" | "neutro" }[] = [];
  if (modo === "corrente") {
    if (m.gAntAteCorte > 0) narrativa.push(m.paceVar <= 0
      ? { icon: "👏", tom: "bom", texto: `Até hoje (dia ${diaCorte}) vocês gastaram ${formatarMoeda(m.gAteCorte)}, ${Math.abs(m.paceVar).toFixed(0)}% a menos que no mesmo ponto de ${nomeMesAnterior}.` }
      : { icon: "⚠️", tom: "ruim", texto: `Até hoje (dia ${diaCorte}) vocês gastaram ${formatarMoeda(m.gAteCorte)}, ${m.paceVar.toFixed(0)}% a mais que no mesmo ponto de ${nomeMesAnterior}.` });
    narrativa.push({ icon: "🎯", tom: "neutro", texto: `No ritmo atual, o mês fecha em torno de ${formatarMoeda(m.projFech)} de gastos.` });
    if (m.receitas > 0) narrativa.push(m.taxa >= 0 ? { icon: "🐷", tom: "bom", texto: `Já guardaram ${m.taxa.toFixed(0)}% do que entrou este mês.` } : { icon: "🔴", tom: "ruim", texto: `As saídas já superaram as entradas em ${formatarMoeda(Math.abs(m.saldo))}.` });
  } else if (modo === "passado") {
    narrativa.push(m.paceVar <= 0
      ? { icon: "📉", tom: "bom", texto: `Em ${nomeDoMes} vocês gastaram ${formatarMoeda(m.despesas)}, ${Math.abs(m.paceVar).toFixed(0)}% a menos que no mês anterior.` }
      : { icon: "📈", tom: "ruim", texto: `Em ${nomeDoMes} vocês gastaram ${formatarMoeda(m.despesas)}, ${m.paceVar.toFixed(0)}% a mais que no mês anterior.` });
    if (m.receitas > 0) narrativa.push(m.taxa >= 0 ? { icon: "🐷", tom: "bom", texto: `Guardaram ${m.taxa.toFixed(0)}% da renda (${formatarMoeda(m.saldo)}).` } : { icon: "🔴", tom: "ruim", texto: `Fecharam no vermelho em ${formatarMoeda(Math.abs(m.saldo))}.` });
  }

  // ==========================================================================
  // DATASETS BI
  // ==========================================================================
  const fluxoDiario = (() => {
    const rec = new Array(totalDiasMes).fill(0); const desp = new Array(totalDiasMes).fill(0);
    transacoesDoMes.forEach((t) => { const dia = new Date(t.data + "T00:00:00").getDate(); if (t.tipo === "receita") rec[dia - 1] += Number(t.valor); if (t.tipo === "despesa") desp[dia - 1] += Number(t.valor); });
    return { labels: Array.from({ length: totalDiasMes }, (_, i) => `dia ${i + 1}`), rec, desp };
  })();
  const fluxoSemanal = (() => {
    const nSem = Math.ceil(totalDiasMes / 7); const rec = new Array(nSem).fill(0); const desp = new Array(nSem).fill(0);
    transacoesDoMes.forEach((t) => { const dia = new Date(t.data + "T00:00:00").getDate(); const wk = Math.floor((dia - 1) / 7); if (t.tipo === "receita") rec[wk] += Number(t.valor); if (t.tipo === "despesa") desp[wk] += Number(t.valor); });
    return { labels: Array.from({ length: nSem }, (_, i) => `Sem ${i + 1}`), rec, desp };
  })();
  const runway = (() => {
    const netDia = new Array(totalDiasMes).fill(0);
    transacoesDoMes.forEach((t) => { const dia = new Date(t.data + "T00:00:00").getDate(); netDia[dia - 1] += (t.tipo === "receita" ? 1 : -1) * Number(t.valor); });
    const primeiroFuturo = modo === "corrente" ? hojeData.getDate() + 1 : totalDiasMes + 1;
    contasFixas.filter((c) => !c.arquivada && c.modo === "unico" && c.dia_vencimento).forEach((c) => { const dia = Math.min(c.dia_vencimento, totalDiasMes); if (dia < primeiroFuturo) return; const md = projCats.find((p) => p.catId === c.categoria_id); if (md) netDia[dia - 1] -= md.valor; });
    let acc = 0; const cum = netDia.map((v) => (acc += v));
    return { labels: Array.from({ length: totalDiasMes }, (_, i) => `dia ${i + 1}`), valores: cum, hoje: modo === "corrente" ? hojeData.getDate() - 1 : -1 };
  })();
  const serie12m = (() => {
    const labels: string[] = []; const rec: number[] = []; const desp: number[] = []; const saldo: number[] = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(anoNav, mesIdxNav - i, 1); labels.push(`${MESES_CURTOS[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`); const r = somaReceitaMes(d.getFullYear(), d.getMonth(), null); const de = somaDespesaMes(d.getFullYear(), d.getMonth(), null); rec.push(r); desp.push(de); saldo.push(r - de); }
    return { labels, rec, desp, saldo };
  })();
  const evolucaoCategorias = (() => {
    const meses = Array.from({ length: 6 }, (_, k) => { const d = new Date(anoNav, mesIdxNav - 5 + k, 1); return { ano: d.getFullYear(), mes: d.getMonth() }; });
    const tot: Record<string, number> = {};
    transacoes.forEach((t) => { if (t.tipo !== "despesa" || !ehReal(t)) return; const dt = new Date(t.data + "T00:00:00"); if (!meses.some((mm) => mm.ano === dt.getFullYear() && mm.mes === dt.getMonth())) return; const nome = t.categorias?.nome || "Sem categoria"; tot[nome] = (tot[nome] || 0) + Number(t.valor); });
    const top5 = Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
    const series = top5.map((nome, i) => ({ nome, cor: PALETA.categorias[i % PALETA.categorias.length], valores: meses.map((mm) => transacoes.filter((t) => t.tipo === "despesa" && ehReal(t) && (t.categorias?.nome || "Sem categoria") === nome && new Date(t.data + "T00:00:00").getFullYear() === mm.ano && new Date(t.data + "T00:00:00").getMonth() === mm.mes).reduce((a, t) => a + Number(t.valor), 0)) }));
    return { labels: meses.map((mm) => `${MESES_CURTOS[mm.mes]}/${String(mm.ano).slice(-2)}`), series };
  })();
  const fixoVariavel6m = (() => {
    const labels: string[] = []; const fixo: number[] = []; const variavel: number[] = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(anoNav, mesIdxNav - i, 1); labels.push(`${MESES_CURTOS[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`); fixo.push(somaDespesaMes(d.getFullYear(), d.getMonth(), null, (t) => ehFixa(t.categoria_id))); variavel.push(somaDespesaMes(d.getFullYear(), d.getMonth(), null, (t) => !ehFixa(t.categoria_id))); }
    return { labels, fixo, variavel };
  })();
  const fixoM = somaDespesaMes(anoNav, mesIdxNav, null, (t) => ehFixa(t.categoria_id));
  const varM = m.despesas - fixoM;
  const donutSegs = [
    { nome: "Despesas fixas", valor: fixoM, cor: PALETA.fixo },
    { nome: "Despesas variáveis", valor: varM, cor: PALETA.variavel },
    { nome: "Sobrou", valor: Math.max(0, m.receitas - m.despesas), cor: PALETA.receita },
  ];

  const diaLimiteGrafico = modo === "corrente" ? diaCorte : totalDiasMes;

  // série da história (household), com nulls após hoje
  const serieEsteExib = m.serieEste.map((v, i) => (modo === "corrente" && i + 1 > diaCorte ? null : v));
  const serieAntExib = Array.from({ length: totalDiasMes }, (_, i) => m.serieAnt[i] ?? m.serieAnt[m.serieAnt.length - 1] ?? 0);

  return { modo, nomeDoMes, totalDiasMes, computarMes, m, despesasCat, receitasCat, maioresGastos, mediana, projFixas, projVariaveis, totalProjFixas, totalProjVariaveis, faturasComprometidas, mediaReceita6Meses, despesasPrevistas, saldoPrevisto, narrativa, fluxoDiario, fluxoSemanal, runway, serie12m, evolucaoCategorias, fixoVariavel6m, donutSegs, diaLimiteGrafico, serieEsteExib, serieAntExib };
}

export type ResultadoInsights = ReturnType<typeof calcularInsights>;
