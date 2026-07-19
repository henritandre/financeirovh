"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeContext";
import { GaugeSaude, Linhas, Barras, Donut, FlipCard, PALETA } from "./charts";

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function IconeInfo() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;
}

type Metrica = {
  receitas: number; despesas: number; saldo: number; taxa: number;
  gAteCorte: number; gAntAteCorte: number; paceVar: number; projFech: number;
  ptsPoup: number; ptsRitmo: number; ptsFixas: number; score: number;
  faixa: { label: string; hex: string; texto: string; bg: string };
  serieEste: number[]; serieAnt: number[];
};

export default function InsightsPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, isWaving } = useTheme();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [contasFixas, setContasFixas] = useState<any[]>([]);
  const [categoriasLista, setCategoriasLista] = useState<any[]>([]);
  const [poupancaIds, setPoupancaIds] = useState<string[]>([]);
  const [mapPerfis, setMapPerfis] = useState<Record<string, string>>({});
  const [autores, setAutores] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [mesAtual, setMesAtual] = useState(new Date());

  // parâmetros
  const [qtdCategorias, setQtdCategorias] = useState(5);
  const [expandirResto, setExpandirResto] = useState(true);
  const [qtdTop, setQtdTop] = useState(3);

  // ui
  const [infoAberto, setInfoAberto] = useState<string | null>(null);
  const [breakdownAberto, setBreakdownAberto] = useState<string | null>(null);
  const [restoDespAberto, setRestoDespAberto] = useState(false);
  const [restoRecAberto, setRestoRecAberto] = useState(false);
  const [topCount, setTopCount] = useState(3);
  const [saudeIdx, setSaudeIdx] = useState(0);
  const [drill, setDrill] = useState<{ titulo: string; corHex: string; itens: any[] } | null>(null);

  const formatarMoeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const carregarDados = async (uid: string) => {
    setIsLoading(true);
    const { data: perfisData } = await supabase.from("profiles").select("username, avatar_url");
    if (perfisData) {
      const mapa: Record<string, string> = {};
      perfisData.forEach((p) => { if (p.username && p.avatar_url) mapa[p.username] = p.avatar_url; });
      setMapPerfis(mapa);
    }
    const { data: historico } = await supabase.from("transacoes").select("*, categorias(nome), conta_origem:contas!conta_id(nome, tipo, autor_nome)").order("data", { ascending: false });
    const { data: contasData } = await supabase.from("contas").select("*").order("nome");
    const { data: fixasData } = await supabase.from("contas_fixas").select("*, categorias(nome)").order("nome");
    const { data: catsData } = await supabase.from("categorias").select("id, nome, tipo");
    const { data: histCaix } = await supabase.from("caixinhas_historico").select("transacao_id").not("transacao_id", "is", null);
    const { data: params } = await supabase.from("parametros").select("chave, valor").eq("user_id", uid).in("chave", ["insights_qtd_categorias", "insights_expandir_resto", "insights_qtd_top"]);

    if (contasData) setContas(contasData);
    if (fixasData) setContasFixas(fixasData);
    if (catsData) setCategoriasLista(catsData);
    if (histCaix) setPoupancaIds(histCaix.map((h) => h.transacao_id).filter(Boolean));
    if (params) {
      let qt = 3;
      params.forEach((p) => {
        if (p.chave === "insights_qtd_categorias") setQtdCategorias(Number(p.valor));
        if (p.chave === "insights_expandir_resto") setExpandirResto(p.valor);
        if (p.chave === "insights_qtd_top") { qt = Number(p.valor); setQtdTop(qt); }
      });
      setTopCount(qt);
    }
    if (historico) {
      setTransacoes(historico);
      setAutores(Array.from(new Set(historico.map((t) => t.autor_nome).filter((n) => n && n !== "Família"))) as string[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const loadInit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id); setEmail(user.email || "");
        setUsername(user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário");
        setFullName(user.user_metadata?.full_name || ""); setAvatarUrl(user.user_metadata?.avatar_url || "");
        carregarDados(user.id);
      } else { router.push("/login"); }
    };
    loadInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const alterarMes = (delta: number) => setMesAtual((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const toggleInfo = (id: string) => setInfoAberto((prev) => (prev === id ? null : id));

  const poupSet = new Set(poupancaIds);
  const ehReal = (t: any) => !poupSet.has(t.id);
  const daAutor = (t: any, autor: string | null) => autor == null ? true : t.autor_nome === autor;

  // contexto
  const hojeData = new Date(); hojeData.setHours(0, 0, 0, 0);
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
      ? { icon: "👏", tom: "bom", texto: `Até hoje (dia ${diaCorte}) vocês gastaram ${formatarMoeda(m.gAteCorte)} — ${Math.abs(m.paceVar).toFixed(0)}% a menos que no mesmo ponto de ${nomeMesAnterior}.` }
      : { icon: "⚠️", tom: "ruim", texto: `Até hoje (dia ${diaCorte}) vocês gastaram ${formatarMoeda(m.gAteCorte)} — ${m.paceVar.toFixed(0)}% a mais que no mesmo ponto de ${nomeMesAnterior}.` });
    narrativa.push({ icon: "🎯", tom: "neutro", texto: `No ritmo atual, o mês fecha em torno de ${formatarMoeda(m.projFech)} de gastos.` });
    if (m.receitas > 0) narrativa.push(m.taxa >= 0 ? { icon: "🐷", tom: "bom", texto: `Já guardaram ${m.taxa.toFixed(0)}% do que entrou este mês.` } : { icon: "🔴", tom: "ruim", texto: `As saídas já superaram as entradas em ${formatarMoeda(Math.abs(m.saldo))}.` });
  } else if (modo === "passado") {
    narrativa.push(m.paceVar <= 0
      ? { icon: "📉", tom: "bom", texto: `Em ${nomeDoMes} vocês gastaram ${formatarMoeda(m.despesas)} — ${Math.abs(m.paceVar).toFixed(0)}% a menos que no mês anterior.` }
      : { icon: "📈", tom: "ruim", texto: `Em ${nomeDoMes} vocês gastaram ${formatarMoeda(m.despesas)} — ${m.paceVar.toFixed(0)}% a mais que no mês anterior.` });
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

  const initialLetterMenu = username ? username.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";
  const diaLimiteGrafico = modo === "corrente" ? diaCorte : totalDiasMes;

  // série da história (household), com nulls após hoje
  const serieEsteExib = m.serieEste.map((v, i) => (modo === "corrente" && i + 1 > diaCorte ? null : v));
  const serieAntExib = Array.from({ length: totalDiasMes }, (_, i) => m.serieAnt[i] ?? m.serieAnt[m.serieAnt.length - 1] ?? 0);

  const cardCls = `bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`;
  const botaoInfo = (id: string) => (<button onClick={() => toggleInfo(id)} className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${infoAberto === id ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" : "text-gray-300 dark:text-gray-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"}`} title="O que é isto?"><IconeInfo /></button>);
  const legenda = (itens: { nome: string; cor: string }[]) => (<div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">{itens.map((it) => (<span key={it.nome} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-300"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: it.cor }}></span>{it.nome}</span>))}</div>);

  const chartCard = (id: string, titulo: string, sub: string, verso: ReactNode, children: ReactNode, span2 = false) => (
    <div className={`${cardCls} ${span2 ? "lg:col-span-2" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div><h3 className="text-lg font-black text-gray-900 dark:text-gray-100">{titulo}</h3><p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">{sub}</p></div>
        {botaoInfo(id)}
      </div>
      <FlipCard flipped={infoAberto === id} frente={children} verso={<div className="h-full flex items-center px-1 py-2 min-h-[180px]">{verso}</div>} />
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes macDockWave { 0% { transform: translateY(0) scale(1); } 40% { transform: translateY(-16px) scale(1.03); } 70% { transform: translateY(4px) scale(0.98); } 100% { transform: translateY(0) scale(1); } }
        .mac-dock-item { will-change: transform; }
        .mac-dock-animate { animation: macDockWave 0.6s cubic-bezier(0.25, 1, 0.5, 1) both; }
        .tip-wrap { position: relative; }
        .tip-wrap .tip { visibility: hidden; opacity: 0; transition: opacity .15s; }
        .tip-wrap:hover .tip { visibility: visible; opacity: 1; }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative pb-20 overflow-x-hidden transition-colors duration-300">

        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center relative z-10 transition-colors">
          <h1 className="text-xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 tracking-tight">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            Insights
          </h1>
          <div className="flex items-center">
            <button onClick={toggleTheme} className="relative inline-flex items-center h-7 w-14 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors mr-4 focus:outline-none">
              <span className="absolute left-2 text-[10px]">🌙</span><span className="absolute right-2 text-[10px]">☀️</span>
              <span className={`inline-block w-5 h-5 transform rounded-full bg-white shadow-sm transition-transform z-10 ${isDarkMode ? "translate-x-8" : "translate-x-1"}`} />
            </button>
            <div className="flex flex-col items-end mr-4 hidden sm:flex">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">@{username || "usuario"}</span>
              {fullName && <span className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight mt-0.5">{fullName}</span>}
            </div>
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-11 w-11 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-lg font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95 overflow-hidden border-2 border-white dark:border-gray-800">
                {avatarUrl ? <img src={avatarUrl} alt="Perfil" className="w-full h-full object-cover" /> : initialLetterMenu}
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-3 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                    <div className="p-2 space-y-1">
                      <button onClick={() => router.push("/dashboard")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">📊 Dashboard</button>
                      <button onClick={() => router.push("/investimentos")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">💰 Gestão de Patrimônio</button>
                      <button onClick={() => router.push("/contas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🏦 Gestão Bancária</button>
                      <button onClick={() => router.push("/contas-fixas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">📌 Contas Fixas</button>
                      <button onClick={() => router.push("/assinaturas")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🔁 Assinaturas</button>
                      <button onClick={() => router.push("/categorias")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🏷️ Categorias</button>
                      <button onClick={() => router.push("/auditoria")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">🗑️ Auditoria de Lançamentos</button>
                      <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2"></div>
                      <button onClick={() => router.push("/perfil")} className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors">⚙️ Meu Perfil</button>
                      <button onClick={() => router.push("/parametros")} className="w-full text-left px-4 py-2.5 text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg transition-colors">⚙️ Parâmetros do Sistema</button>
                      <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">Sair do Sistema</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>

        <main className="p-6 max-w-6xl mx-auto space-y-6 mt-4">

          {/* NAVEGADOR DE MÊS (sem filtro de usuário — visão da casa) */}
          <div className={`bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center gap-4 transition-colors mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0s' }}>
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 transition-colors">
              <button onClick={() => alterarMes(-1)} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
              <div className="w-40 text-center">
                <span className="block text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider capitalize-first">{nomeDoMes}</span>
                <span className={`block text-[10px] font-black uppercase tracking-widest mt-0.5 ${modo === "futuro" ? "text-indigo-500 dark:text-indigo-400" : modo === "corrente" ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>{modo === "futuro" ? "🔮 Projeção" : modo === "corrente" ? "● Ao vivo" : "Retrospectiva"}</span>
              </div>
              <button onClick={() => alterarMes(1)} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider"><span className="text-lg">🏠</span> Visão da casa</div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600"></div></div>
          ) : modo === "futuro" ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className={`bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-gray-800 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.1s' }}>
                <div className="flex items-start gap-3 mb-5"><span className="text-2xl">🔮</span><p className="text-sm font-bold text-gray-700 dark:text-gray-300 leading-relaxed">Para <span className="font-black capitalize-first">{nomeDoMes}</span>, a previsão é de <span className="font-black text-red-600 dark:text-red-400">{formatarMoeda(despesasPrevistas)}</span> em despesas e uma receita provável de <span className="font-black text-green-600 dark:text-green-400">{formatarMoeda(mediaReceita6Meses)}</span>.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/70 dark:bg-gray-800/70 p-5 rounded-2xl border border-green-100 dark:border-green-800/40"><h3 className="text-xs font-black text-green-800 dark:text-green-400 uppercase tracking-wider mb-2">Receita provável</h3><p className="text-2xl font-black text-green-600 dark:text-green-400">{formatarMoeda(mediaReceita6Meses)}</p><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">média dos últimos 6 meses</p></div>
                  <div className="bg-white/70 dark:bg-gray-800/70 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800/40"><h3 className="text-xs font-black text-indigo-800 dark:text-indigo-400 uppercase tracking-wider mb-2">Despesas fixas</h3><p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatarMoeda(totalProjFixas)}</p><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">média · contas fixas + assinaturas</p></div>
                  <div className="bg-white/70 dark:bg-gray-800/70 p-5 rounded-2xl border border-amber-100 dark:border-amber-800/40"><h3 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-2">Despesas variáveis</h3><p className="text-2xl font-black text-amber-600 dark:text-amber-400">{formatarMoeda(totalProjVariaveis)}</p><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">mediana do dia a dia</p></div>
                  <div className={`p-5 rounded-2xl border ${saldoPrevisto >= 0 ? "bg-white/70 dark:bg-gray-800/70 border-blue-100 dark:border-blue-800/40" : "bg-orange-50/70 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40"}`}><h3 className={`text-xs font-black uppercase tracking-wider mb-2 ${saldoPrevisto >= 0 ? "text-blue-800 dark:text-blue-400" : "text-orange-800 dark:text-orange-400"}`}>Saldo previsto</h3><p className={`text-2xl font-black ${saldoPrevisto >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>{formatarMoeda(saldoPrevisto)}</p><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">{saldoPrevisto >= 0 ? "deve sobrar" : "previsão negativa"}</p></div>
                </div>
                {faturasComprometidas > 0 && <p className="mt-4 text-[11px] font-bold text-purple-600/80 dark:text-purple-400/80 bg-purple-50/60 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/40 rounded-xl px-3 py-2">💳 Deste total, <span className="font-black">{formatarMoeda(faturasComprometidas)}</span> já está comprometido em faturas/parcelas de cartão que vencem neste mês.</p>}
              </div>

              <div className={cardCls}>
                <div className="flex items-start justify-between gap-3 mb-3"><div><h3 className="text-lg font-black text-gray-900 dark:text-gray-100">De onde vem a previsão?</h3><p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">Fixas: média · Variáveis: mediana · últimos 3 meses</p></div>{botaoInfo("proj")}</div>
                <FlipCard flipped={infoAberto === "proj"} verso={<div className="min-h-[120px] flex items-center px-1">A previsão usa o histórico real das despesas dos <b>últimos 3 meses</b>, categoria a categoria. <b>Fixas</b> (contas fixas e assinaturas) usam a <b>média</b>; <b>variáveis</b> usam a <b>mediana</b>, que ignora meses atípicos (ex.: um mês com uma compra grande não infla a previsão). Categorias sem lançamento real não entram.</div>} frente={
                  despesasPrevistas === 0 ? <p className="text-sm font-bold text-gray-400 text-center py-10">Sem histórico nos últimos 3 meses para projetar.</p> : (
                    <div className="space-y-3">
                      {[{ chave: "fixas", titulo: "Despesas fixas", icon: "📌", total: totalProjFixas, itens: projFixas }, { chave: "variaveis", titulo: "Despesas variáveis", icon: "🛒", total: totalProjVariaveis, itens: projVariaveis }].map((g) => {
                        const aberto = breakdownAberto === g.chave;
                        return (
                          <div key={g.chave} className="rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <button onClick={() => setBreakdownAberto(aberto ? null : g.chave)} className="w-full flex items-center justify-between gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors text-left"><div className="flex items-center gap-3 min-w-0"><span className={`text-lg text-gray-400 dark:text-gray-500 transition-transform shrink-0 ${aberto ? "rotate-90" : ""}`}>›</span><span className="text-xl">{g.icon}</span><div className="min-w-0"><p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">{g.titulo}</p><p className="text-[11px] font-bold text-gray-400 dark:text-gray-500">{g.itens.length} categoria(s)</p></div></div><span className="text-base font-black text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatarMoeda(g.total)}</span></button>
                            {aberto && <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700 space-y-2">{g.itens.map((it, i) => (<div key={i} className="flex items-center justify-between gap-3 py-1.5"><p className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">{it.nome}</p><span className="text-sm font-black text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatarMoeda(it.valor)}</span></div>))}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )
                } />
              </div>

              {renderBI()}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* RESUMO */}
              <div>
                <h2 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 px-1">Resumo do mês</h2>
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.1s' }}>
                  <div className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 p-6 rounded-3xl border border-green-100 dark:border-green-800/50 shadow-sm flex flex-col justify-between transition-colors"><div className="flex justify-between items-center mb-4"><h3 className="text-xs font-black text-green-800 dark:text-green-400 uppercase tracking-wider">Entradas</h3><div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></div></div><p className="text-3xl font-black text-green-600 dark:text-green-400">{formatarMoeda(m.receitas)}</p></div>
                  <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 p-6 rounded-3xl border border-red-100 dark:border-red-800/50 shadow-sm flex flex-col justify-between transition-colors"><div className="flex justify-between items-center mb-4"><h3 className="text-xs font-black text-red-800 dark:text-red-400 uppercase tracking-wider">Saídas</h3><div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg></div></div><p className="text-3xl font-black text-red-600 dark:text-red-400">{formatarMoeda(m.despesas)}</p><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">não inclui dinheiro guardado em caixinhas</p></div>
                  <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-colors ${m.saldo >= 0 ? "bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 border-blue-100 dark:border-blue-800/50" : "bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-800 border-orange-100 dark:border-orange-800/50"}`}><div className="flex justify-between items-center mb-4"><h3 className={`text-xs font-black uppercase tracking-wider ${m.saldo >= 0 ? "text-blue-800 dark:text-blue-400" : "text-orange-800 dark:text-orange-400"}`}>Sobrou (Balanço)</h3><div className={`px-2 py-1 rounded-md text-[10px] font-black ${m.saldo >= 0 ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300" : "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300"}`}>{m.taxa >= 0 ? `GUARDOU ${m.taxa.toFixed(1)}%` : "DÉFICIT"}</div></div><p className={`text-3xl font-black ${m.saldo >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>{formatarMoeda(m.saldo)}</p></div>
                </div>
              </div>

              {/* SAÚDE + HISTÓRIA */}
              <div>
                <h2 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 px-1">Saúde do mês</h2>
                <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.15s' }}>
                  {renderSaudePill()}
                  {/* HISTÓRIA */}
                  <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div><h3 className="text-lg font-black text-gray-900 dark:text-gray-100">A história do mês</h3><p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">Gasto acumulado dia a dia · passe o mouse</p></div>
                      <div className="flex items-center gap-2"><div className="hidden sm:flex items-center gap-2.5 text-[10px] font-black uppercase tracking-wider mr-1"><span className="flex items-center gap-1 text-gray-900 dark:text-gray-100"><span className="inline-block w-4 h-0.5 rounded" style={{ background: modo === "corrente" ? PALETA.saldo : "#6b7280" }}></span>{modo === "corrente" ? "Este mês" : "Mês"}</span><span className="flex items-center gap-1 text-gray-400 dark:text-gray-500"><span className="inline-block w-4 border-t-2 border-dashed border-gray-300 dark:border-gray-600"></span>Anterior</span></div>{botaoInfo("historia")}</div>
                    </div>
                    <FlipCard flipped={infoAberto === "historia"} verso={<div className="min-h-[200px] flex items-center px-1">Cada ponto é o <b>total gasto acumulado</b> do começo do mês até aquele dia. A linha cheia é {modo === "corrente" ? "este mês, até hoje" : "o mês selecionado"}; a tracejada é o mês anterior. Se a cheia está <b>abaixo</b> da tracejada, vocês gastaram menos que no mês passado no mesmo ponto. Passe o mouse pra ver o valor de cada dia.</div>} frente={
                      <>
                        <Linhas labels={Array.from({ length: totalDiasMes }, (_, i) => `dia ${i + 1}`)} marcadorIndex={diaLimiteGrafico - 1} series={[{ nome: modo === "corrente" ? "Este mês" : "Mês", valores: serieEsteExib, cor: modo === "corrente" ? PALETA.saldo : "#6b7280", area: true }, { nome: "Anterior", valores: serieAntExib, cor: "#9ca3af", tracejada: true }]} height={220} />
                        <div className="mt-4 flex flex-wrap gap-2">
                          {narrativa.map((f, i) => (<div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${f.tom === "bom" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" : f.tom === "ruim" ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" : "bg-gray-50 dark:bg-gray-700/40 text-gray-700 dark:text-gray-300"}`}><span className="text-sm">{f.icon}</span><span>{f.texto}</span></div>))}
                          {narrativa.length === 0 && <p className="text-sm font-bold text-gray-400 py-2">Sem movimentações suficientes para contar a história deste mês.</p>}
                        </div>
                      </>
                    } />
                  </div>
                </div>
              </div>

              {/* FLUXO POR CATEGORIA */}
              <div>
                <h2 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 px-1">Fluxo por categoria</h2>
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.2s' }}>
                  {renderCategorias("Para onde o dinheiro foi?", "Despesas por categoria", despesasCat, m.despesas, restoDespAberto, setRestoDespAberto)}
                  {renderCategorias("De onde o dinheiro veio?", "Receitas por categoria", receitasCat, m.receitas, restoRecAberto, setRestoRecAberto)}
                </div>
              </div>

              {/* PESOS PESADOS */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Pesos pesados</h2>
                  <div className="flex items-center gap-2"><span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">mostrar</span><div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1"><button onClick={() => setTopCount((c) => Math.max(1, c - 1))} className="w-6 h-6 rounded-md flex items-center justify-center font-black text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">−</button><span className="w-6 text-center text-sm font-black text-gray-900 dark:text-gray-100">{topCount}</span><button onClick={() => setTopCount((c) => Math.min(20, c + 1))} className="w-6 h-6 rounded-md flex items-center justify-center font-black text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">+</button></div></div>
                </div>
                <div className={`bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors mac-dock-item ${isWaving ? 'mac-dock-animate' : ''}`} style={{ animationDelay: '0.22s' }}>
                  {maioresGastos.length === 0 ? (<p className="text-sm font-bold text-gray-400 text-center py-8">Nenhum gasto neste mês.</p>) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {maioresGastos.slice(0, topCount).map((t, index) => {
                        const fotoUsuario = mapPerfis[t.autor_nome];
                        const medalha = index === 0 ? "bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-sm" : index === 1 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-700" : index === 2 ? "bg-gradient-to-br from-amber-500 to-amber-700 text-white" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
                        return (
                          <li key={t.id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard?editar=${t.id}`)}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${medalha}`}>{index < 3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`}</div>
                            <div className="flex-1 truncate"><p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{t.descricao}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-[9px] font-black text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded uppercase tracking-wider truncate">{t.categorias?.nome || "Sem Categoria"}</span><div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[8px] font-black overflow-hidden shrink-0" title={t.autor_nome}>{fotoUsuario ? <img src={fotoUsuario} alt="" className="w-full h-full object-cover" /> : t.autor_nome?.charAt(0).toUpperCase()}</div></div></div>
                            <div className="text-right shrink-0"><p className="text-sm font-black text-gray-900 dark:text-gray-100">{formatarMoeda(t.valor)}</p><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{new Date(t.data + "T00:00:00").toLocaleDateString("pt-BR")}</p></div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {renderBI()}
            </div>
          )}
        </main>

        {drill && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrill(null)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80"><div className="flex items-center gap-2 min-w-0"><span className="w-3 h-3 rounded-full shrink-0" style={{ background: drill.corHex }}></span><h3 className="text-base font-black text-gray-900 dark:text-gray-100 truncate">{drill.titulo}</h3></div><button onClick={() => setDrill(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-2xl font-bold shrink-0">&times;</button></div>
              <div className="p-4 overflow-y-auto space-y-2">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-1">{drill.itens.length} lançamento(s) · clique para editar no Dashboard</p>
                {[...drill.itens].sort((a, b) => Number(b.valor) - Number(a.valor)).map((t) => (
                  <button key={t.id} onClick={() => router.push(`/dashboard?editar=${t.id}`)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-blue-200 dark:hover:border-blue-800 transition-colors text-left group"><div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{t.descricao}</p><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{new Date(t.data + "T00:00:00").toLocaleDateString("pt-BR")} · {t.autor_nome}</p></div><span className="text-sm font-black text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatarMoeda(Number(t.valor))}</span><span className="text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg></span></button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================
  function renderSaudePill() {
    const opcoes = ["__geral__", ...autores, ...(autores.length >= 2 ? ["__comp__"] : [])];
    const idx = Math.min(saudeIdx, opcoes.length - 1);
    const scope = opcoes[idx] || "__geral__";
    const mover = (d: number) => setSaudeIdx((i) => (((Math.min(i, opcoes.length - 1) + d) % opcoes.length) + opcoes.length) % opcoes.length);
    const scopeLabel = scope === "__geral__" ? "Geral · a casa" : scope === "__comp__" ? "Comparativo" : `@${scope}`;
    const met = scope === "__comp__" ? null : computarMes(scope === "__geral__" ? null : scope);

    const single = (metrica: Metrica, autor: string | null) => (
      <div className="flex flex-col items-center">
        {autor && <div className="flex items-center gap-2 mb-1"><div className="w-7 h-7 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[10px] font-black">{mapPerfis[autor] ? <img src={mapPerfis[autor]} alt="" className="w-full h-full object-cover" /> : autor.charAt(0).toUpperCase()}</div><span className="text-sm font-black text-gray-800 dark:text-gray-200">@{autor}</span></div>}
        <GaugeSaude score={metrica.score} corHex={metrica.faixa.hex} label={metrica.faixa.label} />
        <div className="grid grid-cols-3 gap-2 w-full mt-1 text-center">
          {[{ n: "Poupança", v: metrica.ptsPoup, mx: 40, tip: "Quanto da renda sobrou (30%+ = nota cheia)." }, { n: "Ritmo", v: metrica.ptsRitmo, mx: 30, tip: "Gastar menos que no mesmo dia do mês passado pontua mais." }, { n: "Fixos", v: metrica.ptsFixas, mx: 30, tip: "Peso das despesas fixas na renda — quanto menor, melhor." }].map((c) => (
            <div key={c.n} className="tip-wrap cursor-help" title={c.tip}><p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase">{c.n}</p><p className="text-xs font-black text-gray-700 dark:text-gray-200">{Math.round(c.v)}/{c.mx}</p><div className="tip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-gray-900 dark:bg-gray-700 text-white text-[10px] font-bold rounded-lg p-2 z-20 pointer-events-none shadow-lg">{c.tip}</div></div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 w-full mt-3 pt-3 border-t border-gray-200/70 dark:border-gray-700/70 text-center">
          <div><p className="text-[9px] font-black text-green-500 uppercase">Entradas</p><p className="text-xs font-black text-gray-800 dark:text-gray-200">{formatarMoeda(metrica.receitas)}</p></div>
          <div><p className="text-[9px] font-black text-red-500 uppercase">Saídas</p><p className="text-xs font-black text-gray-800 dark:text-gray-200">{formatarMoeda(metrica.despesas)}</p></div>
          <div><p className="text-[9px] font-black text-blue-500 uppercase">Sobrou</p><p className={`text-xs font-black ${metrica.saldo >= 0 ? "text-gray-800 dark:text-gray-200" : "text-orange-600 dark:text-orange-400"}`}>{formatarMoeda(metrica.saldo)}</p></div>
        </div>
      </div>
    );

    const comparativo = () => {
      const a = autores[0], b = autores[1];
      const ma = computarMes(a), mb = computarMes(b);
      const col = (autor: string, mm: Metrica) => (
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-1"><div className="w-6 h-6 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[9px] font-black">{mapPerfis[autor] ? <img src={mapPerfis[autor]} alt="" className="w-full h-full object-cover" /> : autor.charAt(0).toUpperCase()}</div><span className="text-xs font-black text-gray-800 dark:text-gray-200 truncate max-w-[80px]">@{autor}</span></div>
          <GaugeSaude score={mm.score} corHex={mm.faixa.hex} label={mm.faixa.label} compact />
          <div className="w-full mt-2 space-y-1 text-center">
            <div className="flex justify-between text-[10px] font-bold px-1"><span className="text-gray-400 dark:text-gray-500">Entradas</span><span className="text-gray-700 dark:text-gray-200">{formatarMoeda(mm.receitas)}</span></div>
            <div className="flex justify-between text-[10px] font-bold px-1"><span className="text-gray-400 dark:text-gray-500">Saídas</span><span className="text-gray-700 dark:text-gray-200">{formatarMoeda(mm.despesas)}</span></div>
            <div className="flex justify-between text-[10px] font-bold px-1"><span className="text-gray-400 dark:text-gray-500">Sobrou</span><span className={mm.saldo >= 0 ? "text-gray-700 dark:text-gray-200" : "text-orange-500"}>{formatarMoeda(mm.saldo)}</span></div>
          </div>
        </div>
      );
      return (<div className="flex gap-3 pt-2">{col(a, ma)}<div className="w-px bg-gray-200 dark:bg-gray-700"></div>{col(b, mb)}</div>);
    };

    return (
      <div className="bg-blue-50/40 dark:bg-blue-900/10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col transition-colors relative">
        <div className="flex items-center justify-center gap-2 mb-1 relative">
          {opcoes.length > 1 && <button onClick={() => mover(-1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-700 transition-colors shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>}
          <div className="text-center"><h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Saúde Financeira</h3><p className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-wider mt-0.5">{scopeLabel}</p></div>
          {opcoes.length > 1 && <button onClick={() => mover(1)} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-700 transition-colors shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>}
          <button onClick={() => toggleInfo("saude")} className={`absolute right-0 top-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${infoAberto === "saude" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" : "text-gray-300 dark:text-gray-600 hover:text-blue-500"}`} title="Como é calculado?"><IconeInfo /></button>
        </div>
        <FlipCard flipped={infoAberto === "saude"} verso={
          <div className="min-h-[260px] flex flex-col justify-center px-1 space-y-2 text-[11px]">
            <p>Uma nota de <b>0 a 100</b> pra saúde do mês, somando três partes:</p>
            <p>🐷 <b>Poupança (0–40):</b> quanto da renda sobrou. 30%+ = nota cheia.</p>
            <p>⏱️ <b>Ritmo (0–30):</b> se estão gastando menos que no mesmo ponto do mês passado.</p>
            <p>📌 <b>Fixos (0–30):</b> quanto menor o peso das despesas fixas na renda, melhor.</p>
            <p className="text-gray-400 dark:text-gray-500">Use as setas pra ver o geral, cada pessoa, ou o comparativo. Faixas: 0–39 Ruim · 40–59 Atenção · 60–79 Bom · 80–100 Ótimo.</p>
          </div>
        } frente={scope === "__comp__" ? comparativo() : single(met!, scope === "__geral__" ? null : scope)} />
      </div>
    );
  }

  function renderCategorias(titulo: string, sub: string, dados: any[], total: number, restoAberto: boolean, setRestoAberto: (v: boolean) => void) {
    const visiveis = dados.slice(0, qtdCategorias);
    const resto = dados.slice(qtdCategorias);
    const restoValor = resto.reduce((a, c) => a + c.valor, 0);
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-1">{titulo}</h3>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">{sub} · clique para ver os lançamentos</p>
        {dados.length === 0 ? (<p className="text-sm font-bold text-gray-400 text-center py-10">Nada neste mês.</p>) : (
          <div className="space-y-4">
            {visiveis.map((cat, index) => {
              const pct = total > 0 ? ((cat.valor / total) * 100).toFixed(1) : "0";
              const cor = PALETA.categorias[index % PALETA.categorias.length];
              return (
                <button key={cat.nome} onClick={() => setDrill({ titulo: cat.nome, corHex: cor, itens: cat.itens })} className="w-full text-left group">
                  <div className="flex justify-between items-end mb-1.5"><span className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate pr-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{cat.nome}</span><div className="flex flex-col items-end"><span className="text-sm font-black text-gray-900 dark:text-gray-100">{formatarMoeda(cat.valor)}</span><span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{pct}%</span></div></div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden"><div className="h-2.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cor }}></div></div>
                </button>
              );
            })}
            {resto.length > 0 && (
              <div>
                <div className="flex justify-between items-end mb-1.5"><span className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">Resto <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">{resto.length} categorias</span></span><span className="text-sm font-black text-gray-700 dark:text-gray-300">{formatarMoeda(restoValor)}</span></div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden"><div className="h-2.5 rounded-full bg-gray-400 dark:bg-gray-600" style={{ width: `${total > 0 ? (restoValor / total) * 100 : 0}%` }}></div></div>
                {expandirResto && <button onClick={() => setRestoAberto(!restoAberto)} className="mt-2 text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline">{restoAberto ? "▲ ocultar detalhe" : "▼ ver o resto em detalhe"}</button>}
                {expandirResto && restoAberto && (
                  <div className="mt-2 space-y-2 animate-in fade-in duration-200">{resto.map((cat) => (<button key={cat.nome} onClick={() => setDrill({ titulo: cat.nome, corHex: "#64748b", itens: cat.itens })} className="w-full flex items-center justify-between gap-3 py-1 text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><span className="text-xs font-bold text-gray-600 dark:text-gray-400 truncate">{cat.nome}</span><span className="text-xs font-black text-gray-800 dark:text-gray-200 whitespace-nowrap">{formatarMoeda(cat.valor)}</span></button>))}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderBI() {
    return (
      <div>
        <h2 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 px-1">📊 Raio-X das finanças</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {modo !== "futuro" && chartCard("bi-runway", "Saldo do mês, dia a dia", "Quanto o mês está no positivo/negativo",
            <>Mostra o <b>saldo acumulado do mês</b> (entradas − saídas) dia a dia. {modo === "corrente" && "A partir de hoje já desconta as contas fixas programadas que ainda vão cair. "}Cada degrau pra baixo é uma conta chegando — é a resposta pra "quanto ainda sobra?".</>,
            <Linhas labels={runway.labels} marcadorIndex={runway.hoje} series={[{ nome: "Saldo", valores: runway.valores, cor: PALETA.saldo, area: true }]} height={220} />, true)}

          {modo !== "futuro" && chartCard("bi-diario", "Fluxo diário", "Entradas e saídas por dia",
            <>Total de <b>entradas</b> (verde) e <b>saídas</b> (vermelho) em cada dia do mês. Passe o mouse pra ver o valor exato de qualquer dia.</>,
            <>{legenda([{ nome: "Entradas", cor: PALETA.receita }, { nome: "Saídas", cor: PALETA.despesa }])}<Linhas labels={fluxoDiario.labels} series={[{ nome: "Entradas", valores: fluxoDiario.rec, cor: PALETA.receita }, { nome: "Saídas", valores: fluxoDiario.desp, cor: PALETA.despesa }]} height={200} /></>)}

          {modo !== "futuro" && chartCard("bi-semanal", "Fluxo semanal", "Entradas e saídas por semana",
            <>O mesmo fluxo agrupado por <b>semana</b> — útil pra ver em qual semana o dinheiro aperta mais.</>,
            <>{legenda([{ nome: "Entradas", cor: PALETA.receita }, { nome: "Saídas", cor: PALETA.despesa }])}<Barras labels={fluxoSemanal.labels} series={[{ nome: "Entradas", valores: fluxoSemanal.rec, cor: PALETA.receita }, { nome: "Saídas", valores: fluxoSemanal.desp, cor: PALETA.despesa }]} /></>)}

          {chartCard("bi-12m", "Receitas × Despesas", "Últimos 12 meses",
            <>Barras de <b>entradas</b> e <b>saídas</b> mês a mês, com a linha de <b>saldo</b>. Meses com o saldo abaixo de zero fecharam no vermelho.</>,
            <>{legenda([{ nome: "Entradas", cor: PALETA.receita }, { nome: "Saídas", cor: PALETA.despesa }, { nome: "Saldo", cor: PALETA.saldo }])}<Barras labels={serie12m.labels} series={[{ nome: "Entradas", valores: serie12m.rec, cor: PALETA.receita }, { nome: "Saídas", valores: serie12m.desp, cor: PALETA.despesa }]} linha={{ nome: "Saldo", valores: serie12m.saldo, cor: PALETA.saldo }} /></>)}

          {chartCard("bi-fixovar", "Fixo × Variável", "Últimos 6 meses",
            <>Cada barra é o gasto do mês dividido entre <b>fixo</b> (contas fixas e assinaturas) e <b>variável</b> (o dia a dia). Quanto mais variável, mais espaço pra ajustar.</>,
            <>{legenda([{ nome: "Fixo", cor: PALETA.fixo }, { nome: "Variável", cor: PALETA.variavel }])}<Barras labels={fixoVariavel6m.labels} empilhado series={[{ nome: "Fixo", valores: fixoVariavel6m.fixo, cor: PALETA.fixo }, { nome: "Variável", valores: fixoVariavel6m.variavel, cor: PALETA.variavel }]} /></>)}

          {chartCard("bi-evol", "Evolução por categoria", "Top 5 categorias · 6 meses",
            <>A trajetória das suas <b>5 maiores categorias</b> de gasto nos últimos 6 meses. Serve pra ver o que está subindo ou já caiu.</>,
            evolucaoCategorias.series.length === 0 ? <p className="text-sm font-bold text-gray-400 text-center py-10">Sem dados.</p> : <>{legenda(evolucaoCategorias.series.map((s) => ({ nome: s.nome, cor: s.cor })))}<Linhas labels={evolucaoCategorias.labels} series={evolucaoCategorias.series} height={210} /></>)}

          {modo !== "futuro" && chartCard("bi-donut", "Para onde foi a renda", "Comprometimento do mês",
            <>Da renda que entrou este mês, quanto foi pra <b>despesas fixas</b>, <b>variáveis</b> e quanto <b>sobrou</b>. O ideal é manter uma boa fatia verde.</>,
            <><Donut segmentos={donutSegs} centroLabel="da renda sobrou" centroValor={m.receitas > 0 ? `${Math.max(0, Math.round((donutSegs[2].valor / m.receitas) * 100))}%` : "—"} /><div className="grid grid-cols-3 gap-2 mt-3 text-center">{donutSegs.map((s) => (<div key={s.nome}><p className="text-[9px] font-black uppercase" style={{ color: s.cor }}>{s.nome}</p><p className="text-xs font-black text-gray-800 dark:text-gray-200">{formatarMoeda(s.valor)}</p></div>))}</div></>)}
        </div>
      </div>
    );
  }
}
